import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

interface MultiSelectOption {
	id: number;
	label: string;
	sublabel?: string;
}

interface MultiSelectProps {
	options: MultiSelectOption[];
	selectedIds: number[];
	onChange: (selectedIds: number[]) => void;
	placeholder?: string;
	emptyMessage?: string;
	className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
	options,
	selectedIds,
	onChange,
	placeholder = "Select items...",
	emptyMessage = "No items available",
	className = "",
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const toggleOption = (id: number) => {
		const newSelection = selectedIds.includes(id)
			? selectedIds.filter((selectedId) => selectedId !== id)
			: [...selectedIds, id];
		onChange(newSelection);
	};

	const getDisplayText = () => {
		if (selectedIds.length === 0) {
			return placeholder;
		}
		if (selectedIds.length === 1) {
			const selected = options.find((opt) => opt.id === selectedIds[0]);
			return selected ? selected.label : placeholder;
		}
		return `${selectedIds.length} items selected`;
	};

	return (
		<div ref={dropdownRef} className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
			>
				<span className={selectedIds.length === 0 ? "text-gray-500 dark:text-gray-400" : ""}>
					{getDisplayText()}
				</span>
				<ChevronDown
					size={16}
					className={`transition-transform ${isOpen ? "transform rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
					{options.length === 0 ? (
						<div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
							{emptyMessage}
						</div>
					) : (
						options.map((option) => {
							const isSelected = selectedIds.includes(option.id);
							return (
								<div
									key={option.id}
									onClick={() => toggleOption(option.id)}
									className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-2 ${
										isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
									}`}
								>
									<div className="flex items-center h-5 mt-0.5">
										<div
											className={`w-4 h-4 border rounded flex items-center justify-center ${
												isSelected
													? "bg-blue-600 border-blue-600"
													: "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700"
											}`}
										>
											{isSelected && <Check size={12} className="text-white" />}
										</div>
									</div>
									<div className="flex-1 text-sm">
										<div className="text-gray-900 dark:text-gray-100">{option.label}</div>
										{option.sublabel && (
											<div className="text-xs text-gray-500 dark:text-gray-400">
												{option.sublabel}
											</div>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
};
