"use client";

import { useEffect, useState } from "react";
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

interface DepartmentStats {
  name: string;
  count: number;
  active: number;
}

export default function Dashboard() {
  const [records, setRecords] = useState<EMoURecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [radarFilter, setRadarFilter] = useState<"top5" | "all">("top5");
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

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await getEMoUs();
      // Only show analytics for approved records
      setRecords(data.filter((r) => r.approvalStatus === "approved"));
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: records.length,
    active: records.filter((r) => r.status === "Active").length,
    expired: records.filter((r) => r.status === "Expired").length,
    renewal: records.filter((r) => r.status === "Renewal Pending").length,
    draft: records.filter((r) => r.status === "Draft").length,
    totalPlacement: records.reduce(
      (sum, r) => sum + (r.placementOpportunity || 0),
      0,
    ),
    totalInternship: records.reduce(
      (sum, r) => sum + (r.internshipOpportunity || 0),
      0,
    ),
  };

  // Department statistics - include ALL departments
  const departmentStats: DepartmentStats[] = (() => {
    const deptMap = new Map<string, { count: number; active: number }>();
    // Initialize all departments with 0
    ALL_DEPARTMENTS.forEach((dept) => {
      deptMap.set(dept, { count: 0, active: 0 });
    });
    // Count records
    records.forEach((record) => {
      const dept = record.department || "Uncategorized";
      const current = deptMap.get(dept) || { count: 0, active: 0 };
      current.count++;
      if (record.status === "Active") current.active++;
      deptMap.set(dept, current);
    });
    return Array.from(deptMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  })();

  const topDepartments = departmentStats.slice(0, 10);

  const getYearlyTrends = () => {
    const yearData: {
      [key: string]: {
        count: number;
        active: number;
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
        expired: 0,
        renewal: 0,
        draft: 0,
      };
    }

    // Count records per year based on fromDate (when eMoU started)
    records.forEach((record) => {
      if (record.fromDate) {
        try {
          // Parse dd.mm.yyyy format
          const parts = record.fromDate.split(".");
          if (parts.length === 3) {
            const year = parseInt(parts[2]);
            if (yearData[year] !== undefined) {
              yearData[year].count++;
              if (record.status === "Active") yearData[year].active++;
              else if (record.status === "Expired") yearData[year].expired++;
              else if (record.status === "Renewal Pending")
                yearData[year].renewal++;
              else if (record.status === "Draft") yearData[year].draft++;
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
        expired: yearData[year].expired,
        renewal: yearData[year].renewal,
        draft: yearData[year].draft,
      });
    }

    return years;
  };

  const getCurrentYearMonthly = () => {
    const currentYear = new Date().getFullYear();
    const monthData: {
      [key: string]: {
        count: number;
        active: number;
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
      monthData[month] = { count: 0, active: 0, expired: 0, renewal: 0 };
    });

    // Count records for current year based on fromDate
    records.forEach((record) => {
      if (record.fromDate) {
        try {
          // Parse dd.mm.yyyy format
          const parts = record.fromDate.split(".");
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
            const year = parseInt(parts[2]);

            if (year === currentYear) {
              const monthKey = months[month];
              if (monthKey && monthData[monthKey]) {
                monthData[monthKey].count++;
                if (record.status === "Active") monthData[monthKey].active++;
                else if (record.status === "Expired")
                  monthData[monthKey].expired++;
                else if (record.status === "Renewal Pending")
                  monthData[monthKey].renewal++;
              }
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    return months.map((month) => ({
      month,
      count: monthData[month].count,
      active: monthData[month].active,
      expired: monthData[month].expired,
      renewal: monthData[month].renewal,
    }));
  };

  const yearlyTrends = getYearlyTrends();
  const currentYearMonthly = getCurrentYearMonthly();

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
    { name: "Expired", value: stats.expired, color: "#ef4444" },
    { name: "Renewal", value: stats.renewal, color: "#f59e0b" },
    { name: "Draft", value: stats.draft, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  // Department performance radar data - dynamic based on filter
  const radarDepartments =
    radarFilter === "top5" ? topDepartments.slice(0, 5) : departmentStats;
  const departmentRadarData = radarDepartments.map((dept) => ({
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
                  showRecords("All eMoU Records", records, "total", e)
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
                    records.filter((r) => r.status === "Active"),
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
                    records.filter((r) => r.status === "Expired"),
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
                    "Renewal Pending eMoUs",
                    records.filter((r) => r.status === "Renewal Pending"),
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
                    records.filter((r) => (r.placementOpportunity || 0) > 0),
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
                    <div className="text-[10px] text-gray-600">Total No of Students Placed</div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "eMoUs with Internship Opportunities",
                    records.filter((r) => (r.internshipOpportunity || 0) > 0),
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
                    <div className="text-[10px] text-gray-600">Total No of Students Interned</div>
                  </div>
                </div>
              </div>
              <div
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={(e) =>
                  showRecords(
                    "Draft eMoUs",
                    records.filter((r) => r.status === "Draft"),
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

              {/* Status Distribution Pie */}
              <div className="col-span-3 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Status Split
                </h3>
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

              {/* Department Performance Radar */}
              <div className="col-span-4 bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase">
                    Department Performance
                  </h3>
                  <select
                    value={radarFilter}
                    onChange={(e) =>
                      setRadarFilter(e.target.value as "top5" | "all")
                    }
                    className="text-[10px] px-2 py-1 border border-gray-200 rounded bg-white text-gray-700 cursor-pointer hover:border-gray-300"
                  >
                    <option value="top5">Top 5</option>
                    <option value="all">All Depts</option>
                  </select>
                </div>
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

            {/* Row 3: Yearly Bar Chart + Current Year Monthly */}
            <div className="grid grid-cols-12 gap-3">
              {/* Yearly Stacked Bar Chart */}
              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Yearly Status Distribution (2014-2026)
                </h3>
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

              {/* Current Year Monthly Area Chart */}
              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  2026 Monthly Activity
                </h3>
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

            {/* Row 4: Department Pie Chart + Performance Insights */}
            <div className="grid grid-cols-12 gap-3">
              {/* Department Distribution Pie */}
              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Department Distribution
                </h3>
                <div className="flex">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie
                        data={departmentStats
                          .filter((d) => d.count > 0)
                          .slice(0, 10)}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                      >
                        {departmentStats
                          .filter((d) => d.count > 0)
                          .slice(0, 10)
                          .map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-1/2 overflow-y-auto max-h-[160px] pl-2">
                    {departmentStats.map((dept, idx) => (
                      <div
                        key={dept.name}
                        className="flex items-center justify-between text-[10px] py-0.5 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                DEPT_COLORS[idx % DEPT_COLORS.length],
                            }}
                          />
                          <span
                            className="text-gray-700 truncate max-w-[80px]"
                            title={dept.name}
                          >
                            {dept.name}
                          </span>
                        </div>
                        <span className="text-gray-500 font-medium">
                          {dept.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-6 bg-white rounded-lg p-3 border border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 mb-2 uppercase">
                  Performance Insights
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">
                      {departmentStats.filter((d) => d.count > 0).length}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium">
                      Active Depts
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded p-2 border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700">
                      {stats.total > 0
                        ? Math.round((stats.active / stats.total) * 100)
                        : 0}
                      %
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Success Rate
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">
                      {topDepartments.length > 0
                        ? topDepartments[0].name.substring(0, 8)
                        : "N/A"}
                    </div>
                    <div className="text-[10px] text-purple-600 font-medium">
                      Top Dept
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded p-2 border border-orange-200">
                    <div className="text-2xl font-bold text-orange-700">
                      {stats.renewal + stats.expired}
                    </div>
                    <div className="text-[10px] text-orange-600 font-medium">
                      Need Action
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded p-2 border border-indigo-200">
                    <div className="text-2xl font-bold text-indigo-700">
                      {stats.totalPlacement + stats.totalInternship}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-medium">
                      Opportunities
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {topDepartments.slice(0, 6).map((dept, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[9px] bg-gray-50 rounded px-1.5 py-0.5"
                    >
                      <span className="font-medium text-gray-700 truncate">
                        #{idx + 1} {dept.name}
                      </span>
                      <span className="text-gray-600 ml-1">
                        {dept.active}/{dept.count}
                      </span>
                    </div>
                  ))}
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
    </ProtectedRoute>
  );
}
