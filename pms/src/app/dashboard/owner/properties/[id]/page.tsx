"use client";

import { use, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import ManageReceptionistModal from "@/components/owner/manage-receptionist-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FloorEditorModal from "@/components/owner/floor-editor-modal";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";

interface Receptionist {
  id: string;
  name: string;
  email: string;
}

interface Floor {
  id: string;
  floorNumber: number;
  floorName: string;
  description?: string;
  _count?: { rooms: number };
  rooms?: any[];
}

interface Property {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  description?: string;
  amenities?: string[];
  images?: string[];
  numberOfFloors: number;
  totalRooms: number;
  status: string;
  receptionist: Receptionist | null;
  floors?: Floor[];
  rooms?: any[];
  analytics?: {
    totalRoomsCapacity: number;
    actualRoomsCreated: number;
    roomsRemaining: number;
    roomCreationProgress: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyRate: number;
    totalOccupants: number;
    totalRevenue: number;
    unreadAlerts: number;
    roomsByType?: any;
  };
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function PropertyDetail({ params }: Props) {
  //  Unwrap the params Promise using React.use()
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [isFloorsManagerOpen, setIsFloorsManagerOpen] = useState(false);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [editingFloorIndex, setEditingFloorIndex] = useState<number | null>(null);
  const [originalFloorCount, setOriginalFloorCount] = useState<number>(0);
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [revenueFilter, setRevenueFilter] = useState<"all" | "thisWeek" | "thisMonth" | "thisYear" | "avgMonthly" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Fetch property data from API
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/owner/properties/${id}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Property not found");
          }
          throw new Error("Failed to fetch property details");
        }

        const data = await res.json();
        setProperty(data.property);
      } catch (err: any) {
        console.error("Error fetching property:", err);
        setError(err.message || "Failed to load property");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

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

  const handleAssignReceptionist = (receptionistId: string, receptionistName: string, receptionistEmail?: string) => {
    if (property) {
      setProperty({
        ...property,
        receptionist: { id: receptionistId, name: receptionistName, email: receptionistEmail || "" },
      });
    }
  };

  const handleRemoveReceptionist = () => {
    if (property) {
      setProperty({
        ...property,
        receptionist: null,
      });
    }
  };

  const handleUpdateProperty = async () => {
    if (!editDraft) return;

    try {
      setIsUpdating(true);
      setError(null);

      // Calculate total rooms from floors
      const calculatedTotalRooms = (editDraft.floors || []).reduce((acc: number, f: any) => acc + (f.rooms?.length || 0), 0);

      const payload = {
        name: editDraft.name,
        address: editDraft.address,
        city: editDraft.city,
        state: editDraft.state,
        zipCode: editDraft.zipCode,
        country: editDraft.country,
        description: editDraft.description,
        amenities: Array.isArray(editDraft.amenities) 
          ? editDraft.amenities 
          : editDraft.amenities?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
        images: Array.isArray(editDraft.images)
          ? editDraft.images
          : editDraft.images?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
        numberOfFloors: editDraft.numberOfFloors,
        totalRooms: calculatedTotalRooms,
        status: editDraft.status,
        floors: editDraft.floors || [],
      };

      const res = await fetch(`/api/owner/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update property");
      }

      const data = await res.json();
      setProperty(data.property);
      setIsEditOpen(false);
      setEditDraft(null);
      setOriginalFloorCount(0);
      router.refresh();
    } catch (err: any) {
      console.error("Error updating property:", err);
      setError(err.message || "Failed to update property");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
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
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading property details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !property) {
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
            <div className="max-w-3xl mx-auto">
              <Card>
                <CardContent className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    {error || "Property not found"}
                  </h2>
                  <Button onClick={() => router.push("/dashboard/owner/properties")}>
                    Back to Properties
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const analytics = property.analytics || {
    totalRoomsCapacity: property.totalRooms,
    actualRoomsCreated: 0,
    roomsRemaining: property.totalRooms,
    roomCreationProgress: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    occupancyRate: 0,
    totalOccupants: 0,
    totalRevenue: 0,
    unreadAlerts: 0,
  };

  // Calculate filtered revenue
  const getFilteredRevenue = () => {
    const totalRevenue = analytics.totalRevenue;
    const now = new Date();
    
    switch (revenueFilter) {
      case "thisWeek": {
        // Estimate weekly revenue based on daily average
        const estimatedDaily = totalRevenue / 365;
        return estimatedDaily * 7;
      }
      case "thisMonth": {
        // Estimate monthly revenue
        const monthsElapsed = now.getMonth() + 1;
        return totalRevenue / Math.max(monthsElapsed, 1);
      }
      case "thisYear": {
        // Current year revenue
        return totalRevenue;
      }
      case "avgMonthly": {
        // Average monthly revenue
        const monthsElapsed = now.getMonth() + 1;
        return totalRevenue / Math.max(monthsElapsed, 1);
      }
      case "custom": {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          // Estimate based on daily average
          return (totalRevenue / 365) * Math.max(daysDiff, 0);
        }
        return totalRevenue;
      }
      case "all":
      default:
        return totalRevenue;
    }
  };

  const displayRevenue = getFilteredRevenue();
  const revenueLabel = revenueFilter === "all" ? "Total Revenue" : 
                       revenueFilter === "thisWeek" ? "This Week (Est.)" :
                       revenueFilter === "thisMonth" ? "This Month (Est.)" :
                       revenueFilter === "thisYear" ? "This Year" :
                       revenueFilter === "avgMonthly" ? "Avg Monthly" :
                       "Custom Period";

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
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* Property Info */}
          <Card className="mb-8">
            <CardContent>
              <h1 className="text-3xl font-bold mb-1">{property.name}</h1>
              <p className="text-muted-foreground">{property.address}</p>
              {(property.city || property.state || property.zipCode) && (
                <p className="text-sm text-muted-foreground">
                  {property.city}{property.state ? `, ${property.state}` : ""} {property.zipCode || ""}
                </p>
              )}
              {property.description && <p className="mt-4">{property.description}</p>}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Receptionist</p>
                  {property.receptionist ? (
                    <>
                      <p className="font-medium">{property.receptionist.name}</p>
                      <p className="text-sm text-muted-foreground">{property.receptionist.email}</p>
                    </>
                  ) : (
                    <p className="font-medium text-yellow-600">Not assigned</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Property Status</p>
                  <p className={`font-medium ${property.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}`}>
                    {property.status}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Revenue Card with Filter */}
            <Card className="md:col-span-2 lg:col-span-1">
              <CardContent>
                <div className="mb-2">
                  <p className="text-sm text-muted-foreground">{revenueLabel}</p>
                  <p className="text-2xl font-bold">₹{Math.round(displayRevenue).toLocaleString("en-IN")}</p>
                </div>
                <div className="mt-3">
                  <select
                    value={revenueFilter}
                    onChange={(e) => setRevenueFilter(e.target.value as any)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="thisYear">This Year</option>
                    <option value="avgMonthly">Average Monthly</option>
                    <option value="custom">Custom Dates</option>
                  </select>
                </div>
                {revenueFilter === "custom" && (
                  <div className="mt-2 space-y-1">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="Start Date"
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="End Date"
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <MetricCard label="Total Occupants" value={analytics.totalOccupants} />
            <MetricCard label="Occupancy Rate" value={`${Math.round(analytics.occupancyRate)}%`} />
            <MetricCard 
              label="Rooms Created" 
              value={`${analytics.actualRoomsCreated} / ${analytics.totalRoomsCapacity}`} 
            />
            <MetricCard label="Occupied Rooms" value={analytics.occupiedRooms} />
            <MetricCard label="Vacant Rooms" value={analytics.vacantRooms} />
          </div>

          {/* Room Creation Progress */}
          {analytics.roomCreationProgress < 100 && (
            <Card className="mt-6">
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Room Creation Progress</h3>
                  <span className="text-sm text-muted-foreground">
                    {analytics.roomCreationProgress.toFixed(0)}% Complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${analytics.roomCreationProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {analytics.roomsRemaining} rooms remaining to be created by receptionist
                </p>
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {analytics.unreadAlerts > 0 && (
            <Card className="mt-6 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {analytics.unreadAlerts} Unread Alert{analytics.unreadAlerts > 1 ? "s" : ""}
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      You have pending notifications for this property
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card className="mt-8">
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">Property Actions</h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setIsModalOpen(true)}
                  disabled={property.status === "INACTIVE"}
                  className={property.status === "INACTIVE" ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Manage Receptionist
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Merge rooms into their respective floors
                    const floorsWithRooms = (property.floors || []).map((floor: any) => {
                      const floorRooms = (property.rooms || [])
                        .filter((room: any) => room.floorId === floor.id)
                        .map((room: any) => ({
                          id: room.id,
                          roomNumber: room.roomNumber,
                          roomType: room.roomType,
                          roomCategory: room.roomCategory,
                          capacity: room.capacity,
                          pricePerNight: room.pricePerNight,
                          description: room.description || "",
                        }));
                      return {
                        ...floor,
                        rooms: floorRooms,
                      };
                    });
                    
                    const floors = normalizeFloors(floorsWithRooms, property.numberOfFloors || 1);
                    const originalFloors = property.numberOfFloors || 1;
                    setOriginalFloorCount(originalFloors);
                    setEditDraft({ 
                      ...property, 
                      floors, 
                      numberOfFloors: floors.length,
                      amenities: Array.isArray(property.amenities) ? property.amenities.join(",") : (property.amenities || ""),
                      images: Array.isArray(property.images) ? property.images.join(",") : (property.images || ""),
                    });
                    setIsEditOpen(true);
                  }}
                >
                  Edit Property
                </Button>
              </div>
              {property.status === "INACTIVE" && (
                <p className="mt-2 text-sm text-muted-foreground">This property is inactive. Receptionist management is disabled.</p>
              )}
            </CardContent>
          </Card>

          {/* Modal */}
          <ManageReceptionistModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            currentReceptionist={property.receptionist}
            propertyId={property.id}
            propertyName={property.name}
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="edit-floors">Number of Floors <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <select
                          id="edit-floors"
                          value={editDraft.numberOfFloors || 1}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            // Prevent reducing floor count
                            if (n < originalFloorCount) {
                              setError(`Cannot reduce floors from ${originalFloorCount} to ${n}. You can only add more floors.`);
                              return;
                            }
                            setError(null);
                            setEditDraft((d: any) => {
                              const floors = normalizeFloors(d?.floors || [], n);
                              return { ...d, numberOfFloors: floors.length, floors };
                            });
                          }}
                          className="w-full rounded border p-2 pr-8 appearance-none bg-white dark:bg-gray-800 text-black dark:text-white"
                        >
                          {Array.from({ length: 10 }).map((_, i) => {
                            const floorNum = i + 1;
                            const isDisabled = floorNum < originalFloorCount;
                            return (
                              <option key={i} value={floorNum} disabled={isDisabled}>
                                {floorNum} {isDisabled ? '(Cannot reduce)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground dark:text-white" size={16} />
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        ✓ Can add more floors | ✗ Cannot reduce from {originalFloorCount}
                      </p>
                    </div>

                    <div>
                      <Label>Preview Total Rooms</Label>
                      <div className="mt-2 text-lg font-semibold">
                        {(editDraft.floors || []).reduce((acc: number, f: any) => acc + (f.rooms?.length || 0), 0)}
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

                  <div className="mt-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                      ✓ Update existing rooms | ✓ Add new rooms | ✗ Cannot remove rooms with bookings
                    </p>
                  </div>

                  <div className="mt-2 flex gap-2">
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
                    <Button onClick={() => { handleUpdateProperty(); }} disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => { setIsEditOpen(false); setError(null); setOriginalFloorCount(0); }} disabled={isUpdating}>Cancel</Button>
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

                  <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                    ✓ Update existing rooms | ✓ Add new rooms/floors | ✗ Cannot remove rooms with bookings or reduce below {originalFloorCount} floors
                  </p>

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
                              // Prevent reducing below original floor count
                              if (editDraft.floors.length <= originalFloorCount) {
                                setError(`Cannot delete floor. Must maintain at least ${originalFloorCount} floors (original count).`);
                                return;
                              }
                              const ok = window.confirm("Delete this floor? This will remove all rooms on it.");
                              if (!ok) return;
                              setError(null);
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