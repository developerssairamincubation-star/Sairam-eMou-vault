"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  EMoURecord,
  DepartmentCode,
  EMoUStatus,
  DocumentAvailability,
} from "@/types";

interface ImportDialogProps {
  onImport: (records: Partial<EMoURecord>[]) => Promise<void>;
  onClose: () => void;
}

interface ValidationResult {
  valid: Partial<EMoURecord>[];
  invalid: Array<{
    row: number;
    data: Record<string, unknown>;
    missingFields: string[];
  }>;
}

export default function ImportDialog({ onImport, onClose }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFields = ["companyName", "department"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
    }
  };

  // Intelligent date parser supporting multiple formats
  const parseDate = (dateValue: unknown): string => {
    if (!dateValue) return "";

    const dateStr = String(dateValue).trim();
    if (!dateStr) return "";

    // Check for perpetual/indefinite dates
    if (
      dateStr.toLowerCase().includes("perpetual") ||
      dateStr.toLowerCase().includes("indefinite") ||
      dateStr.toLowerCase().includes("infinite")
    ) {
      return "Perpetual";
    }

    // Try parsing as Excel serial date
    if (!isNaN(Number(dateStr)) && Number(dateStr) > 1000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + Number(dateStr) * 86400000);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }

    // Common date separators: ., /, -
    const patterns = [
      /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/, // DD.MM.YYYY or DD/MM/YY
      /^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{2,4})$/, // DD Month YYYY
    ];

    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let day: string, month: string, year: string;

        if (pattern === patterns[1]) {
          // YYYY-MM-DD
          [, year, month, day] = match;
        } else if (pattern === patterns[2]) {
          // DD Month YYYY
          [, day, month, year] = match;
          const monthNames = [
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
          ];
          const monthIndex = monthNames.findIndex((m) =>
            month.toLowerCase().startsWith(m),
          );
          month = String(monthIndex + 1).padStart(2, "0");
        } else {
          // DD.MM.YYYY or DD/MM/YY
          [, day, month, year] = match;
        }

        // Handle 2-digit years
        if (year.length === 2) {
          year = Number(year) > 50 ? `19${year}` : `20${year}`;
        }

        // Normalize
        day = String(day).padStart(2, "0");
        month = String(month).padStart(2, "0");

        return `${day}.${month}.${year}`;
      }
    }

    // Try native Date parsing as last resort
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      }
    } catch (e) {
      // Ignore
    }

    return dateStr; // Return as-is if can't parse
  };

  // Normalize status values (case-insensitive) or auto-determine from dates
  const normalizeStatus = (status: unknown, toDateStr?: string): EMoUStatus => {
    const statusStr = String(status || "")
      .trim()
      .toLowerCase();

    // Check if toDate is perpetual/indefinite - always Active
    if (
      toDateStr &&
      (toDateStr.toLowerCase().includes("perpetual") ||
        toDateStr.toLowerCase().includes("indefinite") ||
        toDateStr.toLowerCase().includes("infinite"))
    ) {
      return "Active";
    }

    if (statusStr.includes("perpetual")) return "Active";
    // If status is provided, use it
    if (statusStr) {
      if (statusStr.includes("active")) return "Active";
      if (statusStr.includes("expire")) return "Expired";
      if (statusStr.includes("renew")) return "Renewal Pending";
      if (statusStr.includes("draft")) return "Draft";
    }

    // If status is empty, auto-determine from toDate
    if (toDateStr) {
      try {
        const parts = toDateStr.split(".");
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
          const year = parseInt(parts[2]);
          const toDate = new Date(year, month, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time for date-only comparison

          if (toDate >= today) {
            return "Active";
          } else {
            return "Expired";
          }
        }
      } catch (e) {
        // If date parsing fails, default to Draft
      }
    }

    return "Draft"; // Default
  };

  // Normalize department codes
  const normalizeDepartment = (dept: unknown): DepartmentCode => {
    const deptStr = String(dept || "")
      .trim()
      .toUpperCase();
    const deptMapping: Record<string, DepartmentCode> = {
      CSE: "CSE",
      COMPUTER: "CSE",
      CS: "CSE",
      ECE: "ECE",
      ELECTRONICS: "ECE",
      EC: "ECE",
      EEE: "EEE",
      ELECTRICAL: "EEE",
      EE: "EEE",
      MECH: "MECH",
      MECHANICAL: "MECH",
      ME: "MECH",
      CIVIL: "CIVIL",
      CE: "CIVIL",
      IT: "IT",
      INFORMATION: "IT",
      AIDS: "AIDS",
      "AI&DS": "AIDS",
      AI: "AIDS",
      CSBS: "CSBS",
    };

    // Try exact match first
    if (deptMapping[deptStr]) return deptMapping[deptStr];

    // Try partial match
    for (const [key, value] of Object.entries(deptMapping)) {
      if (deptStr.includes(key)) return value;
    }

    return "CSE"; // Default
  };

  // Normalize document availability
  const normalizeDocAvailability = (doc: unknown): DocumentAvailability => {
    const docStr = String(doc || "")
      .trim()
      .toLowerCase();
    if (
      docStr.includes("available") ||
      docStr.includes("yes") ||
      docStr.includes("soft") ||
      docStr.includes("hard")
    )
      return "Available";
    return "Not Available"; // Default
  };

  // Normalize yes/no fields
  const normalizeYesNo = (value: unknown): "Yes" | "No" => {
    const valStr = String(value || "")
      .trim()
      .toLowerCase();
    if (
      valStr.includes("yes") ||
      valStr === "y" ||
      valStr === "1" ||
      valStr === "true"
    )
      return "Yes";
    return "No";
  };

  // Smart scope detection from company address
  const detectScope = (
    scopeValue: unknown,
    companyAddress: unknown,
  ): "National" | "International" => {
    const scopeStr = String(scopeValue || "")
      .trim()
      .toLowerCase();

    // If scope is explicitly provided, use it
    if (scopeStr && scopeStr.includes("international")) {
      return "International";
    }
    if (scopeStr && scopeStr.includes("national")) {
      return "National";
    }

    // If scope is not provided, detect from company address
    const addressStr = String(companyAddress || "")
      .trim()
      .toLowerCase();

    // Indian location indicators
    const indianIndicators = [
      "india",
      "bharat",
      "chennai",
      "mumbai",
      "delhi",
      "bangalore",
      "bengaluru",
      "hyderabad",
      "pune",
      "kolkata",
      "ahmedabad",
      "tamilnadu",
      "tamil nadu",
      "karnataka",
      "maharashtra",
      "kerala",
      "gujarat",
      "rajasthan",
      "madhya pradesh",
      "uttar pradesh",
      "west bengal",
      "telangana",
      "andhra pradesh",
    ];

    // International country indicators
    const internationalIndicators = [
      "usa",
      "united states",
      "uk",
      "united kingdom",
      "canada",
      "australia",
      "singapore",
      "japan",
      "germany",
      "france",
      "netherlands",
      "sweden",
      "switzerland",
      "china",
      "south korea",
      "dubai",
      "uae",
      "malaysia",
    ];

    // Check for international indicators first (more specific)
    if (
      internationalIndicators.some((indicator) =>
        addressStr.includes(indicator),
      )
    ) {
      return "International";
    }

    // Check for Indian indicators
    if (indianIndicators.some((indicator) => addressStr.includes(indicator))) {
      return "National";
    }

    // Default to National if can't determine
    return "National";
  };

  // Normalize maintainedBy field
  const normalizeMaintainedBy = (
    value: unknown,
  ): "Institution" | "Incubation" | "Departments" => {
    const valStr = String(value || "")
      .trim()
      .toLowerCase();
    if (valStr.includes("institution")) return "Institution";
    if (valStr.includes("incubation")) return "Incubation";
    return "Departments"; // Default
  };

  const parseExcelFile = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      validateAndParseRecords(jsonData);
    };
    reader.readAsBinaryString(file);
  };

  const validateAndParseRecords = (data: unknown[]) => {
    const valid: Partial<EMoURecord>[] = [];
    const invalid: Array<{
      row: number;
      data: Record<string, unknown>;
      missingFields: string[];
    }> = [];

    data.forEach((row, index) => {
      const record = row as Record<string, unknown>;
      const missingFields: string[] = [];

      // Check ONLY essential required fields (companyName and department)
      requiredFields.forEach((field) => {
        if (!record[field] || String(record[field]).trim() === "") {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        invalid.push({
          row: index + 2, // +2 because Excel is 1-indexed and row 1 is header
          data: record,
          missingFields,
        });
      } else {
        // Map Excel columns to EMoURecord fields with intelligent parsing
        const fromDate = parseDate(record.fromDate) || "";
        const toDate = parseDate(record.toDate) || "";
        const companyAddress = String(record.companyAddress || "").trim();
        const hodApprovalDoc =
          record.hodApprovalDoc && String(record.hodApprovalDoc).trim()
            ? String(record.hodApprovalDoc).trim()
            : undefined;
        const signedAgreementDoc =
          record.signedAgreementDoc && String(record.signedAgreementDoc).trim()
            ? String(record.signedAgreementDoc).trim()
            : undefined;

        const emouRecord: Partial<EMoURecord> = {
          department: normalizeDepartment(record.department),
          companyName: String(record.companyName || "").trim(),
          fromDate: fromDate,
          toDate: toDate,
          scope: detectScope(record.scope, companyAddress),
          status: normalizeStatus(record.status, toDate),
          maintainedBy: normalizeMaintainedBy(record.maintainedBy),
          approvalStatus:
            hodApprovalDoc && signedAgreementDoc ? "pending" : "draft",
          description: String(record.description || "").trim(),
          documentAvailability: normalizeDocAvailability(
            record.documentAvailability,
          ),
          hodApprovalDoc: hodApprovalDoc,
          signedAgreementDoc: signedAgreementDoc,
          goingForRenewal: normalizeYesNo(record.goingForRenewal),
          perStudentCost:
            record.perStudentCost && !isNaN(Number(record.perStudentCost))
              ? Number(record.perStudentCost)
              : 0,
          placementOpportunity:
            record.placementOpportunity &&
            !isNaN(Number(record.placementOpportunity))
              ? Number(record.placementOpportunity)
              : 0,
          internshipOpportunity:
            record.internshipOpportunity &&
            !isNaN(Number(record.internshipOpportunity))
              ? Number(record.internshipOpportunity)
              : 0,
          companyRelationship:
            record.companyRelationship &&
            !isNaN(Number(record.companyRelationship))
              ? (Math.max(
                  1,
                  Math.min(5, Number(record.companyRelationship)),
                ) as 1 | 2 | 3 | 4 | 5)
              : 3,
        };

        // Only add optional fields if they have values (avoid undefined)
        if (record.scannedCopy && String(record.scannedCopy).trim()) {
          emouRecord.scannedCopy = String(record.scannedCopy).trim();
        }
        if (record.companyWebsite && String(record.companyWebsite).trim()) {
          emouRecord.companyWebsite = String(record.companyWebsite).trim();
        }
        if (record.aboutCompany && String(record.aboutCompany).trim()) {
          emouRecord.aboutCompany = String(record.aboutCompany).trim();
        }
        if (record.companyAddress && String(record.companyAddress).trim()) {
          emouRecord.companyAddress = String(record.companyAddress).trim();
        }
        if (
          record.industryContactName &&
          String(record.industryContactName).trim()
        ) {
          emouRecord.industryContactName = String(
            record.industryContactName,
          ).trim();
        }
        if (
          record.industryContactMobile &&
          String(record.industryContactMobile).trim()
        ) {
          emouRecord.industryContactMobile = String(
            record.industryContactMobile,
          ).trim();
        }
        if (
          record.industryContactEmail &&
          String(record.industryContactEmail).trim()
        ) {
          emouRecord.industryContactEmail = String(
            record.industryContactEmail,
          ).trim();
        }
        if (
          record.institutionContactName &&
          String(record.institutionContactName).trim()
        ) {
          emouRecord.institutionContactName = String(
            record.institutionContactName,
          ).trim();
        }
        if (
          record.institutionContactMobile &&
          String(record.institutionContactMobile).trim()
        ) {
          emouRecord.institutionContactMobile = String(
            record.institutionContactMobile,
          ).trim();
        }
        if (
          record.institutionContactEmail &&
          String(record.institutionContactEmail).trim()
        ) {
          emouRecord.institutionContactEmail = String(
            record.institutionContactEmail,
          ).trim();
        }
        if (record.clubsAligned && String(record.clubsAligned).trim()) {
          emouRecord.clubsAligned = String(record.clubsAligned).trim();
        }
        if (record.sdgGoals && String(record.sdgGoals).trim()) {
          emouRecord.sdgGoals = String(record.sdgGoals).trim();
        }
        if (
          record.skillsTechnologies &&
          String(record.skillsTechnologies).trim()
        ) {
          emouRecord.skillsTechnologies = String(
            record.skillsTechnologies,
          ).trim();
        }
        if (record.benefitsAchieved && String(record.benefitsAchieved).trim()) {
          emouRecord.benefitsAchieved = String(record.benefitsAchieved).trim();
        }
        if (record.ieeeSociety && String(record.ieeeSociety).trim()) {
          emouRecord.ieeeSociety = String(record.ieeeSociety).trim();
        }
        if (record.emouOutcome && String(record.emouOutcome).trim()) {
          emouRecord.emouOutcome = String(record.emouOutcome).trim();
        }

        valid.push(emouRecord);
      }
    });

    setValidationResult({ valid, invalid });
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.valid.length === 0) return;

    setImporting(true);
    try {
      await onImport(validationResult.valid);
      onClose();
    } catch {
      alert("Failed to import records");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-white">
            <h2 className="text-lg font-semibold">Import eMoU Records</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Upload an Excel file (.xlsx) with eMoU records
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50">
          <div className="space-y-4">
            {/* File Upload */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                Select Excel File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <p className="text-xs text-gray-600 mt-3 font-medium">
                  Selected: <span className="text-gray-900">{file.name}</span>
                </p>
              )}
            </div>

            {/* Required Fields Info */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                Required Excel Columns:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                {requiredFields.map((field) => (
                  <div key={field}>• {field}</div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">
                  Smart Import Features:
                </h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    Accepts dates in any format (12.02.2021, 23/3/22,
                    2021-03-15)
                  </li>
                  <li>
                    Auto-determines status from toDate if status field is empty
                  </li>
                  <li>
                    Auto-detects scope (National/International) from company
                    address
                  </li>
                  <li>Case-insensitive status (EXPIRED, Expired, expired)</li>
                  <li>Auto-detects departments (CSE, Computer, CS → CSE)</li>
                  <li>
                    Sets approval status: pending if both docs uploaded, else
                    draft
                  </li>
                  <li>Missing fields are filled with defaults</li>
                </ul>
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && (
              <div className="space-y-4">
                {/* Valid Records */}
                {validationResult.valid.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-emerald-800 mb-2">
                      ✓ Valid Records: {validationResult.valid.length}
                    </h3>
                    <p className="text-xs text-emerald-700">
                      These records will be imported successfully.
                    </p>
                  </div>
                )}

                {/* Invalid Records */}
                {validationResult.invalid.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2">
                      ⚠ Invalid Records: {validationResult.invalid.length}
                    </h3>
                    <p className="text-xs text-amber-700 mb-3">
                      These records have missing required fields and will be
                      skipped:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {validationResult.invalid.map((item) => (
                        <div
                          key={item.row}
                          className="bg-white p-3 rounded border border-amber-200 text-xs shadow-sm"
                        >
                          <div className="font-semibold text-amber-900">
                            Row {item.row}:{" "}
                            {String(item.data.companyName || "Unnamed Company")}
                          </div>
                          <div className="text-amber-700 mt-1">
                            Missing fields: {item.missingFields.join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="btn btn-secondary text-sm"
            disabled={importing}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {!validationResult && (
              <button
                onClick={parseExcelFile}
                className="btn btn-primary text-sm"
                disabled={!file}
              >
                Validate File
              </button>
            )}
            {validationResult && validationResult.valid.length > 0 && (
              <button
                onClick={handleImport}
                className="btn btn-primary text-sm"
                disabled={importing}
              >
                {importing
                  ? "Importing..."
                  : `Import ${validationResult.valid.length} Record${validationResult.valid.length > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
