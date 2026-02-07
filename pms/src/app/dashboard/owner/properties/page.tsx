import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import PropertiesList from "@/components/owner/properties-list";
import prisma from "@/lib/prisma";

export default async function OwnerPropertiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin");

  if ((session.user as any).role !== "OWNER") {
    redirect("/dashboard/receptionist");
  }

  // Fetch properties directly from database in server component
  const ownerId = (session.user as any)?.id;
  let properties = [];

  try {
    const propertiesData = await prisma.properties.findMany({
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
          include: {
            rooms: {
              orderBy: { roomNumber: 'asc' },
            },
          },
          orderBy: { floorNumber: 'asc' },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    properties = propertiesData.map((property) => ({
      ...property,
      receptionist: property.users_properties_receptionistIdTousers,
      users_properties_receptionistIdTousers: undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch properties:', error);
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Properties</h1>
            <p className="text-muted-foreground">Manage your properties</p>
          </div>

          {/* Client-side list + form */}
          <PropertiesList initial={properties} />
        </main>
      </div>
    </div>
  );
}
