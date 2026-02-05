import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Search guest database
// Query params:
//   - search (optional): Search by name, email, or phone (partial match, case-insensitive)
// Returns: Guest list with stay history, total spending, current stay status, visit count
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(req.url);

    // Get search parameter
    const search = searchParams.get("search");

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

    // Build search conditions
    const whereConditions: any = {};

    if (search) {
      whereConditions.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Get all guests who have stayed at this property via occupancy_guests
    const guests = await prisma.guests.findMany({
      where: whereConditions,
      include: {
        occupancy_guests: {
          include: {
            occupancies: {
              include: {
                rooms: {
                  select: {
                    roomNumber: true,
                    roomType: true,
                    propertyId: true,
                  },
                },
                payments: true,
              },
            },
          },
        },
      },
    });

    // Filter guests who have stayed at this property
    const filteredGuests = guests.filter(
      (guest) => guest.occupancy_guests.some((og) => og.occupancies.rooms?.propertyId === propertyId)
    );

    // Enrich guest data with stay history
    const enrichedGuests = filteredGuests.map((guest) => {
      const occupancies = guest.occupancy_guests
        .map((og) => og.occupancies)
        .filter((occ) => occ.rooms?.propertyId === propertyId);

      const totalStays = occupancies.length;
      const totalSpent = occupancies.reduce((sum: number, occ: any) => sum + (occ.paidAmount || 0), 0);

      // Get recent stays
      const recentStays = occupancies
        .sort(
          (a: any, b: any) =>
            new Date(b.checkInTime).getTime() -
            new Date(a.checkInTime).getTime()
        )
        .slice(0, 5)
        .map((occ: any) => ({
          occupancyId: occ.id,
          room: occ.rooms,
          checkInTime: occ.checkInTime,
          actualCheckOut: occ.actualCheckOut,
          totalAmount: occ.totalAmount,
          paidAmount: occ.paidAmount || 0,
        }));

      // Check if currently staying
      const currentStay = occupancies.find((occ: any) => !occ.actualCheckOut);

      // Calculate age if dateOfBirth exists
      let age = null;
      if (guest.dateOfBirth) {
        const birthDate = new Date(guest.dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        alternatePhone: guest.alternatePhone,
        idProofType: guest.idProofType,
        idProofNumber: guest.idProofNumber,
        address: guest.address,
        city: guest.city,
        state: guest.state,
        country: guest.country,
        nationality: guest.nationality,
        dateOfBirth: guest.dateOfBirth,
        age: age,
        gender: guest.gender,
        emergencyContact: guest.emergencyContact,
        emergencyPhone: guest.emergencyPhone,
        totalStays,
        totalSpent,
        isCurrentlyStaying: !!currentStay,
        currentStay: currentStay
          ? {
              occupancyId: currentStay.id,
              room: currentStay.rooms,
              checkInTime: currentStay.checkInTime,
              balanceAmount: currentStay.balanceAmount,
            }
          : null,
        recentStays,
      };
    });

    // Sort by total spent (best customers first)
    enrichedGuests.sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({
      guests: enrichedGuests,
      total: enrichedGuests.length,
      search,
    });
  } catch (error) {
    console.error("Guests fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch guests" },
      { status: 500 }
    );
  }
}

// POST: Add new guest to database
// Body:
//   - name: Guest full name (required)
//   - phone: Phone number (required)
//   - email (optional): Email address
//   - idProof (optional): Type of ID (AADHAAR, PASSPORT, DRIVER_LICENSE, VOTER_ID, PAN)
//   - idNumber (optional): ID proof number
//   - address, city, state (optional): Contact details
// Returns: Created guest record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
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

    // Check if guest already exists
    let existingGuest = null;
    if (body.email) {
      existingGuest = await prisma.guests.findFirst({
        where: { email: body.email },
      });
    }

    if (!existingGuest && body.phone) {
      existingGuest = await prisma.guests.findFirst({
        where: { phone: body.phone },
      });
    }

    if (existingGuest) {
      return NextResponse.json(
        {
          error: "Guest already exists",
          guest: existingGuest,
        },
        { status: 409 }
      );
    }

    // Create new guest
    const guest = await prisma.guests.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        idProofType: body.idProofType,
        otherIdProof: body.otherIdProof, // Custom ID proof if OTHER is selected
        idProofNumber: body.idProofNumber,
        idProofImage: body.idProofImage,
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country,
        nationality: body.nationality,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        notes: body.notes,
      },
    });

    return NextResponse.json({
      message: "Guest created successfully",
      guest,
    });
  } catch (error) {
    console.error("Guest creation error:", error);
    return NextResponse.json(
      { error: "Failed to create guest" },
      { status: 500 }
    );
  }
}
