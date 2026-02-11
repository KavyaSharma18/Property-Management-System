import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DoorOpen, DoorClosed, TrendingUp } from "lucide-react";
import prisma from "@/lib/prisma";

export default async function ReceptionistDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Check if user is receptionist
  if ((session.user as any).role !== "RECEPTIONIST") {
    redirect("/dashboard/owner");
  }

  const userId = (session.user as any)?.id;

  // Get receptionist's assigned property
  const receptionist = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      propertyId: true,
      properties_properties_receptionistIdTousers: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });

  if (!receptionist?.propertyId || !receptionist.properties_properties_receptionistIdTousers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader
          userName={session.user?.name}
          userEmail={session.user?.email}
          userRole="RECEPTIONIST"
        />
        <div className="flex">
          <Sidebar role="receptionist" />
          <div className="flex-1 p-8">
            <Card className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-4">No Property Assigned</h2>
              <p className="text-muted-foreground">
                You haven't been assigned to any property yet. Please contact your administrator.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const assignedProperty = receptionist.properties_properties_receptionistIdTousers;

  // Get room statistics
  const rooms = await prisma.rooms.findMany({
    where: { propertyId: receptionist.propertyId },
    select: {
      id: true,
      status: true,
      roomType: true,
    },
  });

  const totalRooms = rooms.length;
  const vacantRooms = rooms.filter(r => r.status === "VACANT").length;
  const occupiedRooms = rooms.filter(r => r.status === "OCCUPIED").length;

  // Get total guest count by summing numberOfOccupants from active occupancies
  const activeOccupanciesData = await prisma.occupancies.findMany({
    where: {
      rooms: {
        propertyId: receptionist.propertyId,
      },
      actualCheckOut: null,
    },
    select: {
      numberOfOccupants: true,
    },
  });

  const totalGuests = activeOccupanciesData.reduce(
    (sum, occ) => sum + (occ.numberOfOccupants || 0),
    0
  );

  // Calculate occupancy rate
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Get available rooms by type (only vacant)
  const availableByCategory = rooms
    .filter(r => r.status === "VACANT")
    .reduce((acc: any[], room) => {
      const existing = acc.find(item => item.label === room.roomType);
      if (existing) {
        existing.available++;
      } else {
        acc.push({ label: room.roomType, available: 1 });
      }
      return acc;
    }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={session.user?.name}
        userEmail={session.user?.email}
        userRole="RECEPTIONIST"
      />

      <div className="flex">
        <Sidebar role="receptionist" />

        <div className="flex-1 p-8">
          {/* Heading with Property Name */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-1">
              {assignedProperty.name}
            </h1>
            <p className="text-muted-foreground mb-4">
              {assignedProperty.address}
            </p>
            <p className="text-sm text-muted-foreground">
              Welcome, {session.user?.name || "Receptionist"}
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Rooms */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Total Rooms</h3>
                  <DoorOpen className="text-blue-500" size={20} />
                </div>
                <p className="text-3xl font-bold">{totalRooms}</p>
                <p className="text-sm text-muted-foreground mt-2">in this property</p>
              </CardContent>
            </Card>

            {/* Vacant Rooms */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Vacant Rooms</h3>
                  <DoorOpen className="text-green-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-green-600">{vacantRooms}</p>
                <p className="text-sm text-muted-foreground mt-2">Available for booking</p>
              </CardContent>
            </Card>

            {/* Occupied Rooms */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Occupied Rooms</h3>
                  <DoorClosed className="text-red-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-red-600">{occupiedRooms}</p>
                <p className="text-sm text-muted-foreground mt-2">Currently occupied</p>
              </CardContent>
            </Card>

            {/* Total Guests */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm">Total Guests</h3>
                  <Users className="text-purple-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-purple-600">{totalGuests}</p>
                <p className="text-sm text-muted-foreground mt-2">Currently staying</p>
              </CardContent>
            </Card>
          </div>

          {/* Occupancy Rate */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Occupancy Rate</h3>
                  <p className="text-muted-foreground">Property utilization</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <TrendingUp className="text-blue-500 mb-2" size={28} />
                    <p className="text-4xl font-bold text-blue-600">{occupancyRate}%</p>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${occupancyRate}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Category Availability */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Available Rooms by Category</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Current vacant rooms grouped by category
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {availableByCategory.length > 0 ? (
                  availableByCategory.map((category) => (
                    <div key={category.label} className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                      <p className="text-sm text-muted-foreground">{category.label}</p>
                      <p className="text-2xl font-bold mt-1">{category.available}</p>
                      <p className="text-xs text-muted-foreground">available</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4">
                    <p className="text-sm text-muted-foreground">No vacant rooms available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div> {/* closes flex-1 */}
      </div> {/*closes flex */}
    </div> /* closes min-h-screen */
  );
}
