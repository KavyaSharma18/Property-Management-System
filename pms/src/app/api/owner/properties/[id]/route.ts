import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Get detailed information about a specific property
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
          select: {
            id: true,
            floorNumber: true,
            floorName: true,
            description: true,
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
                description: true,
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

    property.rooms.forEach((room) => {
      room.occupancies.forEach((occupancy) => {
        totalOccupants += occupancy.numberOfOccupants;
      });
    });

    // Get total revenue from ALL payments for this property (not just active occupancies)
    const allPayments = await prisma.payments.findMany({
      where: {
        occupancies: {
          rooms: {
            propertyId,
          },
        },
      },
      select: {
        amount: true,
        paymentDate: true,
      },
    });

    const totalRevenue = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Calculate period-specific revenues
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

    const todayRevenue = allPayments
      .filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
      })
      .reduce((sum, p) => sum + p.amount, 0);
    
    const yesterdayRevenue = allPayments
      .filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === yesterday.getTime();
      })
      .reduce((sum, p) => sum + p.amount, 0);
    
    const thisWeekRevenue = allPayments
      .filter((p) => new Date(p.paymentDate) >= firstDayOfWeek)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const thisMonthRevenue = allPayments
      .filter((p) => new Date(p.paymentDate) >= firstDayOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const thisYearRevenue = allPayments
      .filter((p) => new Date(p.paymentDate) >= firstDayOfYear)
      .reduce((sum, p) => sum + p.amount, 0);

    // Recent check-ins (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCheckIns = await prisma.occupancies.count({
      where: {
        rooms: {
          propertyId,
        },
        checkInTime: {
          gte: sevenDaysAgo,
        },
      },
    });

    // Upcoming checkouts (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingCheckouts = await prisma.occupancies.count({
      where: {
        rooms: {
          propertyId,
        },
        actualCheckOut: null,
        expectedCheckOut: {
          lte: threeDaysFromNow,
          gte: new Date(),
        },
      },
    });

    // Get pending payments
    const pendingPayments = await prisma.occupancies.findMany({
      where: {
        rooms: {
          propertyId,
        },
        actualCheckOut: null,
        balanceAmount: {
          gt: 0,
        },
      },
      select: {
        balanceAmount: true,
      },
    });

    const totalPendingAmount = pendingPayments.reduce(
      (sum, occ) => sum + (occ.balanceAmount || 0),
      0
    );

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
        todayRevenue: parseFloat(todayRevenue.toFixed(2)),
        yesterdayRevenue: parseFloat(yesterdayRevenue.toFixed(2)),
        thisWeekRevenue: parseFloat(thisWeekRevenue.toFixed(2)),
        thisMonthRevenue: parseFloat(thisMonthRevenue.toFixed(2)),
        thisYearRevenue: parseFloat(thisYearRevenue.toFixed(2)),
        unreadAlerts: property.alerts.length,
        recentCheckIns,
        upcomingCheckouts,
        pendingAmount: parseFloat(totalPendingAmount.toFixed(2)),
        pendingCount: pendingPayments.length,
        roomsByType,
        payments: allPayments.map(p => ({
          amount: p.amount,
          date: p.paymentDate.toISOString(),
        })),
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
      status,
      floors
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

    // Check if name is being changed and if new name already exists
    if (name && name !== property.name) {
      const existingProperty = await prisma.properties.findFirst({
        where: {
          name,
          ownerId,
          NOT: {
            id: propertyId,
          },
        },
      });

      if (existingProperty) {
        return NextResponse.json(
          { error: "You already have a property with this name" },
          { status: 409 }
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

    // Note: totalRooms validation is skipped here as it will be automatically 
    // calculated based on the actual rooms after floors/rooms are processed

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

    // Handle floors update if provided
    if (floors && Array.isArray(floors)) {
      console.log("=== Floor Update Process ===");
      
      // Get existing floors and rooms
      const existingFloors = await prisma.floors.findMany({
        where: { propertyId },
        include: { 
          rooms: {
            include: {
              occupancies: {
                select: { 
                  id: true,
                  actualCheckOut: true 
                }
              }
            }
          }
        },
        orderBy: { floorNumber: 'asc' }
      });

      console.log(`Found ${existingFloors.length} existing floors`);

      // Validate: Cannot reduce number of floors
      const incomingFloorCount = floors.length;
      const existingFloorCount = existingFloors.length;
      
      if (incomingFloorCount < existingFloorCount) {
        return NextResponse.json(
          {
            error: `Cannot reduce floors from ${existingFloorCount} to ${incomingFloorCount}. You can only add more floors or keep the same number.`,
          },
          { status: 400 }
        );
      }

      // Process each floor - UPDATE existing or CREATE new
      for (const floorData of floors) {
        const existingFloor = existingFloors.find(f => f.floorNumber === floorData.floorNumber);
        
        if (existingFloor) {
          // UPDATE existing floor
          console.log(`Updating floor ${floorData.floorNumber}`);
          await prisma.floors.update({
            where: { id: existingFloor.id },
            data: {
              floorName: floorData.floorName || `Floor ${floorData.floorNumber}`,
              description: floorData.description || "",
            }
          });

          // Get existing rooms on this floor
          const existingRoomsOnFloor = existingFloor.rooms;
          const incomingRooms = floorData.rooms || [];

          // Validate: Cannot reduce number of rooms
          const existingRoomsWithHistory = existingRoomsOnFloor.filter(room => room.occupancies.length > 0);
          
          // Check if trying to remove rooms with history
          for (const existingRoom of existingRoomsWithHistory) {
            const stillExists = incomingRooms.some((r: any) => r.roomNumber === existingRoom.roomNumber);
            if (!stillExists) {
              return NextResponse.json(
                {
                  error: `Cannot remove room ${existingRoom.roomNumber} on Floor ${floorData.floorNumber}. This room has booking history and must be preserved.`,
                },
                { status: 400 }
              );
            }
          }

          // Process rooms - UPDATE existing or CREATE new
          for (const roomData of incomingRooms) {
            const existingRoom = existingRoomsOnFloor.find((r: any) => r.roomNumber === roomData.roomNumber);
            
            if (existingRoom) {
              // UPDATE existing room - preserves all revenue and booking history
              console.log(`Updating room ${roomData.roomNumber}`);
              await prisma.rooms.update({
                where: { id: existingRoom.id },
                data: {
                  roomType: roomData.roomType,
                  roomCategory: roomData.roomCategory || "MODERATE",
                  capacity: roomData.capacity,
                  pricePerNight: roomData.pricePerNight,
                  description: roomData.description || "",
                  amenities: roomData.amenities ? JSON.stringify(roomData.amenities) : null,
                  images: roomData.images ? JSON.stringify(roomData.images) : null,
                  // Keep existing status and don't override it
                }
              });
            } else {
              // CREATE new room
              console.log(`Creating new room ${roomData.roomNumber} on floor ${floorData.floorNumber}`);
              await prisma.rooms.create({
                data: {
                  propertyId,
                  floorId: existingFloor.id,
                  roomNumber: roomData.roomNumber,
                  roomType: roomData.roomType,
                  roomCategory: roomData.roomCategory || "MODERATE",
                  capacity: roomData.capacity,
                  pricePerNight: roomData.pricePerNight,
                  description: roomData.description || "",
                  amenities: roomData.amenities ? JSON.stringify(roomData.amenities) : null,
                  images: roomData.images ? JSON.stringify(roomData.images) : null,
                  status: "VACANT",
                }
              });
            }
          }

          // Delete vacant rooms that are not in the incoming list
          const incomingRoomNumbers = incomingRooms.map((r: any) => r.roomNumber);
          const roomsToDelete = existingRoomsOnFloor.filter(
            room => !incomingRoomNumbers.includes(room.roomNumber) && room.occupancies.length === 0
          );
          
          for (const roomToDelete of roomsToDelete) {
            console.log(`Deleting vacant room ${roomToDelete.roomNumber} from floor ${floorData.floorNumber}`);
            await prisma.rooms.delete({
              where: { id: roomToDelete.id }
            });
          }
        } else {
          // CREATE new floor
          console.log(`Creating new floor ${floorData.floorNumber}`);
          const newFloor = await prisma.floors.create({
            data: {
              propertyId,
              floorNumber: floorData.floorNumber,
              floorName: floorData.floorName || `Floor ${floorData.floorNumber}`,
              description: floorData.description || "",
            },
          });

          // Create all rooms for new floor
          if (floorData.rooms && floorData.rooms.length > 0) {
            await prisma.rooms.createMany({
              data: floorData.rooms.map((room: any) => ({
                propertyId,
                floorId: newFloor.id,
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                roomCategory: room.roomCategory || "MODERATE",
                capacity: room.capacity,
                pricePerNight: room.pricePerNight,
                description: room.description || "",
                amenities: room.amenities ? JSON.stringify(room.amenities) : null,
                images: room.images ? JSON.stringify(room.images) : null,
                status: "VACANT",
              })),
            });
          }
        }
      }

      console.log("=== Floor Update Complete ===");
      
      // Recalculate totalRooms after all room operations
      const actualRoomsCount = await prisma.rooms.count({
        where: { propertyId },
      });
      
      // Update property with the actual room count
      await prisma.properties.update({
        where: { id: propertyId },
        data: { totalRooms: actualRoomsCount }
      });
      
      console.log(`Updated totalRooms to ${actualRoomsCount}`);
    }

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
