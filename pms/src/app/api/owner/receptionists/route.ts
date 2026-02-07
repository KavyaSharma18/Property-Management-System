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

    // Get all active receptionists who are NOT assigned to any property
    const allReceptionists = await prisma.users.findMany({
      where: { 
        role: "RECEPTIONIST",
        isActive: true,
        NOT: {
          properties_properties_receptionistIdTousers: {
            isNot: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        phoneVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Map receptionists
    const receptionists = allReceptionists.map((receptionist) => ({
      id: receptionist.id,
      name: receptionist.name,
      email: receptionist.email,
      phone: receptionist.phone,
      phoneVerified: receptionist.phoneVerified,
      isActive: receptionist.isActive,
      createdAt: receptionist.createdAt,
      assignedProperties: [], // No assignments for unassigned receptionists
    }));

    return NextResponse.json(
      {
        receptionists,
        totalReceptionists: receptionists.length,
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
