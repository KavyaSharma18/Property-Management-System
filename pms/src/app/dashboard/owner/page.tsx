import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

export default async function OwnerDashboard() {

  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin");

  // // TEMP: mock session for frontend-only phase
  // const session =
  //   process.env.NODE_ENV === "development"
  //     ? {
  //         user: {
  //           name: "Demo Owner",
  //           email: "owner@sentinelpms.com",
  //           role: "OWNER",
  //         },
  //       }
  //     : await getServerSession(authOptions);

  // if (!session) redirect("/auth/signin");

  if ((session.user as any).role !== "OWNER") {
    redirect("/dashboard/receptionist");
  }

  // 🔹 Demo dashboard data (will come from backend later)
  const dashboardStats = {
    totalRevenue: 1250000, // ₹
    totalProperties: 4,
    visitorsToday: 86,
    guestsStaying: 214,
    occupancyRate: 78, // %
    alerts: 2,
  };

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

          {/* KPI Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-muted-foreground">Total Revenue Generated</h3>
                <p className="text-3xl font-bold mt-2">₹{dashboardStats.totalRevenue.toLocaleString("en-IN")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-muted-foreground">Total Properties</h3>
                <p className="text-3xl font-bold mt-2">{dashboardStats.totalProperties}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-muted-foreground">Visitors Today</h3>
                <p className="text-3xl font-bold mt-2">{dashboardStats.visitorsToday}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-muted-foreground">Guests Currently Staying</h3>
                <p className="text-3xl font-bold mt-2">{dashboardStats.guestsStaying}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-muted-foreground">Occupancy Rate</h3>
                <p className="text-3xl font-bold mt-2">{dashboardStats.occupancyRate}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-medium text-muted-foreground">Alerts / Flags</h3>
                <p className="text-3xl font-bold mt-2 text-red-500">{dashboardStats.alerts}</p>
                <p className="text-xs text-muted-foreground mt-1">Suspicious activity detected</p>
              </CardContent>
            </Card>
          </div>

          {/* Insights / Future ML Section */}
          <Card className="mt-10">
            <CardContent>
              <h2 className="text-xl font-semibold mb-3">Operational Insights</h2>
              <p className="text-muted-foreground">ML-based behavior insights and anomaly detection will appear here once monitoring is enabled.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
