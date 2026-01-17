import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import PropertiesList from "@/components/owner/properties-list";

export default async function OwnerPropertiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin");

//     const session =
//   process.env.NODE_ENV === "development"
//     ? {
//         user: {
//           name: "Demo Owner",
//           email: "owner@demo.com",
//           role: "OWNER",
//         },
//       }
//     : await getServerSession(authOptions);

//     if (!session) redirect("/auth/signin");


  if ((session.user as any).role !== "OWNER") {
    redirect("/dashboard/receptionist");
  }

  // Demo properties — replace with DB query to fetch properties for the authenticated owner
  const properties: any[] =
    process.env.NODE_ENV === "development"
      ? [
          {
            id: "prop_1",
            name: "Seaside Retreat",
            address: "12 Ocean Drive, Beach City",
            totalRooms: 24,
            numberOfFloors: 3,
            status: "ACTIVE",
          },
          {
            id: "prop_2",
            name: "Mountain View Inn",
            address: "99 Alpine Rd, Hilltown",
            totalRooms: 18,
            numberOfFloors: 4,
            status: "ACTIVE",
          },
          {
        id: "prop_3",
        name: "Lakeside Hotel",
        address: "7 Lakeview Rd, Waterside",
        totalRooms: 30,
        numberOfFloors: 5,
        status: "ACTIVE",
      },
      {
        id: "prop_4",
        name: "Urban Central Hotel",
        address: "101 City Plaza, Metropolis",
        totalRooms: 56,
        numberOfFloors: 12,
        status: "ACTIVE",
      },
      {
        id: "prop_5",
        name: "Garden Palace",
        address: "22 Greenway, Floral Town",
        totalRooms: 40,
        numberOfFloors: 6,
        status: "MAINTENANCE",
      }
        ]
      : [];


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
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Properties</h1>
            <p className="text-muted-foreground">List of properties you own</p>
          </div>

          {/* Client-side list + form */}
          <PropertiesList initial={properties} />
        </main>
      </div>
    </div>
  );
}
