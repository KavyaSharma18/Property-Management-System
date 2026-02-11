// "use client";

// import React, { useEffect, useState } from "react";
// import { useSession } from "next-auth/react";
// import DashboardHeader from "@/components/dashboard/header";
// import Sidebar from "@/components/dashboard/sidebar";
// import CheckInModal from "@/components/receptionist/CheckInModal";
// import { Button } from "@/components/ui/button";
// import { Card } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Search, DoorOpen, Users, MoreHorizontal } from "lucide-react";

// interface Room {
// 	id: number;
// 	number: string;
// 	type: string;
// 	status: "occupied" | "vacant" | "maintenance";
// 	capacity: number;
// 	pricePerNight: number;
// 	guests: number;
// 	// Guest information (optional - only for occupied rooms)
// 	guestName?: string;
// 	guestEmail?: string;
// 	guestPhone?: string;
// 	paymentMethod?: string;
// 	checkInDate?: string;
// 	checkOutDate?: string;
// }

// // Mock room data
// const MOCK_ROOMS: Room[] = [
// 	{
// 		id: 1,
// 		number: "101",
// 		type: "Single",
// 		status: "occupied",
// 		capacity: 1,
// 		pricePerNight: 50,
// 		guests: 1,
// 	},
// 	{
// 		id: 2,
// 		number: "102",
// 		type: "Double",
// 		status: "vacant",
// 		capacity: 2,
// 		pricePerNight: 80,
// 		guests: 0,
// 	},
// 	{
// 		id: 3,
// 		number: "103",
// 		type: "Suite",
// 		status: "occupied",
// 		capacity: 4,
// 		pricePerNight: 150,
// 		guests: 3,
// 	},
// 	{
// 		id: 4,
// 		number: "104",
// 		type: "Double",
// 		status: "vacant",
// 		capacity: 2,
// 		pricePerNight: 80,
// 		guests: 0,
// 	},
// 	{
// 		id: 5,
// 		number: "201",
// 		type: "Single",
// 		status: "occupied",
// 		capacity: 1,
// 		pricePerNight: 50,
// 		guests: 1,
// 	},
// 	{
// 		id: 6,
// 		number: "202",
// 		type: "Double",
// 		status: "occupied",
// 		capacity: 2,
// 		pricePerNight: 80,
// 		guests: 2,
// 	},
// 	{
// 		id: 7,
// 		number: "203",
// 		type: "Single",
// 		status: "maintenance",
// 		capacity: 1,
// 		pricePerNight: 0,
// 		guests: 0,
// 	},
// ];

// export default function RoomsPage() {
// 	const { data: session } = useSession();
// 	const rawRole = (session?.user as { role?: string } | undefined)?.role;
// 	const userRole = (rawRole === "owner" ? "owner" : "receptionist") as "owner" | "receptionist";
// 	const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
// 	const [searchTerm, setSearchTerm] = useState("");
// 	const [statusFilter, setStatusFilter] = useState<"all" | "occupied" | "vacant" | "maintenance">("all");
// 	const [capacityFilter, setCapacityFilter] = useState<"all" | "1" | "2" | "4">("all");
// 	const [typeFilter, setTypeFilter] = useState<"all" | "Single" | "Double" | "Suite">("all");
// 	const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
// 	const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
// 	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
// 	const [menuRoomId, setMenuRoomId] = useState<number | null>(null);

// 	const filteredRooms = rooms.filter((room) => {
// 		const matchesSearch = room.number.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase());
// 		const matchesStatus = statusFilter === "all" || room.status === statusFilter;
// 		const matchesCapacity = capacityFilter === "all" || room.capacity.toString() === capacityFilter;
// 		const matchesType = typeFilter === "all" || room.type === typeFilter;
// 		return matchesSearch && matchesStatus && matchesCapacity && matchesType;
// 	});

// 	const vacantCount = rooms.filter((r) => r.status === "vacant").length;
// 	const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
// 	const maintenanceCount = rooms.filter((r) => r.status === "maintenance").length;
// 	const occupancyDenominator = Math.max(1, rooms.length - maintenanceCount);
// 	const occupancyRate = Math.round((occupiedCount / occupancyDenominator) * 100);

// 	const toggleRoomStatus = (id: number) => {
// 		const room = rooms.find(r => r.id === id);
// 		if (!room) return;

// 		// If room is vacant, open check-in modal
// 		if (room.status === "vacant") {
// 			setSelectedRoom(room);
// 			setIsCheckInModalOpen(true);
// 		} else if (room.status === "occupied") {
// 			// If room is occupied, mark as vacant and clear guest data
// 			setRooms((prevRooms) =>
// 				prevRooms.map((r) =>
// 					r.id === id ? { 
// 						...r, 
// 						status: "vacant", 
// 						guests: 0,
// 						guestName: undefined,
// 						guestEmail: undefined,
// 						guestPhone: undefined,
// 						paymentMethod: undefined,
// 						checkInDate: undefined,
// 						checkOutDate: undefined,
// 					} : r
// 				)
// 			);
// 		}
// 	};

// 	const handleCheckIn = (roomId: number, checkInData: any) => {
// 		setRooms((prevRooms) =>
// 			prevRooms.map((room) =>
// 				room.id === roomId
// 					? { 
// 						...room, 
// 						status: "occupied", 
// 						guests: checkInData.numberOfGuests,
// 						guestName: checkInData.guestName,
// 						guestEmail: checkInData.guestEmail,
// 						guestPhone: checkInData.guestPhone,
// 						paymentMethod: checkInData.paymentMethod,
// 						checkInDate: checkInData.checkInDate,
// 						checkOutDate: checkInData.checkOutDate,
// 					}
// 					: room
// 			)
// 		);
// 		setIsCheckInModalOpen(false);
// 		setSelectedRoom(null);
// 	};

// 	const setMaintenanceStatus = (id: number, toMaintenance: boolean) => {
// 		setRooms((prevRooms) =>
// 			prevRooms.map((room) => {
// 				if (room.id !== id) return room;
// 				if (toMaintenance) {
// 					return {
// 						...room,
// 						status: "maintenance",
// 						guests: 0,
// 						guestName: undefined,
// 						guestEmail: undefined,
// 						guestPhone: undefined,
// 						paymentMethod: undefined,
// 						checkInDate: undefined,
// 						checkOutDate: undefined,
// 					};
// 				}
// 				return { ...room, status: "vacant", guests: 0 };
// 			})
// 		);
// 	};

// 	const openRoomModal = (room: Room) => {
// 		setSelectedRoom(room);
// 		setIsRoomModalOpen(true);
// 	};

// 	const closeRoomModal = () => {
// 		setSelectedRoom(null);
// 		setIsRoomModalOpen(false);
// 	};

// 	const closeCheckInModal = () => {
// 		setSelectedRoom(null);
// 		setIsCheckInModalOpen(false);
// 	};

// 	const toggleRoomMenu = (e: React.MouseEvent, roomId: number) => {
// 		e.stopPropagation();
// 		setMenuRoomId((prev) => (prev === roomId ? null : roomId));
// 	};

// 	useEffect(() => {
// 		const handleOutsideClick = (event: MouseEvent) => {
// 			if (menuRoomId === null) return;
// 			const target = event.target as Element | null;
// 			if (target?.closest("[data-room-menu]")) return;
// 			setMenuRoomId(null);
// 		};
// 		document.addEventListener("mousedown", handleOutsideClick);
// 		return () => document.removeEventListener("mousedown", handleOutsideClick);
// 	}, [menuRoomId]);

// 	return (
// 		<div className="min-h-screen bg-gray-50">
// 			<DashboardHeader
// 				userName={session?.user?.name}
// 				userEmail={session?.user?.email}
// 				userRole={(session?.user as { role?: string } | undefined)?.role}
// 			/>

// 			<div className="flex">
// 				<Sidebar role={userRole} />

// 				<div className="flex-1 p-8">
// 					{/* Page Title */}
// 					<div className="mb-8">
// 						<h1 className="text-3xl font-bold mb-2">Manage Rooms</h1>
// 						<p className="text-muted-foreground">View and manage all rooms in your assigned property</p>
// 					</div>

// 					{/* Stats Cards */}
// 					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
// 						<Card>
// 							<div className="p-4">
// 								<div className="flex items-center justify-between">
// 									<div>
// 										<p className="text-sm font-medium text-muted-foreground">Total Rooms</p>
// 										<p className="text-3xl font-bold mt-2">{rooms.length}</p>
// 									</div>
// 									<div className="p-3 rounded-lg bg-blue-50">
// 										<DoorOpen size={24} className="text-blue-500" />
// 									</div>
// 								</div>
// 							</div>
// 						</Card>

// 						<Card>
// 							<div className="p-4">
// 								<div className="flex items-center justify-between">
// 									<div>
// 										<p className="text-sm font-medium text-muted-foreground">Vacant</p>
// 										<p className="text-3xl font-bold text-green-600 mt-2">{vacantCount}</p>
// 									</div>
// 									<div className="p-3 rounded-lg bg-green-50">
// 										<DoorOpen size={24} className="text-green-500" />
// 									</div>
// 								</div>
// 							</div>
// 						</Card>

// 						<Card>
// 							<div className="p-4">
// 								<div className="flex items-center justify-between">
// 									<div>
// 										<p className="text-sm font-medium text-muted-foreground">Occupied</p>
// 										<p className="text-3xl font-bold text-red-600 mt-2">{occupiedCount}</p>
// 									</div>
// 									<div className="p-3 rounded-lg bg-red-50">
// 										<Users size={24} className="text-red-500" />
// 									</div>
// 								</div>
// 							</div>
// 						</Card>

// 						<Card>
// 							<div className="p-4">
// 								<div className="flex items-center justify-between">
// 									<div>
// 										<p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
// 										<p className="text-3xl font-bold text-purple-600 mt-2">{occupancyRate}%</p>
// 									</div>
// 									<div className="p-3 rounded-lg bg-purple-50">
// 										<span className="text-purple-600 font-bold">{occupancyRate}%</span>
// 									</div>
// 								</div>
// 							</div>
// 						</Card>
// 					</div>

// 					{/* Filters */}
// 					<div className="mb-6 flex flex-col sm:flex-row gap-4">
// 						<div className="flex-1 relative">
// 							<Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
// 							<Input
// 								placeholder="Search by room number or type..."
// 								value={searchTerm}
// 								onChange={(e) => setSearchTerm(e.target.value)}
// 								className="pl-10"
// 							/>
// 						</div>
						
// 						{/* Capacity Filter */}
// 						<select
// 							value={capacityFilter}
// 							onChange={(e) => setCapacityFilter(e.target.value as "all" | "1" | "2" | "4")}
// 							className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
// 						>
// 							<option value="all">All Capacities</option>
// 							<option value="1">1 Person</option>
// 							<option value="2">2 People</option>
// 							<option value="4">4 People</option>
// 						</select>

// 						{/* Type Filter */}
// 						<select
// 							value={typeFilter}
// 							onChange={(e) => setTypeFilter(e.target.value as "all" | "Single" | "Double" | "Suite")}
// 							className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
// 						>
// 							<option value="all">All Types</option>
// 							<option value="Single">Single</option>
// 							<option value="Double">Double</option>
// 							<option value="Suite">Suite</option>
// 						</select>

// 						<div className="flex gap-2">
// 							<Button
// 								variant={statusFilter === "all" ? "default" : "outline"}
// 								onClick={() => setStatusFilter("all")}
// 							>
// 								All
// 							</Button>
// 							<Button
// 								variant={statusFilter === "vacant" ? "default" : "outline"}
// 								onClick={() => setStatusFilter("vacant")}
// 							>
// 								Vacant
// 							</Button>
// 							<Button
// 								variant={statusFilter === "occupied" ? "default" : "outline"}
// 								onClick={() => setStatusFilter("occupied")}
// 							>
// 								Occupied
// 							</Button>
// 							<Button
// 								variant={statusFilter === "maintenance" ? "default" : "outline"}
// 								onClick={() => setStatusFilter("maintenance")}
// 							>
// 								Maintenance
// 							</Button>
// 						</div>
// 					</div>

// 					{/* Rooms Table */}
// 					<div className="overflow-x-auto">
// 						<table className="w-full text-sm">
// 							<thead>
// 								<tr className="border-b border-gray-200">
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Room Number</th>
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Type</th>
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Capacity</th>
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Guests</th>
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Price/Night</th>
// 									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Action</th>
// 								</tr>
// 							</thead>
// 							<tbody>
// 								{filteredRooms.map((room) => (
// 									<tr
// 										key={room.id}
// 										onClick={() => room.status !== "maintenance" && openRoomModal(room)}
// 										className={`border-b border-gray-200 hover:bg-gray-50 transition ${
// 											room.status !== "maintenance" ? "cursor-pointer" : "cursor-default"
// 										}`}
// 									>
// 										<td className="px-4 py-3 font-semibold">#{room.number}</td>
// 										<td className="px-4 py-3">{room.type}</td>
// 										<td className="px-4 py-3">
// 											<span
// 												className={`px-3 py-1 rounded-full text-xs font-medium ${
// 													room.status === "occupied"
// 														? "bg-red-50 text-red-600"
// 														: room.status === "vacant"
// 														? "bg-green-50 text-green-600"
// 														: "bg-gray-50 text-gray-600"
// 												}`}
// 											>
// 												{room.status.charAt(0).toUpperCase() + room.status.slice(1)}
// 											</span>
// 										</td>
// 										<td className="px-4 py-3">{room.capacity}</td>
// 										<td className="px-4 py-3">{room.guests}</td>
// 										<td className="px-4 py-3">${room.pricePerNight}</td>
// 										<td className="px-4 py-3">
// 											<div className="flex items-center justify-between min-w-[200px]">
												
// 												{/* Left: Action button OR invisible placeholder */}
// 												{room.status === "maintenance" ? (
// 												<span className="inline-block w-[120px] h-[32px] invisible" />
// 												) : (
// 												<Button
// 													size="sm"
// 													variant="outline"
// 													onClick={(e) => {
// 													e.stopPropagation();
// 													toggleRoomStatus(room.id);
// 													}}
// 													className={`text-xs w-[120px] ${
// 													room.status === "occupied"
// 														? "border-green-600 text-green-600 hover:bg-green-50"
// 														: "border-red-600 text-red-600 hover:bg-red-50"
// 													}`}
// 												>
// 													{room.status === "occupied" ? "Mark Vacant" : "Mark Occupied"}
// 												</Button>
// 												)}

// 												{/* Right: 3 dots (ALWAYS fixed) */}
// 												<div className="relative">
// 												<button
// 													type="button"
// 														className="p-2 rounded hover:bg-gray-100"
// 													onClick={(e) => toggleRoomMenu(e, room.id)}
// 													aria-label="Room actions"
// 														data-room-menu
// 												>
// 													<MoreHorizontal size={16} />
// 												</button>

// 												{menuRoomId === room.id && (
// 													<div
// 													className="absolute right-0 mt-2 w-48 rounded border bg-white shadow-md z-10"
// 													onClick={(e) => e.stopPropagation()}
// 															data-room-menu
// 													>
// 													<button
// 														type="button"
// 														className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
// 														onClick={() => {
// 														setMaintenanceStatus(room.id, room.status !== "maintenance");
// 														setMenuRoomId(null);
// 														}}
// 													>
// 														{room.status === "maintenance"
// 														? "Remove Maintenance"
// 														: "Mark Under Maintenance"}
// 													</button>
// 													</div>
// 												)}
// 												</div>

// 											</div>
// 											</td>

// 									</tr>
// 								))}
// 							</tbody>
// 						</table>
// 					</div>

// 					{filteredRooms.length === 0 && (
// 						<div className="text-center py-12">
// 							<DoorOpen size={48} className="mx-auto text-gray-400 mb-4" />
// 							<p className="text-muted-foreground text-lg">No rooms found matching your filters</p>
// 						</div>
// 					)}

// 					{/* Room Details Modal */}
// 					<RoomDetailsModal
// 						open={isRoomModalOpen}
// 						room={selectedRoom}
// 						onClose={closeRoomModal}
// 					/>

// 					{/* Check-In Modal */}
// 					<CheckInModal
// 						open={isCheckInModalOpen}
// 						room={selectedRoom}
// 						onClose={closeCheckInModal}
// 						onConfirm={handleCheckIn}
// 					/>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }


"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import CheckInModal from "@/components/receptionist/CheckInModal";
import RoomActionModal from "@/components/receptionist/room-action-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, DoorOpen, Users } from "lucide-react";

interface Room {
	id: number;
	number: string;
	type: string;
	status: "occupied" | "vacant" | "maintenance" | "dirty" | "cleaning";
	capacity: number;
	pricePerNight: number;
	guests: number;
	floorNumber: number;
	isGroupBooking?: boolean;
	groupBookingName?: string;
	paidAmount?: number;
	bookingId?: string;
	occupancyId?: string;
	idProofType?: string;
	idProofNumber?: string;
	checkInAt?: string;
	checkOutAt?: string;
	expectedCheckOutDate?: string;
	// Guest information (optional - only for occupied rooms)
	guestName?: string;
	guestEmail?: string;
	guestPhone?: string;
	paymentMethod?: string;
	bookingSource?: string;
}

export default function RoomsPage() {
	const { data: session } = useSession();
	const rawRole = (session?.user as { role?: string } | undefined)?.role;
	const userRole = (rawRole === "owner" ? "owner" : "receptionist") as "owner" | "receptionist";
	const [rooms, setRooms] = useState<Room[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "occupied" | "vacant" | "dirty" | "cleaning">("all");
	const [capacityFilter, setCapacityFilter] = useState<"all" | "1" | "2" | "4">("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
	const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
	const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
	const [paymentAmount, setPaymentAmount] = useState("");
	const [priceDraft, setPriceDraft] = useState("");
	const [editCheckOutDate, setEditCheckOutDate] = useState("");

	// Fetch rooms data from API
	useEffect(() => {
		async function fetchRooms() {
			try {
				setIsLoading(true);
				const response = await fetch("/api/receptionist/rooms");
				if (!response.ok) throw new Error("Failed to fetch rooms");
				
				const data = await response.json();
				
			// Transform API data to match Room interface
			const transformedRooms: Room[] = data.rooms.map((room: any) => {
				const occupancy = room.currentOccupancy;
				const primaryGuest = occupancy?.guests?.[0];
				
				// Normalize status to match expected values
				let normalizedStatus: "occupied" | "vacant" | "maintenance" | "dirty" | "cleaning" = "vacant";
				if (room.status === "OCCUPIED") normalizedStatus = "occupied";
				else if (room.status === "MAINTENANCE") normalizedStatus = "maintenance";
				else if (room.status === "DIRTY") normalizedStatus = "dirty";
				else if (room.status === "CLEANING") normalizedStatus = "cleaning";
				else normalizedStatus = "vacant";
				
				return {
					id: room.id,
					number: room.roomNumber,
					type: room.type,
					status: normalizedStatus,
					capacity: occupancy?.actualCapacity || room.capacity,
					pricePerNight: room.pricePerNight,
					guests: occupancy?.numberOfOccupants || 0,
					floorNumber: room.floor?.floorNumber || 0,
					paidAmount: occupancy?.paidAmount || 0,
					bookingId: occupancy?.id ? `BK-${occupancy.id}` : undefined,
					occupancyId: occupancy?.id,
					checkInAt: occupancy?.checkInTime,
					expectedCheckOutDate: occupancy?.expectedCheckOut,
					guestName: primaryGuest?.name,
					guestEmail: primaryGuest?.email,
					guestPhone: primaryGuest?.phone,
					isGroupBooking: !!occupancy?.groupBookingId,
					bookingSource: occupancy?.bookingSource,
					idProofType: occupancy?.idProofType,
					idProofNumber: occupancy?.idProofNumber,
				};
			});				setRooms(transformedRooms);
			} catch (error) {
				console.error("Error fetching rooms:", error);
			} finally {
				setIsLoading(false);
			}
		}

		if (session?.user) {
			fetchRooms();
		}
	}, [session]);

	const selectedRoom = selectedRoomId
		? rooms.find((room) => room.id === selectedRoomId) || null
		: null;

	const filteredRooms = rooms.filter((room) => {
		const matchesSearch = room.number.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === "all" || room.status === statusFilter;
		const matchesCapacity = capacityFilter === "all" || room.capacity.toString() === capacityFilter;
		const matchesType = typeFilter === "all" || room.type === typeFilter;
		return matchesSearch && matchesStatus && matchesCapacity && matchesType;
	});

	const vacantCount = rooms.filter((r) => r.status === "vacant").length;
	const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
	const dirtyCount = rooms.filter((r) => r.status === "dirty").length;
	const cleaningCount = rooms.filter((r) => r.status === "cleaning").length;
	const occupancyDenominator = Math.max(1, rooms.length);
	const occupancyRate = Math.round((occupiedCount / occupancyDenominator) * 100);

	const toggleRoomStatus = async (id: number) => {
		const room = rooms.find(r => r.id === id);
		if (!room) return;

		// If room is vacant, open check-in modal
		if (room.status === "vacant") {
			setSelectedRoomId(room.id);
			setIsCheckInModalOpen(true);
		} else if (room.status === "occupied") {
			// If room is occupied, perform checkout with payment validation
			if (!room.occupancyId) {
				alert("No active booking found for this room");
				return;
			}

			try {
				const response = await fetch("/api/receptionist/checkout", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ occupancyId: room.occupancyId }),
				});

				if (!response.ok) {
					const error = await response.json();
					if (error.balanceAmount !== undefined) {
						alert(
							`Cannot checkout - Payment incomplete!\n\n` +
							`Nights Stayed: ${error.nightsStayed}\n` +
							`Total Amount: ₹${error.totalAmount}\n` +
							`Paid Amount: ₹${error.paidAmount}\n` +
							`Balance Pending: ₹${error.balanceAmount}\n\n` +
							`Please collect the pending payment before checkout.`
						);
					} else {
						alert(error.error || "Failed to checkout");
					}
					return;
				}

				const result = await response.json();
				
				// Reload rooms data to reflect the checkout
				setIsLoading(true);
				const roomsResponse = await fetch("/api/receptionist/rooms");
				if (roomsResponse.ok) {
					const data = await roomsResponse.json();
					const transformedRooms: Room[] = data.rooms.map((room: any) => {
						const occupancy = room.currentOccupancy;
						const primaryGuest = occupancy?.guests?.[0];
						
						let normalizedStatus: "occupied" | "vacant" | "maintenance" | "dirty" | "cleaning" = "vacant";
						if (room.status === "OCCUPIED") normalizedStatus = "occupied";
						else if (room.status === "MAINTENANCE") normalizedStatus = "maintenance";
						else if (room.status === "DIRTY") normalizedStatus = "dirty";
						else if (room.status === "CLEANING") normalizedStatus = "cleaning";
						else normalizedStatus = "vacant";
						
						return {
							id: room.id,
							number: room.roomNumber,
							type: room.type,
							status: normalizedStatus,
							capacity: occupancy?.actualCapacity || room.capacity,
							pricePerNight: room.pricePerNight,
							guests: occupancy?.numberOfOccupants || 0,
							floorNumber: room.floor?.floorNumber || 0,
							paidAmount: occupancy?.paidAmount || 0,
							bookingId: occupancy?.id ? `BK-${occupancy.id}` : undefined,
							occupancyId: occupancy?.id,
							checkInAt: occupancy?.checkInTime,
							expectedCheckOutDate: occupancy?.expectedCheckOut,
							guestName: primaryGuest?.name,
							guestEmail: primaryGuest?.email,
							guestPhone: primaryGuest?.phone,
							isGroupBooking: !!occupancy?.groupBookingId,
							bookingSource: occupancy?.bookingSource,
						};
					});
					setRooms(transformedRooms);
				}
				setIsLoading(false);
				
				alert(
					`Checkout successful!\n\n` +
					`Guest: ${room.guestName}\n` +
					`Nights Stayed: ${result.occupancy.nightsStayed}\n` +
					`Room marked as DIRTY for cleaning.`
				);
				
				// Close the modal if it's open
				setIsRoomModalOpen(false);
			} catch (error) {
				console.error("Checkout error:", error);
				alert(error instanceof Error ? error.message : "Failed to checkout guest");
			}
		}
	};

	const handleCheckIn = async (roomId: number, checkInData: any) => {
		try {
			const checkInTimestamp = new Date().toISOString();
			
			// Prepare API payload
			const payload = {
				roomId,
				checkInTime: checkInTimestamp,
				expectedCheckOut: checkInData.checkOutDate,
				actualRoomRate: checkInData.pricePerNight,
				actualCapacity: checkInData.numberOfGuests,
				numberOfOccupants: checkInData.numberOfGuests,
				guests: [
					{
						name: checkInData.guestName,
						email: checkInData.guestEmail,
						phone: checkInData.guestPhone,
						idProofType: checkInData.idProofType,
						idProofNumber: checkInData.idProofNumber,
						isPrimary: true,
					}
				],
				initialPayment: checkInData.advancePayment ? {
					amount: checkInData.advancePayment,
					paymentMethod: checkInData.paymentMethod,
				} : undefined,
				bookingSource: checkInData.bookingPlatform || "WALK_IN",
			};
			
			console.log("Check-in payload:", payload);
			console.log("numberOfOccupants being sent:", payload.numberOfOccupants);


			const response = await fetch("/api/receptionist/check-in", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Check-in failed");
			}

			// Refresh rooms data after successful check-in
			const roomsResponse = await fetch("/api/receptionist/rooms");
			if (roomsResponse.ok) {
				const data = await roomsResponse.json();
				const transformedRooms: Room[] = data.rooms.map((room: any) => {
					const occupancy = room.currentOccupancy;
					const primaryGuest = occupancy?.guests?.[0];
					
					let normalizedStatus: "occupied" | "vacant" | "maintenance" | "dirty" | "cleaning" = "vacant";
					if (room.status === "OCCUPIED") normalizedStatus = "occupied";
					else if (room.status === "MAINTENANCE") normalizedStatus = "maintenance";
					else if (room.status === "DIRTY") normalizedStatus = "dirty";
					else if (room.status === "CLEANING") normalizedStatus = "cleaning";
					else normalizedStatus = "vacant";
					
					return {
						id: room.id,
						number: room.roomNumber,
						type: room.type,
						status: normalizedStatus,
						capacity: occupancy?.actualCapacity || room.capacity,
						pricePerNight: room.pricePerNight,
						guests: occupancy?.numberOfOccupants || 0,
						floorNumber: room.floor?.floorNumber || 0,
						paidAmount: occupancy?.paidAmount || 0,
						bookingId: occupancy?.id ? `BK-${occupancy.id}` : undefined,
						occupancyId: occupancy?.id,
						checkInAt: occupancy?.checkInTime,
						expectedCheckOutDate: occupancy?.expectedCheckOut,
						guestName: primaryGuest?.name,
						guestEmail: primaryGuest?.email,
						guestPhone: primaryGuest?.phone,
						isGroupBooking: !!occupancy?.groupBookingId,
						bookingSource: occupancy?.bookingSource,
						idProofType: occupancy?.idProofType,
						idProofNumber: occupancy?.idProofNumber,
					};
				});
				setRooms(transformedRooms);
			}
			
			setIsCheckInModalOpen(false);
			setSelectedRoomId(null);
		} catch (error) {
			console.error("Check-in error:", error);
			alert(error instanceof Error ? error.message : "Failed to check in guest");
		}
	};

	const removeMaintenance = async (id: number) => {
		try {
			const response = await fetch(`/api/receptionist/rooms/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "VACANT" }),
			});

			if (!response.ok) throw new Error("Failed to update room status");

			setRooms((prevRooms) =>
				prevRooms.map((room) => (room.id === id ? { ...room, status: "vacant", guests: 0 } : room))
			);
			alert("Room marked as vacant");
		} catch (error) {
			console.error("Error removing maintenance:", error);
			alert("Failed to update room status");
		}
	};

	const markRoomCleaning = async (id: number) => {
		try {
			const response = await fetch(`/api/receptionist/rooms/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "CLEANING" }),
			});

			if (!response.ok) throw new Error("Failed to update room status");

			setRooms((prevRooms) =>
				prevRooms.map((room) => (room.id === id ? { ...room, status: "cleaning" } : room))
			);
			setIsRoomModalOpen(false);
			alert("Room status updated to Cleaning");
		} catch (error) {
			console.error("Error updating room status:", error);
			alert("Failed to update room status");
		}
	};

	const markRoomVacantFromCleaning = async (id: number) => {
		try {
			const response = await fetch(`/api/receptionist/rooms/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "VACANT" }),
			});

			if (!response.ok) throw new Error("Failed to update room status");

			setRooms((prevRooms) =>
				prevRooms.map((room) => (room.id === id ? { ...room, status: "vacant" } : room))
			);
			setIsRoomModalOpen(false);
			alert("Room marked as vacant and ready for booking");
		} catch (error) {
			console.error("Error updating room status:", error);
			alert("Failed to update room status");
		}
	};

	const openRoomModal = (room: Room) => {
		setSelectedRoomId(room.id);
		setPriceDraft(String(room.pricePerNight));
		setPaymentAmount("");
		setEditCheckOutDate(room.expectedCheckOutDate || "");
		setIsRoomModalOpen(true);
	};

	const closeRoomModal = () => {
		setSelectedRoomId(null);
		setIsRoomModalOpen(false);
	};

	const closeCheckInModal = () => {
		setSelectedRoomId(null);
		setIsCheckInModalOpen(false);
	};

	const calculateNights = (room: Room) => {
		if (!room.checkInAt || !(room.expectedCheckOutDate || room.checkOutAt)) return 1;
		const checkIn = new Date(room.checkInAt);
		const checkOut = new Date(room.expectedCheckOutDate || room.checkOutAt || room.checkInAt);
		return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
	};

	const formatDate = (date?: string) => {
		if (!date) return "N/A";
		return new Date(date).toLocaleDateString("en-IN", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getTotalAmount = (room: Room) => {
		if (room.status !== "occupied") return 0;
		return calculateNights(room) * room.pricePerNight;
	};

	const getPaymentSummary = (room: Room) => {
		const total = getTotalAmount(room);
		const paid = room.paidAmount || 0;
		const balance = Math.max(0, total - paid);
		const status = total === 0 ? "N/A" : balance === 0 ? "Completed" : paid === 0 ? "Pending" : "Partial";
		return { total, paid, balance, status };
	};

	const handleAddPayment = async () => {
		console.log("handleAddPayment called");
		console.log("selectedRoom:", selectedRoom);
		console.log("paymentAmount:", paymentAmount);
		
		if (!selectedRoom || !selectedRoom.occupancyId) {
			console.error("No selected room or occupancyId missing");
			alert("Cannot process payment: No booking selected");
			return;
		}
		
		const amount = Number(paymentAmount);
		console.log("Parsed amount:", amount);
		
		if (!amount || amount <= 0) {
			alert("Please enter a valid payment amount");
			return;
		}
		
		const { total, paid, balance } = getPaymentSummary(selectedRoom);
		console.log("Payment summary:", { total, paid, balance });
		
		if (amount > balance) {
			alert(`Payment amount (₹${amount}) exceeds balance (₹${balance})`);
			return;
		}
		
		try {
			console.log("Sending payment request...");
			const response = await fetch("/api/receptionist/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					occupancyId: selectedRoom.occupancyId,
					amount,
					paymentMethod: "CASH",
					notes: `Payment for room ${selectedRoom.number}`,
				}),
			});

			console.log("Response status:", response.status);
			
			if (!response.ok) {
				const error = await response.json();
				console.error("API error:", error);
				throw new Error(error.error || "Failed to record payment");
			}

			const result = await response.json();
			console.log("Payment recorded successfully:", result);

			// Update local state
			const nextPaid = Math.min(total, paid + amount);
			setRooms((prevRooms) =>
				prevRooms.map((room) =>
					room.id === selectedRoom.id ? { ...room, paidAmount: nextPaid } : room
				)
			);
			setPaymentAmount("");
			alert("Payment recorded successfully!");
		} catch (error) {
			console.error("Payment error:", error);
			alert(error instanceof Error ? error.message : "Failed to record payment");
		}
	};

	const handleUpdatePrice = async () => {
		if (!selectedRoom) return;
		const nextPrice = Number(priceDraft);
		if (!nextPrice || nextPrice <= 0) return;
		
		try {
			const response = await fetch(`/api/receptionist/rooms/${selectedRoom.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pricePerNight: nextPrice }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to update price");
			}

			// Update local state
			setRooms((prevRooms) =>
				prevRooms.map((room) =>
					room.id === selectedRoom.id ? { ...room, pricePerNight: nextPrice } : room
				)
			);
		} catch (error) {
			console.error("Update price error:", error);
			alert(error instanceof Error ? error.message : "Failed to update price");
		}
	};

	const handleUpdateBooking = async () => {
		if (!selectedRoom || !selectedRoom.occupancyId) return;
		if (!editCheckOutDate) {
			alert("Please select a new checkout date");
			return;
		}
		
		try {
			const response = await fetch(`/api/receptionist/occupancies/${selectedRoom.occupancyId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					expectedCheckOut: new Date(editCheckOutDate).toISOString(),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to update booking");
			}

			// Update local state
			setRooms((prevRooms) =>
				prevRooms.map((room) =>
					room.id === selectedRoom.id
						? {
								...room,
								expectedCheckOutDate: editCheckOutDate,
							}
							: room
				)
			);
			alert("Booking updated successfully!");
		} catch (error) {
			console.error("Update booking error:", error);
			alert(error instanceof Error ? error.message : "Failed to update booking");
		}
	};
	const formatDateTime = (date?: string) => {
		if (!date) return "N/A";
		return new Date(date).toLocaleString("en-IN", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getStatusStyles = (status: Room["status"]) => {
		switch (status) {
			case "vacant":
				return "border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/40";
			case "occupied":
				return "border-orange-200 dark:border-orange-900 bg-orange-50/60 dark:bg-orange-950/40";
			case "dirty":
				return "border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/40";
			case "cleaning":
				return "border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40";
			case "maintenance":
			default:
				return "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800";
		}
	};

	const getFloorLabel = (floorNumber: number) => {
		if (floorNumber === 0) return "Ground Floor";
		const suffix = floorNumber === 1 ? "st" : floorNumber === 2 ? "nd" : floorNumber === 3 ? "rd" : "th";
		return `${floorNumber}${suffix} Floor`;
	};

	const roomsByFloor = filteredRooms.reduce<Record<number, Room[]>>((acc, room) => {
		const key = room.floorNumber;
		if (!acc[key]) acc[key] = [];
		acc[key].push(room);
		return acc;
	}, {});

	const floorOrder = Object.keys(roomsByFloor)
		.map((f) => Number(f))
		.sort((a, b) => a - b);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<DashboardHeader />

			<div className="flex">
				<Sidebar role={userRole} />

				<div className="flex-1 p-8">
					{/* Page Title */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">Manage Rooms</h1>
						<p className="text-muted-foreground">View and manage all rooms in your assigned property</p>
					</div>

					{/* Filters */}
					<div className="mb-6 flex flex-col sm:flex-row gap-4">
						<div className="flex-1 relative">
							<Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
							<Input
								placeholder="Search by room number or type..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>
						
						{/* Capacity Filter */}
						<select
							value={capacityFilter}
							onChange={(e) => setCapacityFilter(e.target.value as "all" | "1" | "2" | "4")}
							className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Capacities</option>
							<option value="1">1 Person</option>
							<option value="2">2 People</option>
							<option value="4">4 People</option>
						</select>

						{/* Type Filter */}
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
							className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Types</option>
							{Array.from(new Set(rooms.map(r => r.type))).sort().map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>

						<div className="flex gap-2">
							<Button
								variant={statusFilter === "all" ? "default" : "outline"}
								onClick={() => setStatusFilter("all")}
							>
								All
							</Button>
							<Button
								variant={statusFilter === "vacant" ? "default" : "outline"}
								onClick={() => setStatusFilter("vacant")}
							>
								Vacant
							</Button>
							<Button
								variant={statusFilter === "occupied" ? "default" : "outline"}
								onClick={() => setStatusFilter("occupied")}
							>
								Occupied
							</Button>
							<Button
								variant={statusFilter === "dirty" ? "default" : "outline"}
								onClick={() => setStatusFilter("dirty")}
							>
								Dirty
							</Button>
							<Button
								variant={statusFilter === "cleaning" ? "default" : "outline"}
								onClick={() => setStatusFilter("cleaning")}
							>
								Cleaning
							</Button>
						</div>
					</div>

					{/* Rooms by Floor */}
					{isLoading ? (
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
							<p className="text-muted-foreground">Loading rooms...</p>
						</div>
					) : (
						<>
							{floorOrder.map((floorNumber) => (
						<div key={floorNumber} className="mb-8">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-xl font-semibold">{getFloorLabel(floorNumber)}</h2>
								<span className="text-sm text-muted-foreground">
									{roomsByFloor[floorNumber]?.length || 0} Rooms
								</span>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
								{roomsByFloor[floorNumber].map((room) => (
									<button
										key={room.id}
										type="button"
										onClick={() => openRoomModal(room)}
										className={`relative text-left rounded-md border p-2 shadow-sm transition hover:shadow-md ${getStatusStyles(room.status)}`}
									>
										<div className="flex items-center justify-between mb-1">
											<div className="flex items-center gap-1">
												<div className="text-sm font-semibold">#{room.number}</div>
												{room.isGroupBooking && (
													<span
														className="h-2.5 w-2.5 rounded-full bg-red-500"
														title={`Group booking: ${room.groupBookingName || "Unknown"}`}
													/>
												)}
											</div>
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
													room.status === "occupied"
													? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-100"
													: room.status === "vacant"
													? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100"
													: room.status === "dirty"
													? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100"
													: room.status === "cleaning"
													? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100"
													: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100"
												}`}
											>
												{room.status.charAt(0).toUpperCase() + room.status.slice(1)}
											</span>
										</div>

										<div className="text-[11px] text-muted-foreground mb-1">{room.type}</div>
										{room.status === "occupied" && room.guestName && (
											<div className="text-[10px] text-blue-600 dark:text-blue-400 mb-1 truncate" title={room.guestName}>
												👤 {room.guestName}
											</div>
										)}
										<div className="grid grid-cols-2 gap-2 text-[11px]">
											<div>
												<p className="text-xs text-muted-foreground">Capacity</p>
												<p className="font-medium">{room.capacity}</p>
											</div>
											<div className="col-span-2">
												<p className="text-xs text-muted-foreground">Price / Night</p>
												<p className="font-semibold">₹{room.pricePerNight}</p>
											</div>
										</div>
									</button>
								))}
							</div>
						</div>
					))}

					{filteredRooms.length === 0 && !isLoading && (
						<div className="text-center py-12">
							<DoorOpen size={48} className="mx-auto text-gray-400 mb-4" />
							<p className="text-muted-foreground text-lg">No rooms found matching your filters</p>
						</div>
					)}
						</>
					)}


					{/* Room Details Modal */}
					<RoomActionModal
						open={isRoomModalOpen}
						room={selectedRoom}
						onClose={closeRoomModal}
						onCheckIn={() => {
							setIsRoomModalOpen(false);
							setIsCheckInModalOpen(true);
						}}
						onMarkVacant={() => selectedRoom && toggleRoomStatus(selectedRoom.id)}
						onRemoveMaintenance={() => selectedRoom && removeMaintenance(selectedRoom.id)}
						onMarkCleaning={() => selectedRoom && markRoomCleaning(selectedRoom.id)}
						onMarkVacantFromCleaning={() => selectedRoom && markRoomVacantFromCleaning(selectedRoom.id)}
						paymentSummary={selectedRoom ? getPaymentSummary(selectedRoom) : null}
						nights={selectedRoom ? calculateNights(selectedRoom) : 0}
						formatDate={formatDate}
						formatDateTime={formatDateTime}
						paymentAmount={paymentAmount}
						onPaymentAmountChange={setPaymentAmount}
						onAddPayment={handleAddPayment}
						priceDraft={priceDraft}
						onPriceDraftChange={setPriceDraft}
						onUpdatePrice={handleUpdatePrice}
						editCheckOutDate={editCheckOutDate}
						onEditCheckOutDateChange={setEditCheckOutDate}
						onUpdateBooking={handleUpdateBooking}
						getFloorLabel={getFloorLabel}
					/>

					{/* Check-In Modal */}
					<CheckInModal
						open={isCheckInModalOpen}
						room={selectedRoom}
						onClose={closeCheckInModal}
						onConfirm={handleCheckIn}
					/>
				</div>
			</div>
		</div>
	);
}