"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import BookingEditModal from "@/components/receptionist/booking-edit-modal";

interface Booking {
  id: string;
  guestName: string;
  idProofType: string;
  idProofNumber: string;
  rooms: string[];
  checkInDate: string;
  checkOutDate: string;
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: "BK-2026-0001",
    guestName: "Sundar Sharma",
    idProofType: "AADHAR",
    idProofNumber: "XXXX-1234",
    rooms: ["G01", "202"],
    checkInDate: "2026-02-02",
    checkOutDate: "2026-02-05",
  },
  {
    id: "BK-2026-0002",
    guestName: "Aarav Patel",
    idProofType: "PASSPORT",
    idProofNumber: "P1234567",
    rooms: ["101"],
    checkInDate: "2026-02-01",
    checkOutDate: "2026-02-04",
  },
  {
    id: "BK-2026-0003",
    guestName: "Nisha Rao",
    idProofType: "DRIVING_LICENSE",
    idProofNumber: "DL-9988",
    rooms: ["201"],
    checkInDate: "2026-02-03",
    checkOutDate: "2026-02-06",
  },
];

const calculateDays = (checkInDate: string, checkOutDate: string) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
};

export default function ManageBookingsPage() {
  const { data: session } = useSession();
  const rawRole = (session?.user as { role?: string } | undefined)?.role;
  const userRole = (rawRole === "owner" ? "owner" : "receptionist") as "owner" | "receptionist";

  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [editRooms, setEditRooms] = useState("");
  const [editCheckOutDate, setEditCheckOutDate] = useState("");

  const selectedBooking = selectedBookingId
    ? bookings.find((booking) => booking.id === selectedBookingId) || null
    : null;

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return bookings;
    return bookings.filter((booking) => {
      return (
        booking.id.toLowerCase().includes(query) ||
        booking.guestName.toLowerCase().includes(query) ||
        booking.rooms.join(",").toLowerCase().includes(query)
      );
    });
  }, [bookings, searchTerm]);

  const openEditModal = (booking: Booking) => {
    setSelectedBookingId(booking.id);
    setEditRooms(booking.rooms.join(", "));
    setEditCheckOutDate(booking.checkOutDate);
  };

  const closeEditModal = () => {
    setSelectedBookingId(null);
  };

  const handleSaveBooking = () => {
    if (!selectedBooking) return;
    const rooms = editRooms
      .split(",")
      .map((room) => room.trim())
      .filter(Boolean);

    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === selectedBooking.id
          ? {
              ...booking,
              rooms: rooms.length ? rooms : booking.rooms,
              checkOutDate: editCheckOutDate || booking.checkOutDate,
            }
          : booking
      )
    );
    closeEditModal();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />

      <div className="flex">
        <Sidebar role={userRole} />

        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Manage Bookings</h1>
            <p className="text-muted-foreground">
              Search, view, and update booking details
            </p>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, guest, or room number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Booking ID</p>
                    <p className="text-lg font-semibold">{booking.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.guestName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ID Proof</p>
                    <p className="text-sm font-medium">
                      {booking.idProofType} • {booking.idProofNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Rooms: {booking.rooms.join(", ")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Booked For</p>
                    <p className="text-sm font-medium">
                      {calculateDays(booking.checkInDate, booking.checkOutDate)} days
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.checkInDate} → {booking.checkOutDate}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => openEditModal(booking)}>
                    Edit Booking
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BookingEditModal
        open={Boolean(selectedBooking)}
        bookingId={selectedBooking?.id || ""}
        guestName={selectedBooking?.guestName || ""}
        roomsValue={editRooms}
        checkOutDateValue={editCheckOutDate}
        onRoomsChange={setEditRooms}
        onCheckOutDateChange={setEditCheckOutDate}
        onClose={closeEditModal}
        onSave={handleSaveBooking}
      />
    </div>
  );
}
