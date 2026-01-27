"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import ManageReceptionistModal from "@/components/owner/manage-receptionist-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FloorEditorModal from "@/components/owner/floor-editor-modal";
import { ChevronDown } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetail({ params }: Props) {
  //  Unwrap the params Promise using React.use()
  const { id } = use(params);
  const { data: session } = useSession();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [isFloorsManagerOpen, setIsFloorsManagerOpen] = useState(false);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [editingFloorIndex, setEditingFloorIndex] = useState<number | null>(null);
  const [property, setProperty] = useState<any>(null);

  const normalizeFloors = (floors: any[], count: number) => {
    const total = Math.max(1, Number(count) || 1);
    const copy = [...(floors || [])];
    for (let i = 1; i <= total; i += 1) {
      if (!copy[i - 1]) {
        copy[i - 1] = { floorNumber: i, floorName: `Floor ${i}`, description: "", rooms: [] };
      }
    }
    return copy.slice(0, total).map((f, i) => ({
      ...f,
      floorNumber: i + 1,
      floorName: f.floorName || `Floor ${i + 1}`,
      rooms: f.rooms || [],
    }));
  };

  //   const session = await getServerSession(authOptions);

  // if (!session) redirect("/auth/signin");

  // 🔹 Demo property + metrics data (later comes from backend)
  const demoProperties: Record<string, any> = {
    prop_1: {
      name: "Seaside Retreat",
      address: "12 Ocean Drive, Beach City",
      description: "A cozy inn by the sea",
      receptionist: { id: "rec_1", name: "Alice Johnson" },
      city: "Beach City",
      state: "Coastal State",
      zipCode: "400001",
      country: "India",
      amenities: ["WiFi","Sea View","Breakfast"],
      images: ["/images/seaside1.jpg"],
      numberOfFloors: 3,
      status: "ACTIVE",
      totalRevenue: 320000,
      visitorsToday: 18,
      guestsStaying: 42,
      occupancyRate: 70,
      totalRooms: 60,
      alerts: 1,
    },
    prop_2: {
      name: "Mountain View Inn",
      address: "99 Alpine Rd, Hilltown",
      description: "Rustic hotel with mountain views",
      receptionist: null,
      city: "Hilltown",
      state: "Highland",
      zipCode: "110022",
      country: "India",
      amenities: ["Hiking","Breakfast"],
      images: ["/images/mountain1.jpg"],
      numberOfFloors: 2,
      status: "ACTIVE",
      totalRevenue: 210000,
      visitorsToday: 12,
      guestsStaying: 30,
      occupancyRate: 62,
      totalRooms: 48,
      alerts: 0,
    },
    prop_3: {
      name: "Lakeside Hotel",
      address: "7 Lakeview Rd, Waterside",
      description: "Relaxing hotel overlooking the lake",
      receptionist: { id: "rec_2", name: "Brian Lee" },
      city: "Waterside",
      state: "Lake State",
      zipCode: "220033",
      country: "India",
      amenities: ["Boating","Spa","Breakfast"],
      images: ["/images/lakeside1.jpg"],
      numberOfFloors: 4,
      status: "ACTIVE",
      totalRevenue: 450000,
      visitorsToday: 25,
      guestsStaying: 65,
      occupancyRate: 82,
      totalRooms: 80,
      alerts: 2,
    },
    prop_4: {
      name: "Urban Central Hotel",
      address: "101 City Plaza, Metropolis",
      description: "Modern hotel in the city center",
      receptionist: { id: "rec_3", name: "Carla Gomez" },
      city: "Metropolis",
      state: "Central",
      zipCode: "560001",
      country: "India",
      amenities: ["Gym","Conference Rooms","Breakfast"],
      images: ["/images/urban1.jpg"],
      numberOfFloors: 10,
      status: "ACTIVE",
      totalRevenue: 780000,
      visitorsToday: 40,
      guestsStaying: 120,
      occupancyRate: 90,
      totalRooms: 140,
      alerts: 3,
    },
    prop_5: {
      name: "Garden Palace",
      address: "22 Greenway, Floral Town",
      description: "Boutique hotel surrounded by gardens",
      receptionist: null,
      city: "Floral Town",
      state: "Garden State",
      zipCode: "560022",
      country: "India",
      amenities: ["WiFi", "Breakfast", "Pool"],
      images: ["/images/garden1.jpg"],
      numberOfFloors: 2,
      status: "INACTIVE",
      totalRevenue: 150000,
      visitorsToday: 8,
      guestsStaying: 20,
      occupancyRate: 50,
      totalRooms: 40,
      alerts: 0,
    },
  };

  const currentProperty = property || demoProperties[id];

  const handleAssignReceptionist = (receptionistId: string, receptionistName: string) => {
    setProperty({
      ...currentProperty,
      receptionist: { id: receptionistId, name: receptionistName },
    });
  };

  const handleRemoveReceptionist = () => {
    setProperty({
      ...currentProperty,
      receptionist: null,
    });
  };

  if (!currentProperty) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="text-center p-6">
              <h2 className="text-xl font-semibold mb-2">Property not found</h2>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userRole={(session?.user as { role?: string } | undefined)?.role || "OWNER"}
      />

      <div className="flex">
        <Sidebar role="owner" />

        <main className="flex-1 p-8">
          {/* Property Info */}
          <Card className="mb-8">
            <CardContent>
              <h1 className="text-3xl font-bold mb-1">{currentProperty.name}</h1>
              <p className="text-muted-foreground">{currentProperty.address}</p>
              <p className="mt-4">{currentProperty.description}</p>

              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Receptionist</p>
                {currentProperty.receptionist ? (
                  <p className="font-medium">{currentProperty.receptionist.name} ({currentProperty.receptionist.id})</p>
                ) : (
                  <p className="font-medium text-muted-foreground">Not assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Property Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total Revenue" value={`₹${currentProperty.totalRevenue.toLocaleString("en-IN")}`} />
            <MetricCard label="Visitors Today" value={currentProperty.visitorsToday} />
            <MetricCard label="Guests Staying" value={currentProperty.guestsStaying} />
            <MetricCard label="Occupancy Rate" value={`${currentProperty.occupancyRate}%`} />
            <MetricCard label="Total Rooms" value={currentProperty.totalRooms} />
            <MetricCard label="Alerts / Flags" value={currentProperty.alerts} highlight={currentProperty.alerts > 0} />
          </div>

          {/* Actions */}
          <Card className="mt-8">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">Property Actions</h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsModalOpen(true)}
                  disabled={currentProperty.status === "INACTIVE"}
                  className={currentProperty.status === "INACTIVE" ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Manage Receptionist
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const floors = normalizeFloors(currentProperty.floors || [], currentProperty.numberOfFloors || 1);
                    setEditDraft({ ...currentProperty, floors, numberOfFloors: floors.length });
                    setIsEditOpen(true);
                  }}
                >
                  Edit Property
                </Button>
              </div>
              {currentProperty.status === "INACTIVE" && (
                <p className="mt-2 text-sm text-muted-foreground">This property is inactive. Receptionist management is disabled.</p>
              )}
            </CardContent>
          </Card>

          {/* Modal */}
          <ManageReceptionistModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            currentReceptionist={currentProperty.receptionist}
            propertyName={currentProperty.name}
            onAssignSuccess={handleAssignReceptionist}
            onRemoveSuccess={handleRemoveReceptionist}
          />

          {/* Edit Property Modal (client-side only) */}
          {isEditOpen && editDraft && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setIsEditOpen(false)} />
              <Card className="z-10 w-full max-w-3xl">
                <CardContent>
                  <h3 className="text-xl font-semibold mb-4">Edit Property</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Property Name</Label>
                      <Input id="edit-name" value={editDraft.name || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="edit-address">Address</Label>
                      <Input id="edit-address" value={editDraft.address || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, address: e.target.value }))} />
                    </div>

                    <div>
                      <Label htmlFor="edit-city">City</Label>
                      <Input id="edit-city" value={editDraft.city || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="edit-state">State</Label>
                      <Input id="edit-state" value={editDraft.state || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, state: e.target.value }))} />
                    </div>

                    <div>
                      <Label htmlFor="edit-zip">Zip Code</Label>
                      <Input id="edit-zip" value={editDraft.zipCode || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, zipCode: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="edit-country">Country</Label>
                      <Input id="edit-country" value={editDraft.country || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, country: e.target.value }))} />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Input id="edit-description" value={editDraft.description || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, description: e.target.value }))} />
                    </div>

                    <div>
                      <Label htmlFor="edit-amenities">Amenities (comma separated)</Label>
                      <Input id="edit-amenities" value={(editDraft.amenities || []).join ? (editDraft.amenities || []).join(",") : editDraft.amenities || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, amenities: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))} />
                    </div>

                    <div>
                      <Label htmlFor="edit-images">Images (comma separated URLs)</Label>
                      <Input id="edit-images" value={(editDraft.images || []).join ? (editDraft.images || []).join(",") : editDraft.images || ""} onChange={(e) => setEditDraft((d: any) => ({ ...d, images: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))} />
                    </div>

                    <div>
                      <Label htmlFor="edit-floors">Number of Floors</Label>
                      <div className="relative">
                        <select
                          id="edit-floors"
                          value={editDraft.numberOfFloors || 1}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            setEditDraft((d: any) => {
                              const floors = normalizeFloors(d?.floors || [], n);
                              return { ...d, numberOfFloors: floors.length, floors };
                            });
                          }}
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
                      <Label>Status</Label>
                      <div className="relative">
                        <select value={editDraft.status || "ACTIVE"} onChange={(e) => setEditDraft((d: any) => ({ ...d, status: e.target.value }))} className="w-full rounded border p-2 pr-8 appearance-none bg-white dark:bg-gray-800 text-black dark:text-white">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground dark:text-white" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        setEditDraft((d: any) => {
                          const floors = normalizeFloors(d?.floors || [], d?.numberOfFloors || 1);
                          return { ...d, floors, numberOfFloors: floors.length };
                        });
                        setIsFloorsManagerOpen(true);
                      }}
                    >
                      Edit Floors
                    </Button>
                    <Button onClick={() => { setProperty({ ...currentProperty, ...editDraft }); setIsEditOpen(false); }}>Save</Button>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Floors Manager Modal */}
          {isFloorsManagerOpen && editDraft && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setIsFloorsManagerOpen(false)} />
              <Card className="z-10 w-full max-w-3xl">
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Manage Floors</h3>
                    <Button
                      onClick={() => {
                        setEditDraft((d: any) => {
                          const copy = { ...(d || {}) };
                          const floors = [...(copy.floors || [])];
                          const nextNumber = floors.length + 1;
                          floors.push({ floorNumber: nextNumber, floorName: `Floor ${nextNumber}`, description: "", rooms: [] });
                          copy.floors = floors;
                          copy.numberOfFloors = floors.length;
                          return copy;
                        });
                      }}
                    >
                      Add Floor
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(editDraft.floors || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No floors yet. Add a floor to begin.</p>
                    )}
                    {(editDraft.floors || []).map((floor: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between rounded border p-3">
                        <div>
                          <div className="font-medium">{floor.floorName || `Floor ${floor.floorNumber || idx + 1}`}</div>
                          <div className="text-xs text-muted-foreground">Rooms: {floor.rooms?.length || 0}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingFloorIndex(idx); setIsFloorModalOpen(true); }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const ok = window.confirm("Delete this floor? This will remove all rooms on it.");
                              if (!ok) return;
                              setEditDraft((d: any) => {
                                const copy = { ...(d || {}) };
                                const floors = [...(copy.floors || [])].filter((_: any, i: number) => i !== idx);
                                const normalized = floors.map((f: any, i: number) => ({
                                  ...f,
                                  floorNumber: i + 1,
                                  floorName: f.floorName || `Floor ${i + 1}`,
                                }));
                                copy.floors = normalized;
                                copy.numberOfFloors = normalized.length || 1;
                                return copy;
                              });
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => setIsFloorsManagerOpen(false)}>Done</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <FloorEditorModal
            isOpen={isFloorModalOpen}
            onClose={() => { setIsFloorModalOpen(false); setEditingFloorIndex(null); }}
            floor={
              editDraft?.floors && editingFloorIndex !== null
                ? { ...editDraft.floors[editingFloorIndex], floorNumber: editDraft.floors[editingFloorIndex]?.floorNumber || editingFloorIndex + 1, rooms: editDraft.floors[editingFloorIndex]?.rooms || [] }
                : { floorNumber: 1, floorName: "Floor 1", description: "", rooms: [] }
            }
            onSave={(f) => {
              setEditDraft((d: any) => {
                const copy = { ...(d || {}) };
                copy.floors = copy.floors || [];
                const index = editingFloorIndex ?? (f.floorNumber - 1);
                copy.floors[index] = f;
                copy.numberOfFloors = copy.floors.length || 1;
                return copy;
              });
              setIsFloorModalOpen(false);
              setEditingFloorIndex(null);
            }}
          />
        </main>
      </div>
    </div>
  );
}

/* 🔹 Small reusable metric card */
function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold mt-2 ${highlight ? "text-red-500" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}