import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get complete payment transaction history
// Query params:
//   - propertyId (optional): filter by specific property
//   - startDate (optional): filter from date (YYYY-MM-DD)
//   - endDate (optional): filter to date (YYYY-MM-DD)
//   - paymentMethod (optional): filter by payment method
//   - limit (optional): number of results, default 100
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentMethod = searchParams.get("paymentMethod");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build where clause
    const where: any = {
      occupancies: {
        rooms: {
          properties: {
            ownerId,
          },
        },
      },
    };

    if (propertyId) {
      where.occupancies.rooms.propertyId = propertyId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const payments = await prisma.payments.findMany({
      where,
      include: {
        occupancies: {
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
              where: {
                isPrimary: true,
              },
              include: {
                guests: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
      take: limit,
    });

    // Enrich payment data
    const enrichedPayments = payments.map((payment) => {
      // Get the primary guest from occupancy_guests or fallback to the main guest
      const primaryGuestData = payment.occupancies.occupancy_guests?.[0]?.guests || payment.occupancies.guests;
      
      return {
        paymentId: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        transactionId: payment.transactionId,
        paidUpToDate: payment.paidUpToDate,
        notes: payment.notes,
        property: payment.occupancies.rooms.properties,
        room: {
          id: payment.occupancies.rooms.id,
          roomNumber: payment.occupancies.rooms.roomNumber,
          roomType: payment.occupancies.rooms.roomType,
        },
        guest: primaryGuestData,
        occupancy: {
          id: payment.occupancies.id,
          checkInTime: payment.occupancies.checkInTime,
          expectedCheckOut: payment.occupancies.expectedCheckOut,
          actualCheckOut: payment.occupancies.actualCheckOut,
          totalAmount: payment.occupancies.totalAmount,
          balanceAmount: payment.occupancies.balanceAmount,
        },
        receivedBy: payment.users,
      };
    });

    // Calculate statistics
    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      byMethod: payments.reduce((acc: any, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.amount;
        return acc;
      }, {}),
      byProperty: enrichedPayments.reduce((acc: any, p) => {
        const propName = p.property.name;
        if (!acc[propName]) {
          acc[propName] = { propertyId: p.property.id, count: 0, total: 0 };
        }
        acc[propName].count++;
        acc[propName].total += p.amount;
        return acc;
      }, {}),
    };

    return NextResponse.json(
      {
        payments: enrichedPayments,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
