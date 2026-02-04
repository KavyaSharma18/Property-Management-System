import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Receptionist dashboard with property overview
// Returns:
//   - Room status distribution (vacant, occupied, maintenance, dirty, cleaning)
//   - Room type breakdown
//   - Active occupancy statistics
//   - Today's check-ins and checkouts
//   - Payment collection summary
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;

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

    // Get property with rooms
    const property = await prisma.properties.findUnique({
      where: { id: receptionist.propertyId },
      include: {
        floors: true,
        rooms: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }
    const propertyId = property.id;

    // Get current date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get room statistics
    const roomStats = {
      total: property.rooms.length,
      VACANT: property.rooms.filter((r) => r.status === "VACANT").length,
      OCCUPIED: property.rooms.filter((r) => r.status === "OCCUPIED").length,
      MAINTENANCE: property.rooms.filter((r) => r.status === "MAINTENANCE")
        .length,
      RESERVED: property.rooms.filter((r) => r.status === "RESERVED").length,
      DIRTY: property.rooms.filter((r) => r.status === "DIRTY").length,
      CLEANING: property.rooms.filter((r) => r.status === "CLEANING").length,
    };

    // Get active occupancies
    const activeOccupancies = await prisma.occupancies.findMany({
      where: {
        rooms: {
          propertyId: propertyId,
        },
        actualCheckOut: null,
      },
      include: {
        rooms: true,
        occupancy_guests: {
          include: {
            guests: true,
          },
        },
      },
    });

    // Calculate revenue
    const allPayments = await prisma.payments.findMany({
      where: {
        occupancies: {
          rooms: {
            propertyId: propertyId,
          },
        },
      },
    });

    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // This month's revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthPayments = allPayments.filter(
      (p) => p.paymentDate >= firstDayOfMonth
    );
    const thisMonthRevenue = thisMonthPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // Today's checkouts
    const todayCheckouts = activeOccupancies.filter((occ) => {
      if (!occ.expectedCheckOut) return false;
      const checkoutDate = new Date(occ.expectedCheckOut);
      checkoutDate.setHours(0, 0, 0, 0);
      return checkoutDate.getTime() === today.getTime();
    }).length;

    // Pending payments
    const pendingPayments = activeOccupancies.filter(
      (occ) => (occ.balanceAmount || 0) > 0
    );
    const totalPendingAmount = pendingPayments.reduce(
      (sum, occ) => sum + (occ.balanceAmount || 0),
      0
    );

    // Occupancy rate
    const occupancyRate =
      property.rooms.length > 0
        ? ((roomStats.OCCUPIED / property.rooms.length) * 100).toFixed(1)
        : 0;

    // Recent check-ins (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCheckIns = await prisma.occupancies.count({
      where: {
        rooms: {
          propertyId: propertyId,
        },
        checkInTime: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Booking source distribution (active occupancies)
    const bookingSourceDistribution = activeOccupancies.reduce((acc, occ) => {
      const source = occ.bookingSource || 'WALK_IN';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Corporate bookings count
    const corporateBookingsCount = activeOccupancies.filter(
      (occ) => occ.corporateBookingId !== null
    ).length;

    return NextResponse.json({
      property: {
        id: property.id,
        name: property.name,
        totalFloors: property.floors.length,
        totalRooms: property.rooms.length,
      },
      roomStats,
      analytics: {
        totalRevenue,
        thisMonthRevenue,
        occupancyRate: parseFloat(occupancyRate as string),
        activeOccupancies: activeOccupancies.length,
        todayCheckouts,
        pendingPayments: {
          count: pendingPayments.length,
          totalAmount: totalPendingAmount,
        },
        recentCheckIns,
        bookingSourceDistribution,
        corporateBookingsCount,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
