"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface ManageReceptionistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReceptionist?: { id: string; name: string } | null;
  propertyName?: string;
  onAssignSuccess?: (id: string, name: string) => void;
  onRemoveSuccess?: () => void;
}

const HARDCODED_RECEPTIONISTS: Record<string, string> = {
  rec_1: "Alice Johnson",
  rec_2: "Brian Lee",
  rec_3: "Carla Gomez",
  rec_4: "David Kumar",
  rec_5: "Emma Wilson",
  rec_6: "Frank Murphy",
};

export default function ManageReceptionistModal({
  isOpen,
  onClose,
  currentReceptionist,
  propertyName,
  onAssignSuccess,
  onRemoveSuccess,
}: ManageReceptionistModalProps) {
  const [receptionistId, setReceptionistId] = useState("");
  const [fetchedName, setFetchedName] = useState("");
  const [error, setError] = useState("");

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* 🔹 Auto-fetch after 3000ms OR Enter key (whichever first) */
  useEffect(() => {
    if (!receptionistId.trim()) {
      setFetchedName("");
      setError("");
      return;
    }

    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      fetchReceptionist();
      fetchTimeoutRef.current = null;
    }, 3000);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [receptionistId]);

  const fetchReceptionist = () => {
    setError("");
    setFetchedName("");

    const id = receptionistId.trim().toLowerCase();
    const name = HARDCODED_RECEPTIONISTS[id];

    if (name) {
      setFetchedName(name);
    } else {
      setError("Receptionist ID not found");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      fetchReceptionist();
    }
  };

  const handleAssign = () => {
    if (!fetchedName) return;

    if (typeof onAssignSuccess === "function") {
      onAssignSuccess(receptionistId.trim().toLowerCase(), fetchedName);
    }

    handleClose();
  };

  const handleRemove = () => {
    if (confirm("Are you sure you want to remove the receptionist?")) {
      if (typeof onRemoveSuccess === "function") {
        onRemoveSuccess();
      }
      handleClose();
    }
  };

  const handleClose = () => {
    setReceptionistId("");
    setFetchedName("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
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

        <CardContent className="p-6 space-y-4">
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
                ID: {currentReceptionist.id}
              </p>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Receptionist ID</Label>
            <Input
              placeholder="rec_1"
              value={receptionistId}
              onChange={(e) => setReceptionistId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {fetchedName && (
            <div className="p-3 border rounded-md bg-green-50 dark:bg-green-950">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold text-green-700 dark:text-green-400">
                {fetchedName}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 border rounded-md bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              disabled={!fetchedName}
              onClick={handleAssign}
            >
              {currentReceptionist ? "Change" : "Assign"}
            </Button>

            {currentReceptionist && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRemove}
              >
                Remove
              </Button>
            )}

            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
