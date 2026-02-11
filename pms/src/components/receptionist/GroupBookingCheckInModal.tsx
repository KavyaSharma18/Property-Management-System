import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

interface Room {
	id: number;
	number: string;
	type: string;
	status: string;
	capacity: number;
	pricePerNight: number;
}

interface GroupBookingCheckInData {
	groupName: string;
	guestName: string;
	guestEmail: string;
	guestPhone: string;
	paymentMethod: string;
	checkInDate: string;
	checkOutDate: string;
	numberOfGuests: number;
	idProofType: string;
	idProofNumber: string;
	pricePerNight: number;
	advancePayment?: number;
	selectedRoomIds: number[];
	bookingPlatform?: string;
}

interface GroupBookingCheckInModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: (checkInData: GroupBookingCheckInData) => void;
}

const GroupBookingCheckInModal: React.FC<GroupBookingCheckInModalProps> = ({ 
	open, 
	onClose, 
	onConfirm 
}) => {
	const [formData, setFormData] = useState<GroupBookingCheckInData>({
		groupName: "",
		guestName: "",
		guestEmail: "",
		guestPhone: "",
		paymentMethod: "CASH",
		checkInDate: new Date().toISOString().split("T")[0],
		checkOutDate: "",
		numberOfGuests: 1,
		idProofType: "",
		idProofNumber: "",
		pricePerNight: 0,
		advancePayment: undefined,
		selectedRoomIds: [],
		bookingPlatform: "WALK_IN",
	});

	const [errors, setErrors] = useState<Partial<Record<keyof GroupBookingCheckInData, string>>>({});
	const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
	const [isLoadingRooms, setIsLoadingRooms] = useState(false);

	useEffect(() => {
		if (open) {
			fetchAvailableRooms();
		}
	}, [open]);

	const fetchAvailableRooms = async () => {
		try {
			setIsLoadingRooms(true);
			const response = await fetch("/api/receptionist/rooms");
			if (!response.ok) throw new Error("Failed to fetch rooms");
			
			const data = await response.json();
			const vacant = data.rooms.filter((r: any) => r.status === "VACANT").map((r: any) => ({
				id: r.id,
				number: r.roomNumber,
				type: r.type,
				status: r.status,
				capacity: r.capacity,
				pricePerNight: r.pricePerNight,
			}));
			setAvailableRooms(vacant);
		} catch (error) {
			console.error("Error fetching rooms:", error);
		} finally {
			setIsLoadingRooms(false);
		}
	};

	if (!open) return null;

	const handleModalClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const handleInputChange = (field: keyof GroupBookingCheckInData, value: string | number | number[] | undefined) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors(prev => ({ ...prev, [field]: "" }));
		}
	};

	const handleRoomSelection = (roomId: number) => {
		setFormData(prev => {
			const isSelected = prev.selectedRoomIds.includes(roomId);
			const newSelection = isSelected 
				? prev.selectedRoomIds.filter(id => id !== roomId)
				: [...prev.selectedRoomIds, roomId];
			
			// Update price based on first selected room
			const newPrice = newSelection.length > 0
				? availableRooms.find(r => r.id === newSelection[0])?.pricePerNight || 0
				: 0;
			
			return {
				...prev,
				selectedRoomIds: newSelection,
				pricePerNight: newPrice,
			};
		});
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof GroupBookingCheckInData, string>> = {};

		if (!formData.groupName.trim()) newErrors.groupName = "Group name is required";
		if (!formData.guestName.trim()) newErrors.guestName = "Guest name is required";

		if (
			formData.guestEmail.trim() &&
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)
		) {
			newErrors.guestEmail = "Please enter a valid email address";
		}

		if (!formData.guestPhone.trim()) newErrors.guestPhone = "Phone number is required";
		
		if (!formData.checkOutDate) {
			newErrors.checkOutDate = "Check-out date is required";
		} else {
			const checkIn = new Date(formData.checkInDate);
			const checkOut = new Date(formData.checkOutDate);
			if (checkOut <= checkIn) {
				newErrors.checkOutDate = "Check-out must be after check-in";
			}
		}

		if (formData.numberOfGuests < 1) {
			newErrors.numberOfGuests = "At least 1 guest required";
		}

		if (!formData.idProofType.trim()) newErrors.idProofType = "ID proof type is required";
		if (!formData.idProofNumber.trim()) newErrors.idProofNumber = "ID proof number is required";

		if (formData.selectedRoomIds.length === 0) {
			newErrors.selectedRoomIds = "Please select at least one room";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (validateForm()) {
			onConfirm(formData);
			// Reset form
			setFormData({
				groupName: "",
				guestName: "",
				guestEmail: "",
				guestPhone: "",
				paymentMethod: "CASH",
				checkInDate: new Date().toISOString().split("T")[0],
				checkOutDate: "",
				numberOfGuests: 1,
				idProofType: "",
				idProofNumber: "",
				pricePerNight: 0,
				advancePayment: undefined,
				selectedRoomIds: [],
			});
			setErrors({});
		}
	};

	const handleClose = () => {
		setFormData({
			groupName: "",
			guestName: "",
			guestEmail: "",
			guestPhone: "",
			paymentMethod: "CASH",
			checkInDate: new Date().toISOString().split("T")[0],
			checkOutDate: "",
			numberOfGuests: 1,
			idProofType: "",
			idProofNumber: "",
			pricePerNight: 0,
			advancePayment: undefined,
			selectedRoomIds: [],
		});
		setErrors({});
		onClose();
	};

	return (
		<div 
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		>
			<div 
				className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto"
				onClick={handleModalClick}
			>
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
					<div>
						<h3 className="text-xl font-semibold">New Group Booking</h3>
						<p className="text-sm text-muted-foreground mt-1">Book multiple rooms for a group</p>
					</div>
					<button 
						onClick={handleClose} 
						className="text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Close modal"
					>
						<X size={24} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6">
					<div className="space-y-4">
						{/* Group Information */}
						<div className="space-y-4">
							<h4 className="font-semibold text-lg">Group Information</h4>
							
							<div>
								<Label htmlFor="groupName">Group/Organization Name *</Label>
								<Input
									id="groupName"
									type="text"
									placeholder="Enter group or organization name"
									value={formData.groupName}
									onChange={(e) => handleInputChange("groupName", e.target.value)}
									className={errors.groupName ? "border-red-500" : ""}
								/>
								{errors.groupName && <p className="text-red-500 text-xs mt-1">{errors.groupName}</p>}
							</div>
						</div>

						{/* Primary Guest Information */}
						<div className="space-y-4 pt-4 border-t dark:border-gray-700">
							<h4 className="font-semibold text-lg">Primary Contact Person</h4>
							
							<div>
								<Label htmlFor="guestName">Contact Person Name *</Label>
								<Input
									id="guestName"
									type="text"
									placeholder="Enter contact person full name"
									value={formData.guestName}
									onChange={(e) => handleInputChange("guestName", e.target.value)}
									className={errors.guestName ? "border-red-500" : ""}
								/>
								{errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="guestEmail">Email</Label>
									<Input
										id="guestEmail"
										type="email"
										placeholder="contact@example.com (optional)"
										value={formData.guestEmail}
										onChange={(e) => handleInputChange("guestEmail", e.target.value)}
										className={errors.guestEmail ? "border-red-500" : ""}
									/>
									{errors.guestEmail && <p className="text-red-500 text-xs mt-1">{errors.guestEmail}</p>}
								</div>

								<div>
									<Label htmlFor="guestPhone">Phone Number *</Label>
									<Input
										id="guestPhone"
										type="tel"
										placeholder="+1 234 567 8900"
										value={formData.guestPhone}
										onChange={(e) => handleInputChange("guestPhone", e.target.value)}
										className={errors.guestPhone ? "border-red-500" : ""}
									/>
									{errors.guestPhone && <p className="text-red-500 text-xs mt-1">{errors.guestPhone}</p>}
								</div>
							</div>
						</div>

						{/* Room Selection */}
						<div className="space-y-4 pt-4 border-t dark:border-gray-700">
							<h4 className="font-semibold text-lg">Room Selection *</h4>
							
							{isLoadingRooms ? (
								<p className="text-sm text-muted-foreground">Loading available rooms...</p>
							) : (
							<>
								<div className="relative">
									<MultiSelect
										options={availableRooms.map((room) => ({
											id: room.id,
											label: `Room #${room.number} - ${room.type}`,
											sublabel: `Capacity: ${room.capacity} | ₹${room.pricePerNight}/night`,
										}))}
										selectedIds={formData.selectedRoomIds}
										onChange={(selectedIds) => {
											handleInputChange("selectedRoomIds", selectedIds);
											// Update price based on first selected room
											const newPrice = selectedIds.length > 0
												? availableRooms.find(r => r.id === selectedIds[0])?.pricePerNight || 0
												: 0;
											handleInputChange("pricePerNight", newPrice);
										}}
										placeholder="Click to select rooms"
										emptyMessage="No vacant rooms available"
									/>
								</div>
								{errors.selectedRoomIds && <p className="text-red-500 text-xs mt-1">{errors.selectedRoomIds}</p>}
								{formData.selectedRoomIds.length > 0 && (
									<div className="flex flex-wrap gap-2">
										{formData.selectedRoomIds.map(roomId => {
											const room = availableRooms.find(r => r.id === roomId);
											return room ? (
												<span key={roomId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 rounded text-sm">
													Room #{room.number}
													<button
														type="button"
														onClick={() => handleRoomSelection(roomId)}
														className="hover:text-blue-900 dark:hover:text-blue-50"
													>
														×
													</button>
												</span>
											) : null;
										})}
									</div>
								)}
							</>
						)}
					</div>

					{/* Booking Details */}
					<div className="space-y-4 pt-4 border-t dark:border-gray-700">
						<h4 className="font-semibold text-lg">Booking Details</h4>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="checkInDate">Check-In Date *</Label>
								<Input
									id="checkInDate"
									type="date"
									value={formData.checkInDate}
									onChange={(e) => handleInputChange("checkInDate", e.target.value)}
								/>
							</div>

							<div>
								<Label htmlFor="checkOutDate">Check-Out Date *</Label>
								<Input
									id="checkOutDate"
									type="date"
									value={formData.checkOutDate}
									onChange={(e) => handleInputChange("checkOutDate", e.target.value)}
									className={errors.checkOutDate ? "border-red-500" : ""}
								/>
								{errors.checkOutDate && <p className="text-red-500 text-xs mt-1">{errors.checkOutDate}</p>}
							</div>
						</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="numberOfGuests">Number of Guests *</Label>
									<Input
										id="numberOfGuests"
										type="number"
										min="1"
										value={formData.numberOfGuests}
										onChange={(e) => {
											const value = e.target.value === "" ? "" : parseInt(e.target.value) || 1;
											handleInputChange("numberOfGuests", value);
										}}
										onBlur={(e) => {
											if (e.target.value === "" || parseInt(e.target.value) < 1) {
												handleInputChange("numberOfGuests", 1);
											}
										}}
										className={errors.numberOfGuests ? "border-red-500" : ""}
									/>
									{errors.numberOfGuests && <p className="text-red-500 text-xs mt-1">{errors.numberOfGuests}</p>}
								</div>

								<div>
									<Label htmlFor="advancePayment">Advance Payment (Optional)</Label>
									<Input
										id="advancePayment"
										type="text"
										inputMode="decimal"
										placeholder="Enter advance amount"
										value={formData.advancePayment || ""}
										onChange={(e) => {
											const value = e.target.value.replace(/[^0-9.]/g, '');
											handleInputChange("advancePayment", value ? parseFloat(value) : undefined);
										}}
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="paymentMethod">Payment Method *</Label>
									<select
										id="paymentMethod"
										value={formData.paymentMethod}
										onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="CASH">Cash</option>
										<option value="CARD">Card</option>
										<option value="UPI">UPI</option>
										<option value="BANK_TRANSFER">Bank Transfer</option>
										<option value="CHEQUE">Cheque</option>
									</select>
								</div>
								
								<div>
									<Label htmlFor="bookingPlatform">Booking Source *</Label>
									<select
										id="bookingPlatform"
										value={formData.bookingPlatform}
										onChange={(e) => handleInputChange("bookingPlatform", e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="WALK_IN">Walk-In</option>
										<option value="PHONE_CALL">Phone Call</option>
										<option value="MAKEMYTRIP">MakeMyTrip</option>
										<option value="GOIBIBO">Goibibo</option>
										<option value="BOOKING_DOT_COM">Booking.com</option>
										<option value="AIRBNB">Airbnb</option>
										<option value="AGODA">Agoda</option>
										<option value="EXPEDIA">Expedia</option>
										<option value="TRAVEL_AGENT">Travel Agent</option>
										<option value="WEBSITE">Property Website</option>
										<option value="OTHER">Other</option>
									</select>
								</div>
							</div>
						</div>

						{/* ID Proof */}
						<div className="space-y-4 pt-4 border-t dark:border-gray-700">
							<h4 className="font-semibold text-lg">ID Proof</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="idProofType">ID Proof Type *</Label>
									<select
										id="idProofType"
										value={formData.idProofType}
										onChange={(e) => handleInputChange("idProofType", e.target.value)}
										className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
											errors.idProofType ? "border-red-500" : "border-gray-300 dark:border-gray-600"
										}`}
									>
										<option value="">Select ID Type</option>
                                        <option value="AADHAAR_CARD">Aadhaar Card</option>
                                        <option value="PASSPORT">Passport</option>
                                        <option value="DRIVING_LICENSE">Driving License</option>
                                        <option value="VOTER_ID">Voter ID</option>
                                        <option value="PAN_CARD">PAN Card</option>
                                        <option value="RATION_CARD">Ration Card</option>
                                        <option value="OTHER">Other</option>
									</select>
									{errors.idProofType && <p className="text-red-500 text-xs mt-1">{errors.idProofType}</p>}
								</div>
								<div>
									<Label htmlFor="idProofNumber">ID Proof Number *</Label>
									<Input
										id="idProofNumber"
										value={formData.idProofNumber}
										onChange={(e) => handleInputChange("idProofNumber", e.target.value)}
										placeholder="Enter ID number"
										className={errors.idProofNumber ? "border-red-500" : ""}
									/>
									{errors.idProofNumber && <p className="text-red-500 text-xs mt-1">{errors.idProofNumber}</p>}
								</div>
							</div>
						</div>

						{/* Price Summary */}
						{formData.selectedRoomIds.length > 0 && (
							<div className="pt-4 border-t dark:border-gray-700">
								<div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
									<div className="flex justify-between items-center">
										<span className="text-sm text-muted-foreground">Number of rooms:</span>
										<span className="font-semibold">{formData.selectedRoomIds.length}</span>
									</div>
									{formData.checkInDate && formData.checkOutDate && (() => {
										const checkIn = new Date(formData.checkInDate);
										const checkOut = new Date(formData.checkOutDate);
										if (checkOut <= checkIn) return null;
										const nights = Math.ceil(
											(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
										);
										
										// Calculate total for all selected rooms
										const totalPerNight = formData.selectedRoomIds.reduce((sum, roomId) => {
											const room = availableRooms.find(r => r.id === roomId);
											return sum + (room?.pricePerNight || 0);
										}, 0);
										
										const grandTotal = totalPerNight * nights;
										
										return (
											<>
												<div className="flex justify-between items-center mt-2">
													<span className="text-sm text-muted-foreground">Total per night:</span>
													<span className="font-semibold">₹{totalPerNight.toLocaleString()}</span>
												</div>
												<div className="flex justify-between items-center mt-2">
													<span className="text-sm text-muted-foreground">Number of nights:</span>
													<span className="font-semibold">{nights}</span>
												</div>
												<div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-gray-600">
													<span className="font-semibold">Grand Total:</span>
													<span className="text-xl font-bold text-blue-600">
														₹{grandTotal.toLocaleString()}
													</span>
												</div>
											</>
										);
									})()}
								</div>
							</div>
						)}
					</div>

					<div className="flex items-center gap-3 mt-6 pt-4 border-t dark:border-gray-700">
						<Button 
							type="button"
							variant="outline"
							onClick={handleClose}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button 
							type="submit"
							className="flex-1 bg-blue-600 hover:bg-blue-700"
							disabled={formData.selectedRoomIds.length === 0}
						>
							Confirm Group Booking
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default GroupBookingCheckInModal;
