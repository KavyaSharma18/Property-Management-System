import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: List all corporate bookings for receptionist's property
// Query params:
//   - search (optional): Search by company name or contact person
// Returns: List of corporate bookings with occupancy count
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

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

    if (search) {
      whereConditions.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get corporate bookings
    const corporateBookings = await prisma.corporate_bookings.findMany({
      where: whereConditions,
      include: {
        _count: {
          select: {
            occupancies: true, // Count of bookings under this corporate
          },
        },
        occupancies: {
          where: {
            actualCheckOut: null, // Currently active bookings
          },
          select: {
            id: true,
            checkInTime: true,
            expectedCheckOut: true,
            rooms: {
              select: {
                roomNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      corporateBookings: corporateBookings.map((corp) => ({
        id: corp.id,
        companyName: corp.companyName,
        contactPerson: corp.contactPerson,
        contactPhone: corp.contactPhone,
        contactEmail: corp.contactEmail,
        gstNumber: corp.gstNumber,
        notes: corp.notes,
        createdAt: corp.createdAt,
        totalBookings: corp._count.occupancies,
        activeBookings: corp.occupancies.length,
        currentRooms: corp.occupancies.map((occ) => occ.rooms.roomNumber),
      })),
    });
  } catch (error) {
    console.error("Corporate bookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporate bookings" },
      { status: 500 }
    );
  }
}

// POST: Create new corporate booking account
// Body:
//   - companyName: Company name (required)
//   - contactPerson: Contact person name (required)
//   - contactPhone: Contact phone (required)
//   - contactEmail (optional): Contact email
//   - gstNumber (optional): GST registration number
//   - notes (optional): Additional notes
// Returns: Created corporate booking record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();

    const { companyName, contactPerson, contactPhone, contactEmail, gstNumber, notes } = body;

    // Validation
    if (!companyName || !contactPerson || !contactPhone) {
      return NextResponse.json(
        { error: "Company name, contact person, and phone are required" },
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

    // Create corporate booking
    const corporateBooking = await prisma.corporate_bookings.create({
      data: {
        companyName,
        contactPerson,
        contactPhone,
        contactEmail: contactEmail || null,
        gstNumber: gstNumber || null,
        notes: notes || null,
        propertyId: receptionist.propertyId,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      message: "Corporate booking created successfully",
      corporateBooking,
    });
  } catch (error) {
    console.error("Corporate booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create corporate booking" },
      { status: 500 }
    );
  }
}
