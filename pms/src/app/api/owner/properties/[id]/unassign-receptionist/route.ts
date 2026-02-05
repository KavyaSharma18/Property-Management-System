import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

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

    // Verify property ownership
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ownerId,
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

    // Unassign receptionist (update both sides of the relationship)
    const updatedProperty = await prisma.$transaction(async (tx) => {
      // Remove receptionist from property
      const property = await tx.properties.update({
        where: { id: propertyId },
        data: {
          receptionistId: null,
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
        message: `Receptionist ${property.users_properties_receptionistIdTousers?.name} has been unassigned from ${property.name}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unassigning receptionist:", error);
    return NextResponse.json(
      { error: "Failed to unassign receptionist" },
      { status: 500 }
    );
  }
}
