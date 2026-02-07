import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Home, 
  Users, 
  TrendingUp, 
  AlertCircle,
  DoorOpen,
  IndianRupee,
  Calendar
} from "lucide-react";
import prisma from "@/lib/prisma";

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin");

  if ((session.user as any).role !== "OWNER") {
    redirect("/dashboard/receptionist");
  }

  const userId = (session.user as any)?.id;

  // Fetch dashboard data directly from database
  let overview = {
    totalProperties: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    maintenanceRooms: 0,
    dirtyRooms: 0,
    cleaningRooms: 0,
    reservedRooms: 0,
    overallOccupancyRate: 0,
    activeOccupancies: 0,
    propertiesWithoutReceptionist: 0,
  };

  let revenue = {
    total: 0,
    thisMonth: 0,
    today: 0,
    pendingAmount: 0,
    pendingCount: 0,
  };

  let activity = {
    recentCheckIns: 0,
    upcomingCheckouts: 0,
  };

  let properties: any[] = [];

  try {
    // Get all properties owned by this user
    const propertiesData = await prisma.properties.findMany({
      where: { ownerId: userId },
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
        users_properties_receptionistIdTousers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate totals
    const totalProperties = propertiesData.length;
    const totalRooms = propertiesData.reduce((sum, p) => sum + p.rooms.length, 0);

    // Room status distribution
    const roomStatusCounts = propertiesData.reduce(
      (acc, property) => {
        property.rooms.forEach((room) => {
          acc[room.status] = (acc[room.status] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    const occupiedRooms = roomStatusCounts["OCCUPIED"] || 0;
    const vacantRooms = roomStatusCounts["VACANT"] || 0;
    const maintenanceRooms = roomStatusCounts["MAINTENANCE"] || 0;
    const dirtyRooms = roomStatusCounts["DIRTY"] || 0;
    const cleaningRooms = roomStatusCounts["CLEANING"] || 0;
    const reservedRooms = roomStatusCounts["RESERVED"] || 0;

    const occupancyRate =
      totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100) : 0;

    // Get all payments for revenue calculation
    const allPayments = await prisma.payments.findMany({
      where: {
        occupancies: {
          rooms: {
            propertyId: {
              in: propertiesData.map((p) => p.id),
            },
          },
        },
      },
      select: {
        amount: true,
        paymentDate: true,
      },
    });

    const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // This month's revenue
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthRevenue = allPayments
      .filter((p) => p.paymentDate >= firstDayOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = allPayments
      .filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Active occupancies count
    const activeOccupancies = propertiesData.reduce(
      (sum, p) => sum + p.rooms.reduce((count, r) => count + r.occupancies.length, 0),
      0
    );

    // Properties without receptionist
    const propertiesWithoutReceptionist = propertiesData.filter(
      (p) => !p.users_properties_receptionistIdTousers
    ).length;

    // Get pending payments
    const pendingPayments = await prisma.occupancies.findMany({
      where: {
        rooms: {
          propertyId: {
            in: propertiesData.map((p) => p.id),
          },
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

    // Recent check-ins (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCheckIns = await prisma.occupancies.count({
      where: {
        rooms: {
          propertyId: {
            in: propertiesData.map((p) => p.id),
          },
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
          propertyId: {
            in: propertiesData.map((p) => p.id),
          },
        },
        actualCheckOut: null,
        expectedCheckOut: {
          lte: threeDaysFromNow,
          gte: new Date(),
        },
      },
    });

    // Property-wise summary
    const propertySummary = propertiesData.map((property) => {
      const rooms = property.rooms;
      const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
      const vacant = rooms.filter((r) => r.status === "VACANT").length;
      const propOccupancyRate =
        rooms.length > 0 ? ((occupied / rooms.length) * 100) : 0;

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        totalRooms: rooms.length,
        occupiedRooms: occupied,
        vacantRooms: vacant,
        occupancyRate: propOccupancyRate,
        receptionist: property.users_properties_receptionistIdTousers,
        status: property.status,
      };
    });

    overview = {
      totalProperties,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      dirtyRooms,
      cleaningRooms,
      reservedRooms,
      overallOccupancyRate: occupancyRate,
      activeOccupancies,
      propertiesWithoutReceptionist,
    };

    revenue = {
      total: totalRevenue,
      thisMonth: thisMonthRevenue,
      today: todayRevenue,
      pendingAmount: totalPendingAmount,
      pendingCount: pendingPayments.length,
    };

    activity = {
      recentCheckIns,
      upcomingCheckouts,
    };

    properties = propertySummary;
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={session.user?.name}
        userEmail={session.user?.email}
        userRole="OWNER"
      />

      <div className="flex">
        <Sidebar role="owner" />

        <main className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Owner Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your hotel operations
            </p>
          </div>

          {/* Alert for properties without receptionist */}
          {overview.propertiesWithoutReceptionist > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {overview.propertiesWithoutReceptionist} {overview.propertiesWithoutReceptionist === 1 ? 'property needs' : 'properties need'} a receptionist
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Assign receptionists to manage check-ins and operations.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{revenue.total.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  This month: ₹{revenue.thisMonth.toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>

            {/* Total Properties */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalProperties}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview.totalRooms} total rooms
                </p>
              </CardContent>
            </Card>

            {/* Occupancy Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.overallOccupancyRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {overview.occupiedRooms} / {overview.totalRooms} rooms occupied
                </p>
              </CardContent>
            </Card>

            {/* Active Guests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Guests</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.activeOccupancies}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently staying
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            {/* Vacant Rooms */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vacant Rooms</CardTitle>
                <DoorOpen className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overview.vacantRooms}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available for booking
                </p>
              </CardContent>
            </Card>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Check-ins</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{activity.recentCheckIns}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 7 days
                </p>
              </CardContent>
            </Card>

            {/* Upcoming Checkouts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Checkouts</CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{activity.upcomingCheckouts}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Next 3 days
                </p>
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <IndianRupee className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{revenue.pendingAmount.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenue.pendingCount} payments pending
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Room Status Overview */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Room Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Occupied: {overview.occupiedRooms}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Vacant: {overview.vacantRooms}</Badge>
                </div>
                {overview.maintenanceRooms > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Maintenance: {overview.maintenanceRooms}</Badge>
                  </div>
                )}
                {overview.dirtyRooms > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Dirty: {overview.dirtyRooms}</Badge>
                  </div>
                )}
                {overview.cleaningRooms > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Cleaning: {overview.cleaningRooms}</Badge>
                  </div>
                )}
                {overview.reservedRooms > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge>Reserved: {overview.reservedRooms}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insights / Future ML Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Operational Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">ML-based behavior insights and anomaly detection will appear here once monitoring is enabled.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
