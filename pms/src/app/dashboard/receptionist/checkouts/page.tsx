"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Card, CardContent } from "@/components/ui/card";

interface Checkout {
  id: string;
  guestName: string;
  roomNumber: string;
  expectedCheckOutDate: string;
  expectedCheckOutTime: string;
  balanceAmount: number;
}

export default function ReceptionistCheckoutsPage() {
  const { data: session } = useSession();
  const rawRole = (session?.user as { role?: string } | undefined)?.role;
  const userRole = (rawRole === "owner" ? "owner" : "receptionist") as "owner" | "receptionist";
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch upcoming checkouts from API
  useEffect(() => {
    async function fetchCheckouts() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/receptionist/checkouts/upcoming?period=week");
        if (!response.ok) throw new Error("Failed to fetch checkouts");
        
        const data = await response.json();
        
        // Transform API data to checkout format
        const transformedCheckouts: Checkout[] = data.checkouts.map((checkout: any) => {
          const expectedDate = checkout.expectedCheckOut ? new Date(checkout.expectedCheckOut) : new Date();
          return {
            id: `BK-${checkout.occupancyId}`,
            guestName: checkout.primaryGuest?.name || "Unknown Guest",
            roomNumber: checkout.room?.roomNumber || "N/A",
            expectedCheckOutDate: expectedDate.toISOString().split('T')[0],
            expectedCheckOutTime: expectedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            balanceAmount: checkout.balanceAmount || 0,
          };
        });
        
        setCheckouts(transformedCheckouts);
      } catch (error) {
        console.error("Error fetching checkouts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchCheckouts();
    }
  }, [session]);

  const today = new Date().toISOString().split("T")[0];
  const upcomingCheckouts = useMemo(
    () => checkouts.filter((checkout) => checkout.expectedCheckOutDate >= today),
    [checkouts, today]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="flex">
        <Sidebar role={userRole} />

        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Upcoming Checkouts</h1>
            <p className="text-muted-foreground">
              Manage upcoming guest checkouts and ensure timely payments.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading checkouts...</p>
            </div>
          ) : upcomingCheckouts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No upcoming checkouts</p>
            </div>
          ) : (
          <div className="grid gap-4">
            {upcomingCheckouts.map((checkout) => (
              <Card key={checkout.id}>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Booking ID</p>
                    <p className="text-lg font-semibold">{checkout.id}</p>
                    <p className="text-sm text-muted-foreground">{checkout.guestName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Room</p>
                    <p className="text-sm font-medium">{checkout.roomNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected Checkout</p>
                    <p className="text-sm font-medium">
                      {checkout.expectedCheckOutDate} • {checkout.expectedCheckOutTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Amount</p>
                    <p className={`text-sm font-semibold ${checkout.balanceAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{checkout.balanceAmount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
