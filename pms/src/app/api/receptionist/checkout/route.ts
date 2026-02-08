import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// POST: Complete guest checkout
// Body: { occupancyId: string }
// Business rule: Requires full payment (balance must be zero)
// Returns: Checkout summary with stay duration, final payment breakdown, room marked DIRTY
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();

    const { occupancyId } = body;

    if (!occupancyId) {
      return NextResponse.json(
        { error: "Occupancy ID is required" },
        { status: 400 }
      );
    }

    // Get receptionist's assigned property
    const receptionist = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        role: true,
        propertyId: true,
        name: true,
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

    // Get occupancy details
    const occupancy = await prisma.occupancies.findUnique({
      where: { id: occupancyId },
      include: {
        rooms: true,
        occupancy_guests: {
          include: {
            guests: true,
          },
        },
      },
    });

    if (!occupancy) {
      return NextResponse.json(
        { error: "Occupancy not found" },
        { status: 404 }
      );
    }

    // Verify occupancy belongs to receptionist's property
    if (occupancy.rooms.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Occupancy does not belong to your property" },
        { status: 403 }
      );
    }

    // Check if already checked out
    if (occupancy.actualCheckOut) {
      return NextResponse.json(
        { error: "Occupancy already checked out" },
        { status: 400 }
      );
    }

    // Calculate payment for actual days stayed (up to today)
    const checkInTime = new Date(occupancy.checkInTime);
    const today = new Date();
    let actualNightsStayed = Math.ceil(
      (today.getTime() - checkInTime.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (actualNightsStayed < 1) actualNightsStayed = 1;

    // Calculate the actual amount to be paid for days stayed
    const roomRate = occupancy.actualRoomRate || 0;
    const calculatedTotalAmount = roomRate * actualNightsStayed;
    const paidAmount = occupancy.paidAmount || 0;
    const calculatedBalance = calculatedTotalAmount - paidAmount;

    // Check if payment is complete for days actually stayed
    if (calculatedBalance > 0) {
      return NextResponse.json(
        {
          error: `Cannot checkout. Balance amount pending for ${actualNightsStayed} night(s): ₹${calculatedBalance.toFixed(2)}`,
          balanceAmount: calculatedBalance,
          nightsStayed: actualNightsStayed,
          totalAmount: calculatedTotalAmount,
          paidAmount: paidAmount,
        },
        { status: 400 }
      );
    }

    // Perform checkout
    const result = await prisma.$transaction(async (tx) => {
      // Update occupancy with checkout date and recalculated amounts
      const updatedOccupancy = await tx.occupancies.update({
        where: { id: occupancyId },
        data: {
          actualCheckOut: today,
          expectedCheckOut: today,
          totalAmount: calculatedTotalAmount,
          balanceAmount: calculatedBalance,
        },
        include: {
          rooms: true,
          occupancy_guests: {
            include: {
              guests: true,
            },
          },
          payments: true,
        },
      });

      // Update room status to DIRTY (needs cleaning)
      await tx.rooms.update({
        where: { id: occupancy.roomId },
        data: {
          status: "DIRTY",
        },
      });

      return updatedOccupancy;
    });

    // Calculate final statistics
    const checkIn = new Date(result.checkInTime);
    const checkOut = new Date(result.actualCheckOut!);
    const nightsStayed = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      message: "Checkout successful. Room marked as DIRTY for cleaning.",
      occupancy: {
        ...result,
        nightsStayed,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to complete checkout" },
      { status: 500 }
    );
  }
}
