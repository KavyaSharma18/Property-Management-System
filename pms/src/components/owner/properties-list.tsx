"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import FloorEditorModal from "@/components/owner/floor-editor-modal";
import { ChevronDown } from "lucide-react";
import { Trash2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  description?: string;
  totalRooms?: number;
  numberOfFloors?: number;
  status?: string;
  receptionist?: { id: string; name: string } | null;
}

export default function PropertiesList({ initial = [] }: { initial?: Property[] }) {
  const [properties, setProperties] = useState<Property[]>(initial);
  const [showForm, setShowForm] = useState(false);
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
  const [floors, setFloors] = useState<any[]>([]);
  const [editingFloor, setEditingFloor] = useState<any | null>(null);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    const parsedAmenities = amenities.split(",").map((s) => s.trim()).filter(Boolean);
    const parsedImages = images.split(",").map((s) => s.trim()).filter(Boolean);

    const newProp: Property = {
      id: `prop_${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      description: description.trim(),
      totalRooms: floors.reduce((acc, f) => acc + (f.rooms?.length || 0), 0),
      numberOfFloors: numberOfFloors,
      status: "ACTIVE",
      receptionist: null,
      // attach additional metadata for preview (not persisted yet)
      // @ts-ignore
      city: city,
      // @ts-ignore
      state: stateVal,
      // @ts-ignore
      zipCode: zipCode,
      // @ts-ignore
      country: country,
      // @ts-ignore
      amenities: JSON.stringify(parsedAmenities),
      // @ts-ignore
      images: JSON.stringify(parsedImages),
      // @ts-ignore
      floors: floors,
    };

    setProperties((p) => [newProp, ...p]);
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
    setFloors([]);
    setShowForm(false);
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

  const handleDeleteProperty = (id: string) => {
    const ok = window.confirm("Delete this property? This cannot be undone.");
    if (!ok) return;
    setProperties((prev) => prev.filter((p) => p.id !== id));
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
          >
            {showForm ? "Cancel" : "Add Property"}
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 bg-white dark:bg-gray-950 rounded-lg shadow p-6 space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amenities">Amenities (comma separated)</Label>
              <Input id="amenities" value={amenities} onChange={(e) => setAmenities(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="images">Images (comma separated URLs)</Label>
              <Input id="images" value={images} onChange={(e) => setImages(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="floors">Number of Floors <span className="text-red-500">*</span></Label>
              <div className="relative">
                <select
                  id="floors"
                  value={numberOfFloors}
                  onChange={(e) => { const n = Number(e.target.value); setNumberOfFloors(n); ensureFloors(n); }}
                  className="w-full rounded border p-2 pr-8 appearance-none bg-white dark:bg-gray-800 text-black dark:text-white"
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground dark:text-white" size={16} />
              </div>
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
            <Label>Floors</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {floors.map((f, idx) => (
                <div key={idx} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{f.floorName || `Floor ${f.floorNumber}`}</div>
                    <div className="text-xs text-muted-foreground">Rooms: {f.rooms?.length || 0}</div>
                  </div>
                  <div>
                    <Button size="sm" type="button" onClick={() => openFloorEditor(idx)}>Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit">Add Property</Button>
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>

          <FloorEditorModal isOpen={isFloorModalOpen} onClose={() => setIsFloorModalOpen(false)} floor={editingFloor || { floorNumber: 1, floorName: "Floor 1", description: "", rooms: [] }} onSave={(f) => { saveFloor(f); setIsFloorModalOpen(false); }} />
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <Card key={p.id} className="hover:shadow-lg transition-shadow">
            <CardContent>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/dashboard/owner/properties/${p.id}`} className="block flex-1">
                  <CardTitle className="text-xl mb-1">{p.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mb-3">{p.address}</p>
                  {p.receptionist ? (
                    <p className="text-xs text-muted-foreground">Receptionist: {p.receptionist.name} ({p.receptionist.id})</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Receptionist: Not assigned</p>
                  )}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProperty(p.id); }}
                  aria-label="Delete property"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
