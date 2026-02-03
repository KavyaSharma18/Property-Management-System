import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Track all outstanding payments and overdue accounts
// Returns:
//   - Active occupancies with pending balance (sorted by amount, highest first)
//   - Overdue flag (no payment in 3+ days)
//   - Days since last payment
//   - Summary: total pending, overdue count, total overdue amount
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

    const propertyId = receptionist.propertyId;

    // Get all active occupancies with pending payments via rooms
    const rooms = await prisma.rooms.findMany({
      where: { propertyId },
      include: {
        occupancies: {
          where: {
            actualCheckOut: null,
            balanceAmount: {
              gt: 0,
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
              where: {
                isPrimary: true,
              },
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
            payments: {
              orderBy: {
                paymentDate: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    const pendingOccupancies = rooms.flatMap((room) => room.occupancies).sort((a, b) => (b.balanceAmount || 0) - (a.balanceAmount || 0));

    // Enrich data with calculations
    const enrichedData = pendingOccupancies.map((occ) => {
      const checkIn = new Date(occ.checkInTime);
      const today = new Date();
      const nightsStayed = Math.ceil(
        (today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate days since last payment
      let daysSinceLastPayment = 0;
      if (occ.lastPaidDate) {
        const lastPaid = new Date(occ.lastPaidDate);
        daysSinceLastPayment = Math.ceil(
          (today.getTime() - lastPaid.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Check if overdue (more than 3 days since last payment)
      const isOverdue = daysSinceLastPayment > 3;

      const primaryGuest = occ.occupancy_guests[0]?.guests || null;

      return {
        occupancyId: occ.id,
        room: occ.rooms,
        checkInTime: occ.checkInTime,
        expectedCheckOut: occ.expectedCheckOut,
        nightsStayed,
        totalAmount: occ.totalAmount,
        paidAmount: occ.paidAmount || 0,
        balanceAmount: occ.balanceAmount || 0,
        lastPaidDate: occ.lastPaidDate,
        daysSinceLastPayment,
        isOverdue,
        primaryGuest,
        lastPayment: occ.payments[0] || null,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalPending: enrichedData.reduce((sum, occ) => sum + (occ.balanceAmount || 0), 0),
      totalOccupancies: enrichedData.length,
      overdueCount: enrichedData.filter((occ) => occ.isOverdue).length,
      totalOverdue: enrichedData
        .filter((occ) => occ.isOverdue)
        .reduce((sum, occ) => sum + (occ.balanceAmount || 0), 0),
    };

    return NextResponse.json({
      summary,
      pendingPayments: enrichedData,
    });
  } catch (error) {
    console.error("Pending payments fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending payments" },
      { status: 500 }
    );
  }
}
