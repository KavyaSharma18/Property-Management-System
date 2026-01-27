"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import DashboardHeader from "@/components/dashboard/header";
import Sidebar from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  params: Promise<{ id?: string }>;
}

interface Alert {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  propertyId: string;
  propertySnapshot: { id: string; name: string };
  timestamp: string;
  isRead: boolean;
}

export default function AlertsPage({ params }: Props) {
  const { id } = use(params);
  const { data: session } = useSession();

  // Mock alerts data
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "alert_1",
      severity: "high",
      message: "High occupancy rate detected",
      propertyId: "prop_1",
      propertySnapshot: { id: "prop_1", name: "Seaside Retreat" },
      timestamp: "2 hours ago",
      isRead: false,
    },
    {
      id: "alert_2",
      severity: "medium",
      message: "Payment pending from guest",
      propertyId: "prop_2",
      propertySnapshot: { id: "prop_2", name: "Mountain View Inn" },
      timestamp: "5 hours ago",
      isRead: false,
    },
    {
      id: "alert_3",
      severity: "low",
      message: "Room cleaning completed",
      propertyId: "prop_3",
      propertySnapshot: { id: "prop_3", name: "Lakeside Hotel" },
      timestamp: "1 day ago",
      isRead: true,
    },
    {
      id: "alert_4",
      severity: "high",
      message: "Unusual guest activity detected",
      propertyId: "prop_4",
      propertySnapshot: { id: "prop_4", name: "Urban Central Hotel" },
      timestamp: "3 days ago",
      isRead: true,
    },
  ]);

  const handleMarkAsRead = (alertId: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === alertId ? { ...alert, isRead: true } : alert
      )
    );
  };

  const handleDelete = (alertId: string) => {
    const ok = window.confirm("Delete this alert? This cannot be undone.");
    if (!ok) return;
    setAlerts(alerts.filter((alert) => alert.id !== alertId));
  };

  const unreadCount = alerts.filter((alert) => !alert.isRead).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-l-4 border-l-red-500";
      case "medium":
        return "border-l-4 border-l-yellow-500";
      case "low":
        return "border-l-4 border-l-green-500";
      default:
        return "";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="text-red-500" size={20} />;
      case "medium":
        return <AlertCircle className="text-yellow-500" size={20} />;
      case "low":
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userRole={(session?.user as { role?: string } | undefined)?.role || "OWNER"}
      />

      <div className="flex">
        <Sidebar role="owner" />

        <main className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Alerts</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread alert${unreadCount !== 1 ? "s" : ""}`
                : "All alerts read"}
            </p>
          </div>

          {/* Alerts List */}
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                <h2 className="text-xl font-semibold mb-2">No Alerts</h2>
                <p className="text-muted-foreground">All is well! No new alerts at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`${getSeverityColor(alert.severity)} ${
                    !alert.isRead ? "bg-blue-50 dark:bg-blue-950" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{alert.message}</h3>
                            {!alert.isRead && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                              {alert.propertySnapshot?.name} • {alert.timestamp}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!alert.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(alert.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(alert.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
