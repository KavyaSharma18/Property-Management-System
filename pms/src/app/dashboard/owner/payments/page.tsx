"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
	IndianRupee, 
	Search, 
	AlertCircle,
	Calendar,
	User,
	Building
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface OutstandingPayment {
	occupancyId: string;
	checkInTime: string;
	expectedCheckOut: string;
	actualCheckOut: string | null;
	nightsStayed: number;
	property: {
		id: string;
		name: string;
		city: string;
		state: string;
	};
	room: {
		id: string;
		roomNumber: string;
		roomType: string;
	};
	guest: {
		id: string;
		name: string;
		phone: string;
		email: string;
	};
	payment: {
		totalAmount: number;
		paidAmount: number;
		balanceAmount: number;
		lastPaidDate: string | null;
		recentPayments: Array<{
			amount: number;
			paymentDate: string;
			paymentMethod: string;
		}>;
	};
	status: {
		isActive: boolean;
		isOverdue: boolean;
		daysOverdue: number;
	};
}

interface PaymentHistoryItem {
	paymentId: string;
	amount: number;
	paymentMethod: string;
	paymentDate: string;
	transactionId: string | null;
	property: {
		id: string;
		name: string;
		city: string;
	};
	room: {
		id: string;
		roomNumber: string;
		roomType: string;
	};
	guest: {
		id: string;
		name: string;
		phone: string;
		email: string;
	};
	receivedBy: {
		id: string;
		name: string;
		email: string;
		role: string;
	};
}

export default function PaymentsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [outstandingPayments, setOutstandingPayments] = useState<OutstandingPayment[]>([]);
	const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterOverdue, setFilterOverdue] = useState(false);
	const [revenuePeriod, setRevenuePeriod] = useState("last-week");
	const [customStartDate, setCustomStartDate] = useState("");
	const [customEndDate, setCustomEndDate] = useState("");
	const [revenueData, setRevenueData] = useState<any>(null);
	const [loadingRevenue, setLoadingRevenue] = useState(false);
	const [properties, setProperties] = useState<any[]>([]);
	const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/auth/signin");
		} else if (status === "authenticated") {
			fetchOutstandingPayments();
			fetchPaymentHistory();
			fetchProperties();
		}
	}, [status]);

	const fetchOutstandingPayments = async () => {
		try {
			setLoading(true);
			const url = new URL("/api/owner/payments/outstanding", window.location.origin);
			if (filterOverdue) {
				url.searchParams.append("overdue", "true");
			}
			
			const res = await fetch(url.toString());
			if (!res.ok) {
				throw new Error("Failed to fetch outstanding payments");
			}
			const data = await res.json();
			setOutstandingPayments(data.outstandingPayments || []);
			setError(null);
		} catch (err) {
			console.error("Error fetching outstanding payments:", err);
			setError("Failed to load outstanding payments");
		} finally {
			setLoading(false);
		}
	};

	const fetchPaymentHistory = async () => {
		try {
			const res = await fetch("/api/owner/payments/history?limit=50");
			if (!res.ok) {
				throw new Error("Failed to fetch payment history");
			}
			const data = await res.json();
			setPaymentHistory(data.payments || []);
		} catch (err) {
			console.error("Error fetching payment history:", err);
		}
	};

	const fetchProperties = async () => {
		try {
			const res = await fetch("/api/owner/properties");
			if (!res.ok) {
				throw new Error("Failed to fetch properties");
			}
			const data = await res.json();
			setProperties(data.properties || []);
		} catch (err) {
			console.error("Error fetching properties:", err);
		}
	};

	const fetchRevenue = async () => {
		try {
			setLoadingRevenue(true);
			const url = new URL("/api/owner/earnings", window.location.origin);
			url.searchParams.append("period", revenuePeriod);
			
			if (selectedPropertyId && selectedPropertyId !== "all") {
				url.searchParams.append("propertyId", selectedPropertyId);
			}
			
			if (revenuePeriod === "custom") {
				if (!customStartDate || !customEndDate) {
					setError("Please select both start and end dates");
					return;
				}
				url.searchParams.append("startDate", customStartDate);
				url.searchParams.append("endDate", customEndDate);
			}
			
			const res = await fetch(url.toString());
			if (!res.ok) {
				throw new Error("Failed to fetch revenue data");
			}
			const data = await res.json();
			setRevenueData(data);
			setError(null);
		} catch (err: any) {
			console.error("Error fetching revenue:", err);
			setError(err.message || "Failed to load revenue data");
		} finally {
			setLoadingRevenue(false);
		}
	};

	useEffect(() => {
		if (status === "authenticated") {
			fetchOutstandingPayments();
		}
	}, [filterOverdue]);

	useEffect(() => {
		if (status === "authenticated") {
			fetchRevenue();
		}
	}, [revenuePeriod, selectedPropertyId]);

	const filteredOutstanding = outstandingPayments.filter((payment) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			payment.guest.name.toLowerCase().includes(search) ||
			payment.room.roomNumber.toLowerCase().includes(search) ||
			payment.property.name.toLowerCase().includes(search) ||
			payment.occupancyId.toLowerCase().includes(search)
		);
	});

	const filteredHistory = paymentHistory.filter((payment) => {
		if (!searchTerm) return true;
		const search = searchTerm.toLowerCase();
		return (
			payment.guest.name.toLowerCase().includes(search) ||
			payment.room.roomNumber.toLowerCase().includes(search) ||
			payment.property.name.toLowerCase().includes(search) ||
			payment.paymentId.toLowerCase().includes(search)
		);
	});

	const totalOutstanding = outstandingPayments.reduce(
		(sum, p) => sum + p.payment.balanceAmount,
		0
	);

	const totalCollected = paymentHistory.reduce(
		(sum, p) => sum + p.amount,
		0
	);

	const overdueCount = outstandingPayments.filter((p) => p.status.isOverdue).length;

	if (status === "loading" || loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<DashboardHeader />
				<div className="flex">
					<Sidebar role="owner" />
					<div className="flex-1 p-8 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
							<p className="text-muted-foreground">Loading payments...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}
	if (status === "loading" || loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<DashboardHeader />
				<div className="flex">
					<Sidebar role="owner" />
					<div className="flex-1 p-8 flex items-center justify-center">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
							<p className="text-muted-foreground">Loading payments...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<DashboardHeader />

			<div className="flex">
				<Sidebar role="owner" />

				<main className="flex-1 p-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">Payments</h1>
						<p className="text-muted-foreground">Track and manage all payments across properties</p>
					</div>

					{/* Stats Cards */}
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
								<IndianRupee className="h-4 w-4 text-red-600" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-red-600">
									₹{totalOutstanding.toLocaleString("en-IN")}
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									{outstandingPayments.length} payments pending
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Collected (Last 50)</CardTitle>
								<IndianRupee className="h-4 w-4 text-green-600" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-green-600">
									₹{totalCollected.toLocaleString("en-IN")}
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									{paymentHistory.length} transactions
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
								<AlertCircle className="h-4 w-4 text-orange-600" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-orange-600">{overdueCount}</div>
								<p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
							</CardContent>
						</Card>
					</div>

					{error && (
						<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
							<AlertCircle className="w-5 h-5 text-red-600" />
							<p className="text-red-800 dark:text-red-200">{error}</p>
						</div>
					)}

					{/* Tabs */}
					<Tabs defaultValue="outstanding" className="space-y-6">
						<TabsList>
							<TabsTrigger value="outstanding">
								Outstanding ({outstandingPayments.length})
							</TabsTrigger>
							<TabsTrigger value="history">
								Payment History ({paymentHistory.length})
							</TabsTrigger>
						<TabsTrigger value="revenue">
							Revenue Reports
						</TabsTrigger>
					</TabsList>

					{/* Outstanding Tab */}
					<TabsContent value="outstanding">
						{/* Search and Filter Bar */}
						<div className="flex gap-4 mb-6 flex-wrap">
							<div className="flex-1 relative min-w-[300px]">
								<Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
								<input
									type="text"
									placeholder="Search by guest, room, property, or occupancy ID..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								/>
							</div>
							<Button
								variant={filterOverdue ? "default" : "outline"}
								onClick={() => setFilterOverdue(!filterOverdue)}
							>
								<AlertCircle className="w-4 h-4 mr-2" />
								Overdue Only
							</Button>
							<Button variant="outline" onClick={fetchOutstandingPayments}>
								Refresh
							</Button>
						</div>

							{/* Outstanding Payments List */}
							<div className="grid gap-4">
								{filteredOutstanding.length === 0 ? (
									<Card className="p-12 text-center">
										<IndianRupee size={48} className="mx-auto text-gray-400 mb-4" />
										<p className="text-muted-foreground">No outstanding payments found</p>
									</Card>
								) : (
									filteredOutstanding.map((payment) => (
										<Card key={payment.occupancyId}>
											<CardContent className="p-6">
												<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
													<div className="flex-1 space-y-3">
														<div className="flex items-start justify-between">
															<div>
																<h3 className="font-semibold text-lg flex items-center gap-2">
																	<User className="w-4 h-4" />
																	{payment.guest.name}
																	{payment.status.isOverdue && (
																		<Badge variant="destructive">
																			Overdue {payment.status.daysOverdue} days
																		</Badge>
																	)}
																	{payment.status.isActive && (
																		<Badge variant="default">Active</Badge>
																	)}
																</h3>
																<p className="text-sm text-muted-foreground">
																	{payment.guest.phone} • {payment.guest.email}
																</p>
															</div>
														</div>

														<div className="grid grid-cols-2 gap-4 text-sm">
															<div>
																<p className="text-muted-foreground flex items-center gap-1">
																	<Building className="w-3 h-3" />
																	Property
																</p>
																<p className="font-medium">{payment.property.name}</p>
																<p className="text-xs text-muted-foreground">
																	{payment.property.city}, {payment.property.state}
																</p>
															</div>
															<div>
																<p className="text-muted-foreground">Room</p>
																<p className="font-medium">
																	{payment.room.roomNumber} ({payment.room.roomType})
																</p>
															</div>
															<div>
																<p className="text-muted-foreground flex items-center gap-1">
																	<Calendar className="w-3 h-3" />
																	Check-in
																</p>
																<p className="font-medium">
																	{new Date(payment.checkInTime).toLocaleDateString("en-IN")}
																</p>
															</div>
															<div>
																<p className="text-muted-foreground">Expected Checkout</p>
																<p className="font-medium">
																	{new Date(payment.expectedCheckOut).toLocaleDateString("en-IN")}
																</p>
															</div>
														</div>

														{payment.payment.recentPayments.length > 0 && (
															<div className="pt-2 border-t">
																<p className="text-xs text-muted-foreground mb-2">Recent Payments:</p>
																<div className="space-y-1">
																	{payment.payment.recentPayments.map((p, i) => (
																		<p key={i} className="text-xs">
																			₹{p.amount.toLocaleString("en-IN")} via {p.paymentMethod} on{" "}
																			{new Date(p.paymentDate).toLocaleDateString("en-IN")}
																		</p>
																	))}
																</div>
															</div>
														)}
													</div>

													<div className="lg:text-right space-y-2 lg:min-w-[200px]">
														<div>
															<p className="text-sm text-muted-foreground">Total Amount</p>
															<p className="text-lg font-semibold">
																₹{payment.payment.totalAmount.toLocaleString("en-IN")}
															</p>
														</div>
														<div>
															<p className="text-sm text-muted-foreground">Paid</p>
															<p className="text-lg font-semibold text-green-600">
																₹{payment.payment.paidAmount.toLocaleString("en-IN")}
															</p>
														</div>
														<div className="pt-2 border-t">
															<p className="text-sm text-muted-foreground">Balance Due</p>
															<p className="text-2xl font-bold text-red-600">
																₹{payment.payment.balanceAmount.toLocaleString("en-IN")}
															</p>
														</div>
														<p className="text-xs text-muted-foreground">
															{payment.nightsStayed} night{payment.nightsStayed !== 1 ? "s" : ""} stayed
														</p>
													</div>
												</div>
											</CardContent>
										</Card>
									))
								)}
							</div>
						</TabsContent>

						{/* Payment History Tab */}
						<TabsContent value="history" className="space-y-6">
							{/* Search */}
							<div className="relative">
								<Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
								<input
									type="text"
									placeholder="Search payment history..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
								/>
							</div>

							{/* Payment History Table */}
							<Card>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead className="bg-gray-50 dark:bg-gray-800 border-b">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{filteredHistory.length === 0 ? (
												<tr>
													<td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
														No payment history found
													</td>
												</tr>
											) : (
												filteredHistory.map((payment) => (
													<tr key={payment.paymentId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
														<td className="px-4 py-3 text-sm">
															{new Date(payment.paymentDate).toLocaleDateString("en-IN")}
														</td>
														<td className="px-4 py-3 text-sm font-medium">{payment.guest.name}</td>
														<td className="px-4 py-3 text-sm">{payment.property.name}</td>
														<td className="px-4 py-3 text-sm">{payment.room.roomNumber}</td>
														<td className="px-4 py-3 text-sm font-semibold text-green-600">
															₹{payment.amount.toLocaleString("en-IN")}
														</td>
														<td className="px-4 py-3 text-sm">
															<Badge variant="outline">{payment.paymentMethod}</Badge>
														</td>
														<td className="px-4 py-3 text-sm">{payment.receivedBy.name}</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							</Card>
						</TabsContent>

						{/* Revenue Reports Tab */}
						<TabsContent value="revenue" className="space-y-6">
						{/* Filters */}
						<Card>
							<CardHeader>
								<CardTitle>Filters</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Property Filter */}
								<div className="space-y-2">
									<Label htmlFor="property-filter">Property</Label>
									<select
										id="property-filter"
										value={selectedPropertyId}
										onChange={(e) => setSelectedPropertyId(e.target.value)}
										className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
									>
										<option value="all">All Properties</option>
										{properties.map((property) => (
											<option key={property.id} value={property.id}>
												{property.name} - {property.city}
											</option>
										))}
									</select>
								</div>

								{/* Time Period */}
								<div className="space-y-2">
									<Label>Time Period</Label>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
										<Button
											variant={revenuePeriod === "last-week" ? "default" : "outline"}
											onClick={() => setRevenuePeriod("last-week")}
											className="w-full"
										>
											Last 7 Days
										</Button>
										<Button
											variant={revenuePeriod === "last-month" ? "default" : "outline"}
											onClick={() => setRevenuePeriod("last-month")}
											className="w-full"
										>
											Last 30 Days
										</Button>
										<Button
											variant={revenuePeriod === "this-month" ? "default" : "outline"}
											onClick={() => setRevenuePeriod("this-month")}
											className="w-full"
										>
											This Month
										</Button>
										<Button
											variant={revenuePeriod === "this-year" ? "default" : "outline"}
											onClick={() => setRevenuePeriod("this-year")}
											className="w-full"
										>
											This Year
										</Button>
									</div>
								</div>

								{/* Custom Date Range */}
								<div className="space-y-2">
									<Button
										variant={revenuePeriod === "custom" ? "default" : "outline"}
										onClick={() => setRevenuePeriod("custom")}
										className="w-full"
									>
										<Calendar className="w-4 h-4 mr-2" />
										Custom Date Range
									</Button>
									
									{revenuePeriod === "custom" && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
											<div>
												<Label htmlFor="start-date">Start Date</Label>
												<input
													id="start-date"
													type="date"
													value={customStartDate}
													onChange={(e) => setCustomStartDate(e.target.value)}
													className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
												/>
											</div>
											<div>
												<Label htmlFor="end-date">End Date</Label>
												<input
													id="end-date"
													type="date"
													value={customEndDate}
													onChange={(e) => setCustomEndDate(e.target.value)}
												className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
											/>
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Revenue Summary */}
					{loadingRevenue ? (
								<Card className="p-12 text-center">
									<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
									<p className="text-muted-foreground">Loading revenue data...</p>
								</Card>
							) : revenueData ? (
								<>
									{/* Summary Cards */}
									<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
										<Card>
											<CardHeader className="pb-2">
												<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="text-2xl font-bold text-green-600">
													₹{revenueData.summary?.totalRevenue?.toLocaleString("en-IN") || 0}
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													{revenueData.summary?.periodLabel || ""}
												</p>
											</CardContent>
										</Card>

										<Card>
											<CardHeader className="pb-2">
												<CardTitle className="text-sm font-medium">Total Payments</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="text-2xl font-bold">
													{revenueData.summary?.totalPayments || 0}
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													Transactions
												</p>
											</CardContent>
										</Card>

										<Card>
											<CardHeader className="pb-2">
												<CardTitle className="text-sm font-medium">Average Payment</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="text-2xl font-bold">
													₹{revenueData.summary?.averagePayment?.toLocaleString("en-IN") || 0}
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													Per transaction
												</p>
											</CardContent>
										</Card>

										<Card>
											<CardHeader className="pb-2">
												<CardTitle className="text-sm font-medium">Properties</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="text-2xl font-bold">
													{revenueData.summary?.totalProperties || 0}
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													With revenue
												</p>
											</CardContent>
										</Card>
									</div>

									{/* Property-wise Breakdown */}
									{revenueData.properties && revenueData.properties.length > 0 && (
										<Card>
											<CardHeader>
												<CardTitle>Revenue by Property</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="space-y-4">
													{revenueData.properties.map((property: any) => (
														<div key={property.id} className="border-b pb-4 last:border-b-0">
															<div className="flex items-start justify-between mb-2">
																<div className="flex-1">
																	<h4 className="font-semibold flex items-center gap-2">
																		<Building className="w-4 h-4" />
																		{property.name}
																	</h4>
																	<p className="text-sm text-muted-foreground">
																		{property.city}, {property.state}
																	</p>
																</div>
																<div className="text-right">
																	<div className="text-xl font-bold text-green-600">
																		₹{property.revenue?.toLocaleString("en-IN") || 0}
																	</div>
																	<p className="text-xs text-muted-foreground">
																		{property.paymentCount} payments
																	</p>
																</div>
															</div>
															<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
																<div
																	className="bg-green-600 h-2 rounded-full"
																	style={{
																		width: `${((property.revenue / revenueData.summary.totalRevenue) * 100).toFixed(1)}%`
																	}}
																/>
															</div>
														</div>
													))}
												</div>
											</CardContent>
										</Card>
									)}

									{/* Payment Methods Breakdown */}
									{revenueData.summary?.paymentMethods && (
										<Card>
											<CardHeader>
												<CardTitle>Payment Methods</CardTitle>
											</CardHeader>
											<CardContent>
												<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
													{Object.entries(revenueData.summary.paymentMethods).map(([method, data]: [string, any]) => (
														<div key={method} className="text-center p-4 border rounded-lg">
															<div className="text-lg font-bold">
																₹{data.amount?.toLocaleString("en-IN") || 0}
															</div>
															<p className="text-sm text-muted-foreground">{method}</p>
															<p className="text-xs text-muted-foreground mt-1">
																{data.count} payments
															</p>
														</div>
													))}
												</div>
											</CardContent>
										</Card>
									)}
								</>
							) : (
								<Card className="p-12 text-center">
									<IndianRupee size={48} className="mx-auto text-gray-400 mb-4" />
									<p className="text-muted-foreground">Select a period to view revenue reports</p>
								</Card>
							)}
						</TabsContent>
					</Tabs>
				</main>
			</div>
		</div>
	);
}
