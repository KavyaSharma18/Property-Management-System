import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get detailed information about a specific group booking
// Params: id - Group booking ID
// Returns: Complete group booking details with all room occupancies
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: groupBookingId } = await params;

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

    // Get group booking details
    const groupBooking = await prisma.group_bookings.findUnique({
      where: { id: groupBookingId },
      include: {
        properties: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        occupancies: {
          include: {
            rooms: {
              select: {
                id: true,
                roomNumber: true,
                roomType: true,
                roomCategory: true,
                status: true,
                pricePerNight: true,
              },
            },
            occupancy_guests: {
              include: {
                guests: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    idProofType: true,
                    idProofNumber: true,
                  },
                },
              },
            },
            payments: {
              orderBy: {
                paymentDate: "desc",
              },
            },
          },
          orderBy: {
            checkInTime: "asc",
          },
        },
      },
    });

    if (!groupBooking) {
      return NextResponse.json(
        { error: "Group booking not found" },
        { status: 404 }
      );
    }

    // Verify group booking belongs to receptionist's property
    if (groupBooking.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Group booking does not belong to your property" },
        { status: 403 }
      );
    }

    // Calculate summary statistics
    const totalAmount = groupBooking.occupancies.reduce(
      (sum, occ) => sum + occ.totalAmount,
      0
    );
    const paidAmount = groupBooking.occupancies.reduce(
      (sum, occ) => sum + (occ.paidAmount || 0),
      0
    );
    const balanceAmount = totalAmount - paidAmount;

    const activeRooms = groupBooking.occupancies.filter(
      (occ) => !occ.actualCheckOut
    ).length;
    const completedRooms = groupBooking.occupancies.filter(
      (occ) => occ.actualCheckOut
    ).length;
    const pendingRooms = groupBooking.totalRooms - groupBooking.occupancies.length;

    // Enrich occupancy data
    const rooms = groupBooking.occupancies.map((occ) => {
      const checkIn = new Date(occ.checkInTime);
      const endDate = occ.actualCheckOut
        ? new Date(occ.actualCheckOut)
        : new Date();
      const nightsStayed = Math.ceil(
        (endDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: occ.id,
        room: occ.rooms,
        checkInTime: occ.checkInTime,
        expectedCheckOut: occ.expectedCheckOut,
        actualCheckOut: occ.actualCheckOut,
        actualRoomRate: occ.actualRoomRate,
        totalAmount: occ.totalAmount,
        paidAmount: occ.paidAmount,
        balanceAmount: occ.balanceAmount,
        lastPaidDate: occ.lastPaidDate,
        nightsStayed: occ.actualCheckOut ? null : nightsStayed,
        isActive: !occ.actualCheckOut,
        isPaid: (occ.balanceAmount || 0) === 0,
        guests: occ.occupancy_guests.map((og) => ({
          ...og.guests,
          isPrimary: og.isPrimary,
        })),
        payments: occ.payments,
      };
    });

    return NextResponse.json({
      groupBooking: {
        id: groupBooking.id,
        groupName: groupBooking.groupName,
        totalRooms: groupBooking.totalRooms,
        checkInDate: groupBooking.checkInDate,
        checkOutDate: groupBooking.checkOutDate,
        contactName: groupBooking.contactName,
        contactPhone: groupBooking.contactPhone,
        contactEmail: groupBooking.contactEmail,
        notes: groupBooking.notes,
        createdBy: groupBooking.users,
        createdAt: groupBooking.createdAt,
        updatedAt: groupBooking.updatedAt,
        property: groupBooking.properties,
        summary: {
          totalAmount,
          paidAmount,
          balanceAmount,
          activeRooms,
          completedRooms,
          pendingRooms,
          bookedRooms: groupBooking.occupancies.length,
        },
        rooms,
      },
    });
  } catch (error) {
    console.error("Group booking details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch group booking details" },
      { status: 500 }
    );
  }
}

// PUT: Update group booking details
// Params: id - Group booking ID
// Body: groupName, totalRooms, checkInDate, checkOutDate, contactName, contactPhone, contactEmail, notes
// Returns: Updated group booking record
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: groupBookingId } = await params;
    const body = await req.json();

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

    // Verify group booking exists and belongs to property
    const existingGroupBooking = await prisma.group_bookings.findUnique({
      where: { id: groupBookingId },
      select: { propertyId: true },
    });

    if (!existingGroupBooking) {
      return NextResponse.json(
        { error: "Group booking not found" },
        { status: 404 }
      );
    }

    if (existingGroupBooking.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Group booking does not belong to your property" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.groupName !== undefined) updateData.groupName = body.groupName;
    if (body.totalRooms !== undefined)
      updateData.totalRooms = parseInt(body.totalRooms);
    if (body.checkInDate !== undefined)
      updateData.checkInDate = new Date(body.checkInDate);
    if (body.checkOutDate !== undefined)
      updateData.checkOutDate = new Date(body.checkOutDate);
    if (body.contactName !== undefined) updateData.contactName = body.contactName;
    if (body.contactPhone !== undefined)
      updateData.contactPhone = body.contactPhone;
    if (body.contactEmail !== undefined)
      updateData.contactEmail = body.contactEmail;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Validate dates if both are being updated
    if (updateData.checkInDate && updateData.checkOutDate) {
      if (updateData.checkOutDate <= updateData.checkInDate) {
        return NextResponse.json(
          { error: "Check-out date must be after check-in date" },
          { status: 400 }
        );
      }
    }

    // Check if there are any updates
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update group booking
    const updatedGroupBooking = await prisma.group_bookings.update({
      where: { id: groupBookingId },
      data: updateData,
      include: {
        properties: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            occupancies: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Group booking updated successfully",
      groupBooking: updatedGroupBooking,
    });
  } catch (error) {
    console.error("Group booking update error:", error);
    return NextResponse.json(
      { error: "Failed to update group booking" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a group booking (only if no rooms have been checked in)
// Params: id - Group booking ID
// Returns: Success message
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { id: groupBookingId } = await params;

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

    // Verify group booking exists and get occupancy count
    const groupBooking = await prisma.group_bookings.findUnique({
      where: { id: groupBookingId },
      include: {
        _count: {
          select: {
            occupancies: true,
          },
        },
      },
    });

    if (!groupBooking) {
      return NextResponse.json(
        { error: "Group booking not found" },
        { status: 404 }
      );
    }

    if (groupBooking.propertyId !== receptionist.propertyId) {
      return NextResponse.json(
        { error: "Group booking does not belong to your property" },
        { status: 403 }
      );
    }

    // Check if any rooms have been checked in
    if (groupBooking._count.occupancies > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete group booking. ${groupBooking._count.occupancies} room(s) have been checked in. Please checkout or transfer the rooms first.`,
        },
        { status: 400 }
      );
    }

    // Delete group booking
    await prisma.group_bookings.delete({
      where: { id: groupBookingId },
    });

    return NextResponse.json({
      message: "Group booking deleted successfully",
    });
  } catch (error) {
    console.error("Group booking deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete group booking" },
      { status: 500 }
    );
  }
}
