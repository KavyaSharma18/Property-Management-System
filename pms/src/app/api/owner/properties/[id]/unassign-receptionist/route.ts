import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// DELETE: Remove receptionist from property
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = (session.user as any)?.id;
    const propertyId = params.id;

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

    // Unassign receptionist
    const updatedProperty = await prisma.properties.update({
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
