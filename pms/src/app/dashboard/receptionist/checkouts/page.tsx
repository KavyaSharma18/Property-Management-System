"use client";

import { useMemo } from "react";
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

const MOCK_CHECKOUTS: Checkout[] = [
  {
    id: "BK-2026-0001",
    guestName: "Sundar Sharma",
    roomNumber: "G01",
    expectedCheckOutDate: "2026-02-04",
    expectedCheckOutTime: "11:00 AM",
    balanceAmount: 0,
  },
  {
    id: "BK-2026-0003",
    guestName: "Nisha Rao",
    roomNumber: "201",
    expectedCheckOutDate: "2026-02-04",
    expectedCheckOutTime: "10:30 AM",
    balanceAmount: 1200,
  },
  {
    id: "BK-2026-0005",
    guestName: "Rahul Mehta",
    roomNumber: "102",
    expectedCheckOutDate: "2026-02-05",
    expectedCheckOutTime: "12:00 PM",
    balanceAmount: 2500,
  },
  {
    id: "BK-2026-0007",
    guestName: "Priya Verma",
    roomNumber: "G03",
    expectedCheckOutDate: "2026-02-05",
    expectedCheckOutTime: "11:00 AM",
    balanceAmount: 0,
  },
  {
    id: "BK-2026-0009",
    guestName: "Amit Kumar",
    roomNumber: "203",
    expectedCheckOutDate: "2026-02-06",
    expectedCheckOutTime: "10:00 AM",
    balanceAmount: 800,
  },
  {
    id: "BK-2026-0011",
    guestName: "Kavita Singh",
    roomNumber: "F01",
    expectedCheckOutDate: "2026-02-06",
    expectedCheckOutTime: "11:30 AM",
    balanceAmount: 0,
  },
  {
    id: "BK-2026-0013",
    guestName: "Rajesh Patel",
    roomNumber: "105",
    expectedCheckOutDate: "2026-02-07",
    expectedCheckOutTime: "12:00 PM",
    balanceAmount: 3200,
  },
  {
    id: "BK-2026-0015",
    guestName: "Sneha Desai",
    roomNumber: "301",
    expectedCheckOutDate: "2026-02-08",
    expectedCheckOutTime: "11:00 AM",
    balanceAmount: 0,
  },
];

export default function ReceptionistCheckoutsPage() {
  const { data: session } = useSession();
  const rawRole = (session?.user as { role?: string } | undefined)?.role;
  const userRole = (rawRole === "owner" ? "owner" : "receptionist") as "owner" | "receptionist";

  const today = new Date().toISOString().split("T")[0];
  const upcomingCheckouts = useMemo(
    () => MOCK_CHECKOUTS.filter((checkout) => checkout.expectedCheckOutDate > today),
    [today]
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
              Demo data. Will be fetched from database later.
            </p>
          </div>

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

            {upcomingCheckouts.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                No upcoming checkouts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
