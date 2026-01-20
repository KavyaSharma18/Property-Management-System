// "use client";

// import { X } from "lucide-react";
// import { Button } from "@/components/ui/button";

// export interface Room {
// 	id: number;
// 	number: string;
// 	type: string;
// 	status: "occupied" | "vacant" | "maintenance";
// 	capacity: number;
// 	pricePerNight: number;
// 	guests: number;
// }

// interface RoomDetailsModalProps {
// 	open: boolean;
// 	room: Room | null;
// 	onClose: () => void;
// }

// export default function RoomDetailsModal({
// 	open,
// 	room,
// 	onClose,
// }: RoomDetailsModalProps) {
// 	if (!open || !room) return null;

// 	return (
// 		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
// 			<div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
// 				{/* Header */}
// 				<div className="flex items-center justify-between p-4 border-b">
// 					<h3 className="text-lg font-semibold">
// 						Room #{room.number}
// 					</h3>
// 					<button
// 						onClick={onClose}
// 						className="text-muted-foreground hover:text-foreground"
// 					>
// 						<X size={20} />
// 					</button>
// 				</div>

// 				{/* Body */}
// 				<div className="p-4 space-y-3">
// 					<p className="text-sm text-muted-foreground">
// 						Type: <span className="font-medium text-foreground">{room.type}</span>
// 					</p>
// 					<p className="text-sm text-muted-foreground">
// 						Status: <span className="font-medium text-foreground">{room.status}</span>
// 					</p>
// 					<p className="text-sm text-muted-foreground">
// 						Capacity: <span className="font-medium text-foreground">{room.capacity}</span>
// 					</p>
// 					<p className="text-sm text-muted-foreground">
// 						Guests: <span className="font-medium text-foreground">{room.guests}</span>
// 					</p>
// 					<p className="text-sm text-muted-foreground">
// 						Price / night: <span className="font-medium text-foreground">${room.pricePerNight}</span>
// 					</p>
// 				</div>

// 				{/* Footer */}
// 				<div className="flex justify-end gap-3 p-4 border-t">
// 					<Button variant="secondary" onClick={onClose}>
// 						Close
// 					</Button>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }



// "use client";

// import { X, User, Mail, Phone, CreditCard, Calendar, Users } from "lucide-react";
// import { Button } from "@/components/ui/button";

// export interface Room {
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

// interface RoomDetailsModalProps {
// 	open: boolean;
// 	room: Room | null;
// 	onClose: () => void;
// }

// export default function RoomDetailsModal({
// 	open,
// 	room,
// 	onClose,
// }: RoomDetailsModalProps) {
// 	if (!open || !room) return null;

// 	const handleModalClick = (e: React.MouseEvent) => {
// 		e.stopPropagation();
// 	};

// 	const formatDate = (dateString?: string) => {
// 		if (!dateString) return "N/A";
// 		return new Date(dateString).toLocaleDateString("en-US", {
// 			year: "numeric",
// 			month: "long",
// 			day: "numeric",
// 		});
// 	};

// 	const getPaymentMethodLabel = (method?: string) => {
// 		const methods: Record<string, string> = {
// 			cash: "Cash",
// 			credit_card: "Credit Card",
// 			debit_card: "Debit Card",
// 			upi: "UPI",
// 			bank_transfer: "Bank Transfer",
// 		};
// 		return methods[method || ""] || method || "N/A";
// 	};

// 	const calculateNights = () => {
// 		if (!room.checkInDate || !room.checkOutDate) return 0;
// 		const checkIn = new Date(room.checkInDate);
// 		const checkOut = new Date(room.checkOutDate);
// 		return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
// 	};

// 	const totalAmount = calculateNights() * room.pricePerNight;

// 	return (
// 		<div 
// 			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
// 			onClick={onClose}
// 		>
// 			<div 
// 				className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto"
// 				onClick={handleModalClick}
// 			>
// 				{/* Header */}
// 				<div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
// 					<div>
// 						<h3 className="text-xl font-semibold">
// 							Room #{room.number}
// 						</h3>
// 						<p className="text-sm text-muted-foreground mt-1">
// 							{room.type} Room
// 						</p>
// 					</div>
// 					<button
// 						onClick={onClose}
// 						className="text-muted-foreground hover:text-foreground transition-colors"
// 						aria-label="Close modal"
// 					>
// 						<X size={24} />
// 					</button>
// 				</div>

// 				{/* Body */}
// 				<div className="p-6">
// 					{/* Room Information */}
// 					<div className="mb-6">
// 						<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
// 							<span className="w-1 h-5 bg-blue-600 rounded"></span>
// 							Room Information
// 						</h4>
// 						<div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
// 							<div>
// 								<p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
// 								<span
// 									className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
// 										room.status === "occupied"
// 											? "bg-red-100 text-red-700"
// 											: room.status === "vacant"
// 											? "bg-green-100 text-green-700"
// 											: "bg-gray-100 text-gray-700"
// 									}`}
// 								>
// 									{room.status.charAt(0).toUpperCase() + room.status.slice(1)}
// 								</span>
// 							</div>
// 							<div>
// 								<p className="text-xs text-muted-foreground uppercase mb-1">Room Type</p>
// 								<p className="font-medium">{room.type}</p>
// 							</div>
// 							<div>
// 								<p className="text-xs text-muted-foreground uppercase mb-1">Capacity</p>
// 								<p className="font-medium">{room.capacity} {room.capacity === 1 ? "Person" : "People"}</p>
// 							</div>
// 							<div>
// 								<p className="text-xs text-muted-foreground uppercase mb-1">Current Guests</p>
// 								<p className="font-medium">{room.guests} {room.guests === 1 ? "Guest" : "Guests"}</p>
// 							</div>
// 							<div className="col-span-2">
// 								<p className="text-xs text-muted-foreground uppercase mb-1">Price per Night</p>
// 								<p className="text-2xl font-bold text-blue-600">${room.pricePerNight}</p>
// 							</div>
// 						</div>
// 					</div>

// 					{/* Guest Information - Only show if room is occupied */}
// 					{room.status === "occupied" && room.guestName && (
// 						<>
// 							<div className="mb-6">
// 								<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
// 									<span className="w-1 h-5 bg-green-600 rounded"></span>
// 									Guest Information
// 								</h4>
// 								<div className="space-y-3 bg-gray-50 p-4 rounded-lg">
// 									<div className="flex items-center gap-3">
// 										<User size={18} className="text-muted-foreground" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Guest Name</p>
// 											<p className="font-medium">{room.guestName}</p>
// 										</div>
// 									</div>
// 									<div className="flex items-center gap-3">
// 										<Mail size={18} className="text-muted-foreground" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Email</p>
// 											<p className="font-medium">{room.guestEmail || "N/A"}</p>
// 										</div>
// 									</div>
// 									<div className="flex items-center gap-3">
// 										<Phone size={18} className="text-muted-foreground" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Phone</p>
// 											<p className="font-medium">{room.guestPhone || "N/A"}</p>
// 										</div>
// 									</div>
// 									<div className="flex items-center gap-3">
// 										<CreditCard size={18} className="text-muted-foreground" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Payment Method</p>
// 											<p className="font-medium">{getPaymentMethodLabel(room.paymentMethod)}</p>
// 										</div>
// 									</div>
// 								</div>
// 							</div>

// 							{/* Booking Details */}
// 							<div className="mb-6">
// 								<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
// 									<span className="w-1 h-5 bg-purple-600 rounded"></span>
// 									Booking Details
// 								</h4>
// 								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
// 									<div className="flex items-start gap-3">
// 										<Calendar size={18} className="text-muted-foreground mt-1" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Check-In Date</p>
// 											<p className="font-medium">{formatDate(room.checkInDate)}</p>
// 										</div>
// 									</div>
// 									<div className="flex items-start gap-3">
// 										<Calendar size={18} className="text-muted-foreground mt-1" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Check-Out Date</p>
// 											<p className="font-medium">{formatDate(room.checkOutDate)}</p>
// 										</div>
// 									</div>
// 									<div className="flex items-start gap-3">
// 										<Users size={18} className="text-muted-foreground mt-1" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Number of Guests</p>
// 											<p className="font-medium">{room.guests}</p>
// 										</div>
// 									</div>
// 									<div className="flex items-start gap-3">
// 										<Calendar size={18} className="text-muted-foreground mt-1" />
// 										<div>
// 											<p className="text-xs text-muted-foreground">Number of Nights</p>
// 											<p className="font-medium">{calculateNights()} {calculateNights() === 1 ? "Night" : "Nights"}</p>
// 										</div>
// 									</div>
// 								</div>
// 							</div>

// 							{/* Payment Summary */}
// 							<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
// 								<h4 className="font-semibold mb-3">Payment Summary</h4>
// 								<div className="space-y-2">
// 									<div className="flex justify-between">
// 										<span className="text-sm text-muted-foreground">Price per Night</span>
// 										<span className="font-medium">${room.pricePerNight}</span>
// 									</div>
// 									<div className="flex justify-between">
// 										<span className="text-sm text-muted-foreground">Number of Nights</span>
// 										<span className="font-medium">{calculateNights()}</span>
// 									</div>
// 									<div className="flex justify-between pt-2 border-t border-blue-300">
// 										<span className="font-semibold">Total Amount</span>
// 										<span className="text-xl font-bold text-blue-600">${totalAmount}</span>
// 									</div>
// 								</div>
// 							</div>
// 						</>
// 					)}

// 					{/* Empty state for vacant rooms */}
// 					{room.status === "vacant" && (
// 						<div className="text-center py-8">
// 							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
// 								<Users size={32} className="text-green-600" />
// 							</div>
// 							<p className="text-muted-foreground">This room is currently vacant</p>
// 							<p className="text-sm text-muted-foreground mt-1">No guest information available</p>
// 						</div>
// 					)}

// 					{/* Maintenance state */}
// 					{room.status === "maintenance" && (
// 						<div className="text-center py-8">
// 							<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
// 								<X size={32} className="text-gray-600" />
// 							</div>
// 							<p className="text-muted-foreground">This room is under maintenance</p>
// 							<p className="text-sm text-muted-foreground mt-1">Not available for booking</p>
// 						</div>
// 					)}
// 				</div>

// 				{/* Footer */}
// 				<div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
// 					<Button variant="outline" onClick={onClose}>
// 						Close
// 					</Button>
// 				</div>
// 			</div>
// 		</div>
// 	);
// }

"use client";

import { X, User, Mail, Phone, CreditCard, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Room {
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

interface RoomDetailsModalProps {
	open: boolean;
	room: Room | null;
	onClose: () => void;
}

export default function RoomDetailsModal({
	open,
	room,
	onClose,
}: RoomDetailsModalProps) {
	if (!open || !room) return null;

	const handleModalClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const getPaymentMethodLabel = (method?: string) => {
		const methods: Record<string, string> = {
			cash: "Cash",
			credit_card: "Credit Card",
			debit_card: "Debit Card",
			upi: "UPI",
			bank_transfer: "Bank Transfer",
		};
		return methods[method || ""] || method || "N/A";
	};

	const calculateNights = () => {
		if (!room.checkInDate || !room.checkOutDate) return 0;
		const checkIn = new Date(room.checkInDate);
		const checkOut = new Date(room.checkOutDate);
		return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
	};

	const totalAmount = calculateNights() * room.pricePerNight;

	return (
		<div 
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			onClick={onClose}
		>
			<div 
				className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto"
				onClick={handleModalClick}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
					<div>
						<h3 className="text-xl font-semibold">
							Room #{room.number}
						</h3>
						<p className="text-sm text-muted-foreground mt-1">
							{room.type} Room
						</p>
					</div>
					<button
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Close modal"
					>
						<X size={24} />
					</button>
				</div>

				{/* Body */}
				<div className="p-6">
					{/* Room Information */}
					<div className="mb-6">
						<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
							<span className="w-1 h-5 bg-blue-600 rounded"></span>
							Room Information
						</h4>
						<div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
							<div>
								<p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
								<span
									className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
										room.status === "occupied"
											? "bg-red-100 text-red-700"
											: room.status === "vacant"
											? "bg-green-100 text-green-700"
											: "bg-gray-100 text-gray-700"
									}`}
								>
									{room.status.charAt(0).toUpperCase() + room.status.slice(1)}
								</span>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase mb-1">Room Type</p>
								<p className="font-medium">{room.type}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase mb-1">Capacity</p>
								<p className="font-medium">{room.capacity} {room.capacity === 1 ? "Person" : "People"}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground uppercase mb-1">Current Guests</p>
								<p className="font-medium">{room.guests} {room.guests === 1 ? "Guest" : "Guests"}</p>
							</div>
							<div className="col-span-2">
								<p className="text-xs text-muted-foreground uppercase mb-1">Price per Night</p>
								<p className="text-2xl font-bold text-blue-600">${room.pricePerNight}</p>
							</div>
						</div>
					</div>

					{/* Guest Information - Only show if room is occupied */}
					{room.status === "occupied" && (
						<>
							<div className="mb-6">
								<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
									<span className="w-1 h-5 bg-green-600 rounded"></span>
									Guest Information
								</h4>
								<div className="space-y-3 bg-gray-50 p-4 rounded-lg">
									<div className="flex items-center gap-3">
										<User size={18} className="text-muted-foreground" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Guest Name</p>
											<p className="font-medium">{room.guestName || "Not provided"}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Mail size={18} className="text-muted-foreground" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Email</p>
											<p className="font-medium">{room.guestEmail || "Not provided"}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Phone size={18} className="text-muted-foreground" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Phone</p>
											<p className="font-medium">{room.guestPhone || "Not provided"}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<CreditCard size={18} className="text-muted-foreground" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Payment Method</p>
											<p className="font-medium">{getPaymentMethodLabel(room.paymentMethod)}</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Users size={18} className="text-muted-foreground" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Number of Guests</p>
											<p className="font-medium">{room.guests} {room.guests === 1 ? "Guest" : "Guests"}</p>
										</div>
									</div>
								</div>
							</div>

							{/* Booking Details */}
							<div className="mb-6">
								<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
									<span className="w-1 h-5 bg-purple-600 rounded"></span>
									Booking Details
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
									<div className="flex items-start gap-3">
										<Calendar size={18} className="text-muted-foreground mt-1" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Check-In Date</p>
											<p className="font-medium">{formatDate(room.checkInDate)}</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<Calendar size={18} className="text-muted-foreground mt-1" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Check-Out Date</p>
											<p className="font-medium">{formatDate(room.checkOutDate)}</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<Calendar size={18} className="text-muted-foreground mt-1" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Number of Nights</p>
											<p className="font-medium">{calculateNights()} {calculateNights() === 1 ? "Night" : "Nights"}</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<CreditCard size={18} className="text-muted-foreground mt-1" />
										<div className="flex-1">
											<p className="text-xs text-muted-foreground">Price per Night</p>
											<p className="font-medium">${room.pricePerNight}</p>
										</div>
									</div>
								</div>
							</div>

							{/* Payment Summary */}
							<div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
								<h4 className="font-semibold mb-3">Payment Summary</h4>
								<div className="space-y-2">
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">Price per Night</span>
										<span className="font-medium">${room.pricePerNight}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">Number of Nights</span>
										<span className="font-medium">{calculateNights()}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">Number of Guests</span>
										<span className="font-medium">{room.guests}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-muted-foreground">Payment Method</span>
										<span className="font-medium">{getPaymentMethodLabel(room.paymentMethod)}</span>
									</div>
									<div className="flex justify-between pt-2 border-t border-blue-300">
										<span className="font-semibold">Total Amount</span>
										<span className="text-xl font-bold text-blue-600">${totalAmount}</span>
									</div>
								</div>
							</div>
						</>
					)}

					{/* Empty state for vacant rooms */}
					{room.status === "vacant" && (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<Users size={32} className="text-green-600" />
							</div>
							<p className="text-muted-foreground">This room is currently vacant</p>
							<p className="text-sm text-muted-foreground mt-1">No guest information available</p>
						</div>
					)}

					{/* Maintenance state */}
					{room.status === "maintenance" && (
						<div className="text-center py-8">
							<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
								<X size={32} className="text-gray-600" />
							</div>
							<p className="text-muted-foreground">This room is under maintenance</p>
							<p className="text-sm text-muted-foreground mt-1">Not available for booking</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</div>
			</div>
		</div>
	);
}