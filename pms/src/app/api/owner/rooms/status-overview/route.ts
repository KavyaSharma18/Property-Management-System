import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get overview of room statuses across all properties
// Query params:
//   - propertyId (optional): filter by specific property
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    // Build where clause
    const where: any = {
      properties: {
        ownerId,
      },
    };

    if (propertyId) {
      where.propertyId = propertyId;
    }

    // Get all rooms with their occupancies
    const rooms = await prisma.rooms.findMany({
      where,
      include: {
        properties: {
          select: {
            id: true,
            name: true,
            city: true,
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
    });

    // Count by status
    const statusCounts = {
      VACANT: 0,
      OCCUPIED: 0,
      MAINTENANCE: 0,
      RESERVED: 0,
      DIRTY: 0,
      CLEANING: 0,
    };

    rooms.forEach((room) => {
      statusCounts[room.status as keyof typeof statusCounts]++;
    });

    // Group by property
    const byProperty = rooms.reduce((acc: any, room) => {
      const propId = room.properties.id;
      if (!acc[propId]) {
        acc[propId] = {
          propertyId: propId,
          propertyName: room.properties.name,
          city: room.properties.city,
          totalRooms: 0,
          byStatus: {
            VACANT: 0,
            OCCUPIED: 0,
            MAINTENANCE: 0,
            RESERVED: 0,
            DIRTY: 0,
            CLEANING: 0,
          },
        };
      }
      acc[propId].totalRooms++;
      acc[propId].byStatus[room.status as keyof typeof statusCounts]++;
      return acc;
    }, {});

    // Group by room type
    const byType = rooms.reduce((acc: any, room) => {
      if (!acc[room.roomType]) {
        acc[room.roomType] = {
          total: 0,
          vacant: 0,
          occupied: 0,
          maintenance: 0,
        };
      }
      acc[room.roomType].total++;
      if (room.status === "VACANT") acc[room.roomType].vacant++;
      if (room.status === "OCCUPIED") acc[room.roomType].occupied++;
      if (room.status === "MAINTENANCE") acc[room.roomType].maintenance++;
      return acc;
    }, {});

    // Get rooms needing attention
    const needsAttention = {
      dirty: rooms.filter((r) => r.status === "DIRTY"),
      maintenance: rooms.filter((r) => r.status === "MAINTENANCE"),
      cleaning: rooms.filter((r) => r.status === "CLEANING"),
    };

    return NextResponse.json(
      {
        summary: {
          totalRooms: rooms.length,
          statusCounts,
          availableRooms: statusCounts.VACANT,
          occupiedRooms: statusCounts.OCCUPIED,
          needsAttentionCount:
            statusCounts.DIRTY +
            statusCounts.MAINTENANCE +
            statusCounts.CLEANING,
        },
        byProperty: Object.values(byProperty),
        byType,
        needsAttention: {
          dirty: needsAttention.dirty.map((r) => ({
            id: r.id,
            roomNumber: r.roomNumber,
            property: r.properties.name,
          })),
          maintenance: needsAttention.maintenance.map((r) => ({
            id: r.id,
            roomNumber: r.roomNumber,
            property: r.properties.name,
          })),
          cleaning: needsAttention.cleaning.map((r) => ({
            id: r.id,
            roomNumber: r.roomNumber,
            property: r.properties.name,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching room status overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch room status overview" },
      { status: 500 }
    );
  }
}
