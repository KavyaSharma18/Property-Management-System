import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Search receptionists by ID or email (unassigned only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q");

    if (!searchQuery) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Find all assigned receptionist IDs
    const assignedProperties = await prisma.properties.findMany({
      where: {
        receptionistId: { not: null },
      },
      select: {
        receptionistId: true,
      },
    });

    const assignedIds = assignedProperties
      .map((p) => p.receptionistId)
      .filter((id): id is string => id !== null);

    // Find receptionists that are not assigned to any property
    const receptionists = await prisma.users.findMany({
      where: {
        role: "RECEPTIONIST",
        isActive: true,
        id: { notIn: assignedIds }, // Not assigned to any property
        OR: [
          { id: { startsWith: searchQuery } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      take: 10,
    });

    return NextResponse.json({ receptionists }, { status: 200 });
  } catch (error) {
    console.error("Error searching receptionists:", error);
    return NextResponse.json(
      { error: "Failed to search receptionists" },
      { status: 500 }
    );
  }
}
