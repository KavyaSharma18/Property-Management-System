"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, IndianRupee, X } from "lucide-react";

interface Payment {
	id: string;
	bookingId: string;
	roomNumber: string;
	guestName: string;
	totalAmount: number;
	paidAmount: number;
	balanceAmount: number;
	status: "pending" | "completed";
	checkInDate: string;
	expectedCheckOut: string;
	lastPaidDate?: string;
}

// Mock data
const MOCK_PAYMENTS: Payment[] = [
	{
		id: "1",
		bookingId: "BK001",
		roomNumber: "101",
		guestName: "Rajesh Kumar",
		totalAmount: 15000,
		paidAmount: 0,
		balanceAmount: 15000,
		status: "pending",
		checkInDate: "2026-02-01",
		expectedCheckOut: "2026-02-10",
	},
	{
		id: "2",
		bookingId: "BK002",
		roomNumber: "102",
		guestName: "Priya Sharma",
		totalAmount: 12000,
		paidAmount: 5000,
		balanceAmount: 7000,
		status: "pending",
		checkInDate: "2026-02-03",
		expectedCheckOut: "2026-02-08",
		lastPaidDate: "2026-02-03",
	},
	{
		id: "3",
		bookingId: "BK003",
		roomNumber: "201",
		guestName: "Amit Patel",
		totalAmount: 20000,
		paidAmount: 20000,
		balanceAmount: 0,
		status: "completed",
		checkInDate: "2026-02-01",
		expectedCheckOut: "2026-02-05",
		lastPaidDate: "2026-02-05",
	},
	{
		id: "4",
		bookingId: "BK004",
		roomNumber: "103",
		guestName: "Sneha Reddy",
		totalAmount: 8000,
		paidAmount: 3000,
		balanceAmount: 5000,
		status: "pending",
		checkInDate: "2026-02-04",
		expectedCheckOut: "2026-02-07",
		lastPaidDate: "2026-02-04",
	},
	{
		id: "5",
		bookingId: "BK005",
		roomNumber: "202",
		guestName: "Vikram Singh",
		totalAmount: 18000,
		paidAmount: 0,
		balanceAmount: 18000,
		status: "pending",
		checkInDate: "2026-02-02",
		expectedCheckOut: "2026-02-09",
	},
];

export default function PaymentsPage() {
	const { data: session } = useSession();
	const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
	const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
	const [paymentAmount, setPaymentAmount] = useState("");
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

	const filteredPayments = payments.filter((payment) => {
		const matchesSearch =
			payment.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.guestName.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const handleAddPayment = () => {
		if (!selectedPayment) return;
		const amount = Number(paymentAmount);
		if (!amount || amount <= 0 || amount > selectedPayment.balanceAmount) return;

		setPayments((prev) =>
			prev.map((payment) => {
				if (payment.id === selectedPayment.id) {
					const newPaidAmount = payment.paidAmount + amount;
					const newBalanceAmount = payment.totalAmount - newPaidAmount;
					return {
						...payment,
						paidAmount: newPaidAmount,
						balanceAmount: newBalanceAmount,
						status: newBalanceAmount === 0 ? "completed" : "pending",
						lastPaidDate: new Date().toISOString().split("T")[0],
					};
				}
				return payment;
			})
		);

		setPaymentAmount("");
		setIsPaymentModalOpen(false);
		setSelectedPayment(null);
	};

	const openPaymentModal = (payment: Payment) => {
		setSelectedPayment(payment);
		setIsPaymentModalOpen(true);
		setPaymentAmount("");
	};

	const closePaymentModal = () => {
		setIsPaymentModalOpen(false);
		setSelectedPayment(null);
		setPaymentAmount("");
	};

	const getStatusStyles = (status: Payment["status"]) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-700 border-green-200";
			case "pending":
				return "bg-red-100 text-red-700 border-red-200";
		}
	};

	const totalStats = {
		total: payments.reduce((sum, p) => sum + p.totalAmount, 0),
		collected: payments.reduce((sum, p) => sum + p.paidAmount, 0),
		pending: payments.reduce((sum, p) => sum + p.balanceAmount, 0),
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<DashboardHeader />

			<div className="flex">
				<Sidebar role="receptionist" />

				<div className="flex-1 p-8">
					{/* Page Title */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">Manage Payments</h1>
						<p className="text-muted-foreground">Track and manage all booking payments</p>
					</div>

					{/* Stats Cards */}
					<div className="mb-6">
						<Card className="p-4 max-w-sm bg-white dark:bg-gray-800">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm text-muted-foreground">Pending Payments</p>
									<p className="text-3xl font-bold mt-1 text-red-600">₹{totalStats.pending.toLocaleString("en-IN")}</p>
								</div>
								<IndianRupee className="text-red-500" size={36} />
							</div>
						</Card>
					</div>

					{/* Filters */}
					<div className="mb-6 flex flex-col sm:flex-row gap-4">
						<div className="flex-1 relative">
							<Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
							<Input
								placeholder="Search by booking ID, room number, or guest name..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10"
							/>
						</div>

						<div className="flex gap-2">
							<Button variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>
								All
							</Button>
							<Button variant={statusFilter === "pending" ? "default" : "outline"} onClick={() => setStatusFilter("pending")}>
								Pending
							</Button>
							<Button variant={statusFilter === "completed" ? "default" : "outline"} onClick={() => setStatusFilter("completed")}>
								Completed
							</Button>
						</div>
					</div>

					{/* Payments Table */}
					<Card className="bg-white dark:bg-gray-800">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Booking ID</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Room</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Guest Name</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Amount</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Paid</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balance</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Check-In</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y dark:divide-gray-700">
									{filteredPayments.map((payment) => (
										<tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
											<td className="px-4 py-3 text-sm font-medium">{payment.bookingId}</td>
											<td className="px-4 py-3 text-sm">#{payment.roomNumber}</td>
											<td className="px-4 py-3 text-sm">{payment.guestName}</td>
											<td className="px-4 py-3 text-sm font-medium">₹{payment.totalAmount.toLocaleString("en-IN")}</td>
											<td className="px-4 py-3 text-sm text-green-600">₹{payment.paidAmount.toLocaleString("en-IN")}</td>
											<td className="px-4 py-3 text-sm text-red-600">₹{payment.balanceAmount.toLocaleString("en-IN")}</td>
											<td className="px-4 py-3">
												<span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(payment.status)}`}>
													{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
												</span>
											</td>
											<td className="px-4 py-3 text-sm">{new Date(payment.checkInDate).toLocaleDateString("en-IN")}</td>
											<td className="px-4 py-3">
												{payment.status !== "completed" && (
													<Button size="sm" onClick={() => openPaymentModal(payment)}>
														Add Payment
													</Button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{filteredPayments.length === 0 && (
							<div className="text-center py-12">
								<IndianRupee size={48} className="mx-auto text-gray-400 mb-4" />
								<p className="text-muted-foreground text-lg">No payments found matching your filters</p>
							</div>
						)}
					</Card>
				</div>
			</div>

			{/* Payment Modal */}
			{isPaymentModalOpen && selectedPayment && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closePaymentModal}>
					<div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
							<div>
								<h3 className="text-xl font-semibold">Add Payment</h3>
								<p className="text-sm text-muted-foreground mt-1">{selectedPayment.bookingId} - Room #{selectedPayment.roomNumber}</p>
							</div>
							<button onClick={closePaymentModal} className="text-muted-foreground hover:text-foreground transition-colors">
								<X size={24} />
							</button>
						</div>

						<div className="p-6 space-y-4">
							<div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
								<div className="flex justify-between">
									<span className="text-sm text-muted-foreground">Guest Name:</span>
									<span className="font-medium">{selectedPayment.guestName}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-muted-foreground">Total Amount:</span>
									<span className="font-medium">₹{selectedPayment.totalAmount.toLocaleString("en-IN")}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-sm text-muted-foreground">Paid Amount:</span>
									<span className="font-medium text-green-600">₹{selectedPayment.paidAmount.toLocaleString("en-IN")}</span>
								</div>
								<div className="flex justify-between pt-2 border-t">
									<span className="text-sm font-semibold">Balance Due:</span>
									<span className="font-bold text-red-600">₹{selectedPayment.balanceAmount.toLocaleString("en-IN")}</span>
								</div>
							</div>

							<div>
								<Label htmlFor="paymentAmount">Payment Amount *</Label>
								<Input
									id="paymentAmount"
									type="number"
									placeholder="Enter amount to pay"
									value={paymentAmount}
									onChange={(e) => setPaymentAmount(e.target.value)}
									min="1"
									max={selectedPayment.balanceAmount}
								/>
								<p className="text-xs text-muted-foreground mt-1">Maximum: ₹{selectedPayment.balanceAmount.toLocaleString("en-IN")}</p>
							</div>

							<div className="flex gap-2">
								<Button variant="outline" onClick={() => setPaymentAmount(selectedPayment.balanceAmount.toString())} className="flex-1">
									Pay Full
								</Button>
								<Button variant="outline" onClick={() => setPaymentAmount((selectedPayment.balanceAmount / 2).toString())} className="flex-1">
									Pay Half
								</Button>
							</div>
						</div>

						<div className="flex items-center gap-3 p-6 pt-0">
							<Button type="button" variant="outline" onClick={closePaymentModal} className="flex-1">
								Cancel
							</Button>
							<Button type="button" onClick={handleAddPayment} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > selectedPayment.balanceAmount}>
								Confirm Payment
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
