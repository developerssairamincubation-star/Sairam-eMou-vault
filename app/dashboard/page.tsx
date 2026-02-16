"use client";

import { useEffect, useState, useMemo } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getEMoUs } from "@/lib/firestore";
import { EMoURecord } from "@/types";
import Link from "next/link";
import RecordDetailPopup from "@/components/RecordDetailPopup";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// All available departments
const ALL_DEPARTMENTS = [
  "CSE",
  "ECE",
  "MECH",
  "CIVIL",
  "EEE",
  "IT",
  "AIDS",
  "CSBS",
  "E&I",
  "MECHATRONICS",
  "CCE",
  "AIML",
  "CYBERSECURITY",
  "IOT",
  "EICE",
  "CSE MTECH",
  "Institution",
  "Incubation",
];

// Colors for departments
const DEPT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#22c55e",
  "#eab308",
  "#0ea5e9",
  "#d946ef",
  "#64748b",
  "#78716c",
];

// Check if a date has a very large year (like 9999) - treat as perpetual
const isPerpetualDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const parts = dateStr.split(".");
  if (parts.length === 3) {
    const year = parseInt(parts[2], 10);
    return year >= 9000; // Years 9000+ are treated as perpetual
  }
  return false;
};

// Helper function to parse date in DD.MM.YYYY format
const parseDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
};

// Get display status - perpetual dates are always Active, also calculates "Expiring" for near-expiry records
const getDisplayStatus = (record: EMoURecord): string => {
  const toDate = record.toDate;
  // Check if toDate is perpetual - always show Active for perpetual dates
  if (
    toDate &&
    (toDate.toLowerCase().includes("perpetual") ||
      toDate.toLowerCase().includes("indefinite") ||
      isPerpetualDate(toDate))
  ) {
    return "Active";
  }

  // If not Active, return as-is (Expired, Renewal Pending, Draft, etc.)
  if (record.status !== "Active") return record.status;

  // Check if Active record is expiring (within 2 months)
  if (!toDate) {
    return "Active";
  }

  try {
    const parsedDate = parseDate(toDate);
    parsedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

    // If expiry date is between today and 2 months from now, show "Expiring"
    if (parsedDate > today && parsedDate <= twoMonthsFromNow) {
      return "Expiring";
    }
    return "Active";
  } catch {
    return "Active";
  }
};

interface DepartmentStats {
  name: string;
  count: number;
  active: number;
}

export default function Dashboard() {
  const [records, setRecords] = useState<EMoURecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [comparisonDepartments, setComparisonDepartments] = useState<string[]>(
    [],
  );
  const [showComparisonDropdown, setShowComparisonDropdown] = useState(false);
  const [popupData, setPopupData] = useState<{
    isOpen: boolean;
    title: string;
    records: EMoURecord[];
    type?:
      | "total"
      | "active"
      | "expired"
      | "renewal"
      | "draft"
      | "placement"
      | "internship";
    clickX?: number;
  }>({ isOpen: false, title: "", records: [], type: "total", clickX: 0 });
  const [graphPopup, setGraphPopup] = useState<{
    isOpen: boolean;
    type: string;
    title: string;
  }>({ isOpen: false, type: "", title: "" });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthRangeStart, setMonthRangeStart] = useState(0); // 0 = Jan
  const [monthRangeEnd, setMonthRangeEnd] = useState(11); // 11 = Dec

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await getEMoUs();
      // Load all records for proper draft/pending counts
      setRecords(data);
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  // Filter approved records for most analytics, but count all drafts/pending
  const approvedRecords = records.filter(
    (r) => r.approvalStatus === "approved",
  );

  const stats = {
    total: approvedRecords.length,
    active: approvedRecords.filter((r) => getDisplayStatus(r) === "Active")
      .length,
    expiring: approvedRecords.filter((r) => getDisplayStatus(r) === "Expiring")
      .length,
    expired: approvedRecords.filter((r) => getDisplayStatus(r) === "Expired")
      .length,
    renewal: approvedRecords.filter((r) => r.goingForRenewal === "Yes").length,
    draft: records.filter(
      (r) => r.approvalStatus === "draft" || r.approvalStatus === "pending",
    ).length,
    totalPlacement: approvedRecords.reduce(
      (sum, r) => sum + (r.placementOpportunity || 0),
      0,
    ),
    totalInternship: approvedRecords.reduce(
      (sum, r) => sum + (r.internshipOpportunity || 0),
      0,
    ),
  };

  // Department statistics - include ALL departments (memoized to prevent infinite loop)
  // Only count approved records for department analytics
  const departmentStats: DepartmentStats[] = useMemo(() => {
    const deptMap = new Map<string, { count: number; active: number }>();
    // Initialize all departments with 0
    ALL_DEPARTMENTS.forEach((dept) => {
      deptMap.set(dept, { count: 0, active: 0 });
    });
    // Count only approved records
    const approvedOnly = records.filter((r) => r.approvalStatus === "approved");
    approvedOnly.forEach((record) => {
      const dept = record.department || "Uncategorized";
      const current = deptMap.get(dept) || { count: 0, active: 0 };
      current.count++;
      if (getDisplayStatus(record) === "Active") current.active++;
      deptMap.set(dept, current);
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  // Initialize selected departments with top 5 on first load
  useEffect(() => {
    if (selectedDepartments.length === 0 && departmentStats.length > 0) {
      const top5 = departmentStats
        .filter((d) => d.count > 0)
        .slice(0, 5)
        .map((d) => d.name);
      setSelectedDepartments(top5);
    }
  }, [departmentStats, selectedDepartments.length]);

  // Initialize comparison departments with top 5 on first load
  useEffect(() => {
    if (comparisonDepartments.length === 0 && departmentStats.length > 0) {
      const top5 = departmentStats
        .filter((d) => d.count > 0)
        .slice(0, 5)
        .map((d) => d.name);
      setComparisonDepartments(top5);
    }
  }, [departmentStats, comparisonDepartments.length]);

  const handleDepartmentToggle = (deptName: string) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(deptName)) {
        return prev.filter((d) => d !== deptName);
      } else {
        return [...prev, deptName];
      }
    });
  };

  const handleComparisonToggle = (deptName: string) => {
    setComparisonDepartments((prev) => {
      if (prev.includes(deptName)) {
        return prev.filter((d) => d !== deptName);
      } else {
        return [...prev, deptName];
      }
    });
  };

  const getYearlyTrends = () => {
    const yearData: {
      [key: string]: {
        count: number;
        active: number;
        expiring: number;
        expired: number;
        renewal: number;
        draft: number;
      };
    } = {};

    // Initialize years from 2014 to current year
    const currentYear = new Date().getFullYear();
    for (let year = 2014; year <= currentYear; year++) {
      yearData[year] = {
        count: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        renewal: 0,
        draft: 0,
      };
    }

    // Count only approved records per year based on fromDate (when eMoU started)
    const approvedOnly = records.filter((r) => r.approvalStatus === "approved");
    approvedOnly.forEach((record) => {
      if (record.fromDate) {
        try {
          // Parse dd.mm.yyyy format
          const parts = record.fromDate.split(".");
          if (parts.length === 3) {
            const year = parseInt(parts[2]);
            if (yearData[year] !== undefined) {
              const status = getDisplayStatus(record);
              yearData[year].count++;
              if (status === "Active") yearData[year].active++;
              else if (status === "Expiring") yearData[year].expiring++;
              else if (status === "Expired") yearData[year].expired++;
              if (record.goingForRenewal === "Yes") yearData[year].renewal++;
              if (record.approvalStatus === "draft") yearData[year].draft++;
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    const years = [];
    for (let year = 2014; year <= currentYear; year++) {
      years.push({
        year: year.toString(),
        count: yearData[year].count,
        active: yearData[year].active,
        expiring: yearData[year].expiring,
        expired: yearData[year].expired,
        renewal: yearData[year].renewal,
        draft: yearData[year].draft,
      });
    }

    return years;
  };

  const getCurrentYearMonthly = (
    year: number,
    startMonth: number,
    endMonth: number,
  ) => {
    const monthData: {
      [key: string]: {
        count: number;
        active: number;
        expiring: number;
        expired: number;
        renewal: number;
      };
    } = {};

    // Initialize all 12 months
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    months.forEach((month) => {
      monthData[month] = {
        count: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        renewal: 0,
      };
    });

    // Count only approved records for selected year based on fromDate
    const approvedOnly = records.filter((r) => r.approvalStatus === "approved");
    approvedOnly.forEach((record) => {
      if (record.fromDate) {
        try {
          // Parse dd.mm.yyyy format
          const parts = record.fromDate.split(".");
          if (parts.length === 3) {
            const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
            const recordYear = parseInt(parts[2]);

            if (
              recordYear === year &&
              month >= startMonth &&
              month <= endMonth
            ) {
              const monthKey = months[month];
              if (monthKey && monthData[monthKey]) {
                const status = getDisplayStatus(record);
                monthData[monthKey].count++;
                if (status === "Active") monthData[monthKey].active++;
                else if (status === "Expiring") monthData[monthKey].expiring++;
                else if (status === "Expired") monthData[monthKey].expired++;
                if (record.goingForRenewal === "Yes")
                  monthData[monthKey].renewal++;
              }
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    // Return only the selected month range
    return months.slice(startMonth, endMonth + 1).map((month) => ({
      month,
      count: monthData[month].count,
      active: monthData[month].active,
      expiring: monthData[month].expiring,
      expired: monthData[month].expired,
      renewal: monthData[month].renewal,
    }));
  };

  const yearlyTrends = getYearlyTrends();
  const currentYearMonthly = getCurrentYearMonthly(
    selectedYear,
    monthRangeStart,
    monthRangeEnd,
  );

  // Get available years from records
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    records.forEach((record) => {
      if (record.fromDate) {
        const parts = record.fromDate.split(".");
        if (parts.length === 3) {
          const year = parseInt(parts[2]);
          if (!isNaN(year)) years.add(year);
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [records]);

  // Helper function to show filtered records in popup
  const showRecords = (
    title: string,
    filteredRecords: EMoURecord[],
    type:
      | "total"
      | "active"
      | "expired"
      | "renewal"
      | "draft"
      | "placement"
      | "internship" = "total",
    event?: React.MouseEvent,
  ) => {
    const clickX = event
      ? event.currentTarget.getBoundingClientRect().left +
        event.currentTarget.getBoundingClientRect().width / 2
      : window.innerWidth / 2;
    setPopupData({
      isOpen: true,
      title,
      records: filteredRecords,
      type,
      clickX,
    });
  };

  const closePopup = () => {
    setPopupData({
      isOpen: false,
      title: "",
      records: [],
      type: "total",
      clickX: 0,
    });
  };

  // Status distribution for pie chart
  const statusData = [
    { name: "Active", value: stats.active, color: "#10b981" },
    { name: "Expiring", value: stats.expiring, color: "#eab308" },
    { name: "Expired", value: stats.expired, color: "#ef4444" },
    { name: "Renewal", value: stats.renewal, color: "#f59e0b" },
    { name: "Draft", value: stats.draft, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  // Department performance radar data - based on selected departments
  const departmentRadarData = departmentStats
    .filter((dept) => selectedDepartments.includes(dept.name))
    .map((dept) => ({
      department:
        dept.name.length > 8 ? dept.name.substring(0, 8) + "..." : dept.name,
      total: dept.count,
      active: dept.active,
      efficiency:
        dept.count > 0 ? Math.round((dept.active / dept.count) * 100) : 0,
    }));

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                eMoU Analytics Dashboard
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Real-time insights and comprehensive analytics
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              ← Back to Records
            </Link>
          </div>

          {/* Main Grid - Ultra Dense 4 Row Layout */}
          <div className="space-y-3">
            {/* Row 1: 8 Compact Stats */}
            <div className="grid grid-cols-7 gap-2">
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords("All eMoU Records", approvedRecords, "total", e)
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-800">
                      {stats.total}
                    </div>
                    <div className="text-[10px] text-gray-600">Total</div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "Active eMoUs",
                    approvedRecords.filter(
                      (r) => getDisplayStatus(r) === "Active",
                    ),
                    "active",
                    e,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      {stats.active}
                    </div>
                    <div className="text-[10px] text-gray-600">Active</div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "Expired eMoUs",
                    approvedRecords.filter(
                      (r) => getDisplayStatus(r) === "Expired",
                    ),
                    "expired",
                    e,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">
                      {stats.expired}
                    </div>
                    <div className="text-[10px] text-gray-600">Expired</div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "eMoUs Going for Renewal",
                    approvedRecords.filter((r) => r.goingForRenewal === "Yes"),
                    "renewal",
                    e,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-600">
                      {stats.renewal}
                    </div>
                    <div className="text-[10px] text-gray-600">Renewal</div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "eMoUs with Placement Opportunities",
                    approvedRecords.filter(
                      (r) => (r.placementOpportunity || 0) > 0,
                    ),
                    "placement",
                    e,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600">
                      {stats.totalPlacement}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      Total No of Students Placed
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "eMoUs with Internship Opportunities",
                    approvedRecords.filter(
                      (r) => (r.internshipOpportunity || 0) > 0,
                    ),
                    "internship",
                    e,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-indigo-600">
                      {stats.totalInternship}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      Total No of Students Interned
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "Draft eMoUs",
                    records.filter((r) => r.approvalStatus === "draft"),
                    "draft",
                    e,
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-600">
                      {stats.draft}
                    </div>
                    <div className="text-[10px] text-gray-600">Draft</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Yearly Trends + Pie Chart + Radar */}
            <div className="grid grid-cols-12 gap-3">
              {/* Yearly Historical Trend Chart */}
              <div className="col-span-5 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Yearly Trends (2014-2026)
                </h3>
                <div
                  onDoubleClick={() =>
                    setGraphPopup({
                      isOpen: true,
                      type: "yearlyTrends",
                      title: "Yearly Trends (2014-2026)",
                    })
                  }
                  style={{ cursor: "pointer" }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={yearlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10 }}
                        stroke="#6b7280"
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Total"
                      />
                      <Line
                        type="monotone"
                        dataKey="active"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Active"
                      />
                      <Line
                        type="monotone"
                        dataKey="expired"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Expired"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution Pie */}
              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Status Split
                </h3>
                <div
                  onDoubleClick={() =>
                    setGraphPopup({
                      isOpen: true,
                      type: "statusPie",
                      title: "Status Distribution",
                    })
                  }
                  style={{ cursor: "pointer" }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Performance Radar */}
              <div className="col-span-4 bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase">
                    Department Performance
                  </h3>
                  <div className="relative">
                    <button
                      onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                      className="text-[10px] px-2 py-1 border border-gray-200 rounded bg-white text-gray-700 cursor-pointer hover:border-gray-300 flex items-center gap-1"
                    >
                      <span>
                        {selectedDepartments.length} dept
                        {selectedDepartments.length !== 1 ? "s" : ""} selected
                      </span>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showDeptDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowDeptDropdown(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 w-48 max-h-64 overflow-y-auto">
                          <div className="p-2 border-b border-gray-100 bg-gray-50">
                            <p className="text-[9px] text-gray-600 font-medium">
                              Select departments to compare
                            </p>
                          </div>
                          {departmentStats
                            .filter((d) => d.count > 0)
                            .map((dept) => (
                              <label
                                key={dept.name}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-[10px]"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDepartments.includes(
                                    dept.name,
                                  )}
                                  onChange={() =>
                                    handleDepartmentToggle(dept.name)
                                  }
                                  className="cursor-pointer"
                                />
                                <span className="text-gray-700">
                                  {dept.name} ({dept.count})
                                </span>
                              </label>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div
                  onDoubleClick={() =>
                    setGraphPopup({
                      isOpen: true,
                      type: "departmentRadar",
                      title: "Department Performance Radar",
                    })
                  }
                  style={{ cursor: "pointer" }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={departmentRadarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis
                        dataKey="department"
                        tick={{ fontSize: 9 }}
                      />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} />
                      <Radar
                        name="Total eMoUs"
                        dataKey="total"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Active"
                        dataKey="active"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 3: Yearly Bar Chart + Current Year Monthly */}
            <div className="grid grid-cols-12 gap-3">
              {/* Yearly Stacked Bar Chart */}
              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Yearly Status Distribution (2014-2026)
                </h3>
                <div
                  onDoubleClick={() =>
                    setGraphPopup({
                      isOpen: true,
                      type: "yearlyBar",
                      title: "Yearly Status Distribution (2014-2026)",
                    })
                  }
                  style={{ cursor: "pointer" }}
                >
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={yearlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10 }}
                        stroke="#6b7280"
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar
                        dataKey="active"
                        stackId="a"
                        fill="#10b981"
                        name="Active"
                      />
                      <Bar
                        dataKey="renewal"
                        stackId="a"
                        fill="#f59e0b"
                        name="Renewal"
                      />
                      <Bar
                        dataKey="expired"
                        stackId="a"
                        fill="#ef4444"
                        name="Expired"
                      />
                      <Bar
                        dataKey="draft"
                        stackId="a"
                        fill="#6b7280"
                        name="Draft"
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Total"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Current Year Monthly Area Chart */}
              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase">
                    {selectedYear} Monthly Activity
                  </h3>
                  <div className="flex gap-2 items-center">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <select
                      value={`${monthRangeStart}-${monthRangeEnd}`}
                      onChange={(e) => {
                        const [start, end] = e.target.value
                          .split("-")
                          .map(Number);
                        setMonthRangeStart(start);
                        setMonthRangeEnd(end);
                      }}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="0-11">All Year</option>
                      <option value="0-2">Q1 (Jan-Mar)</option>
                      <option value="3-5">Q2 (Apr-Jun)</option>
                      <option value="6-8">Q3 (Jul-Sep)</option>
                      <option value="9-11">Q4 (Oct-Dec)</option>
                      <option value="0-5">H1 (Jan-Jun)</option>
                      <option value="6-11">H2 (Jul-Dec)</option>
                    </select>
                  </div>
                </div>
                <div
                  onDoubleClick={() => {
                    const monthRangeText =
                      monthRangeStart === 0 && monthRangeEnd === 11
                        ? "All Year"
                        : monthRangeStart === 0 && monthRangeEnd === 2
                          ? "Q1"
                          : monthRangeStart === 3 && monthRangeEnd === 5
                            ? "Q2"
                            : monthRangeStart === 6 && monthRangeEnd === 8
                              ? "Q3"
                              : monthRangeStart === 9 && monthRangeEnd === 11
                                ? "Q4"
                                : monthRangeStart === 0 && monthRangeEnd === 5
                                  ? "H1"
                                  : monthRangeStart === 6 &&
                                      monthRangeEnd === 11
                                    ? "H2"
                                    : "Custom Range";
                    setGraphPopup({
                      isOpen: true,
                      type: "monthlyArea",
                      title: `${selectedYear} Monthly Activity (${monthRangeText})`,
                    });
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={currentYearMonthly}>
                      <defs>
                        <linearGradient
                          id="colorActive"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorExpired"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10 }}
                        stroke="#6b7280"
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Area
                        type="monotone"
                        dataKey="active"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorActive)"
                        name="Active"
                      />
                      <Area
                        type="monotone"
                        dataKey="expired"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#colorExpired)"
                        name="Expired"
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={0.2}
                        fill="#3b82f6"
                        name="Total"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 4: Department Comparison + Performance Insights */}
            <div className="grid grid-cols-12 gap-3">
              {/* Department Comparison */}
              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase">
                    Department Comparison
                  </h3>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowComparisonDropdown(!showComparisonDropdown)
                      }
                      className="text-[10px] px-2 py-1 border border-gray-200 rounded bg-white text-gray-700 cursor-pointer hover:border-gray-300 flex items-center gap-1"
                    >
                      <span>
                        {comparisonDepartments.length} dept
                        {comparisonDepartments.length !== 1 ? "s" : ""} selected
                      </span>
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showComparisonDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowComparisonDropdown(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 w-48 max-h-64 overflow-y-auto">
                          <div className="p-2 border-b border-gray-100 bg-gray-50">
                            <p className="text-[9px] text-gray-600 font-medium">
                              Select departments to compare
                            </p>
                          </div>
                          {departmentStats
                            .filter((d) => d.count > 0)
                            .map((dept) => (
                              <label
                                key={dept.name}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-[10px]"
                              >
                                <input
                                  type="checkbox"
                                  checked={comparisonDepartments.includes(
                                    dept.name,
                                  )}
                                  onChange={() =>
                                    handleComparisonToggle(dept.name)
                                  }
                                  className="cursor-pointer"
                                />
                                <span className="text-gray-700">
                                  {dept.name} ({dept.count})
                                </span>
                              </label>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {comparisonDepartments.length > 0 ? (
                  <div
                    className="flex gap-3"
                    onDoubleClick={() =>
                      setGraphPopup({
                        isOpen: true,
                        type: "departmentComparison",
                        title: "Department Comparison",
                      })
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {/* Pie Chart for Selected Departments */}
                    <div className="w-1/2">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={departmentStats.filter((d) =>
                              comparisonDepartments.includes(d.name),
                            )}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={60}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percent }) => {
                              const deptName = name || "";
                              return `${deptName} ${((percent || 0) * 100).toFixed(0)}%`;
                            }}
                          >
                            {departmentStats
                              .filter((d) =>
                                comparisonDepartments.includes(d.name),
                              )
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                                />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              fontSize: "11px",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Department List with Details */}
                    <div className="w-1/2 overflow-y-auto max-h-[220px] space-y-1.5">
                      {departmentStats
                        .filter((dept) =>
                          comparisonDepartments.includes(dept.name),
                        )
                        .map((dept, idx) => {
                          const activeRate =
                            dept.count > 0
                              ? (dept.active / dept.count) * 100
                              : 0;

                          return (
                            <div
                              key={dept.name}
                              className="border border-gray-200 rounded p-1.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              {/* Department Header */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        DEPT_COLORS[idx % DEPT_COLORS.length],
                                    }}
                                  />
                                  <span className="text-[10px] font-bold text-gray-800">
                                    {dept.name}
                                  </span>
                                </div>
                                <div className="text-[9px] font-semibold text-gray-700">
                                  {Math.round(activeRate)}%
                                </div>
                              </div>

                              {/* Mini Stats */}
                              <div className="flex items-center justify-between text-[9px]">
                                <div className="flex gap-2">
                                  <span className="text-blue-700 font-medium">
                                    Total: {dept.count}
                                  </span>
                                  <span className="text-green-700 font-medium">
                                    Active: {dept.active}
                                  </span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                                  style={{ width: `${activeRate}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-center">
                    <div>
                      <div className="text-gray-400 mb-2">
                        <svg
                          className="w-12 h-12 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                          />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600">
                        Select departments from dropdown
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        to view pie chart comparison
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Key Performance Metrics
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {/* Top Department */}
                  <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                    <div className="text-xl font-bold text-emerald-700">
                      {(() => {
                        const topDept = departmentStats
                          .filter((d) => d.count > 0)
                          .sort((a, b) => b.count - a.count)[0];
                        return topDept ? topDept.name : "-";
                      })()}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold">
                      Top Department
                    </div>
                    <div className="text-[9px] text-emerald-600">
                      {(() => {
                        const topDept = departmentStats
                          .filter((d) => d.count > 0)
                          .sort((a, b) => b.count - a.count)[0];
                        return topDept ? `${topDept.count} eMoUs` : "No data";
                      })()}
                    </div>
                  </div>

                  {/* International MoUs */}
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <div className="text-xl font-bold text-blue-700">
                      {
                        approvedRecords.filter(
                          (r) => r.scope === "International",
                        ).length
                      }
                    </div>
                    <div className="text-[10px] text-blue-700 font-semibold">
                      International
                    </div>
                    <div className="text-[9px] text-blue-600">
                      {stats.total > 0
                        ? Math.round(
                            (approvedRecords.filter(
                              (r) => r.scope === "International",
                            ).length /
                              stats.total) *
                              100,
                          )
                        : 0}
                      % of total
                    </div>
                  </div>

                  {/* National MoUs */}
                  <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                    <div className="text-xl font-bold text-purple-700">
                      {
                        approvedRecords.filter((r) => r.scope === "National")
                          .length
                      }
                    </div>
                    <div className="text-[10px] text-purple-700 font-semibold">
                      National
                    </div>
                    <div className="text-[9px] text-purple-600">
                      {stats.total > 0
                        ? Math.round(
                            (approvedRecords.filter(
                              (r) => r.scope === "National",
                            ).length /
                              stats.total) *
                              100,
                          )
                        : 0}
                      % of total
                    </div>
                  </div>

                  {/* Active Rate */}
                  <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                    <div className="text-xl font-bold text-orange-700">
                      {stats.total > 0
                        ? Math.round((stats.active / stats.total) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-[10px] text-orange-700 font-semibold">
                      Active Rate
                    </div>
                    <div className="text-[9px] text-orange-600">
                      {stats.active} active now
                    </div>
                  </div>

                  {/* Placements */}
                  <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                    <div className="text-xl font-bold text-indigo-700">
                      {stats.totalPlacement}
                    </div>
                    <div className="text-[10px] text-indigo-700 font-semibold">
                      Placements
                    </div>
                    <div className="text-[9px] text-indigo-600">
                      Students placed
                    </div>
                  </div>

                  {/* Internships */}
                  <div className="bg-cyan-50 rounded-lg p-2 border border-cyan-200">
                    <div className="text-xl font-bold text-cyan-700">
                      {stats.totalInternship}
                    </div>
                    <div className="text-[10px] text-cyan-700 font-semibold">
                      Internships
                    </div>
                    <div className="text-[9px] text-cyan-600">
                      Students interned
                    </div>
                  </div>

                  {/* Expiring Soon */}
                  <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                    <div className="text-xl font-bold text-yellow-700">
                      {stats.expiring}
                    </div>
                    <div className="text-[10px] text-yellow-700 font-semibold">
                      Expiring Soon
                    </div>
                    <div className="text-[9px] text-yellow-600">
                      Within 2 months
                    </div>
                  </div>

                  {/* Draft Status */}
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <div className="text-xl font-bold text-gray-700">
                      {stats.draft}
                    </div>
                    <div className="text-[10px] text-gray-700 font-semibold">
                      Draft
                    </div>
                    <div className="text-[9px] text-gray-600">
                      Pending approval
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Detail Popup */}
      {popupData.isOpen && (
        <RecordDetailPopup
          title={popupData.title}
          records={popupData.records}
          onClose={closePopup}
          type={popupData.type}
          clickX={popupData.clickX}
        />
      )}

      {/* Graph Popup Modal */}
      {graphPopup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800">
                {graphPopup.title}
              </h2>
              <div className="flex items-center gap-3">
                {/* Department Filter for Radar and Comparison */}
                {(graphPopup.type === "departmentRadar" ||
                  graphPopup.type === "departmentComparison") && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (graphPopup.type === "departmentRadar") {
                          setShowDeptDropdown(!showDeptDropdown);
                        } else {
                          setShowComparisonDropdown(!showComparisonDropdown);
                        }
                      }}
                      className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span>
                        {graphPopup.type === "departmentRadar"
                          ? `${selectedDepartments.length} dept${selectedDepartments.length !== 1 ? "s" : ""} selected`
                          : `${comparisonDepartments.length} dept${comparisonDepartments.length !== 1 ? "s" : ""} selected`}
                      </span>
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {((graphPopup.type === "departmentRadar" &&
                      showDeptDropdown) ||
                      (graphPopup.type === "departmentComparison" &&
                        showComparisonDropdown)) && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => {
                            setShowDeptDropdown(false);
                            setShowComparisonDropdown(false);
                          }}
                        />
                        <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 w-64 max-h-80 overflow-y-auto">
                          <div className="p-3 border-b border-gray-100 bg-gray-50">
                            <p className="text-xs text-gray-600 font-medium">
                              Select departments to compare
                            </p>
                          </div>
                          {departmentStats
                            .filter((d) => d.count > 0)
                            .map((dept) => (
                              <label
                                key={dept.name}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    graphPopup.type === "departmentRadar"
                                      ? selectedDepartments.includes(dept.name)
                                      : comparisonDepartments.includes(
                                          dept.name,
                                        )
                                  }
                                  onChange={() => {
                                    if (graphPopup.type === "departmentRadar") {
                                      handleDepartmentToggle(dept.name);
                                    } else {
                                      handleComparisonToggle(dept.name);
                                    }
                                  }}
                                  className="cursor-pointer w-4 h-4"
                                />
                                <span className="text-gray-700 flex-1">
                                  {dept.name}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  {dept.count}
                                </span>
                              </label>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={() =>
                    setGraphPopup({ isOpen: false, type: "", title: "" })
                  }
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-auto">
              {graphPopup.type === "yearlyTrends" && (
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart data={yearlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 14 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 14 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ fontSize: "14px", borderRadius: "8px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      name="Total"
                    />
                    <Line
                      type="monotone"
                      dataKey="active"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      name="Active"
                    />
                    <Line
                      type="monotone"
                      dataKey="expired"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      name="Expired"
                    />
                    <Line
                      type="monotone"
                      dataKey="renewal"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      name="Renewal"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {graphPopup.type === "statusPie" && (
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={180}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent, value }) =>
                        `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`
                      }
                      labelLine={{ stroke: "#6b7280", strokeWidth: 2 }}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: "14px", borderRadius: "8px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {graphPopup.type === "departmentRadar" && (
                <ResponsiveContainer width="100%" height={500}>
                  <RadarChart data={departmentRadarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="department"
                      tick={{ fontSize: 14 }}
                    />
                    <PolarRadiusAxis tick={{ fontSize: 14 }} />
                    <Radar
                      name="Total eMoUs"
                      dataKey="total"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Active"
                      dataKey="active"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Efficiency %"
                      dataKey="efficiency"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: "14px", borderRadius: "8px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}

              {graphPopup.type === "yearlyBar" && (
                <ResponsiveContainer width="100%" height={500}>
                  <ComposedChart data={yearlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 14 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 14 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ fontSize: "14px", borderRadius: "8px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                    <Bar
                      dataKey="active"
                      stackId="a"
                      fill="#10b981"
                      name="Active"
                    />
                    <Bar
                      dataKey="renewal"
                      stackId="a"
                      fill="#f59e0b"
                      name="Renewal"
                    />
                    <Bar
                      dataKey="expired"
                      stackId="a"
                      fill="#ef4444"
                      name="Expired"
                    />
                    <Bar
                      dataKey="draft"
                      stackId="a"
                      fill="#6b7280"
                      name="Draft"
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      name="Total"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {graphPopup.type === "monthlyArea" && (
                <ResponsiveContainer width="100%" height={500}>
                  <AreaChart data={currentYearMonthly}>
                    <defs>
                      <linearGradient
                        id="colorActiveLarge"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorExpiredLarge"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ef4444"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ef4444"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 14 }}
                      stroke="#6b7280"
                    />
                    <YAxis tick={{ fontSize: 14 }} stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{ fontSize: "14px", borderRadius: "8px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "14px" }} />
                    <Area
                      type="monotone"
                      dataKey="active"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorActiveLarge)"
                      name="Active"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expired"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#colorExpiredLarge)"
                      name="Expired"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      fillOpacity={0.2}
                      fill="#3b82f6"
                      name="Total"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {graphPopup.type === "departmentComparison" &&
                comparisonDepartments.length > 0 && (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={450}>
                        <PieChart>
                          <Pie
                            data={departmentStats.filter((d) =>
                              comparisonDepartments.includes(d.name),
                            )}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={150}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percent, value }) =>
                              `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`
                            }
                            labelLine={{ stroke: "#6b7280", strokeWidth: 2 }}
                          >
                            {departmentStats
                              .filter((d) =>
                                comparisonDepartments.includes(d.name),
                              )
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                                />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              fontSize: "14px",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Department Details
                      </h3>
                      <div className="space-y-4 overflow-y-auto max-h-[450px] pr-2">
                        {departmentStats
                          .filter((dept) =>
                            comparisonDepartments.includes(dept.name),
                          )
                          .map((dept, idx) => {
                            const activeRate =
                              dept.count > 0
                                ? (dept.active / dept.count) * 100
                                : 0;
                            return (
                              <div
                                key={dept.name}
                                className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-shadow"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{
                                        backgroundColor:
                                          DEPT_COLORS[idx % DEPT_COLORS.length],
                                      }}
                                    />
                                    <span className="text-lg font-bold text-gray-800">
                                      {dept.name}
                                    </span>
                                  </div>
                                  <span className="text-2xl font-bold text-gray-700">
                                    {dept.count}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div className="bg-green-50 rounded p-2 border border-green-200">
                                    <div className="text-xs text-green-600 font-medium">
                                      Active
                                    </div>
                                    <div className="text-lg font-bold text-green-700">
                                      {dept.active}
                                    </div>
                                  </div>
                                  <div className="bg-gray-50 rounded p-2 border border-gray-200">
                                    <div className="text-xs text-gray-600 font-medium">
                                      Inactive
                                    </div>
                                    <div className="text-lg font-bold text-gray-700">
                                      {dept.count - dept.active}
                                    </div>
                                  </div>
                                  <div className="bg-blue-50 rounded p-2 border border-blue-200">
                                    <div className="text-xs text-blue-600 font-medium">
                                      Rate
                                    </div>
                                    <div className="text-lg font-bold text-blue-700">
                                      {activeRate.toFixed(0)}%
                                    </div>
                                  </div>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                                    style={{ width: `${activeRate}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

              {graphPopup.type === "departmentComparison" &&
                comparisonDepartments.length === 0 && (
                  <div className="flex items-center justify-center h-96 text-center">
                    <div>
                      <div className="text-gray-400 mb-4">
                        <svg
                          className="w-24 h-24 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                          />
                        </svg>
                      </div>
                      <p className="text-lg text-gray-600 font-medium">
                        No departments selected
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Select departments from the dropdown to view comparison
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
