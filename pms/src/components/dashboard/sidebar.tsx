"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Role = "owner" | "receptionist";

interface SidebarProps {
	role: Role;
}

export default function Sidebar({ role }: SidebarProps) {
	const base = role === "owner" ? "/dashboard/owner" : "/dashboard/receptionist";

	const pathname = usePathname() ?? "/";

	const isExact = (href: string) => pathname === href;
	const isSectionActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

	return (
		<Card className="w-64 h-screen flex flex-col">
			<CardHeader className="h-16 flex items-center px-4">
				<CardTitle className="text-lg text-primary">Sentinel PMS</CardTitle>
			</CardHeader>

			<CardContent className="p-4 flex-1">
				<nav className="flex flex-col gap-2">
					<Button asChild size="default" variant={isExact(base) ? "default" : "ghost"} className="justify-start">
						<Link href={base} className={isExact(base) ? "font-semibold" : ""}>
							Dashboard
						</Link>
					</Button>

					{role === "owner" && (
						<Button
							asChild
							size="default"
							variant={isSectionActive(`${base}/properties`) ? "default" : "ghost"}
							className="justify-start"
						>
							<Link href={`${base}/properties`} className={isSectionActive(`${base}/properties`) ? "font-semibold" : ""}>
								Properties
							</Link>
						</Button>
					)}

					<Button asChild size="default" variant={isSectionActive("/profile") ? "default" : "ghost"} className="justify-start">
						<Link href="/profile" className={isSectionActive("/profile") ? "font-semibold" : ""}>
							Profile
						</Link>
					</Button>
				</nav>
			</CardContent>

			<div className="p-4 border-t text-sm text-muted-foreground">
				<div className="font-medium">Signed in</div>
			</div>
		</Card>
	);
}

