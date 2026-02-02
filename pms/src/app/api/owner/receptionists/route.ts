import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all receptionists working for owner's properties
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;

    // Get all properties owned by this owner with their receptionists
    const properties = await prisma.properties.findMany({
      where: { ownerId },
      include: {
        users_properties_receptionistIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            phoneVerified: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    // Get unique receptionists with their assigned properties
    const receptionistMap = new Map();

    properties.forEach((property) => {
      const receptionist = property.users_properties_receptionistIdTousers;
      if (receptionist) {
        if (!receptionistMap.has(receptionist.id)) {
          receptionistMap.set(receptionist.id, {
            ...receptionist,
            assignedProperties: [],
          });
        }
        receptionistMap.get(receptionist.id).assignedProperties.push({
          id: property.id,
          name: property.name,
          city: property.city,
          totalRooms: property.totalRooms,
        });
      }
    });

    const receptionists = Array.from(receptionistMap.values());

    return NextResponse.json(
      {
        receptionists,
        totalReceptionists: receptionists.length,
        totalAssignments: properties.filter(
          (p) => p.users_properties_receptionistIdTousers
        ).length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching receptionists:", error);
    return NextResponse.json(
      { error: "Failed to fetch receptionists" },
      { status: 500 }
    );
  }
}
