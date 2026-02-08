import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: View complete room details with current occupancy and history
// Params: id - Room ID
// Returns: Room info, current guest details, payment status, last 10 occupancies
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: roomId } = await params;

    // Get receptionist's assigned property
    const receptionist = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        role: true,
        propertyId: true,
      },
    });

    if (
      !receptionist ||
      receptionist.role !== "RECEPTIONIST" ||
      !receptionist.propertyId
    ) {
      return NextResponse.json(
        { error: "Not authorized or no property assigned" },
        { status: 403 }
      );
    }

    // Get room details
    const room = await prisma.rooms.findUnique({
      where: {
        id: roomId,
      },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
          },
        },
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
          include: {
            occupancy_guests: {
              include: {
                guests: true,
              },
            },
            payments: {
              orderBy: {
                paymentDate: "desc",
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Verify room belongs to receptionist's property
    if (room.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Room does not belong to your property" },
        { status: 403 }
      );
    }

    // Get current occupancy
    const currentOccupancy = room.occupancies[0] || null;

    // Calculate nights stayed if occupied
    let nightsStayed = 0;
    if (currentOccupancy) {
      const checkIn = new Date(currentOccupancy.checkInTime);
      const today = new Date();
      nightsStayed = Math.ceil(
        (today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Get occupancy history
    const occupancyHistory = await prisma.occupancies.findMany({
      where: {
        roomId,
        actualCheckOut: {
          not: null,
        },
      },
      include: {
        occupancy_guests: {
          include: {
            guests: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkInTime: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.roomType,
        capacity: room.capacity,
        pricePerNight: room.pricePerNight,
        status: room.status,
        property: room.properties,
        floor: room.floors,
      },
      currentOccupancy: currentOccupancy
        ? {
            id: currentOccupancy.id,
            checkInTime: currentOccupancy.checkInTime,
            expectedCheckOut: currentOccupancy.expectedCheckOut,
            actualRoomRate: currentOccupancy.actualRoomRate,
            actualCapacity: currentOccupancy.actualCapacity,
            totalAmount: currentOccupancy.totalAmount,
            paidAmount: currentOccupancy.paidAmount,
            balanceAmount: currentOccupancy.balanceAmount,
            lastPaidDate: currentOccupancy.lastPaidDate,
            nightsStayed,
            guests: currentOccupancy.occupancy_guests.map((og) => ({
              ...og.guests,
              isPrimary: og.isPrimary,
            })),
            payments: currentOccupancy.payments,
          }
        : null,
      occupancyHistory: occupancyHistory.map((occ) => ({
        id: occ.id,
        checkInTime: occ.checkInTime,
        actualCheckOut: occ.actualCheckOut,
        totalAmount: occ.totalAmount,
        paidAmount: occ.paidAmount,
        guests: occ.occupancy_guests.map((og) => og.guests),
      })),
    });
  } catch (error) {
    console.error("Room details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch room details" },
      { status: 500 }
    );
  }
}

// PATCH: Update room status
// Params: id - Room ID
// Body: { status: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "DIRTY" | "CLEANING" }
// Returns: Updated room details
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: roomId } = await params;
    const body = await req.json();
    const { status, pricePerNight } = body;

    // Get receptionist's assigned property
    const receptionist = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        role: true,
        propertyId: true,
      },
    });

    if (
      !receptionist ||
      receptionist.role !== "RECEPTIONIST" ||
      !receptionist.propertyId
    ) {
      return NextResponse.json(
        { error: "Not authorized or no property assigned" },
        { status: 403 }
      );
    }

    // Verify room belongs to receptionist's property
    const room = await prisma.rooms.findUnique({
      where: { id: roomId },
      select: { propertyId: true, status: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Room does not belong to your property" },
        { status: 403 }
      );
    }

    // Validate status
    const validStatuses = [
      "VACANT",
      "OCCUPIED",
      "MAINTENANCE",
      "RESERVED",
      "DIRTY",
      "CLEANING",
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate pricePerNight
    if (pricePerNight !== undefined && (isNaN(pricePerNight) || pricePerNight < 0)) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (pricePerNight !== undefined) updateData.pricePerNight = pricePerNight;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Update room
    const updatedRoom = await prisma.rooms.update({
      where: { id: roomId },
      data: updateData,
      include: {
        floors: true,
      },
    });

    return NextResponse.json({
      message: "Room updated successfully",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Room update error:", error);
    return NextResponse.json(
      { error: "Failed to update room status" },
      { status: 500 }
    );
  }
}
