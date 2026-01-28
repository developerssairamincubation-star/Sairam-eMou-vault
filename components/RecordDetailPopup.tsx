import { EMoURecord } from "@/types";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface RecordDetailPopupProps {
  title: string;
  records: EMoURecord[];
  onClose: () => void;
  type?:
    | "total"
    | "active"
    | "expired"
    | "renewal"
    | "draft"
    | "placement"
    | "internship";
  clickX?: number;
}

export default function RecordDetailPopup({
  title,
  records,
  onClose,
  type = "total",
  clickX = 0,
}: RecordDetailPopupProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsAnimating(true), 10);
  }, []);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  // Calculate popup position to center below the clicked card
  const calculateLeftPosition = () => {
    const popupWidth = 896; // max-w-4xl = 56rem = 896px
    const leftPos = clickX - popupWidth / 2;
    const padding = 16; // 1rem padding on each side

    // Keep popup within viewport
    if (leftPos < padding) return padding;
    if (leftPos + popupWidth > window.innerWidth - padding) {
      return window.innerWidth - popupWidth - padding;
    }
    return leftPos;
  };

  const arrowOffset = clickX - calculateLeftPosition();

  const handleExport = () => {
    // Prepare data for export
    const exportData = records.map((record, index) => ({
      "S.No": index + 1,
      ID: record.id,
      "Company Name": record.companyName,
      Department: record.department,
      "From Date": record.fromDate,
      "To Date": record.toDate,
      Status: record.status,
      Scope: record.scope || "National",
      "Maintained By": record.maintainedBy || "Departments",
      Description: record.description || "",
      "About Company": record.aboutCompany || "",
      "Company Address": record.companyAddress || "",
      "Company Website": record.companyWebsite || "",
      Relationship: record.companyRelationship || 3,
      "Industry Contact Name": record.industryContactName || "",
      "Industry Contact Mobile": record.industryContactMobile || "",
      "Industry Contact Email": record.industryContactEmail || "",
      "Institution Contact Name": record.institutionContactName || "",
      "Institution Contact Mobile": record.institutionContactMobile || "",
      "Institution Contact Email": record.institutionContactEmail || "",
      "Clubs Aligned": record.clubsAligned || "",
      "SDG Goals": record.sdgGoals || "",
      "Skills/Technologies": record.skillsTechnologies || "",
      "Per Student Cost": record.perStudentCost || 0,
      "Placement Opportunities": record.placementOpportunity || 0,
      "Internship Opportunities": record.internshipOpportunity || 0,
      "Going For Renewal": record.goingForRenewal || "No",
      "Benefits Achieved": record.benefitsAchieved || "",
      "Document Availability": record.documentAvailability || "Not Available",
      "Created By": record.createdByName || "",
      "Created At":
        record.createdAt instanceof Date
          ? record.createdAt.toLocaleDateString()
          : new Date(record.createdAt).toLocaleDateString(),
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
      { wch: 6 }, // S.No
      { wch: 12 }, // ID
      { wch: 25 }, // Company Name
      { wch: 12 }, // Department
      { wch: 12 }, // From Date
      { wch: 12 }, // To Date
      { wch: 15 }, // Status
      { wch: 12 }, // Scope
      { wch: 15 }, // Maintained By
      { wch: 40 }, // Description
      { wch: 30 }, // About Company
      { wch: 30 }, // Company Address
      { wch: 25 }, // Company Website
      { wch: 12 }, // Relationship
      { wch: 20 }, // Industry Contact Name
      { wch: 15 }, // Industry Contact Mobile
      { wch: 25 }, // Industry Contact Email
      { wch: 20 }, // Institution Contact Name
      { wch: 15 }, // Institution Contact Mobile
      { wch: 25 }, // Institution Contact Email
      { wch: 20 }, // Clubs Aligned
      { wch: 20 }, // SDG Goals
      { wch: 30 }, // Skills/Technologies
      { wch: 12 }, // Per Student Cost
      { wch: 15 }, // Placement Opportunities
      { wch: 18 }, // Internship Opportunities
      { wch: 15 }, // Going For Renewal
      { wch: 30 }, // Benefits Achieved
      { wch: 18 }, // Document Availability
      { wch: 20 }, // Created By
      { wch: 15 }, // Created At
    ];
    worksheet["!cols"] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Records");

    // Generate filename
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${sanitizedTitle}_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-start pt-[9rem]"
      onClick={handleClose}
    >
      {/* Backdrop with fade animation */}
      <div
        className={`fixed inset-0 transition-opacity duration-500 ease-out ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Tooltip-style popup with bounce animation */}
      <div
        className={`absolute bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[75vh] overflow-hidden border border-gray-200 transition-all duration-500 ease-out ${
          isAnimating
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-4"
        }`}
        style={{
          left: `${calculateLeftPosition()}px`,
          animation: isAnimating
            ? "smoothBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow pointing up */}
        <div
          className="absolute -top-2 transform -translate-x-1/2"
          style={{ left: `${arrowOffset}px` }}
        >
          <div className="w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45" />
        </div>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-2.5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-slate-300 text-xs">
              {records.length} {records.length === 1 ? "record" : "records"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="text-slate-300 hover:text-white hover:bg-slate-600 rounded px-3 py-1.5 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Export to Excel"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export
            </button>
            <button
              onClick={handleClose}
              className="text-slate-300 hover:text-white hover:bg-slate-600 rounded p-1.5 transition-colors"
              title="Close"
            >
              <svg
                className="w-5 h-5"
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
        <div className="overflow-y-auto max-h-[calc(75vh-56px)] bg-gray-50">
          {records.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="font-medium">No records found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className="bg-white px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {record.companyName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {record.department}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {type === "placement" &&
                        record.placementOpportunity &&
                        record.placementOpportunity > 0 && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-600">
                              {record.placementOpportunity}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Placements
                            </div>
                          </div>
                        )}

                      {type === "internship" &&
                        record.internshipOpportunity &&
                        record.internshipOpportunity > 0 && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-indigo-600">
                              {record.internshipOpportunity}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Internships
                            </div>
                          </div>
                        )}

                      {(type === "total" ||
                        type === "active" ||
                        type === "expired" ||
                        type === "renewal" ||
                        type === "draft") && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {record.fromDate} - {record.toDate}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Duration
                          </div>
                        </div>
                      )}

                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          record.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : record.status === "Expired"
                              ? "bg-red-100 text-red-700"
                              : record.status === "Renewal Pending"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
