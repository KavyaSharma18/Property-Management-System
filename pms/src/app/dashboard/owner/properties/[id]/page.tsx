import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetail({ params }: Props) {
  const { id } = await params;

    const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin");

//   // TEMP demo session for frontend phase
//   const session =
//     process.env.NODE_ENV === "development"
//       ? {
//           user: { name: "Demo Owner", email: "owner@demo.com", role: "OWNER" },
//         }
//       : await getServerSession(authOptions);

//   if (!session) redirect("/auth/signin");

  if ((session.user as any).role !== "OWNER") {
    redirect("/dashboard/receptionist");
  }

  // 🔹 Demo property + metrics data (later comes from backend)
  const demoProperties: Record<string, any> = {
    prop_1: {
      name: "Seaside Retreat",
      address: "12 Ocean Drive, Beach City",
      description: "A cozy inn by the sea",
      receptionist: { id: "rec_1", name: "Alice Johnson" },
      totalRevenue: 320000,
      visitorsToday: 18,
      guestsStaying: 42,
      occupancyRate: 70,
      totalRooms: 60,
      alerts: 1,
    },
    prop_2: {
      name: "Mountain View Inn",
      address: "99 Alpine Rd, Hilltown",
      description: "Rustic hotel with mountain views",
      receptionist: null,
      totalRevenue: 210000,
      visitorsToday: 12,
      guestsStaying: 30,
      occupancyRate: 62,
      totalRooms: 48,
      alerts: 0,
    },
    prop_3: {
      name: "Lakeside Hotel",
      address: "7 Lakeview Rd, Waterside",
      description: "Relaxing hotel overlooking the lake",
      receptionist: { id: "rec_2", name: "Brian Lee" },
      totalRevenue: 450000,
      visitorsToday: 25,
      guestsStaying: 65,
      occupancyRate: 82,
      totalRooms: 80,
      alerts: 2,
    },
    prop_4: {
      name: "Urban Central Hotel",
      address: "101 City Plaza, Metropolis",
      description: "Modern hotel in the city center",
      receptionist: { id: "rec_3", name: "Carla Gomez" },
      totalRevenue: 780000,
      visitorsToday: 40,
      guestsStaying: 120,
      occupancyRate: 90,
      totalRooms: 140,
      alerts: 3,
    },
    prop_5: {
      name: "Garden Palace",
      address: "22 Greenway, Floral Town",
      description: "Boutique hotel surrounded by gardens",
      receptionist: null,
      totalRevenue: 150000,
      visitorsToday: 8,
      guestsStaying: 20,
      occupancyRate: 50,
      totalRooms: 40,
      alerts: 0,
    },
  };

  const property = demoProperties[id];

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="text-center p-6">
              <h2 className="text-xl font-semibold mb-2">Property not found</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
          {/* Property Info */}
          <Card className="mb-8">
            <CardContent>
              <h1 className="text-3xl font-bold mb-1">{property.name}</h1>
              <p className="text-muted-foreground">{property.address}</p>
              <p className="mt-4">{property.description}</p>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Receptionist</p>
                {property.receptionist ? (
                  <p className="font-medium">{property.receptionist.name} ({property.receptionist.id})</p>
                ) : (
                  <p className="font-medium text-muted-foreground">Not assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Property Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total Revenue" value={`₹${property.totalRevenue.toLocaleString()}`} />
            <MetricCard label="Visitors Today" value={property.visitorsToday} />
            <MetricCard label="Guests Staying" value={property.guestsStaying} />
            <MetricCard label="Occupancy Rate" value={`${property.occupancyRate}%`} />
            <MetricCard label="Total Rooms" value={property.totalRooms} />
            <MetricCard label="Alerts / Flags" value={property.alerts} highlight={property.alerts > 0} />
          </div>

          {/* Actions */}
          <Card className="mt-8">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">Property Actions</h2>
              <Button variant="outline">Assign / Manage Receptionist</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

/* 🔹 Small reusable metric card */
function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold mt-2 ${highlight ? "text-red-500" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
