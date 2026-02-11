"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  Calendar,
  Loader2
} from "lucide-react";

export default function OwnerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState<"all" | "thisWeek" | "thisMonth" | "thisYear" | "avgMonthly" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [overview, setOverview] = useState({
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
  });

  const [revenue, setRevenue] = useState({
    total: 0,
    thisMonth: 0,
    today: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });

  const [activity, setActivity] = useState({
    recentCheckIns: 0,
    upcomingCheckouts: 0,
  });

  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if ((session.user as any).role !== "OWNER") {
      router.push("/dashboard/receptionist");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/owner/dashboard");
        if (res.ok) {
          const data = await res.json();
          setOverview(data.overview || overview);
          setRevenue(data.revenue || revenue);
          setActivity(data.activity || activity);
          setProperties(data.properties || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [session, router]);

  // Calculate filtered revenue
  const getFilteredRevenue = () => {
    const totalRevenue = revenue.total;
    const now = new Date();
    
    switch (revenueFilter) {
      case "thisWeek": {
        const estimatedDaily = totalRevenue / 365;
        return estimatedDaily * 7;
      }
      case "thisMonth": {
        const monthsElapsed = now.getMonth() + 1;
        return totalRevenue / Math.max(monthsElapsed, 1);
      }
      case "thisYear": {
        return totalRevenue;
      }
      case "avgMonthly": {
        const monthsElapsed = now.getMonth() + 1;
        return totalRevenue / Math.max(monthsElapsed, 1);
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return (totalRevenue / 365) * Math.max(daysDiff, 0);
        }
        return totalRevenue;
      }
      case "all":
      default:
        return totalRevenue;
    }
  };

  const displayRevenue = getFilteredRevenue();
  const revenueLabel = revenueFilter === "all" ? "Total Revenue" : 
                       revenueFilter === "thisWeek" ? "This Week (Est.)" :
                       revenueFilter === "thisMonth" ? "This Month (Est.)" :
                       revenueFilter === "thisYear" ? "This Year" :
                       revenueFilter === "avgMonthly" ? "Avg Monthly" :
                       "Custom Period";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardHeader
          userName={session?.user?.name}
          userEmail={session?.user?.email}
          userRole="OWNER"
        />
        <div className="flex">
          <Sidebar role="owner" />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={session?.user?.name || ""}
        userEmail={session?.user?.email || ""}
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
            {/* Total Revenue with Filter */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{revenueLabel}</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{Math.round(displayRevenue).toLocaleString('en-IN')}</div>
                <div className="mt-3">
                  <select
                    value={revenueFilter}
                    onChange={(e) => setRevenueFilter(e.target.value as any)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="thisYear">This Year</option>
                    <option value="avgMonthly">Average Monthly</option>
                    <option value="custom">Custom Dates</option>
                  </select>
                </div>
                {revenueFilter === "custom" && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="Start Date"
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="End Date"
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                )}
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
