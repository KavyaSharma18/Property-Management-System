import { NextResponse } from "next/server";

// GET: Fetch all enums used in the application
export async function GET() {
  try {
    const enums = {
      roomTypes: [
        { value: "DELUXE", label: "Deluxe" },
        { value: "SUITE", label: "Suite" },
        { value: "AC", label: "AC" },
        { value: "NON_AC", label: "Non AC" },
      ],
      roomCategories: [
        { value: "ECONOMY", label: "Economy" },
        { value: "MODERATE", label: "Moderate" },
        { value: "PREMIUM", label: "Premium" },
        { value: "ELITE", label: "Elite" },
        { value: "VIP", label: "VIP" },
      ],
      roomStatuses: [
        { value: "VACANT", label: "Vacant" },
        { value: "OCCUPIED", label: "Occupied" },
        { value: "MAINTENANCE", label: "Maintenance" },
        { value: "RESERVED", label: "Reserved" },
        { value: "DIRTY", label: "Dirty" },
        { value: "CLEANING", label: "Cleaning" },
      ],
    };

    return NextResponse.json(enums, { status: 200 });
  } catch (error) {
    console.error("Error fetching enums:", error);
    return NextResponse.json(
      { error: "Failed to fetch enums" },
      { status: 500 }
    );
  }
}
