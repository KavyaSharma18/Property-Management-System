"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FloorEditorModal from "@/components/owner/floor-editor-modal";
import { ChevronDown, Loader2, AlertCircle, Trash2, Building2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  totalRooms?: number;
  numberOfFloors?: number;
  status?: string;
  receptionist?: { id: string; name: string; email: string } | null;
  actualRoomsCreated?: number;
  roomsRemaining?: number;
  roomCreationProgress?: number;
  floors?: any[];
  amenities?: string[] | string | null;
  images?: string[] | string | null;
}

export default function PropertiesList({ initial = [] }: { initial?: Property[] }) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("India");
  const [amenities, setAmenities] = useState(""); // comma separated
  const [images, setImages] = useState(""); // comma separated URLs
  const [numberOfFloors, setNumberOfFloors] = useState<number>(1);
  const [totalRooms, setTotalRooms] = useState<number>(0);
  const [floors, setFloors] = useState<any[]>([]);
  const [editingFloor, setEditingFloor] = useState<any | null>(null);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [originalFloorCount, setOriginalFloorCount] = useState<number>(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Name and address are required");
      return;
    }

    // Calculate total rooms from floors
    const calculatedTotalRooms = floors.reduce((acc, f) => acc + (f.rooms?.length || 0), 0);
    
    if (calculatedTotalRooms === 0) {
      setError("Please add at least one room to at least one floor");
      return;
    }

    // Check for duplicate room numbers across all floors
    const allRoomNumbers: string[] = [];
    const duplicates: string[] = [];
    
    floors.forEach((floor) => {
      (floor.rooms || []).forEach((room: any) => {
        if (room.roomNumber) {
          const roomNum = room.roomNumber.trim().toUpperCase();
          if (allRoomNumbers.includes(roomNum)) {
            if (!duplicates.includes(roomNum)) {
              duplicates.push(roomNum);
            }
          } else {
            allRoomNumbers.push(roomNum);
          }
        }
      });
    });

    if (duplicates.length > 0) {
      const errorMsg = `Duplicate room numbers found: ${duplicates.join(", ")}. Each room must have a unique room number.`;
      setError(errorMsg);
      toast.error("Duplicate Room Numbers", {
        description: errorMsg,
        duration: 5000,
      });
      return;
    }

    // Check for empty room numbers
    const hasEmptyRoomNumber = floors.some((floor) => 
      (floor.rooms || []).some((room: any) => !room.roomNumber || !room.roomNumber.trim())
    );
    
    if (hasEmptyRoomNumber) {
      const errorMsg = "All rooms must have a room number.";
      setError(errorMsg);
      toast.error("Missing Room Numbers", {
        description: errorMsg,
        duration: 5000,
      });
      return;
    }

    if (hasEmptyRoomNumber) {
      setError("All rooms must have a room number");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedAmenities = amenities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const parsedImages = images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const isEditing = editingProperty !== null;

      // Prepare payload - includes floors for both create and edit (API now handles updates intelligently)
      const payload: any = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
        state: stateVal.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        country: country.trim() || "India",
        description: description.trim() || undefined,
        numberOfFloors: numberOfFloors,
        totalRooms: calculatedTotalRooms,
        floors: floors.map((floor) => ({
          floorNumber: floor.floorNumber,
          floorName: floor.floorName || `Floor ${floor.floorNumber}`,
          description: floor.description || "",
          rooms: (floor.rooms || []).map((room: any) => ({
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: parseInt(room.capacity) || 1,
            pricePerNight: parseFloat(room.pricePerNight) || 0,
            roomCategory: room.roomCategory || "MODERATE",
            description: room.description || "",
            amenities: room.amenities || [],
            images: room.images || [],
          })),
        })),
      };
      const url = isEditing ? `/api/owner/properties/${editingProperty.id}` : "/api/owner/properties";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create property");
      }

      // Show success toast
      toast.success(isEditing ? "Property Updated Successfully!" : "Property Created Successfully!", {
        description: `${name} has been ${isEditing ? 'updated' : 'added'} with ${calculatedTotalRooms} rooms.`,
        duration: 5000,
      });
      
      // Refresh the page to show changes
      router.refresh();
      
      // Reset form
      setName("");
      setAddress("");
      setDescription("");
      setCity("");
      setStateVal("");
      setZipCode("");
      setCountry("India");
      setAmenities("");
      setImages("");
      setNumberOfFloors(1);
      setTotalRooms(0);
      setFloors([]);
      setShowForm(false);
      setError(null);
      setEditingProperty(null);
      setOriginalFloorCount(0);
    } catch (err: any) {
      console.error("Error creating property:", err);
      const errorMsg = err.message || "Failed to create property";
      setError(errorMsg);
      toast.error("Failed to Create Property", {
        description: errorMsg,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ensureFloors = (n: number) => {
    setFloors((prev) => {
      const copy = [...prev];
      for (let i = 1; i <= n; i++) {
        if (!copy[i - 1]) {
          copy[i - 1] = { floorNumber: i, floorName: `Floor ${i}`, description: "", rooms: [] };
        }
      }
      return copy.slice(0, n);
    });
  };

  const openFloorEditor = (index: number) => {
    const fl = floors[index];
    setEditingFloor({ ...fl, _index: index });
    setIsFloorModalOpen(true);
  };

  const saveFloor = (floorDraft: any) => {
    setFloors((prev) => {
      const copy = [...prev];
      copy[floorDraft.floorNumber - 1] = floorDraft;
      return copy;
    });
  };

  const handleEdit = async (property: Property) => {
    try {
      // Fetch detailed property information with occupancies
      const res = await fetch(`/api/owner/properties/${property.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch property details");
      }
      const data = await res.json();
      const detailedProperty = data.property;

      setEditingProperty(detailedProperty);
      setName(detailedProperty.name);
      setAddress(detailedProperty.address);
      setDescription(detailedProperty.description || "");
      setCity(detailedProperty.city || "");
      setStateVal(detailedProperty.state || "");
      setZipCode(detailedProperty.zipCode || "");
      setCountry(detailedProperty.country || "India");
      // Store original floor count to prevent reduction
      const originalFloors = detailedProperty.numberOfFloors || 1;
      setOriginalFloorCount(originalFloors);
      setNumberOfFloors(originalFloors);
      setTotalRooms(detailedProperty.totalRooms || 0);
      
      // Load floors data and map to the correct format
      if (detailedProperty.floors && detailedProperty.floors.length > 0) {
        const mappedFloors = detailedProperty.floors.map((floor: any) => {
          // Get rooms for this floor from the property.rooms array
          const floorRooms = (detailedProperty.rooms || [])
            .filter((room: any) => room.floorId === floor.id)
            .map((room: any) => ({
              id: room.id || `r_${Date.now()}_${Math.random()}`,
              roomNumber: room.roomNumber,
              roomType: room.roomType,
              roomCategory: room.roomCategory,
              capacity: room.capacity,
              pricePerNight: room.pricePerNight,
              description: room.description || "",
              amenities: parseArrayField(room.amenities),
              images: parseArrayField(room.images),
              isOccupied: room.occupancies && room.occupancies.length > 0,
            }));
          
          return {
            floorNumber: floor.floorNumber,
            floorName: floor.floorName || `Floor ${floor.floorNumber}`,
            description: floor.description || "",
            rooms: floorRooms,
          };
        });
        setFloors(mappedFloors);
      } else {
        ensureFloors(detailedProperty.numberOfFloors || 1);
      }
      
      setShowForm(true);
      setError(null);
    } catch (error) {
      console.error("Failed to load property for editing:", error);
      toast.error("Failed to load property details");
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const ok = window.confirm("Delete this property? This action cannot be undone and will remove all associated floors, rooms, and data.");
    if (!ok) return;

    try {
      const res = await fetch(`/api/owner/properties/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete property");
      }

      // Refresh the page to reflect changes
      router.refresh();
    } catch (err: any) {
      console.error("Error deleting property:", err);
      alert(err.message || "Failed to delete property");
    }
  };

  // Parse amenities/images for display
  const parseArrayField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Properties</h2>
        <div>
          <Button
            onClick={() => {
              setShowForm((s) => {
                const next = !s;
                if (next) ensureFloors(numberOfFloors);
                return next;
              });
            }}
            className="gap-2"
            disabled={isSubmitting}
          >
            {showForm ? "Cancel" : "Add Property"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 bg-white dark:bg-gray-950 rounded-lg shadow p-6 space-y-4">
          <h3 className="text-xl font-semibold mb-4">
            {editingProperty ? "Edit Property" : "Create New Property"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Property Name <span className="text-red-500">*</span></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="zip">Zip Code</Label>
              <Input id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="floors">Number of Floors <span className="text-red-500">*</span></Label>
              <div className="relative">
                <select
                  id="floors"
                  value={numberOfFloors}
                  onChange={(e) => { 
                    const n = Number(e.target.value);
                    // When editing, only allow increasing floors
                    if (editingProperty && n < originalFloorCount) {
                      setError(`Cannot reduce floors from ${originalFloorCount} to ${n}. You can only add more floors.`);
                      return;
                    }
                    setNumberOfFloors(n); 
                    ensureFloors(n); 
                  }}
                  className="w-full rounded border p-2 pr-8 appearance-none bg-white dark:bg-gray-800 text-black dark:text-white"
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    const floorNum = i + 1;
                    // When editing, disable options below original count
                    const isDisabled = !!(editingProperty && floorNum < originalFloorCount);
                    return (
                      <option key={i} value={floorNum} disabled={isDisabled}>
                        {floorNum} {isDisabled ? '(Cannot reduce)' : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground dark:text-white" size={16} />
              </div>
              {editingProperty && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  ✓ Can add more floors | ✗ Cannot reduce from {originalFloorCount}
                </p>
              )}
            </div>

            <div>
              <Label>Preview Total Rooms</Label>
              <div className="mt-2 text-lg font-semibold">{floors.reduce((acc, f) => acc + (f.rooms?.length || 0), 0)}</div>
            </div>

            <div>
              <Label>Status</Label>
              <div className="relative">
                <select className="w-full rounded border p-2 pr-8 appearance-none bg-white dark:bg-gray-800 text-black dark:text-white">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground dark:text-white" size={16} />
              </div>
            </div>
          </div>

          <div>
            <Label>Floors & Rooms</Label>
            {editingProperty && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 mb-2">
                ✓ Update existing rooms | ✓ Add new rooms | ✗ Cannot remove rooms with bookings
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {floors.map((f, idx) => (
                <div key={idx} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{f.floorName || `Floor ${f.floorNumber}`}</div>
                    <div className="text-xs text-muted-foreground">Rooms: {f.rooms?.length || 0}</div>
                  </div>
                  <div>
                    <Button 
                      size="sm" 
                      type="button" 
                      onClick={() => openFloorEditor(idx)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingProperty ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingProperty ? "Update Property" : "Create Property"
              )}
            </Button>
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => {
                setShowForm(false);
                setError(null);
                setEditingProperty(null);
                setOriginalFloorCount(0);
                setFloors([]);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>

          <FloorEditorModal isOpen={isFloorModalOpen} onClose={() => setIsFloorModalOpen(false)} floor={editingFloor || { floorNumber: 1, floorName: "Floor 1", description: "", rooms: [] }} onSave={(f) => { saveFloor(f); setIsFloorModalOpen(false); }} />
        </form>
      )}

      {properties.length === 0 && !showForm ? (
        <Card className="p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first property to start managing your hotel business
          </p>
          <Button onClick={() => { setShowForm(true); ensureFloors(numberOfFloors); }}>
            Add Your First Property
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Card key={p.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <Link href={`/dashboard/owner/properties/${p.id}`} className="block flex-1">
                    <CardTitle className="text-xl mb-1 hover:text-primary">{p.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-2">{p.address}</p>
                    {p.city && (
                      <p className="text-xs text-muted-foreground">
                        {p.city}{p.state ? `, ${p.state}` : ""} {p.zipCode || ""}
                      </p>
                    )}
                  </Link>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(p); }}
                      aria-label="Edit property"
                    >
                      <Edit size={18} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProperty(p.id); }}
                      aria-label="Delete property"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Rooms:</span>
                    <span className="font-medium">{p.totalRooms || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Floors:</span>
                    <span className="font-medium">{p.numberOfFloors || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                      {p.status || "ACTIVE"}
                    </Badge>
                  </div>
                  
                  {p.actualRoomsCreated !== undefined && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Rooms Created:</span>
                        <span className="font-medium">
                          {p.actualRoomsCreated} / {p.totalRooms}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${p.roomCreationProgress || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.roomCreationProgress?.toFixed(0)}% Complete
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    {p.receptionist ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Receptionist</p>
                        <p className="text-sm font-medium">{p.receptionist.name}</p>
                        <p className="text-xs text-muted-foreground">{p.receptionist.email}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground">Receptionist</p>
                        <p className="text-sm font-medium text-yellow-600">Not assigned</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
