"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Sun, Moon, User } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string;
}

export default function DashboardHeader({
  userName,
  userEmail,
  userRole,
}: DashboardHeaderProps) {
  const { data: session } = useSession();
  const displayName = userName ?? session?.user?.name ?? "";
  const displayEmail = userEmail ?? session?.user?.email ?? "";
  const displayRole = userRole ?? (session?.user as { role?: string } | undefined)?.role;
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored) {
        setIsDark(stored === "dark");
        if (stored === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setIsDark(true);
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch (e) {}
  };

  const goBack = () => {
    if (typeof window !== "undefined") window.history.back();
  };

  const goForward = () => {
    if (typeof window !== "undefined") window.history.forward();
  };

  return (
    <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" onClick={goBack} className="p-2">
                <ArrowLeft size={18} />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={goForward} className="p-2">
                <ArrowRight size={18} />
              </Button>
            </div>

            <h2 className="text-xl font-semibold">Property Management System</h2>
            {displayRole && (
              <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                {displayRole}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>

            <Button asChild type="button" variant="ghost" size="icon" className="p-2">
              <Link href="/profile">
                <User size={18} />
              </Link>
            </Button>

            <Button type="button" variant="ghost" size="icon" onClick={toggleTheme} className="p-2">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
