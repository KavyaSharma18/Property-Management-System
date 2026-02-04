import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Financial reporting and revenue analysis
// Query params:
//   - startDate (optional): Report start date, defaults to first day of current month (YYYY-MM-DD)
//   - endDate (optional): Report end date, defaults to today (YYYY-MM-DD)
// Returns:
//   - Total revenue and transaction count
//   - Breakdown by payment method
//   - Daily and monthly revenue breakdowns
//   - Recent payment transactions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get period parameter
    const period = searchParams.get("period") || "this-month";
    const customStartDate = searchParams.get("startDate");
    const customEndDate = searchParams.get("endDate");

    // Get receptionist's assigned property
    const receptionist = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        role: true,
        propertyId: true,
        properties_properties_receptionistIdTousers: {
          select: {
            id: true,
            name: true,
          },
        },
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
    let startDate: Date;
    let endDate: Date = new Date();
    let periodLabel = "";

    switch (period) {
      case "last-week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        periodLabel = "Last Week";
        break;

      case "last-month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        periodLabel = "Last Month";
        break;

      case "this-month":
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        periodLabel = "This Month";
        break;

      case "this-year":
        startDate = new Date();
        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        periodLabel = "This Year";
        break;

      case "custom":
        if (!customStartDate || !customEndDate) {
          return NextResponse.json(
            {
              error:
                "Start date and end date are required for custom period",
            },
            { status: 400 }
          );
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        periodLabel = "Custom Period";
        break;

      default:
        startDate = new Date();
        startDate.setDate(1);
        periodLabel = "This Month";
    }

    // Get all payments in the date range
    const payments = await prisma.payments.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        occupancies: {
          select: {
            id: true,
            checkInTime: true,
            actualCheckOut: true,
            rooms: {
              select: {
                roomNumber: true,
                roomType: true,
                propertyId: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Filter by property
    const filteredPayments = payments.filter(
      (p) => p.occupancies.rooms.propertyId === propertyId
    );

    // Calculate total earnings
    const totalEarnings = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    // Group by payment method
    const byPaymentMethod = filteredPayments.reduce((acc: any, p) => {
      const method = p.paymentMethod;
      if (!acc[method]) {
        acc[method] = {
          method,
          totalAmount: 0,
          count: 0,
        };
      }
      acc[method].totalAmount += p.amount;
      acc[method].count += 1;
      return acc;
    }, {});

    // Group by date (daily breakdown)
    const dailyBreakdown = filteredPayments.reduce((acc: any, p) => {
      const date = p.paymentDate.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          totalAmount: 0,
          count: 0,
        };
      }
      acc[date].totalAmount += p.amount;
      acc[date].count += 1;
      return acc;
    }, {});

    // Group by month (for yearly view)
    const monthlyBreakdown = filteredPayments.reduce((acc: any, p) => {
      const month = new Date(p.paymentDate).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
      });
      if (!acc[month]) {
        acc[month] = {
          month,
          totalAmount: 0,
          count: 0,
        };
      }
      acc[month].totalAmount += p.amount;
      acc[month].count += 1;
      return acc;
    }, {});

    return NextResponse.json({
      period: periodLabel,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      property: receptionist.properties_properties_receptionistIdTousers,
      totalEarnings,
      totalTransactions: filteredPayments.length,
      byPaymentMethod: Object.values(byPaymentMethod),
      dailyBreakdown: Object.values(dailyBreakdown).sort(
        (a: any, b: any) => a.date.localeCompare(b.date)
      ),
      monthlyBreakdown: Object.values(monthlyBreakdown),
      recentPayments: filteredPayments.slice(0, 10).map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        transactionId: p.transactionId,
        receivedBy: p.receivedBy,
        room: p.occupancies.rooms,
      })),
    });
  } catch (error) {
    console.error("Earnings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
