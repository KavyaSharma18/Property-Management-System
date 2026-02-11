"use client";

import { useMemo, useState, useEffect } from "react";
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
  occupancyId: string;
  guestName: string;
  idProofType: string;
  idProofNumber: string;
  rooms: string[];
  checkInDate: string;
  checkOutDate: string;
  bookingSource?: string;
  isCorporate?: boolean;
}

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [editRooms, setEditRooms] = useState("");
  const [editCheckOutDate, setEditCheckOutDate] = useState("");

  // Fetch active occupancies from API
  useEffect(() => {
    async function fetchBookings() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/receptionist/occupancies?status=active");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error:", response.status, errorData);
          throw new Error(`Failed to fetch bookings: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched bookings data:", data);
        
        // Transform occupancies to bookings format
        const transformedBookings: Booking[] = (data.occupancies || []).map((occ: any) => {
          const primaryGuest = occ.primaryGuest || occ.guests?.[0];
          return {
            id: `BK-${occ.id}`,
            occupancyId: occ.id,
            guestName: primaryGuest?.name || "Unknown Guest",
            idProofType: primaryGuest?.idProofType || "N/A",
            idProofNumber: primaryGuest?.idProofNumber || "N/A",
            rooms: [occ.room?.roomNumber || "N/A"],
            checkInDate: occ.checkInDate ? new Date(occ.checkInDate).toISOString().split('T')[0] : "",
            checkOutDate: occ.expectedCheckOut ? new Date(occ.expectedCheckOut).toISOString().split('T')[0] : "",
            bookingSource: occ.bookingSource || "WALK_IN",
            isCorporate: !!occ.corporateBookingId || occ.bookingSource === "CORPORATE",
          };
        });
        
        setBookings(transformedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchBookings();
    }
  }, [session]);

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

  const handleSaveBooking = async () => {
    if (!selectedBooking) return;
    
    if (!editCheckOutDate) {
      alert("Please select a checkout date");
      return;
    }
    
    try {
      console.log("Updating booking:", selectedBooking.occupancyId, editCheckOutDate);
      const response = await fetch(`/api/receptionist/occupancies/${selectedBooking.occupancyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedCheckOut: new Date(editCheckOutDate).toISOString(),
        }),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        let errorMessage = "Failed to update booking";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Update successful:", result);

      // Update local state
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBooking.id
            ? {
                ...booking,
                checkOutDate: editCheckOutDate,
              }
            : booking
        )
      );
      
      alert("Booking updated successfully!");
      closeEditModal();
    } catch (error) {
      console.error("Update booking error:", error);
      alert(error instanceof Error ? error.message : "Failed to update booking");
    }
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

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No active bookings found</p>
            </div>
          ) : (
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                    {/* Booking ID & Guest */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Booking ID</p>
                      <p className="text-lg font-semibold">{booking.id}</p>
                      <p className="text-sm text-muted-foreground">{booking.guestName}</p>
                      {booking.isCorporate && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                          CORPORATE
                        </span>
                      )}
                    </div>
                    
                    {/* ID Proof & Rooms */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">ID Proof</p>
                      <p className="text-sm font-medium">{booking.idProofType} • {booking.idProofNumber}</p>
                      <p className="text-sm text-muted-foreground">Rooms: {booking.rooms.join(", ")}</p>
                    </div>
                    
                    {/* Booking Source & Duration */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Booking Source</p>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {(booking.bookingSource || 'WALK_IN').replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {calculateDays(booking.checkInDate, booking.checkOutDate)} days
                      </p>
                    </div>
                    
                    {/* Dates & Action */}
                    <div className="space-y-1 flex flex-col items-start md:items-end">
                      <p className="text-xs text-muted-foreground">Check-in → Check-out</p>
                      <p className="text-sm font-medium">
                        {booking.checkInDate} → {booking.checkOutDate}
                      </p>
                      <Button variant="outline" onClick={() => openEditModal(booking)} className="mt-2">
                        Edit Booking
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            )}
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
