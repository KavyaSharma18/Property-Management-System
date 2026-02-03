import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: List all rooms with filtering options
// Query params:
//   - type (optional): Room type (SINGLE, DOUBLE, SUITE, etc.)
//   - floor (optional): Floor ID
//   - roomNumber (optional): Search by room number
//   - status (optional): Room status (VACANT, OCCUPIED, MAINTENANCE, DIRTY, CLEANING)
// Returns: Room list with current occupancy info, status counts, and room type distribution
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get filters
    const roomType = searchParams.get("type"); // SINGLE, DOUBLE, SUITE, etc.
    const floorNumber = searchParams.get("floor");
    const roomNumber = searchParams.get("roomNumber");
    const status = searchParams.get("status"); // VACANT, OCCUPIED, MAINTENANCE, etc.

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

    const propertyId = receptionist.propertyId;

    // Build filter conditions
    const whereConditions: any = {
      propertyId,
    };

    if (roomType) {
      whereConditions.roomType = roomType;
    }

    if (floorNumber) {
      whereConditions.floorNumber = parseInt(floorNumber);
    }

    if (roomNumber) {
      whereConditions.roomNumber = {
        contains: roomNumber,
        mode: "insensitive",
      };
    }

    if (status) {
      whereConditions.status = status;
    }

    // Get rooms with occupancy info
    const rooms = await prisma.rooms.findMany({
      where: whereConditions,
      include: {
        floors: {
          select: {
            id: true,
            floorNumber: true,
            floorName: true,
          },
        },
        occupancies: {
          where: {
            actualCheckOut: null,
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
        },
      },
      orderBy: [{ roomNumber: "asc" }],
    });

    // Get status counts for the filtered property
    const allRooms = await prisma.rooms.findMany({
      where: { propertyId },
      select: { status: true, roomType: true },
    });

    const statusCounts = {
      total: allRooms.length,
      VACANT: allRooms.filter((r) => r.status === "VACANT").length,
      OCCUPIED: allRooms.filter((r) => r.status === "OCCUPIED").length,
      MAINTENANCE: allRooms.filter((r) => r.status === "MAINTENANCE").length,
      RESERVED: allRooms.filter((r) => r.status === "RESERVED").length,
      DIRTY: allRooms.filter((r) => r.status === "DIRTY").length,
      CLEANING: allRooms.filter((r) => r.status === "CLEANING").length,
    };

    // Get type counts
    const typeCounts = allRooms.reduce((acc: any, room) => {
      acc[room.roomType] = (acc[room.roomType] || 0) + 1;
      return acc;
    }, {});

    // Enrich room data
    const enrichedRooms = rooms.map((room) => {
      const currentOccupancy = room.occupancies[0] || null;
      const guests = currentOccupancy
        ? currentOccupancy.occupancy_guests.map((og: any) => og.guests)
        : [];

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.roomType,
        capacity: room.capacity,
        pricePerNight: room.pricePerNight,
        status: room.status,
        floor: room.floors,
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
              guestCount: guests.length,
              guests: guests,
            }
          : null,
      };
    });

    return NextResponse.json({
      rooms: enrichedRooms,
      counts: statusCounts,
      typeCounts,
      filters: {
        roomType,
        floorNumber,
        roomNumber,
        status,
      },
    });
  } catch (error) {
    console.error("Rooms fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
