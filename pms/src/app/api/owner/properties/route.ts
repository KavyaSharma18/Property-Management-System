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
        floors: {
          select: {
            id: true,
            floorNumber: true,
            floorName: true,
            description: true,
          },
          orderBy: { floorNumber: 'asc' },
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
      amenities: property.amenities ? JSON.parse(property.amenities) : null,
      images: property.images ? JSON.parse(property.images) : null,
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
      floors: floorsData
    } = body;

    // Validation
    if (!name || !address || !numberOfFloors || !totalRooms) {
      return NextResponse.json(
        { error: "Name, address, number of floors, and total rooms are required" },
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

    // Validate room counts if rooms are provided
    if (floorsData && Array.isArray(floorsData)) {
      const totalRoomsInFloors = floorsData.reduce((total: number, floor: any) => {
        return total + (floor.rooms ? floor.rooms.length : 0);
      }, 0);

      if (totalRoomsInFloors > parseInt(totalRooms)) {
        return NextResponse.json(
          { 
            error: `Total rooms in floors (${totalRoomsInFloors}) cannot exceed property capacity (${totalRooms})` 
          },
          { status: 400 }
        );
      }

      // Validate room numbers are unique across all floors
      const allRoomNumbers = floorsData.flatMap((floor: any) => 
        floor.rooms ? floor.rooms.map((room: any) => room.roomNumber) : []
      );
      const duplicateRooms = allRoomNumbers.filter(
        (num: string, index: number) => allRoomNumbers.indexOf(num) !== index
      );
      if (duplicateRooms.length > 0) {
        return NextResponse.json(
          { error: `Duplicate room numbers found: ${duplicateRooms.join(', ')}` },
          { status: 400 }
        );
      }

      // Validate room types and categories
      const validRoomTypes = ['DELUXE', 'SUITE', 'AC', 'NON_AC'];
      const validRoomCategories = ['ECONOMY', 'MODERATE', 'PREMIUM', 'ELITE', 'VIP'];
      
      for (const floor of floorsData) {
        if (floor.rooms && Array.isArray(floor.rooms)) {
          for (const room of floor.rooms) {
            if (!room.roomNumber || !room.roomType || !room.capacity || !room.pricePerNight) {
              return NextResponse.json(
                { error: 'Each room must have roomNumber, roomType, capacity, and pricePerNight' },
                { status: 400 }
              );
            }
            if (!validRoomTypes.includes(room.roomType)) {
              return NextResponse.json(
                { error: `Invalid room type: ${room.roomType}. Valid types: ${validRoomTypes.join(', ')}` },
                { status: 400 }
              );
            }
            if (room.roomCategory && !validRoomCategories.includes(room.roomCategory)) {
              return NextResponse.json(
                { error: `Invalid room category: ${room.roomCategory}. Valid categories: ${validRoomCategories.join(', ')}` },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Create property with floors and rooms
    const property = await prisma.properties.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        country: country || "India",
        description,
        amenities: amenities ? JSON.stringify(amenities) : null,
        images: images ? JSON.stringify(images) : null,
        numberOfFloors: parseInt(numberOfFloors),
        totalRooms: parseInt(totalRooms),
        ownerId,
        status: "ACTIVE",
        floors: {
          create: floorsData && Array.isArray(floorsData) && floorsData.length > 0
            ? floorsData.map((floor: any) => ({
                floorNumber: floor.floorNumber,
                floorName: floor.floorName || (floor.floorNumber === 0 ? "Ground Floor" : `Floor ${floor.floorNumber}`),
                description: floor.description,
              }))
            : Array.from({ length: parseInt(numberOfFloors) }, (_, i) => ({
                floorNumber: i,
                floorName: i === 0 ? "Ground Floor" : `Floor ${i}`,
              })),
        },
      },
      include: {
        floors: {
          include: {
            rooms: true,
          },
          orderBy: { floorNumber: 'asc' },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
      },
    });

    // If rooms were provided, create them separately after property and floors are created
    if (floorsData && Array.isArray(floorsData)) {
      for (const floorData of floorsData) {
        if (floorData.rooms && Array.isArray(floorData.rooms) && floorData.rooms.length > 0) {
          // Find the created floor by floor number
          const createdFloor = property.floors.find(
            (f) => f.floorNumber === floorData.floorNumber
          );
          
          if (!createdFloor) {
            console.error(`Floor ${floorData.floorNumber} not found in created property`);
            continue;
          }

          console.log(`Creating ${floorData.rooms.length} rooms for floor ${floorData.floorNumber}`);
          
          await prisma.rooms.createMany({
            data: floorData.rooms.map((room: any) => ({
              propertyId: property.id,
              floorId: createdFloor.id,
              roomNumber: room.roomNumber,
              roomType: room.roomType,
              roomCategory: room.roomCategory || "MODERATE",
              capacity: parseInt(room.capacity) || 1,
              pricePerNight: parseFloat(room.pricePerNight) || 0,
              description: room.description || "",
              amenities: room.amenities && room.amenities.length > 0 ? JSON.stringify(room.amenities) : null,
              images: room.images && room.images.length > 0 ? JSON.stringify(room.images) : null,
              size: room.size ? parseFloat(room.size) : null,
              status: "VACANT",
            })),
          });
          
          console.log(`Successfully created rooms for floor ${floorData.floorNumber}`);
        }
      }
    }

    // Fetch the complete property with rooms
    const completeProperty = await prisma.properties.findUnique({
      where: { id: property.id },
      include: {
        floors: {
          include: {
            rooms: true,
          },
          orderBy: { floorNumber: 'asc' },
        },
        _count: {
          select: {
            rooms: true,
          },
        },
      },
    });

    return NextResponse.json(
      { 
        property: completeProperty, 
        message: "Property created successfully",
        roomsCreated: completeProperty?._count.rooms || 0,
        roomsRemaining: (completeProperty?.totalRooms || 0) - (completeProperty?._count.rooms || 0),
      },
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
