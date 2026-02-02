import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get upcoming checkouts
// Query params:
//   - period (optional): 'today', 'tomorrow', 'week', default 'today'
//   - propertyId (optional): filter by specific property
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const propertyId = searchParams.get("propertyId");

    // Calculate date range based on period
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (period) {
      case "tomorrow":
        startDate = tomorrow;
        endDate = new Date(tomorrow);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = "Tomorrow";
        break;
      case "week":
        startDate = today;
        endDate = weekFromNow;
        periodLabel = "Next 7 Days";
        break;
      case "today":
      default:
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        periodLabel = "Today";
        break;
    }

    // Build where clause
    const where: any = {
      actualCheckOut: null, // Not yet checked out
      expectedCheckOut: {
        gte: startDate,
        lte: endDate,
      },
      rooms: {
        properties: {
          ownerId,
        },
      },
    };

    if (propertyId) {
      where.rooms.propertyId = propertyId;
    }

    // Get occupancies with expected checkout in the period
    const upcomingCheckouts = await prisma.occupancies.findMany({
      where,
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            roomType: true,
            roomCategory: true,
            status: true,
            properties: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
        },
        guests: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        occupancy_guests: {
          include: {
            guests: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        expectedCheckOut: "asc",
      },
    });

    // Enrich data with additional info
    const enrichedCheckouts = upcomingCheckouts.map((checkout) => {
      const checkIn = new Date(checkout.checkInTime);
      const expectedCheckout = checkout.expectedCheckOut
        ? new Date(checkout.expectedCheckOut)
        : null;

      const nightsStayed = expectedCheckout
        ? Math.ceil(
            (expectedCheckout.getTime() - checkIn.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      const allGuestNames = [
        checkout.guests.name,
        ...checkout.occupancy_guests.map((og) => og.guests.name),
      ];

      return {
        occupancyId: checkout.id,
        expectedCheckOut: checkout.expectedCheckOut,
        nightsStayed,
        numberOfGuests: allGuestNames.length,
        property: checkout.rooms.properties,
        room: {
          id: checkout.rooms.id,
          roomNumber: checkout.rooms.roomNumber,
          roomType: checkout.rooms.roomType,
          roomCategory: checkout.rooms.roomCategory,
          currentStatus: checkout.rooms.status,
        },
        primaryGuest: checkout.guests,
        allGuests: allGuestNames,
        payment: {
          totalAmount: checkout.totalAmount,
          paidAmount: checkout.paidAmount || 0,
          balanceAmount: checkout.balanceAmount || 0,
          isPaid: (checkout.balanceAmount || 0) <= 0,
        },
      };
    });

    // Group by property
    const byProperty = enrichedCheckouts.reduce((acc: any, checkout) => {
      const propId = checkout.property.id;
      if (!acc[propId]) {
        acc[propId] = {
          propertyId: propId,
          propertyName: checkout.property.name,
          city: checkout.property.  city,
          checkouts: [],
        };
      }
      acc[propId].checkouts.push(checkout);
      return acc;
    }, {});

    // Calculate summary
    const summary = {
      totalCheckouts: enrichedCheckouts.length,
      paidCheckouts: enrichedCheckouts.filter((c) => c.payment.isPaid).length,
      unpaidCheckouts: enrichedCheckouts.filter((c) => !c.payment.isPaid).length,
      totalOutstandingAmount: enrichedCheckouts.reduce(
        (sum, c) => sum + c.payment.balanceAmount,
        0
      ),
    };

    return NextResponse.json(
      {
        period: periodLabel,
        dateRange: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
        summary,
        checkouts: enrichedCheckouts,
        byProperty: Object.values(byProperty),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching upcoming checkouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming checkouts" },
      { status: 500 }
    );
  }
}
