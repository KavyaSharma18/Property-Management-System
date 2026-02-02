import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get detailed information about a specific property
export async function GET(
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
            createdAt: true,
          },
        },
        floors: {
          include: {
            _count: {
              select: {
                rooms: true,
              },
            },
          },
          orderBy: { floorNumber: 'asc' },
        },
        rooms: {
          include: {
            floors: {
              select: {
                id: true,
                floorNumber: true,
                floorName: true,
              },
            },
            occupancies: {
              where: {
                actualCheckOut: null, // Current occupancies only
              },
              include: {
                guests: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { roomNumber: "asc" },
        },
        alerts: {
          where: {
            isRead: false,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Calculate property-specific analytics
    const actualRoomsCreated = property.rooms.length; // Rooms physically created by receptionist
    const totalRoomsCapacity = property.totalRooms; // Total capacity set by owner
    const roomsRemaining = totalRoomsCapacity - actualRoomsCreated; // How many more can be added
    
    const occupiedRooms = property.rooms.filter(
      (room) => room.occupancies.length > 0
    ).length;
    const vacantRooms = actualRoomsCreated - occupiedRooms;
    const occupancyRate = actualRoomsCreated > 0 ? (occupiedRooms / actualRoomsCreated) * 100 : 0;

    let totalOccupants = 0;
    let totalRevenue = 0;

    property.rooms.forEach((room) => {
      room.occupancies.forEach((occupancy) => {
        totalOccupants += occupancy.numberOfOccupants;
        // Count paid amount (partial or full payment)
        if (occupancy.paidAmount) {
          totalRevenue += occupancy.paidAmount;
        }
      });
    });

    // Room status breakdown
    const roomsByType = property.rooms.reduce((acc: any, room) => {
      if (!acc[room.roomType]) {
        acc[room.roomType] = { total: 0, occupied: 0, vacant: 0 };
      }
      acc[room.roomType].total++;
      if (room.occupancies.length > 0) {
        acc[room.roomType].occupied++;
      } else {
        acc[room.roomType].vacant++;
      }
      return acc;
    }, {});

    const propertyDetails = {
      ...property,
      receptionist: property.users_properties_receptionistIdTousers,
      users_properties_receptionistIdTousers: undefined,
      analytics: {
        // Room capacity tracking
        totalRoomsCapacity,
        actualRoomsCreated,
        roomsRemaining,
        roomCreationProgress: totalRoomsCapacity > 0 
          ? parseFloat(((actualRoomsCreated / totalRoomsCapacity) * 100).toFixed(2))
          : 0,
        
        // Occupancy tracking
        occupiedRooms,
        vacantRooms,
        occupancyRate: parseFloat(occupancyRate.toFixed(2)),
        totalOccupants,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        unreadAlerts: property.alerts.length,
        roomsByType,
      },
    };

    return NextResponse.json({ property: propertyDetails }, { status: 200 });
  } catch (error) {
    console.error("Error fetching property details:", error);
    return NextResponse.json(
      { error: "Failed to fetch property details" },
      { status: 500 }
    );
  }
}

// PUT: Update property details
export async function PUT(
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
    const body = await request.json();
    const { 
      name, 
      address, 
      city,
      state,
      zipCode,
      country,
      description,
      amenities,
      images,
      numberOfFloors, 
      totalRooms, 
      status 
    } = body;

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

    // Validate totalRooms if being updated
    if (totalRooms) {
      const actualRoomsCount = await prisma.rooms.count({
        where: { propertyId },
      });

      if (parseInt(totalRooms) < actualRoomsCount) {
        return NextResponse.json(
          {
            error: `Cannot set total rooms to ${totalRooms}. Property already has ${actualRoomsCount} rooms created.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate numberOfFloors if being updated
    if (numberOfFloors) {
      const currentFloorsCount = await prisma.floors.count({
        where: { propertyId },
      });

      if (parseInt(numberOfFloors) < currentFloorsCount) {
        return NextResponse.json(
          {
            error: `Cannot set number of floors to ${numberOfFloors}. Property already has ${currentFloorsCount} floors created. Delete floors first.`,
          },
          { status: 400 }
        );
      }
    }

    // Update property
    const updatedProperty = await prisma.properties.update({
      where: { id: propertyId },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(country && { country }),
        ...(description && { description }),
        ...(amenities && { amenities: JSON.stringify(amenities) }),
        ...(images && { images: JSON.stringify(images) }),
        ...(numberOfFloors && { numberOfFloors: parseInt(numberOfFloors) }),
        ...(totalRooms && { totalRooms: parseInt(totalRooms) }),
        ...(status && { status }),
      },
      include: {
        users_properties_receptionistIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        floors: {
          orderBy: { floorNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(
      {
        property: updatedProperty,
        message: "Property updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
  }
}

// DELETE: Delete property (only if no active occupancies)
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

    // Check if property belongs to owner
    const property = await prisma.properties.findFirst({
      where: {
        id: propertyId,
        ownerId,
      },
      include: {
        rooms: {
          include: {
            occupancies: {
              where: {
                actualCheckOut: null,
              },
            },
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

    // Check if there are active occupancies
    const hasActiveOccupancies = property.rooms.some(
      (room) => room.occupancies.length > 0
    );

    if (hasActiveOccupancies) {
      return NextResponse.json(
        { error: "Cannot delete property with active occupancies" },
        { status: 400 }
      );
    }

    // Delete property (cascade will handle rooms, alerts, etc.)
    await prisma.properties.delete({
      where: { id: propertyId },
    });

    return NextResponse.json(
      { message: "Property deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}
