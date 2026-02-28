"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageTableSkeleton } from "./SkeletonLoading";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="bg-white border-b border-[#d1d5db] px-6 py-3">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 w-64 bg-gray-200 rounded animate-pulse mt-1"></div>
        </div>
        <div className="p-6">
          <PageTableSkeleton rows={15} columns={8} summaryCardCount={7} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
