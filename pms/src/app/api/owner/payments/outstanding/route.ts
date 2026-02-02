import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all occupancies with outstanding payments
// Query params:
//   - propertyId (optional): filter by specific property
//   - overdue (optional): 'true' to show only overdue payments (expectedCheckOut < today)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const overdueOnly = searchParams.get("overdue") === "true";

    // Build where clause
    const where: any = {
      rooms: {
        properties: {
          ownerId,
        },
      },
    };

    if (propertyId) {
      where.rooms.propertyId = propertyId;
    }

    // Get all occupancies
    const occupancies = await prisma.occupancies.findMany({
      where,
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            roomType: true,
            properties: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
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
            address: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
          },
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
      orderBy: {
        checkInTime: "desc",
      },
    });

    // Filter only those with outstanding balance
    let outstandingOccupancies = occupancies.filter(
      (occ) => (occ.balanceAmount || 0) > 0
    );

    // Filter overdue if requested
    if (overdueOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      outstandingOccupancies = outstandingOccupancies.filter((occ) => {
        if (!occ.expectedCheckOut) return false;
        return new Date(occ.expectedCheckOut) < today;
      });
    }

    // Enrich data
    const enrichedData = outstandingOccupancies.map((occ) => {
      const checkIn = new Date(occ.checkInTime);
      const today = new Date();
      const expectedCheckOut = occ.expectedCheckOut
        ? new Date(occ.expectedCheckOut)
        : null;

      const isOverdue =
        expectedCheckOut && expectedCheckOut < today && !occ.actualCheckOut;
      const daysOverdue = isOverdue
        ? Math.floor(
            (today.getTime() - expectedCheckOut.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      const nightsStayed = occ.actualCheckOut
        ? Math.ceil(
            (new Date(occ.actualCheckOut).getTime() - checkIn.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : expectedCheckOut
        ? Math.ceil(
            (expectedCheckOut.getTime() - checkIn.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : Math.ceil(
            (today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
          );

      return {
        occupancyId: occ.id,
        checkInTime: occ.checkInTime,
        expectedCheckOut: occ.expectedCheckOut,
        actualCheckOut: occ.actualCheckOut,
        nightsStayed,
        property: occ.rooms.properties,
        room: {
          id: occ.rooms.id,
          roomNumber: occ.rooms.roomNumber,
          roomType: occ.rooms.roomType,
        },
        guest: occ.guests,
        payment: {
          totalAmount: occ.totalAmount,
          paidAmount: occ.paidAmount || 0,
          balanceAmount: occ.balanceAmount || 0,
          lastPaidDate: occ.lastPaidDate,
          recentPayments: occ.payments.slice(0, 3),
        },
        status: {
          isActive: !occ.actualCheckOut,
          isOverdue,
          daysOverdue,
        },
      };
    });

    // Sort by balance amount descending (highest debt first)
    enrichedData.sort((a, b) => b.payment.balanceAmount - a.payment.balanceAmount);

    // Calculate totals
    const summary = {
      totalOutstanding: enrichedData.reduce(
        (sum, occ) => sum + occ.payment.balanceAmount,
        0
      ),
      totalOccupancies: enrichedData.length,
      overdueCount: enrichedData.filter((occ) => occ.status.isOverdue).length,
      activeCount: enrichedData.filter((occ) => occ.status.isActive).length,
      completedButUnpaid: enrichedData.filter(
        (occ) => !occ.status.isActive && occ.payment.balanceAmount > 0
      ).length,
    };

    return NextResponse.json(
      {
        summary,
        outstandingPayments: enrichedData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching outstanding payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch outstanding payments" },
      { status: 500 }
    );
  }
}
