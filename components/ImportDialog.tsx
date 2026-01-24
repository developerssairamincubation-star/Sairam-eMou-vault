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

  const requiredFields = [
    "companyName",
    "fromDate",
    "toDate",
    "status",
    "description",
    "department",
    "documentAvailability",
    "goingForRenewal",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationResult(null);
    }
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

      // Check required fields
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
        // Map Excel columns to EMoURecord fields
        const emouRecord: Partial<EMoURecord> = {
          department: (record.department as DepartmentCode) || "CSE",
          companyName: String(record.companyName || ""),
          fromDate: String(record.fromDate || ""),
          toDate: String(record.toDate || ""),
          status: (record.status as EMoUStatus) || "Draft",
          description: String(record.description || ""),
          documentAvailability:
            (record.documentAvailability as DocumentAvailability) ||
            "Not Available",
          goingForRenewal: (record.goingForRenewal as "Yes" | "No") || "No",
          scannedCopy: record.scannedCopy
            ? String(record.scannedCopy)
            : undefined,
          companyWebsite: record.companyWebsite
            ? String(record.companyWebsite)
            : undefined,
          aboutCompany: record.aboutCompany
            ? String(record.aboutCompany)
            : undefined,
          companyAddress: record.companyAddress
            ? String(record.companyAddress)
            : undefined,
          industryContactName: record.industryContactName
            ? String(record.industryContactName)
            : undefined,
          industryContactMobile: record.industryContactMobile
            ? String(record.industryContactMobile)
            : undefined,
          industryContactEmail: record.industryContactEmail
            ? String(record.industryContactEmail)
            : undefined,
          institutionContactName: record.institutionContactName
            ? String(record.institutionContactName)
            : undefined,
          institutionContactMobile: record.institutionContactMobile
            ? String(record.institutionContactMobile)
            : undefined,
          institutionContactEmail: record.institutionContactEmail
            ? String(record.institutionContactEmail)
            : undefined,
          clubsAligned: record.clubsAligned
            ? String(record.clubsAligned)
            : undefined,
          sdgGoals: record.sdgGoals ? String(record.sdgGoals) : undefined,
          skillsTechnologies: record.skillsTechnologies
            ? String(record.skillsTechnologies)
            : undefined,
          perStudentCost: record.perStudentCost
            ? Number(record.perStudentCost)
            : 0,
          placementOpportunity: record.placementOpportunity
            ? Number(record.placementOpportunity)
            : 0,
          internshipOpportunity: record.internshipOpportunity
            ? Number(record.internshipOpportunity)
            : 0,
          benefitsAchieved: record.benefitsAchieved
            ? String(record.benefitsAchieved)
            : undefined,
          companyRelationship: record.companyRelationship
            ? (Number(record.companyRelationship) as 1 | 2 | 3 | 4 | 5)
            : 3,
        };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#d1d5db]">
          <h2 className="text-xl font-semibold text-[#1f2937]">
            Import eMoU Records from Excel
          </h2>
          <p className="text-sm text-[#6b7280] mt-1">
            Upload an Excel file (.xlsx) with eMoU records
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-[#1f2937] mb-2">
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
              <p className="text-xs text-[#6b7280] mt-2">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Required Fields Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#1f2937] mb-2">
              Required Excel Columns:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#4b5563]">
              {requiredFields.map((field) => (
                <div key={field}>• {field}</div>
              ))}
            </div>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-4">
              {/* Valid Records */}
              {validationResult.valid.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-2">
                    ✓ Valid Records: {validationResult.valid.length}
                  </h3>
                  <p className="text-xs text-green-700">
                    These records will be imported successfully.
                  </p>
                </div>
              )}

              {/* Invalid Records */}
              {validationResult.invalid.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-orange-800 mb-2">
                    ⚠ Invalid Records: {validationResult.invalid.length}
                  </h3>
                  <p className="text-xs text-orange-700 mb-3">
                    These records have missing required fields and will be
                    skipped:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {validationResult.invalid.map((item) => (
                      <div
                        key={item.row}
                        className="bg-white p-3 rounded border border-orange-200 text-xs"
                      >
                        <div className="font-semibold text-orange-900">
                          Row {item.row}:{" "}
                          {String(item.data.companyName || "Unnamed Company")}
                        </div>
                        <div className="text-orange-700 mt-1">
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

        {/* Actions */}
        <div className="p-6 border-t border-[#d1d5db] flex justify-between">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={importing}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {!validationResult && (
              <button
                onClick={parseExcelFile}
                className="btn btn-primary"
                disabled={!file}
              >
                Validate File
              </button>
            )}
            {validationResult && validationResult.valid.length > 0 && (
              <button
                onClick={handleImport}
                className="btn btn-primary"
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
