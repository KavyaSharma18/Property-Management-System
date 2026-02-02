import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get overall analytics for all properties owned by the owner
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;

    // Get all properties with their rooms and occupancies
    const properties = await prisma.properties.findMany({
      where: { ownerId },
      include: {
        rooms: {
          include: {
            occupancies: {
              where: {
                actualCheckOut: null, // Only current occupancies
              },
            },
          },
        },
      },
    });

    // Calculate overall statistics
    const totalProperties = properties.length;
    const totalRooms = properties.reduce((sum, prop) => sum + prop.totalRooms, 0);
    
    let occupiedRooms = 0;
    let totalOccupants = 0;
    let totalRevenue = 0;

    properties.forEach((property) => {
      property.rooms.forEach((room) => {
        if (room.occupancies.length > 0) {
          occupiedRooms++;
          room.occupancies.forEach((occupancy) => {
            totalOccupants += occupancy.numberOfOccupants;
            // Count revenue from paid amount (partial or full)
            if (occupancy.paidAmount) {
              totalRevenue += occupancy.paidAmount;
            }
          });
        }
      });
    });

    const vacantRooms = totalRooms - occupiedRooms;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Get recent alerts
    const recentAlerts = await prisma.alerts.count({
      where: {
        userId: ownerId,
        isRead: false,
      },
    });

    // Get property-wise breakdown
    const propertyBreakdown = properties.map((property) => {
      const roomsCount = property.rooms.length;
      const occupied = property.rooms.filter(
        (room) => room.occupancies.length > 0
      ).length;
      const revenue = property.rooms.reduce((sum, room) => {
        return (
          sum +
          room.occupancies.reduce(
            (oSum, occ) => oSum + (occ.paidAmount || 0),
            0
          )
        );
      }, 0);

      return {
        propertyId: property.id,
        propertyName: property.name,
        totalRooms: property.totalRooms,
        occupiedRooms: occupied,
        vacantRooms: property.totalRooms - occupied,
        occupancyRate: property.totalRooms > 0 ? (occupied / property.totalRooms) * 100 : 0,
        revenue,
      };
    });

    const analytics = {
      overall: {
        totalProperties,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        occupancyRate: parseFloat(occupancyRate.toFixed(2)),
        totalOccupants,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        unreadAlerts: recentAlerts,
      },
      propertyBreakdown,
    };

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
