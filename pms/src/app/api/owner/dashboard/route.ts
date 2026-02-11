import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Owner dashboard overview
// Returns: Summary of all properties, revenue, occupancy, and recent activities
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    if (userRole !== "OWNER") {
      return NextResponse.json(
        { error: "Access denied. Owner role required." },
        { status: 403 }
      );
    }

    // Get all properties owned by this user
    const properties = await prisma.properties.findMany({
      where: { ownerId: userId },
      include: {
        rooms: {
          include: {
            occupancies: {
              where: {
                actualCheckOut: null, // Only active occupancies
              },
            },
          },
        },
        users_properties_receptionistIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate totals
    const totalProperties = properties.length;
    const totalRooms = properties.reduce((sum, p) => sum + p.rooms.length, 0);

    // Room status distribution
    const roomStatusCounts = properties.reduce(
      (acc, property) => {
        property.rooms.forEach((room) => {
          acc[room.status] = (acc[room.status] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    const occupiedRooms = roomStatusCounts["OCCUPIED"] || 0;
    const vacantRooms = roomStatusCounts["VACANT"] || 0;
    const maintenanceRooms = roomStatusCounts["MAINTENANCE"] || 0;
    const dirtyRooms = roomStatusCounts["DIRTY"] || 0;
    const cleaningRooms = roomStatusCounts["CLEANING"] || 0;
    const reservedRooms = roomStatusCounts["RESERVED"] || 0;

    // Overall occupancy rate
    const occupancyRate =
      totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    // Get all payments for revenue calculation
    const allPayments = await prisma.payments.findMany({
      where: {
        occupancies: {
          rooms: {
            propertyId: {
              in: properties.map((p) => p.id),
            },
          },
        },
      },
      select: {
        amount: true,
        paymentDate: true,
        paymentMethod: true,
      },
    });

    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

    // Calculate revenues for different periods
    const todayRevenue = allPayments
      .filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
      })
      .reduce((sum, p) => sum + p.amount, 0);
    
    const yesterdayRevenue = allPayments
      .filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === yesterday.getTime();
      })
      .reduce((sum, p) => sum + p.amount, 0);
    
    const thisWeekRevenue = allPayments
      .filter((p) => p.paymentDate >= firstDayOfWeek)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const thisMonthRevenue = allPayments
      .filter((p) => p.paymentDate >= firstDayOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const thisYearRevenue = allPayments
      .filter((p) => p.paymentDate >= firstDayOfYear)
      .reduce((sum, p) => sum + p.amount, 0);

    // Total guests count by summing numberOfOccupants from active occupancies
    const activeOccupancies = properties.reduce(
      (sum, p) => sum + p.rooms.reduce((count, r) => count + r.occupancies.reduce((guestSum, occ) => guestSum + (occ.numberOfOccupants || 0), 0), 0),
      0
    );

    // Properties with issues (no receptionist assigned)
    const propertiesWithoutReceptionist = properties.filter(
      (p) => !p.users_properties_receptionistIdTousers
    ).length;

    // Get pending payments
    const pendingPayments = await prisma.occupancies.findMany({
      where: {
        rooms: {
          propertyId: {
            in: properties.map((p) => p.id),
          },
        },
        actualCheckOut: null,
        balanceAmount: {
          gt: 0,
        },
      },
      select: {
        balanceAmount: true,
      },
    });

    const totalPendingAmount = pendingPayments.reduce(
      (sum, occ) => sum + (occ.balanceAmount || 0),
      0
    );

    // Recent check-ins (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCheckIns = await prisma.occupancies.count({
      where: {
        rooms: {
          propertyId: {
            in: properties.map((p) => p.id),
          },
        },
        checkInTime: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Upcoming checkouts (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingCheckouts = await prisma.occupancies.count({
      where: {
        rooms: {
          propertyId: {
            in: properties.map((p) => p.id),
          },
        },
        actualCheckOut: null,
        expectedCheckOut: {
          lte: threeDaysFromNow,
          gte: new Date(),
        },
      },
    });

    // Property-wise summary
    const propertySummary = properties.map((property) => {
      const rooms = property.rooms;
      const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
      const vacant = rooms.filter((r) => r.status === "VACANT").length;
      const occupancyRate =
        rooms.length > 0 ? ((occupied / rooms.length) * 100).toFixed(1) : 0;

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        totalRooms: rooms.length,
        occupiedRooms: occupied,
        vacantRooms: vacant,
        occupancyRate: parseFloat(occupancyRate as string),
        receptionist: property.users_properties_receptionistIdTousers,
        status: property.status,
      };
    });

    return NextResponse.json({
      overview: {
        totalProperties,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        dirtyRooms,
        cleaningRooms,
        reservedRooms,
        overallOccupancyRate: parseFloat(occupancyRate as string),
        activeOccupancies,
        propertiesWithoutReceptionist,
      },
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        thisWeek: thisWeekRevenue,
        thisMonth: thisMonthRevenue,
        thisYear: thisYearRevenue,
        pendingAmount: totalPendingAmount,
        pendingCount: pendingPayments.length,
        payments: allPayments.map(p => ({
          amount: p.amount,
          date: p.paymentDate.toISOString(),
        })),
      },
      activity: {
        recentCheckIns,
        upcomingCheckouts,
      },
      properties: propertySummary,
    });
  } catch (error) {
    console.error("Owner dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
