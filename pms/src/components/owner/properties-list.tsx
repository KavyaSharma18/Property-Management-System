"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    const newProp: Property = {
      id: `prop_${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      description: description.trim(),
      totalRooms: 0,
      numberOfFloors: 0,
      status: "ACTIVE",
      receptionist: null,
    };

    setProperties((p) => [newProp, ...p]);
    setName("");
    setAddress("");
    setDescription("");
    setShowForm(false);
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Properties</h2>
        <div>
          <Button onClick={() => setShowForm((s) => !s)} className="gap-2">
            {showForm ? "Cancel" : "Add Property"}
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 bg-white dark:bg-gray-950 rounded-lg shadow p-6 space-y-4">
          <div>
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit">Add Property</Button>
            <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <Card key={p.id} className="hover:shadow-lg transition-shadow">
            <CardContent>
              <Link href={`/dashboard/owner/properties/${p.id}`} className="block">
                <CardTitle className="text-xl mb-1">{p.name}</CardTitle>
                <p className="text-sm text-muted-foreground mb-3">{p.address}</p>
                {p.receptionist ? (
                  <p className="text-xs text-muted-foreground">Receptionist: {p.receptionist.name} ({p.receptionist.id})</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Receptionist: Not assigned</p>
                )}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
