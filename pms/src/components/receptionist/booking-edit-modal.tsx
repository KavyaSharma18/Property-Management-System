"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BookingEditModalProps {
  open: boolean;
  bookingId: string;
  guestName: string;
  roomsValue: string;
  checkOutDateValue: string;
  onRoomsChange: (value: string) => void;
  onCheckOutDateChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function BookingEditModal({
  open,
  bookingId,
  guestName,
  roomsValue,
  checkOutDateValue,
  onRoomsChange,
  onCheckOutDateChange,
  onClose,
  onSave,
}: BookingEditModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold">Edit Booking</h3>
            <p className="text-sm text-muted-foreground">{bookingId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <Label>Guest Name</Label>
            <Input value={guestName} disabled />
          </div>
          <div>
            <Label>Rooms (comma separated)</Label>
            <Input value={roomsValue} onChange={(e) => onRoomsChange(e.target.value)} />
          </div>
          <div>
            <Label>Extend / Update Check-Out</Label>
            <Input
              type="date"
              value={checkOutDateValue}
              onChange={(e) => onCheckOutDateChange(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
