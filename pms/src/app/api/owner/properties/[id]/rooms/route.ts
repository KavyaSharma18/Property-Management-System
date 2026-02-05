import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all rooms for a property
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId } = await params;

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ownerId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const rooms = await prisma.rooms.findMany({
      where: { propertyId },
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
          where: {
            actualCheckOut: null,
          },
          select: {
            id: true,
            checkInTime: true,
            expectedCheckOut: true,
            guests: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [
        { floors: { floorNumber: "asc" } },
        { roomNumber: "asc" },
      ],
    });

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

// POST: Create a new room
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId } = await params;
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
      floorId,
    } = body;

    // Validation
    if (!roomNumber || !roomType || !capacity || !pricePerNight || !floorId) {
      return NextResponse.json(
        { error: "Room number, type, capacity, price, and floor are required" },
        { status: 400 }
      );
    }

    // Validate room type and category
    const validRoomTypes = ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'SUITE', 'DELUXE', 'DORMITORY', 'STUDIO'];
    const validRoomCategories = ['ECONOMY', 'MODERATE', 'PREMIUM', 'ELITE', 'VIP'];
    
    if (!validRoomTypes.includes(roomType)) {
      return NextResponse.json(
        { error: `Invalid room type. Valid types: ${validRoomTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    if (roomCategory && !validRoomCategories.includes(roomCategory)) {
      return NextResponse.json(
        { error: `Invalid room category. Valid categories: ${validRoomCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate capacity and price are positive numbers
    if (parseInt(capacity) <= 0) {
      return NextResponse.json(
        { error: "Capacity must be greater than 0" },
        { status: 400 }
      );
    }

    if (parseFloat(pricePerNight) <= 0) {
      return NextResponse.json(
        { error: "Price per night must be greater than 0" },
        { status: 400 }
      );
    }

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ownerId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Check if room number already exists in this property
    const existingRoom = await prisma.rooms.findFirst({
      where: {
        propertyId,
        roomNumber,
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: "Room with this number already exists in this property" },
        { status: 409 }
      );
    }

    // Verify floor belongs to this property
    const floor = await prisma.floors.findFirst({
      where: {
        id: floorId,
        propertyId,
      },
    });

    if (!floor) {
      return NextResponse.json(
        { error: "Floor not found in this property" },
        { status: 404 }
      );
    }

    // Check if property has reached room capacity
    const currentRoomCount = await prisma.rooms.count({
      where: { propertyId },
    });

    if (currentRoomCount >= property.totalRooms) {
      return NextResponse.json(
        {
          error: `Property has reached maximum capacity of ${property.totalRooms} rooms`,
        },
        { status: 400 }
      );
    }

    const room = await prisma.rooms.create({
      data: {
        propertyId,
        floorId,
        roomNumber,
        roomType,
        roomCategory: roomCategory || "MODERATE",
        capacity: parseInt(capacity),
        pricePerNight: parseFloat(pricePerNight),
        description,
        amenities: amenities ? JSON.stringify(amenities) : null,
        images: images ? JSON.stringify(images) : null,
        size: size ? parseFloat(size) : null,
        status: "VACANT",
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
      { room, message: "Room created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
