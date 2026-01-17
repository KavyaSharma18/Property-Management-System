"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";

export default function SelectRolePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelection = async (role: "OWNER" | "RECEPTIONIST") => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update role");
        setIsLoading(false);
        return;
      }

      // Update session with new role
      await update({ role });

      // Redirect based on role
      if (role === "OWNER") {
        router.push("/dashboard/owner");
      } else {
        router.push("/dashboard/receptionist");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl">Select Your Role</CardTitle>
              <p className="text-muted-foreground">Choose how you'll be using the Property Management System</p>
            </div>

            {/* Role Cards */}
            <div className="space-y-4">
              <Button
                onClick={() => handleRoleSelection("OWNER")}
                disabled={isLoading}
                className="w-full p-6 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Property Owner</h3>
                    <p className="text-sm text-muted-foreground">Manage properties, assign receptionists, view occupancy analytics, and monitor security alerts</p>
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleRoleSelection("RECEPTIONIST")}
                disabled={isLoading}
                className="w-full p-6 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Receptionist</h3>
                    <p className="text-sm text-muted-foreground">Handle guest check-ins, manage room occupancy, and update guest information</p>
                  </div>
                </div>
              </Button>
            </div>

            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
