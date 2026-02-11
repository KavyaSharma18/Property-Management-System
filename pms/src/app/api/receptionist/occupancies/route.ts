import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: List all occupancies with filtering
// Query params:
//   - status (optional): 'active' (current stays) or 'completed' (checked out)
//   - paymentStatus (optional): 'paid' or 'pending'
// Returns: Occupancy list with room, guest, payment details, and nights stayed
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get filters
    const status = searchParams.get("status"); // active, completed, all
    const paymentStatus = searchParams.get("paymentStatus"); // paid, pending, all

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
      rooms: {
        propertyId: propertyId,
      },
    };

    // Status filter
    if (status === "active") {
      whereConditions.actualCheckOut = null;
    } else if (status === "completed") {
      whereConditions.actualCheckOut = { not: null };
    }

    // Get occupancies
    let occupancies = await prisma.occupancies.findMany({
      where: whereConditions,
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
      orderBy: {
        checkInTime: "desc",
      },
    });

    // Apply payment status filter
    if (paymentStatus === "paid") {
      occupancies = occupancies.filter((occ) => (occ.balanceAmount || 0) === 0);
    } else if (paymentStatus === "pending") {
      occupancies = occupancies.filter((occ) => (occ.balanceAmount || 0) > 0);
    }

    // Enrich occupancy data
    const enrichedOccupancies = occupancies.map((occ) => {
      const checkIn = new Date(occ.checkInTime);
      const today = new Date();
      const nightsStayed = Math.ceil(
        (today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      const primaryGuest = occ.occupancy_guests.find((og: any) => og.isPrimary);

      // Recalculate total amount based on expected checkout (if still active)
      let recalculatedTotal = occ.totalAmount;
      let recalculatedBalance = occ.balanceAmount || 0;
      
      if (!occ.actualCheckOut && occ.expectedCheckOut) {
        // For active bookings, calculate based on check-in to expected checkout
        const expectedCheckOutDate = new Date(occ.expectedCheckOut);
        const nightsBooked = Math.max(1, Math.ceil(
          (expectedCheckOutDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        ));
        recalculatedTotal = nightsBooked * occ.actualRoomRate;
        recalculatedBalance = Math.max(0, recalculatedTotal - (occ.paidAmount || 0));
      }

      return {
        id: occ.id,
        room: occ.rooms,
        checkInDate: occ.checkInTime,
        expectedCheckOut: occ.expectedCheckOut,
        actualCheckOut: occ.actualCheckOut,
        actualRoomRate: occ.actualRoomRate,
        actualCapacity: occ.actualCapacity,
        totalAmount: recalculatedTotal,
        paidAmount: occ.paidAmount || 0,
        balanceAmount: recalculatedBalance,
        lastPaidDate: occ.lastPaidDate,
        bookingSource: occ.bookingSource, // How the booking was made
        corporateBookingId: occ.corporateBookingId, // Link to corporate booking if applicable
        nightsStayed: occ.actualCheckOut ? null : nightsStayed,
        isActive: !occ.actualCheckOut,
        isPaid: (occ.balanceAmount || 0) === 0,
        primaryGuest: primaryGuest ? primaryGuest.guests : null,
        numberOfOccupants: occ.numberOfOccupants,
        guestCount: occ.occupancy_guests.length,
        guests: occ.occupancy_guests.map((og: any) => ({
          ...og.guests,
          isPrimary: og.isPrimary,
        })),
        paymentCount: occ.payments.length,
        lastPayment: occ.payments[0] || null,
      };
    });

    // Calculate statistics
    const stats = {
      total: enrichedOccupancies.length,
      active: enrichedOccupancies.filter((o) => o.isActive).length,
      completed: enrichedOccupancies.filter((o) => !o.isActive).length,
      totalRevenue: enrichedOccupancies.reduce(
        (sum, o) => sum + o.paidAmount,
        0
      ),
      pendingAmount: enrichedOccupancies.reduce(
        (sum, o) => sum + o.balanceAmount,
        0
      ),
    };

    return NextResponse.json({
      occupancies: enrichedOccupancies,
      stats,
      filters: {
        status,
        paymentStatus,
      },
    });
  } catch (error) {
    console.error("Occupancies fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch occupancies" },
      { status: 500 }
    );
  }
}
