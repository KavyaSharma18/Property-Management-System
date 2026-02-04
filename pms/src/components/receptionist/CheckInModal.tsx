import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Room {
	id: number;
	number: string;
	type: string;
	status: "occupied" | "vacant" | "maintenance";
	capacity: number;
	pricePerNight: number;
	guests: number;
}

interface CheckInData {
	guestName: string;
	guestEmail: string;
	guestPhone: string;
	paymentMethod: string;
	checkOutDate: string;
	numberOfGuests: number;
	idProofType: string;
	idProofNumber: string;
}

interface CheckInModalProps {
	open: boolean;
	room: Room | null;
	onClose: () => void;
	onConfirm: (roomId: number, checkInData: CheckInData) => void;
}

const CheckInModal: React.FC<CheckInModalProps> = ({ open, room, onClose, onConfirm }) => {
	const [formData, setFormData] = useState<CheckInData>({
		guestName: "",
		guestEmail: "",
		guestPhone: "",
		paymentMethod: "cash",
		checkOutDate: "",
		numberOfGuests: 1,
		idProofType: "",
		idProofNumber: "",
	});

	const [errors, setErrors] = useState<Partial<Record<keyof CheckInData, string>>>({});

	if (!open || !room) return null;

	const handleModalClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const handleInputChange = (field: keyof CheckInData, value: string | number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors(prev => ({ ...prev, [field]: "" }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof CheckInData, string>> = {};

		if (!formData.guestName.trim()) newErrors.guestName = "Guest name is required";

		if (
            formData.guestEmail.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)
        ) {
            newErrors.guestEmail = "Please enter a valid email address";
        }


		if (!formData.guestPhone.trim()) newErrors.guestPhone = "Phone number is required";
		const today = new Date().toISOString().split("T")[0];
		if (formData.checkOutDate && today >= formData.checkOutDate) {
			newErrors.checkOutDate = "Check-out must be after today";
		}

		if (formData.numberOfGuests < 1) {
			newErrors.numberOfGuests = "At least 1 guest required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (validateForm()) {
			onConfirm(room.id, formData);
			// Reset form
			setFormData({
				guestName: "",
				guestEmail: "",
				guestPhone: "",
				paymentMethod: "cash",
				checkOutDate: "",
				numberOfGuests: 1,
				idProofType: "",
				idProofNumber: "",
			});
			setErrors({});
		}
	};

	const handleClose = () => {
		setFormData({
			guestName: "",
			guestEmail: "",
			guestPhone: "",
			paymentMethod: "cash",
			checkOutDate: "",
			numberOfGuests: 1,
			idProofType: "",
			idProofNumber: "",
		});
		setErrors({});
		onClose();
	};

	return (
		<div 
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			onClick={handleClose}
		>
			<div 
				className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto"
				onClick={handleModalClick}
			>
				<div className="flex items-center justify-between p-6 border-b bg-blue-50">
					<div>
						<h3 className="text-xl font-semibold">Check-In Guest</h3>
						<p className="text-sm text-muted-foreground mt-1">Room #{room.number} - {room.type}</p>
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
						{/* Guest Information */}
						<div className="space-y-4">
							<h4 className="font-semibold text-lg">Guest Information</h4>
							
							<div>
								<Label htmlFor="guestName">Guest Name *</Label>
								<Input
									id="guestName"
									type="text"
									placeholder="Enter guest full name"
									value={formData.guestName}
									onChange={(e) => handleInputChange("guestName", e.target.value)}
									className={errors.guestName ? "border-red-500" : ""}
								/>
								{errors.guestName && <p className="text-red-500 text-xs mt-1">{errors.guestName}</p>}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="guestEmail">Email </Label>
									<Input
										id="guestEmail"
										type="email"
										placeholder="guest@example.com (optional)"
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

						{/* Booking Details */}
						<div className="space-y-4 pt-4 border-t">
							<h4 className="font-semibold text-lg">Booking Details</h4>
							
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="checkOutDate">Check-Out Date</Label>
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
										onChange={(e) => handleInputChange("numberOfGuests", parseInt(e.target.value) || 1)}
										className={errors.numberOfGuests ? "border-red-500" : ""}
									/>
									{errors.numberOfGuests && <p className="text-red-500 text-xs mt-1">{errors.numberOfGuests}</p>}
								</div>

								<div>
									<Label htmlFor="paymentMethod">Payment Method *</Label>
									<select
										id="paymentMethod"
										value={formData.paymentMethod}
										onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="cash">Cash</option>
										<option value="credit_card">Credit Card</option>
										<option value="debit_card">Debit Card</option>
										<option value="upi">UPI</option>
										<option value="bank_transfer">Bank Transfer</option>
										<option value="aggregator">Aggregator</option>
										<option value="corporate">Corporate</option>
									</select>
								</div>
							</div>
						</div>

						{/* ID Proof */}
						<div className="space-y-4 pt-4 border-t">
							<h4 className="font-semibold text-lg">ID Proof</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="idProofType">ID Proof Type</Label>
									<select
										id="idProofType"
										value={formData.idProofType}
										onChange={(e) => handleInputChange("idProofType", e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="">Select ID Type</option>
										<option value="AADHAR">Aadhar</option>
										<option value="PASSPORT">Passport</option>
										<option value="DRIVING_LICENSE">Driving License</option>
										<option value="VOTER_ID">Voter ID</option>
									</select>
								</div>
								<div>
									<Label htmlFor="idProofNumber">ID Proof Number</Label>
									<Input
										id="idProofNumber"
										value={formData.idProofNumber}
										onChange={(e) => handleInputChange("idProofNumber", e.target.value)}
										placeholder="Enter ID number"
									/>
								</div>
							</div>
						</div>

						{/* Price Summary */}
						<div className="pt-4 border-t">
							<div className="bg-gray-50 p-4 rounded-lg">
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Price per night:</span>
									<span className="font-semibold">${room.pricePerNight}</span>
								</div>
								{formData.checkOutDate && (() => {
									const today = new Date().toISOString().split("T")[0];
									if (today >= formData.checkOutDate) return null;
									const nights = Math.ceil(
										(new Date(formData.checkOutDate).getTime() - new Date(today).getTime()) /
											(1000 * 60 * 60 * 24)
									);
									return (
									<>
										<div className="flex justify-between items-center mt-2">
											<span className="text-sm text-muted-foreground">
												Number of nights:
											</span>
											<span className="font-semibold">
												{nights}
											</span>
										</div>
										<div className="flex justify-between items-center mt-2 pt-2 border-t">
											<span className="font-semibold">Total Amount:</span>
											<span className="text-xl font-bold text-blue-600">
												${room.pricePerNight * nights}
											</span>
										</div>
									</>
								);
							})()}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3 mt-6 pt-4 border-t">
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
						>
							Confirm Check-In
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CheckInModal;