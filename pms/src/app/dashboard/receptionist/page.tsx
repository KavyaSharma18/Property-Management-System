import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReceptionistDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // const session =
  // process.env.NODE_ENV === "development"
  //   ? {
  //       user: {
  //         name: "Demo User",
  //         email: "demo@pms.com",
  //         role: "RECEPTIONIST", 
  //       },
  //     }
  //   : await getServerSession(authOptions);

  //   if (!session) {
  //     redirect("/auth/signin");
  //   }


  // Check if user is receptionist
  if ((session.user as any).role !== "RECEPTIONIST") {
    redirect("/dashboard/owner");
  }

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
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Receptionist Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome, {session.user?.name || "Receptionist"}
            </p>
          </div>

          {/* Stats cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Available Rooms</h3>
                <p className="text-3xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Ready for Check-in</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Occupied Rooms</h3>
                <p className="text-3xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Currently Occupied</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Today's Check-outs</h3>
                <p className="text-3xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Expected Today</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <p className="text-muted-foreground">Waiting for property assignment from owner...</p>
            </CardContent>
          </Card>
        </div> {/* ✅ closes flex-1 */}
      </div> {/* ✅ closes flex */}
    </div> /* ✅ closes min-h-screen */
  );
}
