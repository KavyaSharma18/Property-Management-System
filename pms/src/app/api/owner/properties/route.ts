import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get all properties owned by the logged-in owner
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;

    const properties = await prisma.properties.findMany({
      where: { ownerId },
      include: {
        users_properties_receptionistIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            rooms: true, // Count of actual rooms created
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add room creation progress to each property
    const propertiesWithProgress = properties.map((property) => ({
      ...property,
      receptionist: property.users_properties_receptionistIdTousers,
      users_properties_receptionistIdTousers: undefined,
      actualRoomsCreated: property._count.rooms,
      roomsRemaining: property.totalRooms - property._count.rooms,
      roomCreationProgress: property.totalRooms > 0
        ? parseFloat(((property._count.rooms / property.totalRooms) * 100).toFixed(2))
        : 0,
    }));

    return NextResponse.json({ properties: propertiesWithProgress }, { status: 200 });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

// POST: Create a new property
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const body = await request.json();
    const { name, address, numberOfFloors, totalRooms } = body;

    // Validation
    if (!name || !address || !numberOfFloors || !totalRooms) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (numberOfFloors < 1 || totalRooms < 1) {
      return NextResponse.json(
        { error: "Floors and rooms must be at least 1" },
        { status: 400 }
      );
    }

    // Check if property name already exists for this owner
    const existingProperty = await prisma.properties.findFirst({
      where: {
        name,
        ownerId,
      },
    });

    if (existingProperty) {
      return NextResponse.json(
        { error: "You already have a property with this name" },
        { status: 409 }
      );
    }

    // Create property
    const property = await prisma.properties.create({
      data: {
        name,
        address,
        numberOfFloors: parseInt(numberOfFloors),
        totalRooms: parseInt(totalRooms),
        ownerId,
        status: "ACTIVE",
      },
      include: {
        _count: {
          select: {
            rooms: true,
          },
        },
      },
    });

    return NextResponse.json(
      { property, message: "Property created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating property:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}
