"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface RoomDraft {
  id: string;
  roomNumber: string;
  roomType: string;
  roomCategory: string;
  capacity: number;
  pricePerNight: number;
  description?: string;
}

interface FloorDraft {
  floorNumber: number;
  floorName?: string;
  description?: string;
  rooms: RoomDraft[];
}

interface FloorEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  floor: FloorDraft;
  onSave: (floor: FloorDraft) => void;
}

export default function FloorEditorModal({ isOpen, onClose, floor, onSave }: FloorEditorModalProps) {
  const [draft, setDraft] = useState<FloorDraft>(floor);

  React.useEffect(() => {
    setDraft(floor);
  }, [floor]);

  if (!isOpen) return null;

  const addRoom = () => {
    const newRoom: RoomDraft = {
      id: `r_${Date.now()}`,
      roomNumber: "",
      roomType: "SINGLE",
      roomCategory: "MODERATE",
      capacity: 1,
      pricePerNight: 0,
      description: "",
    };
    setDraft((d) => ({ ...d, rooms: [...d.rooms, newRoom] }));
  };

  const updateRoom = (id: string, patch: Partial<RoomDraft>) => {
    setDraft((d) => ({ ...d, rooms: d.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  };

  const removeRoom = (id: string) => {
    setDraft((d) => ({ ...d, rooms: d.rooms.filter((r) => r.id !== id) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="flex items-center justify-between p-4 border-b">
            <CardTitle>Floor {draft.floorNumber} - {draft.floorName || ""}</CardTitle>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </CardHeader>

          <CardContent className="p-4">
            <div className="mb-4">
              <Label>Floor Name</Label>
              <Input value={draft.floorName || ""} onChange={(e) => setDraft((d) => ({ ...d, floorName: e.target.value }))} />
            </div>

            <div className="mb-4">
              <Label>Floor Description</Label>
              <Input value={draft.description || ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Rooms</h4>
                <Button type="button" onClick={addRoom} size="sm">Add Room</Button>
              </div>

              <div className="space-y-3">
                {draft.rooms.map((room) => (
                  <div key={room.id} className="p-3 border dark:border-gray-700 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <div>
                        <Label>Room Number <span className="text-red-500">*</span></Label>
                        <Input value={room.roomNumber} onChange={(e) => updateRoom(room.id, { roomNumber: e.target.value })} />
                      </div>

                      <div>
                        <Label>Type <span className="text-red-500">*</span></Label>
                        <select value={room.roomType} onChange={(e) => updateRoom(room.id, { roomType: e.target.value })} className="w-full rounded border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2">
                          <option value="SINGLE">Single</option>
                          <option value="DOUBLE">Double</option>
                          <option value="SUITE">Suite</option>
                          <option value="DELUXE">Deluxe</option>
                        </select>
                      </div>

                      <div>
                        <Label>Category</Label>
                        <select value={room.roomCategory} onChange={(e) => updateRoom(room.id, { roomCategory: e.target.value })} className="w-full rounded border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2">
                          <option value="ECONOMY">Economy</option>
                          <option value="MODERATE">Moderate</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="ELITE">Elite</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <div>
                        <Label>Capacity <span className="text-red-500">*</span></Label>
                        <Input type="number" value={room.capacity} onChange={(e) => updateRoom(room.id, { capacity: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Price / Night <span className="text-red-500">*</span></Label>
                        <Input type="number" value={room.pricePerNight} onChange={(e) => updateRoom(room.id, { pricePerNight: Number(e.target.value) })} />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" variant="destructive" onClick={() => removeRoom(room.id)}>Remove</Button>
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input value={room.description || ""} onChange={(e) => updateRoom(room.id, { description: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={() => { onSave(draft); onClose(); }}>Save Floor</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
