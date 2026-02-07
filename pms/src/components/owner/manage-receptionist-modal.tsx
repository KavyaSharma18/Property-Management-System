"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, Search } from "lucide-react";

interface Receptionist {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assignedProperties?: { id: string; name: string }[];
}

interface ManageReceptionistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReceptionist?: { id: string; name: string; email: string } | null;
  propertyId: string;
  propertyName?: string;
  onAssignSuccess?: (id: string, name: string, email?: string) => void;
  onRemoveSuccess?: () => void;
}

export default function ManageReceptionistModal({
  isOpen,
  onClose,
  currentReceptionist,
  propertyId,
  propertyName,
  onAssignSuccess,
  onRemoveSuccess,
}: ManageReceptionistModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState("");
  const [selectedReceptionist, setSelectedReceptionist] = useState<Receptionist | null>(null);

  // Fetch all available receptionists
  useEffect(() => {
    if (isOpen) {
      fetchReceptionists();
    } else {
      // Reset state when modal closes
      setSearchQuery("");
      setSelectedReceptionist(null);
      setError("");
    }
  }, [isOpen]);

  const fetchReceptionists = async () => {
    try {
      setIsLoading(true);
      setError("");

      const res = await fetch("/api/owner/receptionists");
      
      if (!res.ok) {
        throw new Error("Failed to fetch receptionists");
      }

      const data = await res.json();
      setReceptionists(data.receptionists || []);
    } catch (err: any) {
      console.error("Error fetching receptionists:", err);
      setError(err.message || "Failed to load receptionists");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedReceptionist) return;

    try {
      setIsAssigning(true);
      setError("");

      const res = await fetch(`/api/owner/properties/${propertyId}/assign-receptionist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptionistId: selectedReceptionist.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to assign receptionist");
      }

      if (typeof onAssignSuccess === "function") {
        onAssignSuccess(
          selectedReceptionist.id, 
          selectedReceptionist.name,
          selectedReceptionist.email
        );
      }

      handleClose();
    } catch (err: any) {
      console.error("Error assigning receptionist:", err);
      setError(err.message || "Failed to assign receptionist");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove the receptionist from this property?")) {
      return;
    }

    try {
      setIsRemoving(true);
      setError("");

      const res = await fetch(`/api/owner/properties/${propertyId}/unassign-receptionist`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to remove receptionist");
      }

      if (typeof onRemoveSuccess === "function") {
        onRemoveSuccess();
      }

      handleClose();
    } catch (err: any) {
      console.error("Error removing receptionist:", err);
      setError(err.message || "Failed to remove receptionist");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedReceptionist(null);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const filteredReceptionists = receptionists.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <CardTitle>
            {currentReceptionist ? "Change Receptionist" : "Assign Receptionist"}
          </CardTitle>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={22} />
          </button>
        </div>

        <CardContent className="p-6 space-y-4 overflow-y-auto">
          {propertyName && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border">
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-semibold">{propertyName}</p>
            </div>
          )}

          {currentReceptionist && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md border">
              <p className="text-sm text-muted-foreground">
                Current Receptionist
              </p>
              <p className="font-semibold">{currentReceptionist.name}</p>
              <p className="text-xs text-muted-foreground">
                {currentReceptionist.email}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 border rounded-md bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-start gap-2">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Search Receptionists</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading receptionists...</span>
            </div>
          ) : filteredReceptionists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No receptionists found matching your search" : "No receptionists available"}
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredReceptionists.map((receptionist) => {
                const isSelected = selectedReceptionist?.id === receptionist.id;
                const isCurrent = currentReceptionist?.id === receptionist.id;

                return (
                  <div
                    key={receptionist.id}
                    onClick={() => setSelectedReceptionist(receptionist)}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : isCurrent
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                        : "hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{receptionist.name}</p>
                        <p className="text-sm text-muted-foreground">{receptionist.email}</p>
                        {receptionist.phone && (
                          <p className="text-xs text-muted-foreground">
                            {receptionist.phone}
                          </p>
                        )}
                        {isCurrent && (
                          <span className="inline-block mt-1 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              className="flex-1"
              disabled={!selectedReceptionist || isAssigning || isRemoving}
              onClick={handleAssign}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : currentReceptionist ? (
                "Change Receptionist"
              ) : (
                "Assign Receptionist"
              )}
            </Button>

            {currentReceptionist && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRemove}
                disabled={isAssigning || isRemoving}
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isAssigning || isRemoving}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
