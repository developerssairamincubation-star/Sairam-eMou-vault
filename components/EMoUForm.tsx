"use client";

import { useState } from "react";
import {
  EMoURecord,
  DepartmentCode,
  EMoUStatus,
  DocumentAvailability,
  ScopeType,
  MaintainedBy,
} from "@/types";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";

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
  };
  return deptCodeMap[department] || department.slice(0, 2);
};

export default function EMoUForm({
  initialData,
  onSubmit,
  onCancel,
}: EMoUFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingHOD, setUploadingHOD] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [showAlert, setShowAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
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
    } catch (error) {
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
                disabled={user?.role === "hod" || !!initialData}
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
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Maintained By <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.maintainedBy}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maintainedBy: e.target.value as MaintainedBy,
                  })
                }
                required
                className="w-full"
              >
                <option value="Institution">Institution</option>
                <option value="Incubation">Incubation</option>
                <option value="Departments">Departments</option>
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
                Company Relationship (1-5)
              </label>
              <select
                value={formData.companyRelationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    companyRelationship: parseInt(e.target.value) as
                      | 1
                      | 2
                      | 3
                      | 4
                      | 5,
                  })
                }
                className="w-full"
              >
                <option value={1}>1 - Poor</option>
                <option value={2}>2 - Fair</option>
                <option value={3}>3 - Good</option>
                <option value={4}>4 - Very Good</option>
                <option value={5}>5 - Excellent</option>
              </select>
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
                From Date (DD.MM.YYYY) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fromDate}
                onChange={(e) =>
                  setFormData({ ...formData, fromDate: e.target.value })
                }
                required
                placeholder="01.01.2024"
                pattern="\d{2}\.\d{2}\.\d{4}"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                To Date (DD.MM.YYYY) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.toDate}
                onChange={(e) =>
                  setFormData({ ...formData, toDate: e.target.value })
                }
                required
                placeholder="31.12.2024"
                pattern="\d{2}\.\d{2}\.\d{4}"
                className="w-full"
              />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Name of Industry Contact Person
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
                placeholder="Full name of industry representative"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Industry Contact Mobile
              </label>
              <input
                type="tel"
                value={formData.industryContactMobile}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    industryContactMobile: e.target.value,
                  })
                }
                className="w-full"
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Industry Contact Email
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
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Name of Institution Contact Person
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
                placeholder="Full name of faculty/staff representative"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Institution Contact Mobile
              </label>
              <input
                type="tel"
                value={formData.institutionContactMobile}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    institutionContactMobile: e.target.value,
                  })
                }
                className="w-full"
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Institution Contact Email
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
              />
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
                Placement Opportunity (Numbers)
              </label>
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
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Internship Opportunity (Numbers)
              </label>
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
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4b5563] mb-1">
                Per Student Registration Cost (₹)
              </label>
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
                className="w-full"
              />
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
                      onClick={() =>
                        setFormData({ ...formData, hodApprovalDoc: "" })
                      }
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
                      onClick={() =>
                        setFormData({ ...formData, signedAgreementDoc: "" })
                      }
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
