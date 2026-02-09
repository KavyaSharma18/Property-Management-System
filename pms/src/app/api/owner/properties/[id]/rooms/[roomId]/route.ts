import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get specific room details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId, roomId } = await params;

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const room = await prisma.rooms.findFirst({
      where: {
        id: roomId,
        propertyId,
      },
      include: {
        floors: {
          select: {
            id: true,
            floorNumber: true,
            floorName: true,
            description: true,
          },
        },
        occupancies: {
          include: {
            guests: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { checkInTime: "desc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}

// PUT: Update room details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId, roomId } = await params;
    const body = await request.json();
    const {
      roomNumber,
      roomType,
      roomCategory,
      capacity,
      pricePerNight,
      description,
      amenities,
      images,
      size,
      status,
      floorId,
    } = body;

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Check if room exists
    const existingRoom = await prisma.rooms.findFirst({
      where: { id: roomId, propertyId },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Validate room type and category if provided
    if (roomType) {
      const validRoomTypes = ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'SUITE', 'DELUXE', 'DORMITORY', 'STUDIO'];
      if (!validRoomTypes.includes(roomType)) {
        return NextResponse.json(
          { error: `Invalid room type. Valid types: ${validRoomTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (roomCategory) {
      const validRoomCategories = ['ECONOMY', 'MODERATE', 'PREMIUM', 'ELITE', 'VIP'];
      if (!validRoomCategories.includes(roomCategory)) {
        return NextResponse.json(
          { error: `Invalid room category. Valid categories: ${validRoomCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // If room number is being changed, check for duplicates
    if (roomNumber && roomNumber !== existingRoom.roomNumber) {
      const duplicateRoom = await prisma.rooms.findFirst({
        where: {
          propertyId,
          roomNumber,
          id: { not: roomId },
        },
      });

      if (duplicateRoom) {
        return NextResponse.json(
          { error: "Room with this number already exists" },
          { status: 409 }
        );
      }
    }

    // If floor is being changed, verify it belongs to property
    if (floorId && floorId !== existingRoom.floorId) {
      const floor = await prisma.floors.findFirst({
        where: { id: floorId, propertyId },
      });

      if (!floor) {
        return NextResponse.json(
          { error: "Floor not found in this property" },
          { status: 404 }
        );
      }
    }

    // Update room
    const updatedRoom = await prisma.rooms.update({
      where: { id: roomId },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(roomType && { roomType }),
        ...(roomCategory && { roomCategory }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(pricePerNight && { pricePerNight: parseFloat(pricePerNight) }),
        ...(description !== undefined && { description }),
        ...(amenities && { amenities: JSON.stringify(amenities) }),
        ...(images && { images: JSON.stringify(images) }),
        ...(size && { size: parseFloat(size) }),
        ...(status && { status }),
        ...(floorId && { floorId }),
      },
      include: {
        floors: {
          select: {
            id: true,
            floorNumber: true,
            floorName: true,
          },
        },
      },
    });

    return NextResponse.json(
      { room: updatedRoom, message: "Room updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

// DELETE: Delete room (only if no active occupancies)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId, roomId } = await params;

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Check if room exists and has any booking history
    const room = await prisma.rooms.findFirst({
      where: { id: roomId, propertyId },
      include: {
        occupancies: true, // Check all occupancies, not just active ones
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Prevent deletion of rooms with ANY booking history to preserve financial records
    if (room.occupancies.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete room with booking history. This preserves financial records and guest data." },
        { status: 400 }
      );
    }

    await prisma.rooms.delete({
      where: { id: roomId },
    });

    return NextResponse.json(
      { message: "Room deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
