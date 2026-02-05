import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all floors for a property
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId } = await params;

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ownerId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const floors = await prisma.floors.findMany({
      where: { propertyId },
      include: {
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: { floorNumber: "asc" },
    });

    return NextResponse.json({ floors }, { status: 200 });
  } catch (error) {
    console.error("Error fetching floors:", error);
    return NextResponse.json(
      { error: "Failed to fetch floors" },
      { status: 500 }
    );
  }
}

// POST: Add a new floor to a property
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const { id: propertyId } = await params;
    const body = await request.json();
    const { floorNumber, floorName, description } = body;

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ownerId,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Check if floor number already exists
    const existingFloor = await prisma.floors.findFirst({
      where: {
        propertyId,
        floorNumber: parseInt(floorNumber),
      },
    });

    if (existingFloor) {
      return NextResponse.json(
        { error: "Floor with this number already exists" },
        { status: 409 }
      );
    }

    const floor = await prisma.floors.create({
      data: {
        propertyId,
        floorNumber: parseInt(floorNumber),
        floorName,
        description,
      },
    });

    return NextResponse.json(
      { floor, message: "Floor created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating floor:", error);
    return NextResponse.json(
      { error: "Failed to create floor" },
      { status: 500 }
    );
  }
}
