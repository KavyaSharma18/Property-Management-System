import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// POST: Complete guest check-in workflow
// Body:
//   - roomId: Room to check into
//   - guests: Array with guest details (name, email, phone, idProof, idNumber, isPrimary)
//   - checkInTime: Check-in timestamp
//   - expectedCheckOut: Expected checkout date
//   - numberOfOccupants: Number of people staying
//   - actualRoomRate: Room rate per night
//   - advancePayment (optional): Initial payment amount
//   - paymentMethod: CASH | CARD | UPI | BANK_TRANSFER | CHEQUE
// Returns: Complete occupancy record with payment details
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();

    const {
      roomId,
      checkInTime,
      expectedCheckOut,
      actualRoomRate,
      actualCapacity,
      guests, // Array of guest objects with guest details
      initialPayment, // { amount, paymentMethod, transactionId }
      groupBookingId, // Optional
      bookingSource, // Optional: Source of booking (WALK_IN, CORPORATE, etc.)
      corporateBookingId, // Optional: Link to corporate booking
    } = body;

    // Validation
    if (!roomId || !checkInTime || !actualRoomRate || !guests || guests.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify room belongs to receptionist's property and is available
    const room = await prisma.rooms.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        propertyId: true,
        status: true,
        roomNumber: true,
        capacity: true,
        pricePerNight: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Room does not belong to your property" },
        { status: 403 }
      );
    }

    if (room.status !== "VACANT" && room.status !== "RESERVED") {
      return NextResponse.json(
        { error: `Room is ${room.status}, cannot check in` },
        { status: 400 }
      );
    }

    // Validate dates
    const checkIn = new Date(checkInTime);
    if (expectedCheckOut) {
      const checkOut = new Date(expectedCheckOut);
      
      // Check-out must be after check-in
      if (checkOut <= checkIn) {
        return NextResponse.json(
          { error: "Expected checkout date must be after check-in date" },
          { status: 400 }
        );
      }

      // Validate reasonable checkout date (not more than 1 year in future)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (checkOut > oneYearFromNow) {
        return NextResponse.json(
          { error: "Expected checkout date cannot be more than 1 year in the future" },
          { status: 400 }
        );
      }
    }

    // Calculate total amount
    let nights = 1;
    if (expectedCheckOut) {
      const checkOut = new Date(expectedCheckOut);
      nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (nights < 1) nights = 1;
    }

    const totalAmount = actualRoomRate * nights;
    const paidAmount = initialPayment?.amount || 0;
    const balanceAmount = totalAmount - paidAmount;

    // Create check-in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or find guests
      const createdGuests = [];
      for (const guestData of guests) {
        let guest;

        // Check if guest already exists by email or phone
        if (guestData.email) {
          guest = await tx.guests.findFirst({
            where: { email: guestData.email },
          });
        }

        if (!guest && guestData.phone) {
          guest = await tx.guests.findFirst({
            where: { phone: guestData.phone },
          });
        }

        // Create new guest if not found
        if (!guest) {
          guest = await tx.guests.create({
            data: {
              name: guestData.name,
              email: guestData.email,
              phone: guestData.phone,
              alternatePhone: guestData.alternatePhone,
              idProofType: guestData.idProofType,
              otherIdProof: guestData.otherIdProof, // Custom ID proof if OTHER is selected
              idProofNumber: guestData.idProofNumber,
              idProofImage: guestData.idProofImage,
              address: guestData.address,
              city: guestData.city,
              state: guestData.state,
              country: guestData.country,
              nationality: guestData.nationality,
              dateOfBirth: guestData.dateOfBirth
                ? new Date(guestData.dateOfBirth)
                : null,
              gender: guestData.gender,
              emergencyContact: guestData.emergencyContact,
              emergencyPhone: guestData.emergencyPhone,
              notes: guestData.notes,
            },
          });
        }

        createdGuests.push({
          guest,
          isPrimary: guestData.isPrimary || createdGuests.length === 0,
        });
      }

      // Create occupancy
      const occupancy = await tx.occupancies.create({
        data: {
          roomId: roomId,
          guestId: createdGuests[0].guest.id, // Primary guest
          checkedInBy: userId,
          checkInTime: new Date(checkInTime),
          expectedCheckOut: expectedCheckOut
            ? new Date(expectedCheckOut)
            : null,
          actualRoomRate,
          numberOfOccupants: createdGuests.length,
          actualCapacity: actualCapacity || createdGuests.length,
          totalAmount,
          paidAmount,
          balanceAmount,
          lastPaidDate: paidAmount > 0 ? new Date() : null,
          groupBookingId: groupBookingId || null,
          bookingSource: bookingSource || "WALK_IN", // Default to WALK_IN
          corporateBookingId: corporateBookingId || null, // Link to corporate if provided
        },
      });

      // Link guests to occupancy
      await tx.occupancy_guests.createMany({
        data: createdGuests.map((g) => ({
          occupancyId: occupancy.id,
          guestId: g.guest.id,
          isPrimary: g.isPrimary,
        })),
      });

      // Create initial payment if provided
      if (paidAmount > 0 && initialPayment) {
        await tx.payments.create({
          data: {
            occupancyId: occupancy.id,
            amount: paidAmount,
            paymentMethod: initialPayment.paymentMethod || "CASH",
            paymentDate: new Date(),
            paidUpToDate: new Date(checkInTime),
            transactionId: initialPayment.transactionId,
            receivedBy: userId,
          },
        });
      }

      // Update room status to OCCUPIED
      await tx.rooms.update({
        where: { id: roomId },
        data: { status: "OCCUPIED" },
      });

      return { occupancy, guests: createdGuests };
    });

    // Fetch complete occupancy data
    const completeOccupancy = await prisma.occupancies.findUnique({
      where: { id: result.occupancy.id },
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
      message: "Check-in successful",
      occupancy: completeOccupancy,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: "Failed to complete check-in" },
      { status: 500 }
    );
  }
}
