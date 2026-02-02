import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all guests who stayed in owner's properties
// Query params:
//   - search (optional): search by name, phone, or email
//   - propertyId (optional): filter by specific property
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
 
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const propertyId = searchParams.get("propertyId");

    // Build where clause for occupancies
    const occupancyWhere: any = {
      rooms: {
        properties: {
          ownerId,
        },
      },
    };

    if (propertyId) {
      occupancyWhere.rooms.propertyId = propertyId;
    }

    // Get all occupancies for owner's properties
    const occupancies = await prisma.occupancies.findMany({
      where: occupancyWhere,
      include: {
        guests: true,
        rooms: {
          select: {
            properties: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Get unique guests with their stats
    const guestMap = new Map();

    occupancies.forEach((occ) => {
      const guestId = occ.guests.id;
      if (!guestMap.has(guestId)) {
        guestMap.set(guestId, {
          ...occ.guests,
          stays: [],
          totalStays: 0,
          totalSpent: 0,
          properties: new Set(),
        });
      }

      const guestData = guestMap.get(guestId);
      guestData.stays.push({
        occupancyId: occ.id,
        checkInTime: occ.checkInTime,
        actualCheckOut: occ.actualCheckOut,
        property: occ.rooms.properties.name,
        amountPaid: occ.paidAmount || 0,
        balance: occ.balanceAmount || 0,
      });
      guestData.totalStays++;
      guestData.totalSpent += occ.paidAmount || 0;
      guestData.properties.add(occ.rooms.properties.name);
    });

    // Convert to array and format
    let guests = Array.from(guestMap.values()).map((guest) => ({
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      alternatePhone: guest.alternatePhone,
      address: guest.address,
      city: guest.city,
      state: guest.state,
      country: guest.country,
      nationality: guest.nationality,
      idProofType: guest.idProofType,
      idProofNumber: guest.idProofNumber,
      dateOfBirth: guest.dateOfBirth,
      gender: guest.gender,
      emergencyContact: guest.emergencyContact,
      emergencyPhone: guest.emergencyPhone,
      notes: guest.notes,
      statistics: {
        totalStays: guest.totalStays,
        totalSpent: parseFloat(guest.totalSpent.toFixed(2)),
        propertiesVisited: Array.from(guest.properties),
        lastStayDate: guest.stays.sort(
          (a: any, b: any) =>
            new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
        )[0]?.checkInTime,
      },
      recentStays: guest.stays
        .sort(
          (a: any, b: any) =>
            new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
        )
        .slice(0, 5),
    }));

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      guests = guests.filter(
        (guest) =>
          guest.name.toLowerCase().includes(searchLower) ||
          guest.phone.includes(search) ||
          guest.email?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by total spent (best customers first)
    guests.sort((a, b) => b.statistics.totalSpent - a.statistics.totalSpent);

    return NextResponse.json(
      {
        guests,
        totalGuests: guests.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json(
      { error: "Failed to fetch guests" },
      { status: 500 }
    );
  }
}
