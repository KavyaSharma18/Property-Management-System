"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Users, Plus, X } from "lucide-react";

interface GroupBooking {
	id: string;
	groupName: string;
	totalRooms: number;
	checkInDate: string;
	checkOutDate: string;
	contactName: string;
	contactPhone: string;
	contactEmail: string;
	status: string;
	roomsBooked: number;
	roomsPending: number;
}

export default function GroupBookingsPage() {
	const { data: session } = useSession();
	const [groupBookings, setGroupBookings] = useState<GroupBooking[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "completed">("all");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	// Form state for creating new group booking
	const [formData, setFormData] = useState({
		groupName: "",
		totalRooms: "",
		checkInDate: "",
		checkOutDate: "",
		contactName: "",
		contactPhone: "",
		contactEmail: "",
		notes: "",
	});

	useEffect(() => {
		if (session?.user) {
			fetchGroupBookings();
		}
	}, [session, statusFilter]);

	const fetchGroupBookings = async () => {
		try {
			setIsLoading(true);
			const params = new URLSearchParams();
			if (statusFilter !== "all") params.append("status", statusFilter);
			
			const response = await fetch(`/api/receptionist/group-bookings?${params}`);
			if (!response.ok) throw new Error("Failed to fetch group bookings");
			
			const data = await response.json();
			setGroupBookings(data.groupBookings || []);
		} catch (error) {
			console.error("Error fetching group bookings:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateGroupBooking = async (e: React.FormEvent) => {
		e.preventDefault();
		
		try {
			const response = await fetch("/api/receptionist/group-bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...formData,
					totalRooms: parseInt(formData.totalRooms),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to create group booking");
			}

			alert("Group booking created successfully!");
			setIsCreateModalOpen(false);
			setFormData({
				groupName: "",
				totalRooms: "",
				checkInDate: "",
				checkOutDate: "",
				contactName: "",
				contactPhone: "",
				contactEmail: "",
				notes: "",
			});
			fetchGroupBookings();
		} catch (error) {
			console.error("Error creating group booking:", error);
			alert(error instanceof Error ? error.message : "Failed to create group booking");
		}
	};

	const filteredBookings = groupBookings.filter((booking) => {
		const matchesSearch =
			booking.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			booking.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			booking.contactPhone.includes(searchTerm);
		return matchesSearch;
	});

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<DashboardHeader />

			<div className="flex">
				<Sidebar role="receptionist" />

				<div className="flex-1 p-8">
					<div className="mb-8 flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold mb-2">Group Bookings</h1>
							<p className="text-muted-foreground">Manage group and bulk bookings</p>
						</div>
						<Button onClick={() => setIsCreateModalOpen(true)}>
							<Plus size={18} className="mr-2" />
							New Group Booking
						</Button>
					</div>

					{/* Filters */}
					<div className="mb-6 flex flex-col sm:flex-row gap-4">
						<div className="flex-1 relative">
							<Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
							<Input
								placeholder="Search by group name, contact..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>

						<div className="flex gap-2">
							<Button
								variant={statusFilter === "all" ? "default" : "outline"}
								onClick={() => setStatusFilter("all")}
							>
								All
							</Button>
							<Button
								variant={statusFilter === "upcoming" ? "default" : "outline"}
								onClick={() => setStatusFilter("upcoming")}
							>
								Upcoming
							</Button>
							<Button
								variant={statusFilter === "active" ? "default" : "outline"}
								onClick={() => setStatusFilter("active")}
							>
								Active
							</Button>
							<Button
								variant={statusFilter === "completed" ? "default" : "outline"}
								onClick={() => setStatusFilter("completed")}
							>
								Completed
							</Button>
						</div>
					</div>

					{/* Group Bookings List */}
					{isLoading ? (
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
							<p className="text-muted-foreground">Loading group bookings...</p>
						</div>
					) : (
						<div className="grid gap-4">
							{filteredBookings.map((booking) => (
								<Card key={booking.id} className="p-6">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-2">
												<Users className="text-primary" size={24} />
												<h3 className="text-xl font-semibold">{booking.groupName}</h3>
												<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100">
													{booking.status}
												</span>
											</div>
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
												<div>
													<p className="text-xs text-muted-foreground">Total Rooms</p>
													<p className="font-semibold">{booking.totalRooms}</p>
												</div>
												<div>
													<p className="text-xs text-muted-foreground">Booked</p>
													<p className="font-semibold text-green-600">{booking.roomsBooked}</p>
												</div>
												<div>
													<p className="text-xs text-muted-foreground">Pending</p>
													<p className="font-semibold text-orange-600">{booking.roomsPending}</p>
												</div>
												<div>
													<p className="text-xs text-muted-foreground">Check-in / Check-out</p>
													<p className="font-semibold text-sm">
														{new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
													</p>
												</div>
											</div>
											<div className="mt-4 pt-4 border-t dark:border-gray-700">
												<p className="text-sm">
													<span className="text-muted-foreground">Contact:</span> {booking.contactName} • {booking.contactPhone}
												</p>
											</div>
										</div>
										<Button variant="outline" size="sm">
											View Details
										</Button>
									</div>
								</Card>
							))}

							{filteredBookings.length === 0 && (
								<div className="text-center py-12">
									<Users size={48} className="mx-auto text-gray-400 mb-4" />
									<p className="text-muted-foreground">No group bookings found</p>
								</div>
							)}
						</div>
					)}

					{/* Create Group Booking Modal */}
					{isCreateModalOpen && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
							<Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
								<div className="p-6">
									<div className="flex items-center justify-between mb-6">
										<h2 className="text-2xl font-bold">New Group Booking</h2>
										<button onClick={() => setIsCreateModalOpen(false)}>
											<X size={20} />
										</button>
									</div>

									<form onSubmit={handleCreateGroupBooking} className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<div className="col-span-2">
												<Label>Group Name *</Label>
												<Input
													value={formData.groupName}
													onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
													placeholder="e.g., XYZ Company Conference"
													required
												/>
											</div>

											<div>
												<Label>Total Rooms *</Label>
												<Input
													type="number"
													min="1"
													value={formData.totalRooms}
													onChange={(e) => setFormData({ ...formData, totalRooms: e.target.value })}
													required
												/>
											</div>

											<div>
												<Label>Contact Name *</Label>
												<Input
													value={formData.contactName}
													onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
													required
												/>
											</div>

											<div>
												<Label>Contact Phone *</Label>
												<Input
													type="tel"
													value={formData.contactPhone}
													onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
													required
												/>
											</div>

											<div>
												<Label>Contact Email</Label>
												<Input
													type="email"
													value={formData.contactEmail}
													onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
												/>
											</div>

											<div>
												<Label>Check-in Date *</Label>
												<Input
													type="date"
													value={formData.checkInDate}
													onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
													required
												/>
											</div>

											<div>
												<Label>Check-out Date *</Label>
												<Input
													type="date"
													value={formData.checkOutDate}
													onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
													required
												/>
											</div>

											<div className="col-span-2">
												<Label>Notes</Label>
												<textarea
													className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
													value={formData.notes}
													onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
													placeholder="Special requests, dietary requirements, etc."
												/>
											</div>
										</div>

										<div className="flex gap-3 justify-end pt-4">
											<Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
												Cancel
											</Button>
											<Button type="submit">Create Group Booking</Button>
										</div>
									</form>
								</div>
							</Card>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
