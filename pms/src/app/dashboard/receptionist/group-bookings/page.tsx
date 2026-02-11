"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Users, Plus, X, Building2 } from "lucide-react";
import GroupBookingCheckInModal from "@/components/receptionist/GroupBookingCheckInModal";
import CorporateBookingCheckInModal from "@/components/receptionist/CorporateBookingCheckInModal";

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
	isCorporate?: boolean;
	rooms?: { roomNumber: string; status: string }[];
	bookingSource?: string;
}

export default function GroupBookingsPage() {
	const { data: session } = useSession();
	const [groupBookings, setGroupBookings] = useState<GroupBooking[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isGroupBookingModalOpen, setIsGroupBookingModalOpen] = useState(false);
	const [isCorporateBookingModalOpen, setIsCorporateBookingModalOpen] = useState(false);
	const [viewDetailsBooking, setViewDetailsBooking] = useState<GroupBooking | null>(null);
	const [loadingRooms, setLoadingRooms] = useState(false);

	// Form state for creating new group booking (old simple modal)
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
			// Mark corporate bookings by checking if any occupancy has corporateBookingId
			const bookingsWithCorporateFlag = (data.groupBookings || []).map((booking: any) => ({
				...booking,
				isCorporate: booking.rooms?.some((room: any) => room.corporateBookingId) || 
							 booking.groupName.includes("(Corporate)"),
			}));
			setGroupBookings(bookingsWithCorporateFlag);
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

	const handleGroupBookingCheckIn = async (checkInData: any) => {
		try {
			// Create group booking first
			const groupResponse = await fetch("/api/receptionist/group-bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					groupName: checkInData.groupName,
					totalRooms: checkInData.selectedRoomIds.length,
					checkInDate: checkInData.checkInDate,
					checkOutDate: checkInData.checkOutDate,
					contactName: checkInData.guestName,
					contactPhone: checkInData.guestPhone,
					contactEmail: checkInData.guestEmail,
					notes: `Group booking with ${checkInData.selectedRoomIds.length} rooms`,
				}),
			});

			if (!groupResponse.ok) {
				const error = await groupResponse.json();
				throw new Error(error.error || "Failed to create group booking");
			}

			const groupBooking = await groupResponse.json();

			// Check in all selected rooms
			const checkInPromises = checkInData.selectedRoomIds.map((roomId: number) => {
				const payload = {
					roomId,
					checkInTime: new Date(checkInData.checkInDate).toISOString(),
					expectedCheckOut: new Date(checkInData.checkOutDate).toISOString(),
					actualRoomRate: checkInData.pricePerNight,
					actualCapacity: checkInData.numberOfGuests,
					groupBookingId: groupBooking.groupBooking.id,
					guests: [
						{
							name: checkInData.guestName,
							email: checkInData.guestEmail,
							phone: checkInData.guestPhone,
							idProof: checkInData.idProofType,
							idNumber: checkInData.idProofNumber,
							isPrimary: true,
						}
					],
					initialPayment: checkInData.advancePayment ? {
						amount: checkInData.advancePayment,
						paymentMethod: checkInData.paymentMethod,
					} : undefined,
				};

				return fetch("/api/receptionist/check-in", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			});

			const results = await Promise.all(checkInPromises);
			const failedCheckins = results.filter(r => !r.ok);

			if (failedCheckins.length > 0) {
				alert(`Warning: ${failedCheckins.length} room(s) failed to check in. Please check manually.`);
			} else {
				alert(`Group booking created successfully! ${checkInData.selectedRoomIds.length} room(s) checked in.`);
			}

			setIsGroupBookingModalOpen(false);
			fetchGroupBookings();
		} catch (error) {
			console.error("Error creating group booking:", error);
			alert(error instanceof Error ? error.message : "Failed to create group booking");
		}
	};

	const handleCorporateBookingCheckIn = async (checkInData: any) => {
		try {
			// Create corporate booking first
			const corporateResponse = await fetch("/api/receptionist/corporate-bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					companyName: checkInData.companyName,
					contactPerson: checkInData.contactPerson,
					contactPhone: checkInData.guestPhone,
					contactEmail: checkInData.guestEmail,
					gstNumber: checkInData.gstNumber,
					notes: checkInData.notes,
				}),
			});

			if (!corporateResponse.ok) {
				const error = await corporateResponse.json();
				throw new Error(error.error || "Failed to create corporate booking");
			}

			const corporateBooking = await corporateResponse.json();

			// Create group booking to track multiple rooms
			const groupResponse = await fetch("/api/receptionist/group-bookings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					groupName: `${checkInData.companyName} (Corporate)`,
					totalRooms: checkInData.selectedRoomIds.length,
					checkInDate: checkInData.checkInDate,
					checkOutDate: checkInData.checkOutDate,
					contactName: checkInData.contactPerson,
					contactPhone: checkInData.guestPhone,
					contactEmail: checkInData.guestEmail,
					notes: `Corporate booking - ${checkInData.companyName}`,
				}),
			});

			if (!groupResponse.ok) {
				const error = await groupResponse.json();
				throw new Error(error.error || "Failed to create group booking");
			}

			const groupBooking = await groupResponse.json();

			// Check in all selected rooms
			const checkInPromises = checkInData.selectedRoomIds.map((roomId: number) => {
				const payload = {
					roomId,
					checkInTime: new Date(checkInData.checkInDate).toISOString(),
					expectedCheckOut: new Date(checkInData.checkOutDate).toISOString(),
					actualRoomRate: checkInData.pricePerNight,
					actualCapacity: checkInData.numberOfGuests,
					groupBookingId: groupBooking.groupBooking.id,
					corporateBookingId: corporateBooking.corporateBooking.id,
					bookingSource: "CORPORATE",
					guests: [
						{
							name: checkInData.guestName,
							email: checkInData.guestEmail,
							phone: checkInData.guestPhone,
							idProof: checkInData.idProofType,
							idNumber: checkInData.idProofNumber,
							isPrimary: true,
						}
					],
					initialPayment: checkInData.advancePayment ? {
						amount: checkInData.advancePayment,
						paymentMethod: checkInData.paymentMethod,
					} : undefined,
				};

				return fetch("/api/receptionist/check-in", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
			});

			const results = await Promise.all(checkInPromises);
			const failedCheckins = results.filter(r => !r.ok);

			if (failedCheckins.length > 0) {
				alert(`Warning: ${failedCheckins.length} room(s) failed to check in. Please check manually.`);
			} else {
				alert(`Corporate booking created successfully! ${checkInData.selectedRoomIds.length} room(s) checked in.`);
			}

			setIsCorporateBookingModalOpen(false);
			fetchGroupBookings();
		} catch (error) {
			console.error("Error creating corporate booking:", error);
			alert(error instanceof Error ? error.message : "Failed to create corporate booking");
		}
	};

	const handleViewDetails = async (booking: GroupBooking) => {
		setViewDetailsBooking(booking);
		setLoadingRooms(true);
		
		try {
			// Fetch detailed booking information including occupancies and rooms
			const response = await fetch(`/api/receptionist/group-bookings/${booking.id}`);
			if (response.ok) {
				const data = await response.json();
				// Extract room information from the response
				const rooms = data.groupBooking?.rooms?.map((roomData: any) => ({
					roomNumber: roomData.room?.roomNumber || 'N/A',
					status: roomData.room?.status || 'unknown'
				})) || [];
				setViewDetailsBooking({...booking, rooms});
			}
		} catch (error) {
			console.error("Error fetching booking details:", error);
		} finally {
			setLoadingRooms(false);
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
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-3xl font-bold mb-2">Group Bookings</h1>
							<p className="text-muted-foreground">Manage group and bulk bookings</p>
						</div>
						<div className="flex gap-3">
							<Button onClick={() => setIsGroupBookingModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
								<Users size={18} className="mr-2" />
								New Group Booking
							</Button>
							<Button onClick={() => setIsCorporateBookingModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
								<Building2 size={18} className="mr-2" />
								New Corporate Booking
							</Button>
						</div>
					</div>
				</div>

				{/* Filters Section */}
				<div className="mb-6 space-y-4">
					<div className="flex gap-4">
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
												<h3 className="text-xl font-semibold">{booking.groupName}</h3>											{booking.isCorporate && (
												<span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100">
													Corporate
												</span>
											)}												<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100">
													{booking.status}
												</span>
											</div>
											<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
												<div>
													<p className="text-xs text-muted-foreground">Total Rooms</p>
													<p className="font-semibold">{booking.totalRooms}</p>
												</div>
												<div>
													<p className="text-xs text-muted-foreground">Booked</p>
													<p className="font-semibold text-green-600">{booking.roomsBooked}</p>
												</div>
												<div>
													<p className="text-xs text-muted-foreground">Check-in / Check-out</p>
													<p className="font-semibold text-sm">
														{new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
													</p>
												</div>
											</div>
											{booking.bookingSource && (
												<div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
													<p className="text-xs text-blue-600 dark:text-blue-400">
														Booking Source: {booking.bookingSource.replace(/_/g, ' ')}
													</p>
												</div>
											)}
											<div className="mt-4 pt-4 border-t dark:border-gray-700">
												<p className="text-sm">
													<span className="text-muted-foreground">Contact:</span> {booking.contactName} • {booking.contactPhone}
												</p>
											</div>
										</div>
									<Button variant="outline" size="sm" onClick={() => handleViewDetails(booking)}>
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
				</div>

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

					{/* Group Booking Check-In Modal */}
					<GroupBookingCheckInModal
						open={isGroupBookingModalOpen}
						onClose={() => setIsGroupBookingModalOpen(false)}
						onConfirm={handleGroupBookingCheckIn}
					/>

					{/* Corporate Booking Check-In Modal */}
					<CorporateBookingCheckInModal
						open={isCorporateBookingModalOpen}
						onClose={() => setIsCorporateBookingModalOpen(false)}
						onConfirm={handleCorporateBookingCheckIn}
					/>

					{/* View Details Modal */}
					{viewDetailsBooking && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewDetailsBooking(null)}>
							<Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
								<div className="p-6">
									<div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
										<div className="flex items-center gap-3">
											<Users className="text-primary" size={28} />
											<div>
												<h2 className="text-2xl font-bold">{viewDetailsBooking.groupName}</h2>
												<div className="flex gap-2 mt-1">
													<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100">
														{viewDetailsBooking.status}
													</span>
													{viewDetailsBooking.isCorporate && (
														<span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100">
															Corporate
														</span>
													)}
												</div>
											</div>
										</div>
										<button onClick={() => setViewDetailsBooking(null)} className="text-muted-foreground hover:text-foreground transition-colors">
											<X size={24} />
										</button>
									</div>

									<div className="space-y-6">
										{/* Booking Information */}
										<div>
											<h3 className="text-lg font-semibold mb-3">Booking Information</h3>
											<div className="grid grid-cols-2 gap-4">
												<div>
													<p className="text-sm text-muted-foreground">Booking ID</p>
													<p className="font-medium">#{viewDetailsBooking.id}</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">Rooms Booked</p>
													<p className="font-medium text-green-600">{viewDetailsBooking.roomsBooked}</p>
												</div>
											</div>
										</div>

										{/* Date Information */}
										<div className="pt-4 border-t dark:border-gray-700">
											<h3 className="text-lg font-semibold mb-3">Stay Duration</h3>
											<div className="grid grid-cols-2 gap-4">
												<div>
													<p className="text-sm text-muted-foreground">Check-in Date</p>
													<p className="font-medium">{new Date(viewDetailsBooking.checkInDate).toLocaleDateString('en-IN', { 
														weekday: 'short', 
														year: 'numeric', 
														month: 'long', 
														day: 'numeric' 
													})}</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">Check-out Date</p>
													<p className="font-medium">{new Date(viewDetailsBooking.checkOutDate).toLocaleDateString('en-IN', { 
														weekday: 'short', 
														year: 'numeric', 
														month: 'long', 
														day: 'numeric' 
													})}</p>
												</div>
											</div>
										</div>

										{/* Contact Information */}
										<div className="pt-4 border-t dark:border-gray-700">
											<h3 className="text-lg font-semibold mb-3">Contact Information</h3>
											<div className="space-y-2">
												<div>
													<p className="text-sm text-muted-foreground">Contact Person</p>
													<p className="font-medium">{viewDetailsBooking.contactName}</p>
												</div>
												<div>
													<p className="text-sm text-muted-foreground">Phone Number</p>
													<p className="font-medium">{viewDetailsBooking.contactPhone}</p>
												</div>
												{viewDetailsBooking.contactEmail && (
													<div>
														<p className="text-sm text-muted-foreground">Email Address</p>
														<p className="font-medium">{viewDetailsBooking.contactEmail}</p>
													</div>
												)}
											</div>
										</div>
									{/* Rooms Information */}
									<div className="pt-4 border-t dark:border-gray-700">
										<h3 className="text-lg font-semibold mb-3">Rooms</h3>
										{loadingRooms ? (
											<p className="text-sm text-muted-foreground">Loading rooms...</p>
										) : viewDetailsBooking.rooms && viewDetailsBooking.rooms.length > 0 ? (
											<div className="flex flex-wrap gap-2">
												{viewDetailsBooking.rooms.map((room, idx) => (
													<span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium text-sm">
														Room #{room.roomNumber}
														<span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
															room.status === 'OCCUPIED' 
															? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-100'
															: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100'
														}`}>
															{room.status}
														</span>
													</span>
												))}
											</div>
										) : (
											<p className="text-sm text-muted-foreground">No rooms assigned yet</p>
										)}
									</div>									</div>

									<div className="flex gap-3 justify-end pt-6 mt-6 border-t dark:border-gray-700">
										<Button variant="outline" onClick={() => setViewDetailsBooking(null)}>
											Close
										</Button>
									</div>
								</div>
							</Card>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
