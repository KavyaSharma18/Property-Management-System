"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import RoomDetailsModal from "@/components/receptionist/RoomDetailsModal";
import CheckInModal from "@/components/receptionist/CheckInModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, DoorOpen, Users } from "lucide-react";

interface Room {
	id: number;
	number: string;
	type: string;
	status: "occupied" | "vacant" | "maintenance";
	capacity: number;
	pricePerNight: number;
	guests: number;
	// Guest information (optional - only for occupied rooms)
	guestName?: string;
	guestEmail?: string;
	guestPhone?: string;
	paymentMethod?: string;
	checkInDate?: string;
	checkOutDate?: string;
}

// Mock room data
const MOCK_ROOMS: Room[] = [
	{
		id: 1,
		number: "101",
		type: "Single",
		status: "occupied",
		capacity: 1,
		pricePerNight: 50,
		guests: 1,
	},
	{
		id: 2,
		number: "102",
		type: "Double",
		status: "vacant",
		capacity: 2,
		pricePerNight: 80,
		guests: 0,
	},
	{
		id: 3,
		number: "103",
		type: "Suite",
		status: "occupied",
		capacity: 4,
		pricePerNight: 150,
		guests: 3,
	},
	{
		id: 4,
		number: "104",
		type: "Double",
		status: "vacant",
		capacity: 2,
		pricePerNight: 80,
		guests: 0,
	},
	{
		id: 5,
		number: "201",
		type: "Single",
		status: "occupied",
		capacity: 1,
		pricePerNight: 50,
		guests: 1,
	},
	{
		id: 6,
		number: "202",
		type: "Double",
		status: "occupied",
		capacity: 2,
		pricePerNight: 80,
		guests: 2,
	},
	{
		id: 7,
		number: "203",
		type: "Single",
		status: "maintenance",
		capacity: 1,
		pricePerNight: 0,
		guests: 0,
	},
];

export default function RoomsPage() {
	const { data: session } = useSession();
	const rawRole = (session?.user as { role?: string } | undefined)?.role;
	const userRole = (rawRole === "owner" ? "owner" : "receptionist") as "owner" | "receptionist";
	const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "occupied" | "vacant" | "maintenance">("all");
	const [capacityFilter, setCapacityFilter] = useState<"all" | "1" | "2" | "4">("all");
	const [typeFilter, setTypeFilter] = useState<"all" | "Single" | "Double" | "Suite">("all");
	const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
	const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

	const filteredRooms = rooms.filter((room) => {
		const matchesSearch = room.number.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === "all" || room.status === statusFilter;
		const matchesCapacity = capacityFilter === "all" || room.capacity.toString() === capacityFilter;
		const matchesType = typeFilter === "all" || room.type === typeFilter;
		return matchesSearch && matchesStatus && matchesCapacity && matchesType;
	});

	const vacantCount = rooms.filter((r) => r.status === "vacant").length;
	const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
	const maintenanceCount = rooms.filter((r) => r.status === "maintenance").length;
	const occupancyDenominator = Math.max(1, rooms.length - maintenanceCount);
	const occupancyRate = Math.round((occupiedCount / occupancyDenominator) * 100);

	const toggleRoomStatus = (id: number) => {
		const room = rooms.find(r => r.id === id);
		if (!room) return;

		// If room is vacant, open check-in modal
		if (room.status === "vacant") {
			setSelectedRoom(room);
			setIsCheckInModalOpen(true);
		} else if (room.status === "occupied") {
			// If room is occupied, mark as vacant and clear guest data
			setRooms((prevRooms) =>
				prevRooms.map((r) =>
					r.id === id ? { 
						...r, 
						status: "vacant", 
						guests: 0,
						guestName: undefined,
						guestEmail: undefined,
						guestPhone: undefined,
						paymentMethod: undefined,
						checkInDate: undefined,
						checkOutDate: undefined,
					} : r
				)
			);
		}
	};

	const handleCheckIn = (roomId: number, checkInData: any) => {
		setRooms((prevRooms) =>
			prevRooms.map((room) =>
				room.id === roomId
					? { 
						...room, 
						status: "occupied", 
						guests: checkInData.numberOfGuests,
						guestName: checkInData.guestName,
						guestEmail: checkInData.guestEmail,
						guestPhone: checkInData.guestPhone,
						paymentMethod: checkInData.paymentMethod,
						checkInDate: checkInData.checkInDate,
						checkOutDate: checkInData.checkOutDate,
					}
					: room
			)
		);
		setIsCheckInModalOpen(false);
		setSelectedRoom(null);
	};

	const removeMaintenance = (id: number) => {
		setRooms((prevRooms) =>
			prevRooms.map((room) => (room.id === id ? { ...room, status: "vacant", guests: 0 } : room))
		);
	};

	const openRoomModal = (room: Room) => {
		setSelectedRoom(room);
		setIsRoomModalOpen(true);
	};

	const closeRoomModal = () => {
		setSelectedRoom(null);
		setIsRoomModalOpen(false);
	};

	const closeCheckInModal = () => {
		setSelectedRoom(null);
		setIsCheckInModalOpen(false);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<DashboardHeader />

			<div className="flex">
				<Sidebar role={userRole} />

				<div className="flex-1 p-8">
					{/* Page Title */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">Manage Rooms</h1>
						<p className="text-muted-foreground">View and manage all rooms in your assigned property</p>
					</div>

					{/* Stats Cards */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
						<Card>
							<div className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Total Rooms</p>
										<p className="text-3xl font-bold mt-2">{rooms.length}</p>
									</div>
									<div className="p-3 rounded-lg bg-blue-50">
										<DoorOpen size={24} className="text-blue-500" />
									</div>
								</div>
							</div>
						</Card>

						<Card>
							<div className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Vacant</p>
										<p className="text-3xl font-bold text-green-600 mt-2">{vacantCount}</p>
									</div>
									<div className="p-3 rounded-lg bg-green-50">
										<DoorOpen size={24} className="text-green-500" />
									</div>
								</div>
							</div>
						</Card>

						<Card>
							<div className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Occupied</p>
										<p className="text-3xl font-bold text-red-600 mt-2">{occupiedCount}</p>
									</div>
									<div className="p-3 rounded-lg bg-red-50">
										<Users size={24} className="text-red-500" />
									</div>
								</div>
							</div>
						</Card>

						<Card>
							<div className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
										<p className="text-3xl font-bold text-purple-600 mt-2">{occupancyRate}%</p>
									</div>
									<div className="p-3 rounded-lg bg-purple-50">
										<span className="text-purple-600 font-bold">{occupancyRate}%</span>
									</div>
								</div>
							</div>
						</Card>
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
							className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Capacities</option>
							<option value="1">1 Person</option>
							<option value="2">2 People</option>
							<option value="4">4 People</option>
						</select>

						{/* Type Filter */}
						<select
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value as "all" | "Single" | "Double" | "Suite")}
							className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Types</option>
							<option value="Single">Single</option>
							<option value="Double">Double</option>
							<option value="Suite">Suite</option>
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
								variant={statusFilter === "maintenance" ? "default" : "outline"}
								onClick={() => setStatusFilter("maintenance")}
							>
								Maintenance
							</Button>
						</div>
					</div>

					{/* Rooms Table */}
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200">
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Room Number</th>
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Type</th>
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Capacity</th>
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Guests</th>
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Price/Night</th>
									<th className="px-4 py-3 text-left text-muted-foreground font-medium">Action</th>
								</tr>
							</thead>
							<tbody>
								{filteredRooms.map((room) => (
									<tr
										key={room.id}
										onClick={() => room.status !== "maintenance" && openRoomModal(room)}
										className={`border-b border-gray-200 hover:bg-gray-50 transition ${
											room.status !== "maintenance" ? "cursor-pointer" : "cursor-default"
										}`}
									>
										<td className="px-4 py-3 font-semibold">#{room.number}</td>
										<td className="px-4 py-3">{room.type}</td>
										<td className="px-4 py-3">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													room.status === "occupied"
														? "bg-red-50 text-red-600"
														: room.status === "vacant"
														? "bg-green-50 text-green-600"
														: "bg-gray-50 text-gray-600"
												}`}
											>
												{room.status.charAt(0).toUpperCase() + room.status.slice(1)}
											</span>
										</td>
										<td className="px-4 py-3">{room.capacity}</td>
										<td className="px-4 py-3">{room.guests}</td>
										<td className="px-4 py-3">${room.pricePerNight}</td>
										<td className="px-4 py-3">
											{room.status === "maintenance" ? (
												<Button
													size="sm"
													variant="outline"
													onClick={(e) => {
														e.stopPropagation();
														removeMaintenance(room.id);
													}}
													className="text-xs border-gray-400 text-gray-600 hover:bg-gray-50"
												>
													Remove Maintenance
												</Button>
											) : (
												<Button
													size="sm"
													variant="outline"
													onClick={(e) => {
														e.stopPropagation();
														toggleRoomStatus(room.id);
													}}
													className={`text-xs ${
														room.status === "occupied"
															? "border-green-600 text-green-600 hover:bg-green-50"
															: "border-red-600 text-red-600 hover:bg-red-50"
													}`}
												>
													{room.status === "occupied" ? "Mark Vacant" : "Mark Occupied"}
												</Button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{filteredRooms.length === 0 && (
						<div className="text-center py-12">
							<DoorOpen size={48} className="mx-auto text-gray-400 mb-4" />
							<p className="text-muted-foreground text-lg">No rooms found matching your filters</p>
						</div>
					)}

					{/* Room Details Modal */}
					<RoomDetailsModal
						open={isRoomModalOpen}
						room={selectedRoom}
						onClose={closeRoomModal}
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