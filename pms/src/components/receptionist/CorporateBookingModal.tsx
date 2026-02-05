import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CorporateBookingData {
	companyName: string;
	contactPerson: string;
	contactPhone: string;
	contactEmail: string;
	gstNumber: string;
	notes: string;
}

interface CorporateBookingModalProps {
	open: boolean;
	onClose: () => void;
	onConfirm: (data: CorporateBookingData) => void;
}

const CorporateBookingModal: React.FC<CorporateBookingModalProps> = ({ 
	open, 
	onClose, 
	onConfirm 
}) => {
	const [formData, setFormData] = useState<CorporateBookingData>({
		companyName: "",
		contactPerson: "",
		contactPhone: "",
		contactEmail: "",
		gstNumber: "",
		notes: "",
	});

	const [errors, setErrors] = useState<Partial<Record<keyof CorporateBookingData, string>>>({});

	if (!open) return null;

	const handleModalClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const handleInputChange = (field: keyof CorporateBookingData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors(prev => ({ ...prev, [field]: "" }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof CorporateBookingData, string>> = {};

		if (!formData.companyName.trim()) {
			newErrors.companyName = "Company name is required";
		}

		if (!formData.contactPerson.trim()) {
			newErrors.contactPerson = "Contact person is required";
		}

		if (!formData.contactPhone.trim()) {
			newErrors.contactPhone = "Contact phone is required";
		}

		if (formData.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
			newErrors.contactEmail = "Please enter a valid email address";
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
				companyName: "",
				contactPerson: "",
				contactPhone: "",
				contactEmail: "",
				gstNumber: "",
				notes: "",
			});
			setErrors({});
		}
	};

	const handleClose = () => {
		setFormData({
			companyName: "",
			contactPerson: "",
			contactPhone: "",
			contactEmail: "",
			gstNumber: "",
			notes: "",
		});
		setErrors({});
		onClose();
	};

	return (
		<div 
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
			onClick={handleClose}
		>
			<div 
				className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto"
				onClick={handleModalClick}
			>
				<div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
					<div>
						<h3 className="text-xl font-semibold">Corporate Booking Details</h3>
						<p className="text-sm text-muted-foreground mt-1">
							Please fill in the company information
						</p>
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
						{/* Company Information */}
						<div className="space-y-4">
							<h4 className="font-semibold text-lg">Company Information</h4>
							
							<div>
								<Label htmlFor="companyName">Company Name *</Label>
								<Input
									id="companyName"
									type="text"
									placeholder="Enter company name"
									value={formData.companyName}
									onChange={(e) => handleInputChange("companyName", e.target.value)}
									className={errors.companyName ? "border-red-500" : ""}
								/>
								{errors.companyName && (
									<p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
								)}
							</div>

							<div>
								<Label htmlFor="gstNumber">GST Number</Label>
								<Input
									id="gstNumber"
									type="text"
									placeholder="Enter GST registration number (optional)"
									value={formData.gstNumber}
									onChange={(e) => handleInputChange("gstNumber", e.target.value)}
								/>
							</div>
						</div>

						{/* Contact Details */}
						<div className="space-y-4 pt-4 border-t dark:border-gray-700">
							<h4 className="font-semibold text-lg">Contact Details</h4>
							
							<div>
								<Label htmlFor="contactPerson">Contact Person *</Label>
								<Input
									id="contactPerson"
									type="text"
									placeholder="Enter contact person name"
									value={formData.contactPerson}
									onChange={(e) => handleInputChange("contactPerson", e.target.value)}
									className={errors.contactPerson ? "border-red-500" : ""}
								/>
								{errors.contactPerson && (
									<p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="contactPhone">Contact Phone *</Label>
									<Input
										id="contactPhone"
										type="tel"
										placeholder="+1 234 567 8900"
										value={formData.contactPhone}
										onChange={(e) => handleInputChange("contactPhone", e.target.value)}
										className={errors.contactPhone ? "border-red-500" : ""}
									/>
									{errors.contactPhone && (
										<p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>
									)}
								</div>

								<div>
									<Label htmlFor="contactEmail">Contact Email</Label>
									<Input
										id="contactEmail"
										type="email"
										placeholder="contact@company.com (optional)"
										value={formData.contactEmail}
										onChange={(e) => handleInputChange("contactEmail", e.target.value)}
										className={errors.contactEmail ? "border-red-500" : ""}
									/>
									{errors.contactEmail && (
										<p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>
									)}
								</div>
							</div>
						</div>

						{/* Additional Notes */}
						<div className="space-y-4 pt-4 border-t dark:border-gray-700">
							<h4 className="font-semibold text-lg">Additional Notes</h4>
							
							<div>
								<Label htmlFor="notes">Notes</Label>
								<textarea
									id="notes"
									placeholder="Any additional notes or special requirements (optional)"
									value={formData.notes}
									onChange={(e) => handleInputChange("notes", e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y"
								/>
							</div>
						</div>
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
						>
							Confirm Corporate Details
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CorporateBookingModal;
