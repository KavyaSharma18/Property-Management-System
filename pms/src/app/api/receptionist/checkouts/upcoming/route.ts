import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Plan upcoming checkouts and room availability
// Query params:
//   - period (optional): 'today' | 'tomorrow' | 'week' (default: 'today')
// Returns:
//   - Occupancies with expected checkout in period (sorted by time)
//   - Payment status and outstanding balance
//   - Summary: total checkouts, paid/unpaid count, revenue, pending amount
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get period parameter
    const period = searchParams.get("period") || "today";

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

    // Calculate date range based on period
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let startDate: Date;
    let endDate: Date;
    let periodLabel = "";

    switch (period) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(tomorrow);
        periodLabel = "Today's Checkouts";
        break;

      case "tomorrow":
        startDate = new Date(tomorrow);
        endDate = new Date(tomorrow);
        endDate.setDate(endDate.getDate() + 1);
        periodLabel = "Tomorrow's Checkouts";
        break;

      case "week":
        startDate = new Date(today);
        endDate = new Date(weekEnd);
        periodLabel = "This Week's Checkouts";
        break;

      default:
        startDate = new Date(today);
        endDate = new Date(tomorrow);
        periodLabel = "Today's Checkouts";
    }

    // Get upcoming checkouts via rooms
    const rooms = await prisma.rooms.findMany({
      where: { propertyId },
      include: {
        occupancies: {
          where: {
            actualCheckOut: null,
            expectedCheckOut: {
              gte: startDate,
              lt: endDate,
            },
          },
          include: {
            rooms: {
              select: {
                id: true,
                roomNumber: true,
                roomType: true,
                floorId: true,
              },
            },
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

    const upcomingCheckouts = rooms.flatMap((room) => room.occupancies).sort(
      (a, b) => (a.expectedCheckOut?.getTime() || 0) - (b.expectedCheckOut?.getTime() || 0)
    );

    // Enrich checkout data
    const enrichedCheckouts = upcomingCheckouts.map((occ) => {
      const checkIn = new Date(occ.checkInTime);
      const expectedOut = occ.expectedCheckOut
        ? new Date(occ.expectedCheckOut)
        : null;
      const nightsStayed = expectedOut
        ? Math.ceil(
            (expectedOut.getTime() - checkIn.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      const primaryGuest = occ.occupancy_guests.find((og: any) => og.isPrimary);

      return {
        occupancyId: occ.id,
        room: occ.rooms,
        checkInTime: occ.checkInTime,
        expectedCheckOut: occ.expectedCheckOut,
        nightsStayed,
        totalAmount: occ.totalAmount,
        paidAmount: occ.paidAmount || 0,
        balanceAmount: occ.balanceAmount || 0,
        isPaid: (occ.balanceAmount || 0) === 0,
        canCheckout: (occ.balanceAmount || 0) === 0,
        primaryGuest: primaryGuest ? primaryGuest.guests : null,
        numberOfOccupants: occ.numberOfOccupants,
        guestCount: occ.occupancy_guests.length,
        allGuests: occ.occupancy_guests.map((og: any) => ({
          ...og.guests,
          isPrimary: og.isPrimary,
        })),
        lastPayment: occ.payments[0] || null,
      };
    });

    // Calculate statistics
    const stats = {
      total: enrichedCheckouts.length,
      paid: enrichedCheckouts.filter((c) => c.isPaid).length,
      pending: enrichedCheckouts.filter((c) => !c.isPaid).length,
      totalPendingAmount: enrichedCheckouts.reduce(
        (sum, c) => sum + (c.balanceAmount || 0),
        0
      ),
      totalRevenue: enrichedCheckouts.reduce(
        (sum, c) => sum + (c.paidAmount || 0),
        0
      ),
    };

    return NextResponse.json({
      period: periodLabel,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      stats,
      checkouts: enrichedCheckouts,
    });
  } catch (error) {
    console.error("Upcoming checkouts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming checkouts" },
      { status: 500 }
    );
  }
}
