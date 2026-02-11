import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: List all group bookings for the receptionist's property
// Query params:
//   - search (optional): Search by group name, contact name, or phone
//   - status (optional): "active" (ongoing), "completed", "upcoming"
// Returns: List of group bookings with occupancy details
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get search and status parameters
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // active, completed, upcoming

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

    // Build where conditions
    const whereConditions: any = {
      propertyId,
    };

    // Apply search filter
    if (search) {
      whereConditions.OR = [
        {
          groupName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          contactName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          contactPhone: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Apply status filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === "active") {
      // Check-in date has passed, but checkout date is in future
      whereConditions.checkInDate = { lte: today };
      whereConditions.checkOutDate = { gte: today };
    } else if (status === "completed") {
      // Checkout date has passed
      whereConditions.checkOutDate = { lt: today };
    } else if (status === "upcoming") {
      // Check-in date is in future
      whereConditions.checkInDate = { gt: today };
    }

    // Get group bookings
    const groupBookings = await prisma.group_bookings.findMany({
      where: whereConditions,
      include: {
        properties: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        occupancies: {
          include: {
            rooms: {
              select: {
                id: true,
                roomNumber: true,
                roomType: true,
                status: true,
              },
            },
            occupancy_guests: {
              where: { isPrimary: true },
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
          },
        },
        _count: {
          select: {
            occupancies: true,
          },
        },
      },
      orderBy: {
        checkInDate: "desc",
      },
    });

    // Enrich data
    const enrichedGroupBookings = groupBookings.map((gb) => {
      const activeRooms = gb.occupancies.filter(
        (occ) => !occ.actualCheckOut
      ).length;
      const completedRooms = gb.occupancies.filter(
        (occ) => occ.actualCheckOut
      ).length;

      const totalAmount = gb.occupancies.reduce(
        (sum, occ) => sum + occ.totalAmount,
        0
      );
      const paidAmount = gb.occupancies.reduce(
        (sum, occ) => sum + (occ.paidAmount || 0),
        0
      );
      const balanceAmount = totalAmount - paidAmount;

      // Determine status
      const now = new Date();
      const checkIn = new Date(gb.checkInDate);
      const checkOut = new Date(gb.checkOutDate);
      let status = "upcoming";
      if (now >= checkOut || completedRooms === gb.totalRooms) {
        status = "completed";
      } else if (now >= checkIn) {
        status = "active";
      }

      const rooms = gb.occupancies.map((occ) => ({
        id: occ.id,
        room: occ.rooms,
        checkInDate: occ.checkInTime,
        expectedCheckOut: occ.expectedCheckOut,
        actualCheckOut: occ.actualCheckOut,
        primaryGuest: occ.occupancy_guests[0]?.guests || null,
        totalAmount: occ.totalAmount,
        paidAmount: occ.paidAmount,
        balanceAmount: occ.balanceAmount,
        corporateBookingId: occ.corporateBookingId,
      }));

      return {
        id: gb.id,
        groupName: gb.groupName,
        totalRooms: gb.totalRooms,
        checkInDate: gb.checkInDate,
        checkOutDate: gb.checkOutDate,
        contactName: gb.contactName,
        contactPhone: gb.contactPhone,
        contactEmail: gb.contactEmail,
        notes: gb.notes,
        createdBy: gb.users,
        createdAt: gb.createdAt,
        property: gb.properties,
        status,
        activeRooms,
        completedRooms,
        bookedRooms: gb._count.occupancies,
        roomsBooked: gb._count.occupancies,
        roomsPending: gb.totalRooms - gb._count.occupancies,
        totalAmount,
        paidAmount,
        balanceAmount,
        rooms,
      };
    });

    return NextResponse.json({
      groupBookings: enrichedGroupBookings,
      total: enrichedGroupBookings.length,
    });
  } catch (error) {
    console.error("Group bookings list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch group bookings" },
      { status: 500 }
    );
  }
}

// POST: Create a new group booking
// Body: groupName, totalRooms, checkInDate, checkOutDate, contactName, contactPhone, contactEmail, notes
// Returns: Created group booking record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();
    const {
      groupName,
      totalRooms,
      checkInDate,
      checkOutDate,
      contactName,
      contactPhone,
      contactEmail,
      notes,
    } = body;

    // Validation
    if (!groupName || !totalRooms || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        {
          error:
            "Group name, total rooms, check-in date, and check-out date are required",
        },
        { status: 400 }
      );
    }

    if (totalRooms < 1) {
      return NextResponse.json(
        { error: "Total rooms must be at least 1" },
        { status: 400 }
      );
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: "Check-out date must be after check-in date" },
        { status: 400 }
      );
    }

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

    // Create group booking
    const groupBooking = await prisma.group_bookings.create({
      data: {
        groupName,
        totalRooms: parseInt(totalRooms),
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        notes: notes || null,
        propertyId: receptionist.propertyId,
        createdBy: userId,
      },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Group booking created successfully",
      groupBooking,
    });
  } catch (error) {
    console.error("Group booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create group booking" },
      { status: 500 }
    );
  }
}
