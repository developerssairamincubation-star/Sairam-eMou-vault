"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import EMoUForm from "@/components/EMoUForm";
import Alert from "@/components/Alert";
import { useAuth } from "@/context/AuthContext";
import { createEMoU } from "@/lib/firestore";
import { EMoURecord } from "@/types";

export default function CreateEMoUPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const isCreatingRef = useRef(false);

  const handleCreateRecord = async (data: Partial<EMoURecord>) => {
    // Prevent duplicate record creation
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    try {
      if (!user) {
        console.error("No user available");
        setAlert({ message: "Please log in to create records", type: "error" });
        return;
      }

      if (!user.uid) {
        console.error("User object missing uid:", user);
        setAlert({
          message: "User session is invalid. Please log out and log back in.",
          type: "error",
        });
        return;
      }

      const now = new Date();
      const recordData = {
        ...data,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: now,
      };

      console.log("Creating record with data:", {
        createdBy: user.uid,
        createdByName: user.displayName,
      });

      await createEMoU(recordData as Omit<EMoURecord, "id">);

      setAlert({ message: "Record created successfully!", type: "success" });

      // Clear localStorage after successful creation
      localStorage.removeItem("emou_form_draft");

      // Navigate back to main page after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error) {
      console.error("Failed to create record:", error);
      setAlert({
        message: "Failed to create record. Check console for details.",
        type: "error",
      });
    } finally {
      isCreatingRef.current = false;
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <ProtectedRoute>
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="min-h-screen bg-[#f8f9fa] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1f2937]">
              Create New eMoU Record
            </h1>
            <p className="text-sm text-[#6b7280] mt-1">
              Fill in the details below. Your progress is automatically saved.
            </p>
          </div>
          <EMoUForm onSubmit={handleCreateRecord} onCancel={handleCancel} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
