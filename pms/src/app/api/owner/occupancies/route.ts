import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all occupancies for owner's properties with filters
// Query params:
//   - propertyId (optional): filter by specific property
//   - status (optional): 'active' (not checked out), 'completed' (checked out), 'all'
//   - startDate (optional): filter by check-in date from
//   - endDate (optional): filter by check-in date to
//   - paymentStatus (optional): 'paid' (balance=0), 'pending' (balance>0), 'all'
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentStatus = searchParams.get("paymentStatus") || "all";

    // Build where clause
    const where: any = {
      rooms: {
        properties: {
          ownerId,
        },
      },
    };

    // Filter by property
    if (propertyId) {
      where.rooms.propertyId = propertyId;
    }

    // Filter by occupancy status
    if (status === "active") {
      where.actualCheckOut = null;
    } else if (status === "completed") {
      where.actualCheckOut = { not: null };
    }

    // Filter by check-in date range
    if (startDate || endDate) {
      where.checkInTime = {};
      if (startDate) {
        where.checkInTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.checkInTime.lte = new Date(endDate);
      }
    }

    const occupancies = await prisma.occupancies.findMany({
      where,
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            roomType: true,
            roomCategory: true,
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
          include: {
            guests: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        group_bookings: {
          select: {
            id: true,
            groupName: true,
            totalRooms: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            paymentDate: true,
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

    // Filter by payment status
    let filteredOccupancies = occupancies;
    if (paymentStatus === "paid") {
      filteredOccupancies = occupancies.filter(
        (occ) => (occ.balanceAmount || 0) <= 0
      );
    } else if (paymentStatus === "pending") {
      filteredOccupancies = occupancies.filter(
        (occ) => (occ.balanceAmount || 0) > 0
      );
    }

    // Calculate nights stayed and enrich data
    const enrichedOccupancies = filteredOccupancies.map((occ) => {
      const checkIn = new Date(occ.checkInTime);
      const checkOut = occ.actualCheckOut
        ? new Date(occ.actualCheckOut)
        : occ.expectedCheckOut
        ? new Date(occ.expectedCheckOut)
        : new Date();

      const nightsStayed = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...occ,
        property: occ.rooms.properties,
        room: {
          id: occ.rooms.id,
          roomNumber: occ.rooms.roomNumber,
          roomType: occ.rooms.roomType,
          roomCategory: occ.rooms.roomCategory,
        },
        primaryGuest: occ.guests,
        allGuests: [
          occ.guests,
          ...occ.occupancy_guests.map((og) => og.guests),
        ],
        checkedInBy: occ.users,
        groupBooking: occ.group_bookings,
        nightsStayed,
        paymentSummary: {
          totalAmount: occ.totalAmount,
          paidAmount: occ.paidAmount || 0,
          balanceAmount: occ.balanceAmount || 0,
          isPaid: (occ.balanceAmount || 0) <= 0,
          lastPaymentDate: occ.payments[0]?.paymentDate || null,
          paymentCount: occ.payments.length,
        },
        rooms: undefined,
        guests: undefined,
        occupancy_guests: undefined,
        users: undefined,
        group_bookings: undefined,
      };
    });

    // Calculate statistics
    const stats = {
      total: enrichedOccupancies.length,
      active: enrichedOccupancies.filter((occ) => !occ.actualCheckOut).length,
      completed: enrichedOccupancies.filter((occ) => occ.actualCheckOut).length,
      totalRevenue: enrichedOccupancies.reduce(
        (sum, occ) => sum + (occ.paidAmount || 0),
        0
      ),
      pendingAmount: enrichedOccupancies.reduce(
        (sum, occ) => sum + (occ.balanceAmount || 0),
        0
      ),
    };

    return NextResponse.json(
      {
        occupancies: enrichedOccupancies,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching occupancies:", error);
    return NextResponse.json(
      { error: "Failed to fetch occupancies" },
      { status: 500 }
    );
  }
}
