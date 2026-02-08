import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get earnings for owner's properties with flexible date filtering
// Query params: 
//   - propertyId (optional): specific property ID, if omitted returns all properties
//   - period (optional): 'last-week', 'last-month', 'this-month', 'this-year', 'custom'
//   - startDate (required if period='custom'): YYYY-MM-DD format
//   - endDate (required if period='custom'): YYYY-MM-DD format
//   - year (optional): specific year, defaults to current year (ignored if period is set)
//   - month (optional): specific month (1-12), if omitted returns all months (ignored if period is set)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const period = searchParams.get("period");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    // Determine date range based on period parameter
    if (period) {
      const now = new Date();
      switch (period) {
        case "last-week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          periodLabel = "Last 7 Days";
          break;

        case "last-month":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          periodLabel = "Last 30 Days";
          break;

        case "this-month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          periodLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });
          break;

        case "this-year":
          startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          periodLabel = `Year ${now.getFullYear()}`;
          break;

        case "custom":
          if (!startDateParam || !endDateParam) {
            return NextResponse.json(
              { error: "startDate and endDate are required for custom period" },
              { status: 400 }
            );
          }
          startDate = new Date(startDateParam);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(endDateParam);
          endDate.setHours(23, 59, 59, 999);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
              { error: "Invalid date format. Use YYYY-MM-DD" },
              { status: 400 }
            );
          }

          if (startDate > endDate) {
            return NextResponse.json(
              { error: "startDate must be before endDate" },
              { status: 400 }
            );
          }

          periodLabel = `${startDateParam} to ${endDateParam}`;
          break;

        default:
          return NextResponse.json(
            { error: "Invalid period. Use: last-week, last-month, this-month, this-year, or custom" },
            { status: 400 }
          );
      }
    } else {
      // Legacy year/month parameters
      const currentYear = new Date().getFullYear();
      const year = yearParam ? parseInt(yearParam) : currentYear;
      const month = monthParam ? parseInt(monthParam) : null;

      // Validate month if provided
      if (month && (month < 1 || month > 12)) {
        return NextResponse.json(
          { error: "Month must be between 1 and 12" },
          { status: 400 }
        );
      }

      startDate = month
        ? new Date(year, month - 1, 1, 0, 0, 0, 0)
        : new Date(year, 0, 1, 0, 0, 0, 0);

      endDate = month
        ? new Date(year, month, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);

      periodLabel = month
        ? new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" })
        : `Year ${year}`;
    }

    // Build where clause for properties
    const propertyWhere: any = { ownerId };
    if (propertyId) {
      propertyWhere.id = propertyId;
    }

    // Verify property ownership if specific property requested
    if (propertyId) {
      const property = await prisma.properties.findFirst({
        where: { id: propertyId, ownerId },
      });

      if (!property) {
        return NextResponse.json(
          { error: "Property not found" },
          { status: 404 }
        );
      }
    }

    // Get all properties matching the criteria
    const properties = await prisma.properties.findMany({
      where: propertyWhere,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
      },
    });

    if (properties.length === 0) {
      return NextResponse.json(
        { error: "No properties found" },
        { status: 404 }
      );
    }

    const propertyIds = properties.map((p) => p.id);

    // Get all payments for the owner's properties in the date range
    const payments = await prisma.payments.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
        occupancies: {
          rooms: {
            propertyId: {
              in: propertyIds,
            },
          },
        },
      },
      include: {
        occupancies: {
          include: {
            rooms: {
              select: {
                propertyId: true,
                roomNumber: true,
                properties: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            guests: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Group payments by property and month
    const earningsData: any = {};

    payments.forEach((payment) => {
      const propertyId = payment.occupancies.rooms.propertyId;
      const propertyName = payment.occupancies.rooms.properties.name;
      const paymentDate = new Date(payment.paymentDate);
      const paymentMonth = paymentDate.getMonth() + 1; // 1-12
      const paymentYear = paymentDate.getFullYear();

      if (!earningsData[propertyId]) {
        earningsData[propertyId] = {
          propertyId,
          propertyName,
          totalEarnings: 0,
          months: {},
        };
      }

      const monthKey = `${paymentYear}-${String(paymentMonth).padStart(2, "0")}`;

      if (!earningsData[propertyId].months[monthKey]) {
        earningsData[propertyId].months[monthKey] = {
          month: paymentMonth,
          year: paymentYear,
          monthName: new Date(paymentYear, paymentMonth - 1).toLocaleString(
            "en-US",
            { month: "long" }
          ),
          totalAmount: 0,
          paymentCount: 0,
          payments: [],
        };
      }

      earningsData[propertyId].totalEarnings += payment.amount;
      earningsData[propertyId].months[monthKey].totalAmount += payment.amount;
      earningsData[propertyId].months[monthKey].paymentCount += 1;
      earningsData[propertyId].months[monthKey].payments.push({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate,
        transactionId: payment.transactionId,
        guest: payment.occupancies.guests,
        roomNumber: payment.occupancies.rooms.roomNumber,
        receivedBy: payment.users?.name || "Unknown",
      });
    });

    // Convert to array and sort months
    const result = Object.values(earningsData).map((property: any) => ({
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      totalEarnings: parseFloat(property.totalEarnings.toFixed(2)),
      monthlyBreakdown: Object.values(property.months).sort(
        (a: any, b: any) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        }
      ),
    }));

    // Calculate grand total across all properties
    const grandTotal = result.reduce(
      (sum, prop) => sum + prop.totalEarnings,
      0
    );

    // Calculate payment methods breakdown
    const paymentMethodsMap: any = {};
    payments.forEach((payment) => {
      const method = payment.paymentMethod || "Unknown";
      if (!paymentMethodsMap[method]) {
        paymentMethodsMap[method] = { amount: 0, count: 0 };
      }
      paymentMethodsMap[method].amount += payment.amount;
      paymentMethodsMap[method].count += 1;
    });

    // Format properties for summary view
    const propertiesWithRevenue = properties.map((property) => {
      const propertyPayments = payments.filter(
        (p) => p.occupancies.rooms.propertyId === property.id
      );
      const revenue = propertyPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: property.id,
        name: property.name,
        city: property.city,
        state: property.state,
        revenue: parseFloat(revenue.toFixed(2)),
        paymentCount: propertyPayments.length,
      };
    });

    return NextResponse.json(
      {
        summary: {
          totalRevenue: parseFloat(grandTotal.toFixed(2)),
          totalPayments: payments.length,
          averagePayment: payments.length > 0 ? parseFloat((grandTotal / payments.length).toFixed(2)) : 0,
          totalProperties: result.length,
          periodLabel,
          paymentMethods: paymentMethodsMap,
        },
        properties: propertiesWithRevenue,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
        detailedProperties: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    );
  }
}
