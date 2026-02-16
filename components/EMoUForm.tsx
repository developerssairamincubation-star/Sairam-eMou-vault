"use client";

import { useState, useEffect, useCallback } from "react";
import {
  EMoURecord,
  DepartmentCode,
  EMoUStatus,
  DocumentAvailability,
  ScopeType,
  MaintainedBy,
} from "@/types";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import ConfirmDialog from "@/components/ConfirmDialog";

const LOCALSTORAGE_KEY = "emou_form_draft";

interface EMoUFormProps {
  initialData?: EMoURecord;
  onSubmit: (data: Partial<EMoURecord>) => Promise<void>;
  onCancel: () => void;
}

const DEPARTMENTS: DepartmentCode[] = [
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
const STATUSES: EMoUStatus[] = [
  "Active",
  "Expired",
  "Renewal Pending",
  "Draft",
];

// Get short department code for ID preview (2 characters)
const getShortDeptCode = (department: DepartmentCode): string => {
  const deptCodeMap: Record<DepartmentCode, string> = {
    CSE: "CS",
    ECE: "EC",
    MECH: "ME",
    CIVIL: "CE",
    EEE: "EE",
    IT: "IT",
    AIDS: "AD",
    CSBS: "CB",
    "E&I": "EI",
    MECHATRONICS: "MZ",
    CCE: "CO",
    AIML: "AM",
    CYBERSECURITY: "SC",
    IOT: "CI",
    EICE: "IX",
    "CSE MTECH": "CJ",
    Institution: "IN",
    Incubation: "IB",
  };
  return deptCodeMap[department] || department.slice(0, 2);
};

// Convert DD.MM.YYYY to YYYY-MM-DD for HTML date input
const toInputDate = (ddmmyyyy: string): string => {
  if (!ddmmyyyy) return "";
  const parts = ddmmyyyy.split(".");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

// Convert YYYY-MM-DD from HTML date input to DD.MM.YYYY
const toDisplayDate = (yyyymmdd: string): string => {
  if (!yyyymmdd) return "";
  const parts = yyyymmdd.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
};

export default function EMoUForm({
  initialData,
  onSubmit,
  onCancel,
}: EMoUFormProps) {
  const { user, firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingHOD, setUploadingHOD] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [showAlert, setShowAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [formData, setFormData] = useState({
    department:
      initialData?.department || (user?.department as DepartmentCode) || "CSE",
    companyName: initialData?.companyName || "",
    fromDate: initialData?.fromDate || "",
    toDate: initialData?.toDate || "",
    status: initialData?.status || "Draft",
    scope: initialData?.scope || ("National" as ScopeType),
    maintainedBy: initialData?.maintainedBy || ("Departments" as MaintainedBy),
    approvalStatus: initialData?.approvalStatus || ("draft" as const),
    scannedCopy: initialData?.scannedCopy || "",
    documentAvailability: initialData?.documentAvailability || "Not Available",
    hodApprovalDoc: initialData?.hodApprovalDoc || "",
    signedAgreementDoc: initialData?.signedAgreementDoc || "",
    description: initialData?.description || "",
    companyWebsite: initialData?.companyWebsite || "",
    aboutCompany: initialData?.aboutCompany || "",
    companyAddress: initialData?.companyAddress || "",
    industryContactName: initialData?.industryContactName || "",
    industryContactMobile: initialData?.industryContactMobile || "",
    industryContactEmail: initialData?.industryContactEmail || "",
    institutionContactName: initialData?.institutionContactName || "",
    institutionContactMobile: initialData?.institutionContactMobile || "",
    institutionContactEmail: initialData?.institutionContactEmail || "",
    clubsAligned: initialData?.clubsAligned || "",
    sdgGoals: initialData?.sdgGoals || "",
    skillsTechnologies: initialData?.skillsTechnologies || "",
    perStudentCost: initialData?.perStudentCost || 0,
    placementOpportunity: initialData?.placementOpportunity || 0,
    internshipOpportunity: initialData?.internshipOpportunity || 0,
    goingForRenewal: initialData?.goingForRenewal || "No",
    benefitsAchieved: initialData?.benefitsAchieved || "",
    companyRelationship: initialData?.companyRelationship || 3,
  });

  // Perpetual/indefinite date state
  const [isPerpetual, setIsPerpetual] = useState(() => {
    // Check if toDate is perpetual (year >= 9000)
    if (initialData?.toDate) {
      const year = parseInt(initialData.toDate.split(".")[2] || "0");
      return year >= 9000;
    }
    return false;
  });

  // Default form data for reset
  const getDefaultFormData = useCallback(
    () => ({
      department: (user?.department as DepartmentCode) || "CSE",
      companyName: "",
      fromDate: "",
      toDate: "",
      status: "Draft" as const,
      scope: "National" as ScopeType,
      maintainedBy: "Departments" as MaintainedBy,
      approvalStatus: "draft" as const,
      scannedCopy: "",
      documentAvailability: "Not Available" as const,
      hodApprovalDoc: "",
      signedAgreementDoc: "",
      description: "",
      companyWebsite: "",
      aboutCompany: "",
      companyAddress: "",
      industryContactName: "",
      industryContactMobile: "",
      industryContactEmail: "",
      institutionContactName: "",
      institutionContactMobile: "",
      institutionContactEmail: "",
      clubsAligned: "",
      sdgGoals: "",
      skillsTechnologies: "",
      perStudentCost: 0,
      placementOpportunity: 0,
      internshipOpportunity: 0,
      goingForRenewal: "No" as const,
      benefitsAchieved: "",
      companyRelationship: 3 as const,
    }),
    [user?.department],
  );

  // Auto-load from localStorage on mount (only for new records)
  useEffect(() => {
    if (!initialData) {
      try {
        const saved = localStorage.getItem(LOCALSTORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate that parsed data has expected structure
          if (
            parsed &&
            typeof parsed === "object" &&
            parsed.companyName !== undefined
          ) {
            setFormData((prev) => ({ ...prev, ...parsed }));
            // Check if the saved toDate is perpetual
            if (parsed.toDate) {
              const year = parseInt(parsed.toDate.split(".")[2] || "0");
              setIsPerpetual(year >= 9000);
            }
          }
        }
      } catch (error) {
        // If localStorage is corrupted, just clear it
        console.error("Failed to load draft from localStorage:", error);
        localStorage.removeItem(LOCALSTORAGE_KEY);
      }
    }
    // Mark as loaded after first render
    setHasLoadedFromStorage(true);
  }, [initialData]);

  // Auto-save to localStorage on formData change (only for new records)
  useEffect(() => {
    // Only start auto-saving after initial load is complete
    if (!initialData && hasLoadedFromStorage) {
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error("Failed to save draft to localStorage:", error);
      }
    }
  }, [formData, initialData, hasLoadedFromStorage]);

  // Clear all form data and localStorage
  const handleClearAll = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const confirmClearAll = useCallback(() => {
    setFormData(getDefaultFormData());
    setIsPerpetual(false);
    localStorage.removeItem(LOCALSTORAGE_KEY);
    setShowClearConfirm(false);
    setShowAlert({
      message: "Form cleared successfully!",
      type: "success",
    });
    // Keep hasLoadedFromStorage true so auto-save continues working
  }, [getDefaultFormData]);

  const doCloudinaryUpload = async (file: File): Promise<string> => {
    const result = await uploadToCloudinary(file);

    if (!result.success || !result.url) {
      throw new Error(result.error || "Upload failed");
    }

    return result.url;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "hodApprovalDoc" | "signedAgreementDoc",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload only PDF or image files");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should not exceed 10MB");
      return;
    }

    if (fieldName === "hodApprovalDoc") setUploadingHOD(true);
    if (fieldName === "signedAgreementDoc") setUploadingAgreement(true);

    try {
      // Delete old file from Cloudinary if replacing
      const oldUrl = formData[fieldName];
      if (oldUrl && firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        await deleteFromCloudinary(oldUrl, idToken);
      }

      const url = await doCloudinaryUpload(file);
      setFormData({ ...formData, [fieldName]: url });
      setShowAlert({ message: "File uploaded successfully!", type: "success" });

      // Check if both documents are now uploaded, move to pending
      const updatedFormData = { ...formData, [fieldName]: url };
      if (
        updatedFormData.hodApprovalDoc &&
        updatedFormData.signedAgreementDoc
      ) {
        setFormData({ ...updatedFormData, approvalStatus: "pending" });
        setShowAlert({
          message:
            "Both documents uploaded! Your eMoU will be submitted for admin approval.",
          type: "info",
        });
      } else {
        setFormData(updatedFormData);
      }
    } catch {
      setShowAlert({
        message: "Failed to upload file. Please try again.",
        type: "error",
      });
    } finally {
      if (fieldName === "hodApprovalDoc") setUploadingHOD(false);
      if (fieldName === "signedAgreementDoc") setUploadingAgreement(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Determine approval status based on documents
      let approvalStatus: "draft" | "pending" | "approved" | "rejected" =
        "draft";

      if (formData.hodApprovalDoc && formData.signedAgreementDoc) {
        approvalStatus = "pending";
        setShowAlert({
          message:
            "Record submitted for admin approval. You will be notified once approved.",
          type: "info",
        });
      } else {
        setShowAlert({
          message:
            "Record saved as draft. Upload both documents to submit for approval.",
          type: "warning",
        });
      }

      await onSubmit({ ...formData, approvalStatus } as Partial<EMoURecord>);
    } catch {
      setShowAlert({ message: "Failed to save record", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear All Data"
          message="Are you sure you want to clear all form data? This action cannot be undone."
          confirmText="Clear All"
          cancelText="Cancel"
          type="danger"
          onConfirm={confirmClearAll}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`${
              showAlert.type === "success"
                ? "bg-green-50 border-green-500 text-green-800"
                : showAlert.type === "error"
                  ? "bg-red-50 border-red-500 text-red-800"
                  : showAlert.type === "warning"
                    ? "bg-orange-50 border-orange-500 text-orange-800"
                    : "bg-blue-50 border-blue-500 text-blue-800"
            } border-l-4 p-4 rounded shadow-lg max-w-md`}
          >
            <div className="flex items-start">
              <p className="text-sm">{showAlert.message}</p>
              <button
                onClick={() => setShowAlert(null)}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {initialData && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  eMoU ID
                </label>
                <input
                  type="text"
                  value={initialData.id}
                  readOnly
                  disabled
                  className="w-full bg-gray-50 font-mono font-semibold text-blue-600"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Maintained By <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.maintainedBy}
                onChange={(e) => {
                  const maintainedBy = e.target.value as MaintainedBy;
                  let updatedDepartment = formData.department;

                  // Auto-set department based on maintainedBy
                  if (maintainedBy === "Institution") {
                    updatedDepartment = "Institution";
                  } else if (maintainedBy === "Incubation") {
                    updatedDepartment = "Incubation";
                  } else if (
                    formData.department === "Institution" ||
                    formData.department === "Incubation"
                  ) {
                    // Reset to user's department if switching from Institution/Incubation to Departments
                    updatedDepartment =
                      (user?.department as DepartmentCode) || "CSE";
                  }

                  setFormData({
                    ...formData,
                    maintainedBy,
                    department: updatedDepartment,
                  });
                }}
                required
                className="w-full"
              >
                <option value="Institution">Institution</option>
                <option value="Incubation">Incubation</option>
                <option value="Departments">Departments</option>
              </select>
              {!initialData &&
                (formData.maintainedBy === "Institution" ||
                  formData.maintainedBy === "Incubation") && (
                  <p className="text-xs text-blue-600 mt-1">
                    Department will be auto-set to {formData.maintainedBy}
                  </p>
                )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    department: e.target.value as DepartmentCode,
                  })
                }
                required
                disabled={
                  user?.role === "hod" ||
                  !!initialData ||
                  formData.maintainedBy === "Institution" ||
                  formData.maintainedBy === "Incubation"
                }
                className="w-full"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {!initialData && (
                <p className="text-xs text-[#6b7280] mt-1">
                  ID will be auto-generated as:{" "}
                  {new Date().getFullYear().toString().slice(-2)}SEC
                  {getShortDeptCode(formData.department)}001
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as EMoUStatus,
                  })
                }
                required
                className="w-full"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Scope <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.scope}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scope: e.target.value as ScopeType,
                  })
                }
                required
                className="w-full"
              >
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            Company Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Name of the Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                required
                className="w-full"
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Company Website
              </label>
              <input
                type="url"
                value={formData.companyWebsite}
                onChange={(e) =>
                  setFormData({ ...formData, companyWebsite: e.target.value })
                }
                className="w-full"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Company Relationship
              </label>
              <div className="flex items-center gap-1 mt-1">
                {([1, 2, 3, 4, 5] as const).map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, companyRelationship: star })
                    }
                    className="p-0.5 focus:outline-none transition-colors"
                    title={
                      ["Poor", "Fair", "Good", "Very Good", "Excellent"][
                        star - 1
                      ]
                    }
                  >
                    <svg
                      className={`w-6 h-6 ${
                        star <= formData.companyRelationship
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 fill-gray-300"
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-xs text-[#6b7280]">
                  {
                    ["Poor", "Fair", "Good", "Very Good", "Excellent"][
                      formData.companyRelationship - 1
                    ]
                  }
                </span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                About Company
              </label>
              <textarea
                value={formData.aboutCompany}
                onChange={(e) =>
                  setFormData({ ...formData, aboutCompany: e.target.value })
                }
                rows={3}
                className="w-full"
                placeholder="Brief description of the company"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Company Address
              </label>
              <textarea
                value={formData.companyAddress}
                onChange={(e) =>
                  setFormData({ ...formData, companyAddress: e.target.value })
                }
                rows={2}
                className="w-full"
                placeholder="Full address"
              />
            </div>
          </div>
        </div>

        {/* eMoU Period */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            eMoU Period
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={toInputDate(formData.fromDate)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fromDate: toDisplayDate(e.target.value),
                  })
                }
                required
                className="w-full"
              />
              {formData.fromDate && (
                <p className="text-xs text-[#6b7280] mt-1">
                  {formData.fromDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                To Date <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="perpetual"
                  checked={isPerpetual}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsPerpetual(checked);
                    if (checked) {
                      setFormData({
                        ...formData,
                        toDate: "31.12.9999",
                      });
                    } else {
                      setFormData({
                        ...formData,
                        toDate: "",
                      });
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="perpetual"
                  className="text-xs text-[#4b5563] cursor-pointer"
                >
                  Perpetual / Indefinite
                </label>
              </div>
              <input
                type="date"
                value={isPerpetual ? "" : toInputDate(formData.toDate)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    toDate: toDisplayDate(e.target.value),
                  })
                }
                required={!isPerpetual}
                disabled={isPerpetual}
                min={toInputDate(formData.fromDate) || undefined}
                className={`w-full ${isPerpetual ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
              />
              {formData.toDate && (
                <p className="text-xs text-[#6b7280] mt-1">
                  {isPerpetual ? "Perpetual / Indefinite" : formData.toDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Going for Renewal <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.goingForRenewal}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goingForRenewal: e.target.value as "Yes" | "No",
                  })
                }
                required
                className="w-full"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            Contact Details
          </h3>

          {/* Industry Contact */}
          <div className="mb-4">
            <p className="text-xs font-medium text-[#9ca3af] mb-2 uppercase tracking-wider">
              Industry Contact
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={formData.industryContactName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      industryContactName: e.target.value,
                    })
                  }
                  className="w-full"
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.industryContactMobile}
                  onChange={(e) => {
                    // Allow only digits, +, spaces, and hyphens
                    const value = e.target.value.replace(/[^\d+\s-]/g, "");
                    setFormData({
                      ...formData,
                      industryContactMobile: value,
                    });
                  }}
                  className="w-full"
                  placeholder="+91 98765 43210"
                  pattern="[+]?[0-9\s-]{10,15}"
                  title="Enter a valid phone number (10-15 digits)"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.industryContactEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      industryContactEmail: e.target.value,
                    })
                  }
                  className="w-full"
                  placeholder="contact@company.com"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          {/* Institution Contact */}
          <div>
            <p className="text-xs font-medium text-[#9ca3af] mb-2 uppercase tracking-wider">
              Institution Contact
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={formData.institutionContactName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      institutionContactName: e.target.value,
                    })
                  }
                  className="w-full"
                  placeholder="Full name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.institutionContactMobile}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d+\s-]/g, "");
                    setFormData({
                      ...formData,
                      institutionContactMobile: value,
                    });
                  }}
                  className="w-full"
                  placeholder="+91 98765 43210"
                  pattern="[+]?[0-9\s-]{10,15}"
                  title="Enter a valid phone number (10-15 digits)"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4b5563] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.institutionContactEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      institutionContactEmail: e.target.value,
                    })
                  }
                  className="w-full"
                  placeholder="faculty@sairam.edu.in"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Academic Details */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            Academic & Program Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Description / Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={3}
                className="w-full"
                placeholder="Purpose and objectives of this eMoU"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Skills / Technologies Student or Faculty Will Learn
              </label>
              <textarea
                value={formData.skillsTechnologies}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    skillsTechnologies: e.target.value,
                  })
                }
                rows={2}
                className="w-full"
                placeholder="List of skills and technologies"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Clubs Aligned
              </label>
              <input
                type="text"
                value={formData.clubsAligned}
                onChange={(e) =>
                  setFormData({ ...formData, clubsAligned: e.target.value })
                }
                className="w-full"
                placeholder="Coding Club, AI Club, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Aligned to Sairam SDG Goals
              </label>
              <input
                type="text"
                value={formData.sdgGoals}
                onChange={(e) =>
                  setFormData({ ...formData, sdgGoals: e.target.value })
                }
                className="w-full"
                placeholder="SDG 4, SDG 8, etc."
              />
            </div>
          </div>
        </div>

        {/* Opportunities & Benefits */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            Opportunities & Benefits
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Placement Opportunities
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.placementOpportunity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      placementOpportunity: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="1"
                  className="w-full"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af] pointer-events-none">
                  students
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Internship Opportunities
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.internshipOpportunity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internshipOpportunity: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="1"
                  className="w-full"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af] pointer-events-none">
                  students
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Per Student Registration Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280] pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  value={formData.perStudentCost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      perStudentCost: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="100"
                  className="w-full pl-7"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Benefits Achieved So Far
              </label>
              <textarea
                value={formData.benefitsAchieved}
                onChange={(e) =>
                  setFormData({ ...formData, benefitsAchieved: e.target.value })
                }
                rows={3}
                className="w-full"
                placeholder="Describe the benefits and outcomes achieved"
              />
            </div>
          </div>
        </div>

        {/* Document Link */}
        <div className="bg-white p-6 rounded-lg border border-[#d1d5db]">
          <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
            Document Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Document Availability <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.documentAvailability}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    documentAvailability: e.target
                      .value as DocumentAvailability,
                  })
                }
                required
                className="w-full"
              >
                <option value="Available">Available</option>
                <option value="Not Available">Not Available</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                HO Approval Document
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, "hodApprovalDoc")}
                  disabled={uploadingHOD}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingHOD && (
                  <p className="text-xs text-blue-600">Uploading...</p>
                )}
                {formData.hodApprovalDoc && (
                  <div className="flex items-center gap-2">
                    <a
                      href={formData.hodApprovalDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Uploaded Document
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (formData.hodApprovalDoc && firebaseUser) {
                          const idToken = await firebaseUser.getIdToken();
                          await deleteFromCloudinary(
                            formData.hodApprovalDoc,
                            idToken,
                          );
                        }
                        setFormData({ ...formData, hodApprovalDoc: "" });
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Signed Agreement Document
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, "signedAgreementDoc")}
                  disabled={uploadingAgreement}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingAgreement && (
                  <p className="text-xs text-blue-600">Uploading...</p>
                )}
                {formData.signedAgreementDoc && (
                  <div className="flex items-center gap-2">
                    <a
                      href={formData.signedAgreementDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Uploaded Document
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (formData.signedAgreementDoc && firebaseUser) {
                          const idToken = await firebaseUser.getIdToken();
                          await deleteFromCloudinary(
                            formData.signedAgreementDoc,
                            idToken,
                          );
                        }
                        setFormData({ ...formData, signedAgreementDoc: "" });
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#d1d5db]">
          {!initialData && (
            <button
              type="button"
              onClick={handleClearAll}
              className="btn btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={loading}
            >
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? "Saving..."
              : initialData
                ? "Update Record"
                : "Create Record"}
          </button>
        </div>
      </form>
    </>
  );
}
