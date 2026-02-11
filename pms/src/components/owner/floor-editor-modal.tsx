"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoomDraft {
  id: string;
  roomNumber: string;
  roomType: string;
  roomCategory: string;
  capacity: number;
  pricePerNight: number;
  description?: string;
  isOccupied?: boolean;
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

interface EnumOption {
  value: string;
  label: string;
}

interface Enums {
  roomTypes: EnumOption[];
  roomCategories: EnumOption[];
}

export default function FloorEditorModal({ isOpen, onClose, floor, onSave }: FloorEditorModalProps) {
  const [draft, setDraft] = useState<FloorDraft>(floor);
  const [enums, setEnums] = useState<Enums>({ roomTypes: [], roomCategories: [] });
  const [isLoadingEnums, setIsLoadingEnums] = useState(true);
  const [duplicateRoomNumbers, setDuplicateRoomNumbers] = useState<string[]>([]);

  useEffect(() => {
    setDraft(floor);
  }, [floor]);

  // Check for duplicate room numbers whenever draft changes
  useEffect(() => {
    const roomNumbers: { [key: string]: number } = {};
    const duplicates: string[] = [];

    draft.rooms.forEach((room) => {
      if (room.roomNumber && room.roomNumber.trim()) {
        const roomNum = room.roomNumber.trim().toUpperCase();
        roomNumbers[roomNum] = (roomNumbers[roomNum] || 0) + 1;
      }
    });

    Object.entries(roomNumbers).forEach(([roomNum, count]) => {
      if (count > 1) {
        duplicates.push(roomNum);
      }
    });

    setDuplicateRoomNumbers(duplicates);
    
    // Show toast notification when duplicates are detected
    if (duplicates.length > 0) {
      toast.error(`Duplicate room numbers detected: ${duplicates.join(", ")}`, {
        description: "Each room must have a unique room number on this floor.",
        duration: 4000,
      });
    }
  }, [draft.rooms]);

  // Fetch enums from backend
  useEffect(() => {
    const fetchEnums = async () => {
      try {
        setIsLoadingEnums(true);
        const res = await fetch('/api/enums');
        if (res.ok) {
          const data = await res.json();
          setEnums({
            roomTypes: data.roomTypes || [],
            roomCategories: data.roomCategories || [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch enums:', error);
      } finally {
        setIsLoadingEnums(false);
      }
    };

    if (isOpen) {
      fetchEnums();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addRoom = () => {
    const newRoom: RoomDraft = {
      id: `r_${Date.now()}`,
      roomNumber: "",
      roomType: enums.roomTypes[0]?.value || "",
      roomCategory: enums.roomCategories[0]?.value || "",
      capacity: 1,
      pricePerNight: 0,
      description: "",
      isOccupied: false,
    };
    setDraft((d) => ({ ...d, rooms: [...d.rooms, newRoom] }));
  };

  const isRoomValid = (room: RoomDraft) => {
    return (
      room.roomNumber?.trim() !== "" &&
      room.roomType !== "" &&
      room.roomCategory !== "" &&
      room.capacity > 0 &&
      room.pricePerNight > 0
    );
  };

  const hasInvalidRooms = () => {
    return draft.rooms.some(room => !isRoomValid(room));
  };

  const updateRoom = (id: string, patch: Partial<RoomDraft>) => {
    setDraft((d) => ({ ...d, rooms: d.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  };

  const removeRoom = (id: string) => {
    setDraft((d) => ({ ...d, rooms: d.rooms.filter((r) => r.id !== id) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <Card>
          <CardHeader className="flex items-center justify-between p-4 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
            <CardTitle>Floor {draft.floorNumber} - {draft.floorName || ""}</CardTitle>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          </CardHeader>

          <CardContent className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {duplicateRoomNumbers.length > 0 && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-700 rounded-lg shadow-lg animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">!</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-red-900 dark:text-red-200 font-bold text-base mb-1">
                      ⚠️ Duplicate Room Numbers Detected
                    </h4>
                    <p className="text-red-800 dark:text-red-300 text-sm font-medium">
                      The following room numbers appear more than once: <strong>{duplicateRoomNumbers.join(", ")}</strong>
                    </p>
                    <p className="text-red-700 dark:text-red-400 text-xs mt-2">
                      Please ensure each room has a unique room number before saving.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <Label>Floor Name</Label>
              <Input 
                value={draft.floorName || ""} 
                onChange={(e) => setDraft((d) => ({ ...d, floorName: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />
            </div>

            <div className="mb-4">
              <Label>Floor Description</Label>
              <Input 
                value={draft.description || ""} 
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Rooms</h4>
                <Button type="button" onClick={addRoom} size="sm" disabled={isLoadingEnums}>
                  Add Room
                </Button>
              </div>
              
              {draft.rooms.some(r => r.isOccupied) && (
                <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900/20 border border-blue-500 dark:border-blue-700 rounded text-xs text-blue-800 dark:text-blue-200">
                  ℹ️ Occupied rooms cannot be removed. Please check out guests before removing rooms.
                </div>
              )}

              {isLoadingEnums ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading options...</span>
                </div>
              ) : (
                <div className="space-y-3">
                    {draft.rooms.map((room) => {
                      const isDuplicate = room.roomNumber && 
                        duplicateRoomNumbers.includes(room.roomNumber.trim().toUpperCase());
                    const isValid = isRoomValid(room);
                    
                    return (
                      <div key={room.id} className={`p-3 border rounded ${
                        room.isOccupied
                          ? "border-blue-500 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10"
                          : isDuplicate 
                          ? "border-red-500 dark:border-red-700 bg-red-50 dark:bg-red-900/10" 
                          : !isValid 
                            ? "border-yellow-500 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10"
                            : "dark:border-gray-700"
                      }`}>
                        {room.isOccupied && (
                          <div className="mb-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded inline-block">
                            🔒 OCCUPIED - Cannot Remove
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                          <div>
                            <Label>
                              Room Number <span className="text-red-500">*</span>
                              {isDuplicate && <span className="text-red-500 text-xs ml-2">(Duplicate!)</span>}
                            </Label>
                            <Input 
                              value={room.roomNumber} 
                              onChange={(e) => updateRoom(room.id, { roomNumber: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                }
                              }}                            className={isDuplicate ? "border-red-500" : ""}
                          />
                        </div>
                        <div>
                          <Label>Type <span className="text-red-500">*</span></Label>
                          <select 
                            value={room.roomType} 
                            onChange={(e) => updateRoom(room.id, { roomType: e.target.value })} 
                            className="w-full rounded border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2"
                          >
                            {enums.roomTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label>Category <span className="text-red-500">*</span></Label>
                          <select 
                            value={room.roomCategory} 
                            onChange={(e) => updateRoom(room.id, { roomCategory: e.target.value })} 
                            className="w-full rounded border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2"
                          >
                            {enums.roomCategories.map((category) => (
                              <option key={category.value} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <div>
                          <Label>Capacity <span className="text-red-500">*</span></Label>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            value={room.capacity || ""} 
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              updateRoom(room.id, { capacity: value ? Number(value) : 0 });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label>Price / Night <span className="text-red-500">*</span></Label>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            value={room.pricePerNight || ""} 
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              updateRoom(room.id, { pricePerNight: value ? Number(value) : 0 });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                            className={room.pricePerNight === 0 ? "border-yellow-500" : ""}
                          />
                          {room.pricePerNight === 0 && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-500">Price is required</span>
                          )}
                        </div>
                        <div className="flex items-end">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={() => removeRoom(room.id)}
                            disabled={room.isOccupied}
                            title={room.isOccupied ? "Cannot remove occupied rooms" : "Remove room"}
                          >
                            {room.isOccupied ? "Occupied - Cannot Remove" : "Remove"}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Input 
                          value={room.description || ""} 
                          onChange={(e) => updateRoom(room.id, { description: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
          )}
            </div>
          </CardContent>

          <div className="p-4 border-t flex items-center gap-3 justify-end sticky bottom-0 bg-white dark:bg-gray-800">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="button" 
              onClick={() => { 
                if (hasInvalidRooms()) {
                  toast.error("Please fill all required fields with valid values", {
                    description: "All rooms must have a room number, type, category, capacity > 0, and price > 0",
                    duration: 4000,
                  });
                  return;
                }
                onSave(draft); 
                onClose(); 
              }}
              disabled={duplicateRoomNumbers.length > 0 || hasInvalidRooms()}
            >
              Save Floor
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
