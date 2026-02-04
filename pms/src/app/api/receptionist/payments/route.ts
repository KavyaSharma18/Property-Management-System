import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// POST: Record new payment for an occupancy
// Body:
//   - occupancyId: Booking ID to pay for
//   - amount: Payment amount
//   - paymentMethod: CASH | CARD | UPI | BANK_TRANSFER | CHEQUE
//   - transactionId (optional): Reference number
//   - notes (optional): Payment notes
// Returns: Updated occupancy with new balance
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();

    const { occupancyId, amount, paymentMethod, transactionId, notes } = body;

    // Validation
    if (!occupancyId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
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

    // Get occupancy details with room to verify property
    const occupancy = await prisma.occupancies.findUnique({
      where: { id: occupancyId },
      select: {
        balanceAmount: true,
        paidAmount: true,
        checkInTime: true,
        actualCheckOut: true,
        roomId: true,
        rooms: {
          select: {
            propertyId: true,
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

    // Check if amount exceeds balance
    const currentBalance = occupancy.balanceAmount || 0;
    if (amount > currentBalance) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${amount}) exceeds balance amount (₹${currentBalance})`,
        },
        { status: 400 }
      );
    }

    // Create payment transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payments.create({
        data: {
          occupancyId,
          amount,
          paymentMethod,
          paymentDate: new Date(),
          paidUpToDate: new Date(),
          transactionId,
          receivedBy: userId,
          notes,
        },
      });

      // Update occupancy payment details
      const newPaidAmount = (occupancy.paidAmount || 0) + amount;
      const newBalanceAmount = currentBalance - amount;

      const updatedOccupancy = await tx.occupancies.update({
        where: { id: occupancyId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          lastPaidDate: new Date(),
        },
        include: {
          rooms: {
            select: {
              id: true,
              roomNumber: true,
              roomType: true,
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
        },
      });

      return { payment, occupancy: updatedOccupancy };
    });

    return NextResponse.json({
      message: "Payment recorded successfully",
      payment: result.payment,
      occupancy: {
        id: result.occupancy.id,
        room: result.occupancy.rooms,
        primaryGuest: result.occupancy.occupancy_guests[0]?.guests || null,
        paidAmount: result.occupancy.paidAmount,
        balanceAmount: result.occupancy.balanceAmount,
        isPaid: result.occupancy.balanceAmount === 0,
      },
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}

// GET: View payment history with filters
// Query params:
//   - startDate (optional): Filter start date (YYYY-MM-DD)
//   - endDate (optional): Filter end date (YYYY-MM-DD)
//   - paymentMethod (optional): Filter by method
//   - limit (optional): Results limit (default 50)
// Returns: Paginated payment list with room and guest details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get filters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentMethod = searchParams.get("paymentMethod");
    const limit = parseInt(searchParams.get("limit") || "100");

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
    const whereConditions: any = {};

    if (startDate && endDate) {
      whereConditions.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (paymentMethod) {
      whereConditions.paymentMethod = paymentMethod;
    }

    // Get payment history
    const payments = await prisma.payments.findMany({
      where: whereConditions,
      include: {
        occupancies: {
          include: {
            rooms: {
              select: {
                id: true,
                roomNumber: true,
                roomType: true,
                propertyId: true,
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
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
      take: limit,
    });

    // Filter by property and enrich payment data
    const enrichedPayments = payments
      .filter((p) => p.occupancies.rooms.propertyId === propertyId)
      .map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        transactionId: payment.transactionId,
        receivedBy: payment.receivedBy,
        occupancy: {
          id: payment.occupancies.id,
          room: payment.occupancies.rooms,
          checkInTime: payment.occupancies.checkInTime,
          primaryGuest: payment.occupancies.occupancy_guests[0]?.guests || null,
        },
      }));

    // Calculate statistics
    const stats = {
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalPayments: payments.length,
      byMethod: payments.reduce((acc: any, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
        return acc;
      }, {}),
    };

    return NextResponse.json({
      payments: enrichedPayments,
      stats,
      filters: {
        startDate,
        endDate,
        paymentMethod,
        limit,
      },
    });
  } catch (error) {
    console.error("Payment history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
