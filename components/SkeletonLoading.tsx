"use client";

import React from "react";

/**
 * Skeleton shimmer animation base
 */
const shimmerClass =
  "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded";

// Deterministic pseudo-random widths for header columns
const HEADER_WIDTHS = [72, 85, 60, 78, 90, 65, 82, 70, 88, 75];

/**
 * Table skeleton - mimics the sheet-style table used throughout the app
 */
export function TableSkeleton({
  rows = 12,
  columns = 8,
  showSerialNo = true,
}: {
  rows?: number;
  columns?: number;
  showSerialNo?: boolean;
}) {
  return (
    <div className="overflow-hidden">
      <table className="w-full border-collapse" style={{ minWidth: "100%" }}>
        <thead>
          <tr className="border-b border-gray-200">
            {showSerialNo && (
              <th className="px-3 py-3" style={{ width: "60px" }}>
                <div className={`h-3 w-8 mx-auto ${shimmerClass}`} />
              </th>
            )}
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-3 py-3">
                <div
                  className={`h-3 ${shimmerClass}`}
                  style={{
                    width: `${HEADER_WIDTHS[i % HEADER_WIDTHS.length]}%`,
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-100"
              style={{ height: "35.5px" }}
            >
              {showSerialNo && (
                <td className="px-3 py-2">
                  <div className={`h-3 w-5 mx-auto ${shimmerClass}`} />
                </td>
              )}
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-3 py-2">
                  <div
                    className={`h-3 ${shimmerClass}`}
                    style={{
                      width: `${40 + ((rowIdx * 7 + colIdx * 13) % 50)}%`,
                      opacity: 1 - rowIdx * 0.03,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Deterministic bar widths for chart skeleton
const CHART_BAR_WIDTHS = [45, 72, 38, 85, 55, 63];

/**
 * Dashboard skeleton - mimics the stat cards + charts layout
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className={`h-5 w-48 ${shimmerClass}`} />
            <div className={`h-3 w-32 ${shimmerClass}`} />
          </div>
          <div className={`h-9 w-28 ${shimmerClass}`} />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
            >
              <div className={`h-7 w-12 ${shimmerClass}`} />
              <div className={`h-3 w-16 ${shimmerClass}`} />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className={`h-4 w-40 mb-6 ${shimmerClass}`} />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="flex items-end gap-2">
                    <div className={`h-3 w-10 ${shimmerClass}`} />
                    <div
                      className={`${shimmerClass}`}
                      style={{
                        width: `${CHART_BAR_WIDTHS[j % CHART_BAR_WIDTHS.length]}%`,
                        height: `${16 + j * 4}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Page skeleton with header + summary cards + table
 * Used for main page, HOD page, admin page
 */
export function PageTableSkeleton({
  rows = 15,
  columns = 8,
  showSummaryCards = true,
  summaryCardCount = 7,
}: {
  rows?: number;
  columns?: number;
  showSummaryCards?: boolean;
  summaryCardCount?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Summary cards skeleton */}
      {showSummaryCards && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${summaryCardCount}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: summaryCardCount }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-2 rounded border border-gray-200 space-y-2"
            >
              <div className={`h-5 w-10 ${shimmerClass}`} />
              <div className={`h-2.5 w-14 ${shimmerClass}`} />
            </div>
          ))}
        </div>
      )}

      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    </div>
  );
}

/**
 * Tab content skeleton - used inside tabbed layouts (HOD, Admin)
 */
export function TabContentSkeleton({
  rows = 12,
  columns = 8,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <TableSkeleton rows={rows} columns={columns} />
    </div>
  );
}

/**
 * User table skeleton for admin page
 */
export function UserTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr
          key={`skel-${rowIdx}`}
          className="border-b border-gray-100"
          style={{ height: "35.5px" }}
        >
          <td className="text-center px-3 py-2">
            <div className={`h-3 w-5 mx-auto ${shimmerClass}`} />
          </td>
          <td className="px-3 py-2">
            <div className={`h-3 w-32 ${shimmerClass}`} />
          </td>
          <td className="px-3 py-2">
            <div className={`h-3 w-44 ${shimmerClass}`} />
          </td>
          <td className="px-3 py-2">
            <div className={`h-5 w-14 ${shimmerClass} rounded-full`} />
          </td>
          <td className="px-3 py-2">
            <div className={`h-3 w-16 ${shimmerClass}`} />
          </td>
          <td className="px-3 py-2">
            <div className={`h-3 w-20 ${shimmerClass}`} />
          </td>
          <td className="px-3 py-2">
            <div className={`h-3 w-12 ${shimmerClass}`} />
          </td>
        </tr>
      ))}
    </>
  );
}
