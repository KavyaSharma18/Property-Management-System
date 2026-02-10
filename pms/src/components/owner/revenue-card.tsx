"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { IndianRupee, ChevronDown, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RevenuePeriod = "today" | "yesterday" | "thisWeek" | "thisMonth" | "past2Months" | "thisYear" | "custom";

interface RevenueData {
	today: number;
	yesterday: number;
	thisWeek: number;
	thisMonth: number;
	past2Months: number;
	thisYear: number;
	custom: number;
}

// Mock revenue data
const MOCK_REVENUE: RevenueData = {
	today: 45000,
	yesterday: 38000,
	thisWeek: 285000,
	thisMonth: 1250000,
	past2Months: 2450000,
	thisYear: 8750000,
	custom: 0,
};

const periodLabels: Record<RevenuePeriod, string> = {
	today: "Today",
	yesterday: "Yesterday",
	thisWeek: "This Week",
	thisMonth: "This Month",
	past2Months: "Past 2 Months",
	thisYear: "This Year",
	custom: "Custom Range",
};

export default function RevenueCard() {
	const [selectedPeriod, setSelectedPeriod] = useState<RevenuePeriod>("thisMonth");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [customStartDate, setCustomStartDate] = useState("");
	const [customEndDate, setCustomEndDate] = useState("");
	const [customRevenue, setCustomRevenue] = useState(0);

	const currentRevenue = selectedPeriod === "custom" ? customRevenue : MOCK_REVENUE[selectedPeriod];

	const handleCustomDateApply = () => {
		if (customStartDate && customEndDate) {
			// Mock calculation - in real app, this would fetch from backend
			const mockCustomRevenue = Math.floor(Math.random() * 1000000) + 500000;
			setCustomRevenue(mockCustomRevenue);
			setSelectedPeriod("custom");
			setIsDropdownOpen(false);
		}
	};

	const handlePeriodSelect = (period: RevenuePeriod) => {
		if (period !== "custom") {
			setSelectedPeriod(period);
			setIsDropdownOpen(false);
		}
	};

	return (
		<Card className="relative">
			<CardContent className="pt-6">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
					<div className="relative">
						<button
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
						>
							{periodLabels[selectedPeriod]}
							<ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
						</button>

						{isDropdownOpen && (
							<>
								<div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
								<div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
									<div className="py-1">
										{(Object.keys(periodLabels) as RevenuePeriod[]).filter(p => p !== "custom").map((period) => (
											<button
												key={period}
												onClick={() => handlePeriodSelect(period)}
												className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
													selectedPeriod === period ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-medium" : "text-gray-700 dark:text-gray-200"
												}`}
											>
												{periodLabels[period]}
											</button>
										))}
										
										{/* Custom Date Range Section */}
										<div className="border-t dark:border-gray-700 mt-1 pt-2 px-4 pb-3">
											<div className="flex items-center gap-2 mb-2">
												<Calendar size={14} className="text-blue-600 dark:text-blue-400" />
												<span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Custom Range</span>
											</div>
											<div className="space-y-2">
												<div>
													<Label htmlFor="startDate" className="text-xs">From</Label>
													<Input
														id="startDate"
														type="date"
														value={customStartDate}
														onChange={(e) => setCustomStartDate(e.target.value)}
														className="h-8 text-xs"
													/>
												</div>
												<div>
													<Label htmlFor="endDate" className="text-xs">To</Label>
													<Input
														id="endDate"
														type="date"
														value={customEndDate}
														onChange={(e) => setCustomEndDate(e.target.value)}
														min={customStartDate}
														className="h-8 text-xs"
													/>
												</div>
												<button
													onClick={handleCustomDateApply}
													disabled={!customStartDate || !customEndDate}
													className="w-full px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
												>
													Apply
												</button>
											</div>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2">
					<IndianRupee className="text-green-600" size={28} />
					<p className="text-3xl font-bold">₹{currentRevenue.toLocaleString("en-IN")}</p>
				</div>

				<p className="text-xs text-muted-foreground mt-2">
					{selectedPeriod === "custom" && customStartDate && customEndDate
						? `${new Date(customStartDate).toLocaleDateString("en-IN")} - ${new Date(customEndDate).toLocaleDateString("en-IN")}`
						: `Revenue for ${periodLabels[selectedPeriod].toLowerCase()}`}
				</p>
			</CardContent>
		</Card>
	);
}
