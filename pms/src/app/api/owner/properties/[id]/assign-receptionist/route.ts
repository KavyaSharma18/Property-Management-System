import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// POST: Assign receptionist to a property
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
    const { receptionistId } = await request.json();

    if (!receptionistId) {
      return NextResponse.json(
        { error: "Receptionist ID is required" },
        { status: 400 }
      );
    }

    // Check if property belongs to owner
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

    // Check if receptionist exists and is active
    const receptionist = await prisma.users.findFirst({
      where: {
        id: receptionistId,
        role: "RECEPTIONIST",
        isActive: true,
      },
    });

    if (!receptionist) {
      return NextResponse.json(
        { error: "Receptionist not found or inactive" },
        { status: 404 }
      );
    }

    // Check if receptionist is already assigned to another property
    const existingAssignment = await prisma.properties.findFirst({
      where: {
        receptionistId,
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Receptionist is already assigned to another property" },
        { status: 409 }
      );
    }

    // Assign receptionist to property (update both sides of the relationship)
    const updatedProperty = await prisma.$transaction(async (tx) => {
      // Update property with receptionist
      const property = await tx.properties.update({
        where: { id: propertyId },
        data: {
          receptionistId,
        },
        include: {
          users_properties_receptionistIdTousers: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update receptionist with property assignment
      await tx.users.update({
        where: { id: receptionistId },
        data: {
          propertyId,
        },
      });

      return property;
    });

    return NextResponse.json(
      {
        property: updatedProperty,
        message: "Receptionist assigned successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error assigning receptionist:", error);
    return NextResponse.json(
      { error: "Failed to assign receptionist" },
      { status: 500 }
    );
  }
}

// DELETE: Remove receptionist from property
export async function DELETE(
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

    // Check if property belongs to owner
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

    if (!property.receptionistId) {
      return NextResponse.json(
        { error: "No receptionist assigned to this property" },
        { status: 400 }
      );
    }

    const receptionistId = property.receptionistId;

    // Remove receptionist assignment (update both sides of the relationship)
    const updatedProperty = await prisma.$transaction(async (tx) => {
      // Remove receptionist from property
      const property = await tx.properties.update({
        where: { id: propertyId },
        data: {
          receptionistId: null,
        },
      });

      // Remove property assignment from receptionist
      await tx.users.update({
        where: { id: receptionistId },
        data: {
          propertyId: null,
        },
      });

      return property;
    });

    return NextResponse.json(
      {
        property: updatedProperty,
        message: "Receptionist removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing receptionist:", error);
    return NextResponse.json(
      { error: "Failed to remove receptionist" },
      { status: 500 }
    );
  }
}
