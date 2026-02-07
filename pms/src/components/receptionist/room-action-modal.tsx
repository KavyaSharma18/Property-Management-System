"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface RoomActionModalRoom {
  id: number;
  number: string;
  type: string;
  status: "occupied" | "vacant" | "maintenance";
  capacity: number;
  pricePerNight: number;
  guests: number;
  floorNumber: number;
  isGroupBooking?: boolean;
  groupBookingName?: string;
  paidAmount?: number;
  bookingId?: string;
  idProofType?: string;
  idProofNumber?: string;
  checkInAt?: string;
  checkOutAt?: string;
  expectedCheckOutDate?: string;
}

interface PaymentSummary {
  total: number;
  paid: number;
  balance: number;
  status: string;
}

interface RoomActionModalProps {
  open: boolean;
  room: RoomActionModalRoom | null;
  onClose: () => void;
  onCheckIn: () => void;
  onMarkVacant: () => void;
  onRemoveMaintenance: () => void;
  paymentSummary: PaymentSummary | null;
  nights: number;
  formatDate: (date?: string) => string;
  formatDateTime: (date?: string) => string;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  onAddPayment: () => void;
  priceDraft: string;
  onPriceDraftChange: (value: string) => void;
  onUpdatePrice: () => void;
  editCheckOutDate: string;
  onEditCheckOutDateChange: (value: string) => void;
  onUpdateBooking: () => void;
  getFloorLabel: (floorNumber: number) => string;
}

export default function RoomActionModal({
  open,
  room,
  onClose,
  onCheckIn,
  onMarkVacant,
  onRemoveMaintenance,
  paymentSummary,
  nights,
  formatDate,
  formatDateTime,
  paymentAmount,
  onPaymentAmountChange,
  onAddPayment,
  priceDraft,
  onPriceDraftChange,
  onUpdatePrice,
  editCheckOutDate,
  onEditCheckOutDateChange,
  onUpdateBooking,
  getFloorLabel,
}: RoomActionModalProps) {
  if (!open || !room) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold">Room #{room.number}</h3>
            <p className="text-sm text-muted-foreground">
              {room.type} • {getFloorLabel(room.floorNumber)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{room.status}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="font-semibold">{room.capacity} Guests</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-muted-foreground">Current Guests</p>
              <p className="font-semibold">{room.guests}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-muted-foreground">Price / Night</p>
              <p className="font-semibold">₹{room.pricePerNight}</p>
            </div>
            {room.status === "occupied" && (
              <div className="md:col-span-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <p className="text-xs text-muted-foreground">Booking Window</p>
                <p className="font-semibold">
                  {formatDateTime(room.checkInAt)} → {formatDate(room.expectedCheckOutDate)}
                </p>
                {room.checkOutAt && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Checked out at: {formatDateTime(room.checkOutAt)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {nights} days booked
                </p>
              </div>
            )}
          </div>

          {room.isGroupBooking && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
              <span className="font-semibold text-red-700">Group booking</span>
              <span className="text-red-700"> • {room.groupBookingName || "Unknown"}</span>
            </div>
          )}

          {room.status === "occupied" && room.bookingId && (
            <div className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-semibold">{room.bookingId}</p>
              <div className="mt-2 text-sm text-muted-foreground">
                ID Proof: {room.idProofType || "N/A"} {room.idProofNumber ? `• ${room.idProofNumber}` : ""}
              </div>
            </div>
          )}

          {room.status === "occupied" && paymentSummary && (
            <div className="space-y-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <p className="font-semibold">{paymentSummary.status}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-semibold">₹{paymentSummary.total}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="font-semibold">₹{paymentSummary.paid}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="font-semibold">₹{paymentSummary.balance}</p>
              </div>

              {paymentSummary.balance > 0 && (
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Enter amount"
                    type="text"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      onPaymentAmountChange(value);
                    }}
                  />
                  <Button onClick={onAddPayment}>Add Payment</Button>
                </div>
              )}
            </div>
          )}

          {room.status === "vacant" && (
            <div className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-muted-foreground mb-2">Update Price / Night</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={priceDraft}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    onPriceDraftChange(value);
                  }}
                  placeholder="New price"
                  type="text"
                  inputMode="decimal"
                />
                <Button variant="outline" onClick={onUpdatePrice}>
                  Update Price
                </Button>
              </div>
            </div>
          )}

          {room.status === "occupied" && (
            <div className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-muted-foreground mb-2">Extend Booking</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={editCheckOutDate}
                  onChange={(e) => onEditCheckOutDateChange(e.target.value)}
                  type="date"
                />
              </div>
              <div className="mt-3">
                <Button variant="outline" onClick={onUpdateBooking}>
                  Save Booking Changes
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-end">
            {room.status === "vacant" && (
              <Button onClick={onCheckIn}>Check In Guest</Button>
            )}
            {room.status === "occupied" && (
              <Button variant="outline" onClick={onMarkVacant}>
                Mark Vacant (to Maintenance)
              </Button>
            )}
            {room.status === "maintenance" && (
              <Button variant="outline" onClick={onRemoveMaintenance}>
                Remove Maintenance
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
