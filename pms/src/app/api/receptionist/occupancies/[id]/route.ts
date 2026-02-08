import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: View complete occupancy details
// Params: id - Occupancy ID
// Returns: Full occupancy info with room, guests, payments, and calculated stats
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: occupancyId } = await params;

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

    // Get occupancy details
    const occupancy = await prisma.occupancies.findUnique({
      where: { id: occupancyId },
      include: {
        rooms: {
          include: {
            floors: true,
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
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

    // Calculate nights stayed
    const checkIn = new Date(occupancy.checkInTime);
    const endDate = occupancy.actualCheckOut
      ? new Date(occupancy.actualCheckOut)
      : new Date();
    const nightsStayed = Math.ceil(
      (endDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      occupancy: {
        ...occupancy,
        nightsStayed,
        isPaid: occupancy.balanceAmount === 0,
        isActive: !occupancy.actualCheckOut,
        bookingSource: occupancy.bookingSource,
        corporateBookingId: occupancy.corporateBookingId,
      },
    });
  } catch (error) {
    console.error("Occupancy details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch occupancy details" },
      { status: 500 }
    );
  }
}

// PUT: Update occupancy details
// Params: id - Occupancy ID
// Body:
//   - expectedCheckOut (optional): New checkout date
//   - actualRoomRate (optional): Adjusted room rate (auto-recalculates total)
//   - actualCapacity (optional): Updated guest count
// Returns: Updated occupancy record
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: occupancyId } = await params;
    const body = await req.json();

    const { expectedCheckOut, actualRoomRate, actualCapacity } = body;

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

    // Verify occupancy belongs to receptionist's property
    const occupancy = await prisma.occupancies.findUnique({
      where: { id: occupancyId },
      select: {
        roomId: true,
        actualCheckOut: true,
        checkInTime: true,
        paidAmount: true,
        actualRoomRate: true,
        expectedCheckOut: true,
      },
    });

    if (!occupancy) {
      return NextResponse.json(
        { error: "Occupancy not found" },
        { status: 404 }
      );
    }

    // Get room to check property
    const room = await prisma.rooms.findUnique({
      where: { id: occupancy.roomId },
      select: { propertyId: true },
    });

    if (room?.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Occupancy does not belong to your property" },
        { status: 403 }
      );
    }

    if (occupancy.actualCheckOut) {
      return NextResponse.json(
        { error: "Cannot update completed occupancy" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (expectedCheckOut !== undefined) {
      if (expectedCheckOut) {
        const checkOutDate = new Date(expectedCheckOut);
        const checkInDate = new Date(occupancy.checkInTime);

        // Validate checkout is after check-in
        if (checkOutDate <= checkInDate) {
          return NextResponse.json(
            { error: "Expected checkout date must be after check-in date" },
            { status: 400 }
          );
        }

        // Validate reasonable checkout date (not more than 1 year from check-in)
        const oneYearFromCheckIn = new Date(checkInDate);
        oneYearFromCheckIn.setFullYear(oneYearFromCheckIn.getFullYear() + 1);
        if (checkOutDate > oneYearFromCheckIn) {
          return NextResponse.json(
            { error: "Expected checkout date cannot be more than 1 year from check-in" },
            { status: 400 }
          );
        }

        updateData.expectedCheckOut = checkOutDate;
        
        // Recalculate total amount based on new checkout date
        const checkIn = new Date(occupancy.checkInTime);
        let nights = Math.ceil(
          (checkOutDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (nights < 1) nights = 1;

        // Get the current room rate from the occupancy
        const roomRate = actualRoomRate !== undefined ? actualRoomRate : (occupancy.actualRoomRate || 0);
        
        if (roomRate > 0) {
          const newTotalAmount = roomRate * nights;
          updateData.totalAmount = newTotalAmount;
          updateData.balanceAmount = newTotalAmount - (occupancy.paidAmount || 0);
        }
      } else {
        updateData.expectedCheckOut = null;
      }
    }

    if (actualRoomRate !== undefined) {
      updateData.actualRoomRate = actualRoomRate;

      // Recalculate total amount
      let nights = 1;
      const checkIn = new Date(occupancy.checkInTime);
      const checkOut = expectedCheckOut
        ? new Date(expectedCheckOut)
        : occupancy.expectedCheckOut || new Date();

      nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (nights < 1) nights = 1;

      const newTotalAmount = actualRoomRate * nights;

      updateData.totalAmount = newTotalAmount;
      updateData.balanceAmount = newTotalAmount - (occupancy.paidAmount || 0);
    }

    if (actualCapacity !== undefined) {
      updateData.actualCapacity = actualCapacity;
    }

    // Update occupancy
    const updatedOccupancy = await prisma.occupancies.update({
      where: { id: occupancyId },
      data: updateData,
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

    return NextResponse.json({
      message: "Occupancy updated successfully",
      occupancy: updatedOccupancy,
    });
  } catch (error) {
    console.error("Occupancy update error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { 
        error: "Failed to update occupancy",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
