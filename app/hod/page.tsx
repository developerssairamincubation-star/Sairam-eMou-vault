"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import DocumentViewer from "@/components/DocumentViewer";
import {
  CellDropdown,
  SearchableCellDropdown,
  MultiSelectCellDropdown,
} from "@/components/CustomDropdown";
import {
  EMoURecord,
  IEEE_SOCIETIES,
  IEEE_COMMUNITIES,
  CLUB_OPTIONS,
  EMOU_OUTCOME_OPTIONS,
  DOMAIN_OPTIONS,
  SDG_GOALS,
} from "@/types";
import { getEMoUs, updateEMoU } from "@/lib/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useRouter } from "next/navigation";
import { FiCalendar, FiChevronDown, FiUpload } from "react-icons/fi";
import { MdArrowBack } from "react-icons/md";
import { TabContentSkeleton } from "@/components/SkeletonLoading";

/**
 * Helper function to get sticky column positioning styles based on tab context
 * @param columnName - Name of the column to position
 * @param isDraftTab - Whether in draft tab (with upload buttons) or other tabs (view-only)
 * @param isHeader - Whether styling for header cell
 */
function getStickyPosition(
  columnName:
    | "actions"
    | "signedAgreement"
    | "hodApproval"
    | "docAvailability"
    | "createdBy"
    | "approvalStatus",
  isDraftTab: boolean = false,
  isHeader: boolean = false,
) {
  const getStickyRight = (
    position: "approval" | "signed" | "ho" | "doc" | "created" | "actions",
  ) => {
    if (isDraftTab) {
      // Draft tab: Created By, HO Approval Doc (160px), Signed Agreement (160px), Approval Status (200px)
      return {
        approval: 0, // Approval Status - rightmost (200px wide)
        signed: 70, // Signed Agreement (160px with Upload/Replace buttons)
        ho: 230, // HO Approval Doc (160px with Upload/Replace buttons)
        doc: 0, // Not used in draft tab
        created: 390, // Created By (180px wide)
        actions: 0, // Actions (if needed)
      }[position];
    } else {
      // Other tabs (pending/approved/rejected): Created By, Doc Availability (150px), HO Approval (250px), Signed Agreement (300px), Approval Status (200px)
      return {
        approval: 0, // Approval Status - rightmost (200px wide)
        signed: 94, // Signed Agreement (300px view-only)
        ho: 196, // HO Approval (250px view-only)
        doc: 266, // Doc Availability (150px)
        created: 350, // Created By (180px wide)
        actions: 0, // Actions (if needed)
      }[position];
    }
  };

  const positionMap = {
    approvalStatus: "approval" as const,
    signedAgreement: "signed" as const,
    hodApproval: "ho" as const,
    docAvailability: "doc" as const,
    createdBy: "created" as const,
    actions: "actions" as const,
  };

  const position = getStickyRight(positionMap[columnName]);

  return {
    position: "sticky" as const,
    right: position,
    zIndex: isHeader ? 12 : 2,
    background: "#fff",
    ...(columnName === "approvalStatus" &&
      isHeader && {
        boxShadow: "-2px 0 5px rgba(0, 0, 0, 0.1)",
      }),
  };
}

function HODPage() {
  const { user, loading: authLoading, canEdit } = useAuth();
  const router = useRouter();
  const [draftRecords, setDraftRecords] = useState<EMoURecord[]>([]);
  const [pendingRecords, setPendingRecords] = useState<EMoURecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<EMoURecord[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<EMoURecord[]>([]);
  const [activeTab, setActiveTab] = useState<
    "drafts" | "pending" | "approved" | "rejected"
  >("drafts");
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<{
    recordId: string;
    field: "hodApprovalDoc" | "signedAgreementDoc";
  } | null>(null);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<EMoURecord>>({});
  const [editingCell, setEditingCell] = useState<{
    recordId: string;
    field: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  const departments = [
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
    "Incubation",
    "Institution",
  ];

  useEffect(() => {
    // Wait for auth to load before checking permissions
    if (authLoading) return;

    if (user?.role !== "hod") {
      router.push("/");
    } else {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const allRecords = await getEMoUs();
      // Filter records by HOD's department
      const myRecords = allRecords.filter(
        (r) => r.department === user?.department,
      );

      setDraftRecords(myRecords.filter((r) => r.approvalStatus === "draft"));
      setPendingRecords(
        myRecords.filter((r) => r.approvalStatus === "pending"),
      );
      setApprovedRecords(
        myRecords.filter((r) => r.approvalStatus === "approved"),
      );
      setRejectedRecords(
        myRecords.filter((r) => r.approvalStatus === "rejected"),
      );
    } catch (error) {
      console.error("Failed to load records:", error);
      setAlert({ message: "Failed to load records", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    recordId: string,
    field: "hodApprovalDoc" | "signedAgreementDoc",
    file: File,
  ) => {
    if (!user) return;

    setUploadingDoc({ recordId, field });

    try {
      const result = await uploadToCloudinary(file);

      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed");
      }

      // Get the current record
      const currentRecord = draftRecords.find((r) => r.id === recordId);
      if (!currentRecord) return;

      // Update the record with the new document URL
      const updatedData: Partial<EMoURecord> = {
        [field]: result.url,
        updatedAt: new Date(),
        updatedBy: user.uid,
        updatedByName: user.displayName,
      };

      // Check if both documents are now uploaded
      const bothDocsUploaded =
        field === "hodApprovalDoc"
          ? result.url && currentRecord.signedAgreementDoc
          : currentRecord.hodApprovalDoc && result.url;

      if (bothDocsUploaded) {
        updatedData.approvalStatus = "pending";
      }

      await updateEMoU(recordId, updatedData);

      if (bothDocsUploaded) {
        setAlert({
          message:
            "Both documents uploaded! Record submitted for admin approval.",
          type: "success",
        });
      } else {
        setAlert({
          message: "Document uploaded successfully!",
          type: "success",
        });
      }

      await loadRecords();
    } catch (error) {
      console.error("Failed to upload document:", error);
      setAlert({
        message: "Failed to upload document",
        type: "error",
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Expired":
        return "bg-red-100 text-red-800";
      case "Expiring":
        return "bg-orange-100 text-orange-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isPerpetualDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split(".");
    if (parts.length === 3) {
      const year = parseInt(parts[2]);
      return year > 3000;
    }
    return false;
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr || dateStr === "file chosen") return "";
    if (
      dateStr.toLowerCase().includes("perpetual") ||
      dateStr.toLowerCase().includes("indefinite") ||
      isPerpetualDate(dateStr)
    ) {
      return "Perpetual";
    }
    return dateStr;
  };

  const getDisplayStatus = (record: EMoURecord): string => {
    const toDate = record.toDate;
    const hasDates = toDate && toDate.trim() !== "";

    // If status is Draft and no dates, show Draft
    if (record.status === "Draft" && !hasDates) return "Draft";

    if (
      toDate &&
      (toDate.toLowerCase().includes("perpetual") ||
        toDate.toLowerCase().includes("indefinite") ||
        isPerpetualDate(toDate))
    ) {
      return "Active";
    }

    // For approved records with stale Draft status but valid dates, compute from dates
    if (
      record.status === "Draft" &&
      hasDates &&
      record.approvalStatus === "approved"
    ) {
      try {
        const [day, month, year] = toDate.split(".").map(Number);
        const expiryDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        if (expiryDate < today) return "Expired";
        if (expiryDate <= twoMonthsFromNow) return "Expiring";
        return "Active";
      } catch {
        return "Draft";
      }
    }

    if (record.status !== "Active") return record.status;

    if (!toDate) {
      return record.status;
    }

    try {
      const [day, month, year] = toDate.split(".").map(Number);
      const expiryDate = new Date(year, month - 1, day);
      const today = new Date();
      const twoMonthsFromNow = new Date();
      twoMonthsFromNow.setMonth(today.getMonth() + 2);

      if (expiryDate < today) {
        return "Expired";
      } else if (expiryDate <= twoMonthsFromNow) {
        return "Expiring";
      } else {
        return "Active";
      }
    } catch {
      return record.status;
    }
  };

  const handleCellClick = (record: EMoURecord, field: keyof EMoURecord) => {
    if (
      canEdit(record.createdBy, record.department) &&
      field !== "id" &&
      field !== "createdBy" &&
      field !== "createdByName" &&
      field !== "createdAt"
    ) {
      setEditingCell({ recordId: record.id, field });
      setInlineEditData(record);
    }
  };

  const handleInlineFieldChange = (
    field: keyof EMoURecord,
    value: string | number,
  ) => {
    setInlineEditData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "maintainedBy") {
        const maintainedValue = value as string;
        if (maintainedValue === "Institution") {
          updated.department = "Institution";
        } else if (maintainedValue === "Incubation") {
          updated.department = "Incubation";
        }
      }

      if (field === "fromDate" || field === "toDate") {
        const fromDate =
          field === "fromDate"
            ? (value as string)
            : (updated.fromDate as string);
        const toDate =
          field === "toDate" ? (value as string) : (updated.toDate as string);

        if (
          fromDate &&
          toDate &&
          fromDate !== "file chosen" &&
          toDate !== "file chosen"
        ) {
          try {
            const [fDay, fMonth, fYear] = fromDate.split(".").map(Number);
            const [tDay, tMonth, tYear] = toDate.split(".").map(Number);
            const from = new Date(fYear, fMonth - 1, fDay);
            const to = new Date(tYear, tMonth - 1, tDay);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (to < today) {
              updated.status = "Expired";
            } else if (from <= today && to >= today) {
              updated.status = "Active";
            }
          } catch {
            // Ignore date parsing errors
          }
        }
      }

      return updated;
    });
  };

  const saveInlineEdit = async () => {
    if (!editingCell || !user) return;

    try {
      const record = [
        ...draftRecords,
        ...pendingRecords,
        ...approvedRecords,
        ...rejectedRecords,
      ].find((r) => r.id === editingCell.recordId);
      if (!record) return;

      // Ensure number fields are stored as numbers, not strings
      const numberFields = [
        "placementOpportunity",
        "internshipOpportunity",
        "perStudentCost",
        "eventsOrganised",
      ];
      const field = editingCell.field as keyof EMoURecord;
      let fieldValue = inlineEditData[field];
      if (numberFields.includes(field) && typeof fieldValue === "string") {
        fieldValue = parseInt(fieldValue, 10) || 0;
      }

      const updateData: Partial<EMoURecord> = {
        [editingCell.field]: fieldValue,
        updatedAt: new Date(),
        updatedBy: user.uid,
        updatedByName: user.displayName,
      };

      if (editingCell.field === "maintainedBy") {
        const maintainedValue = inlineEditData.maintainedBy;
        if (maintainedValue === "Institution") {
          updateData.department = "Institution";
        } else if (maintainedValue === "Incubation") {
          updateData.department = "Incubation";
        }
      }

      if (editingCell.field === "fromDate" || editingCell.field === "toDate") {
        if (inlineEditData.status) {
          updateData.status = inlineEditData.status;
        }
      }

      // Optimistic local state update FIRST for smooth UI
      const updateRecordInList = (records: EMoURecord[]) =>
        records.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updateData } : r,
        );
      setDraftRecords(updateRecordInList);
      setPendingRecords(updateRecordInList);
      setApprovedRecords(updateRecordInList);
      setRejectedRecords(updateRecordInList);

      setEditingCell(null);
      setInlineEditData({});

      await updateEMoU(editingCell.recordId, updateData);
    } catch (error) {
      console.error("Failed to update:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
  };

  const saveFieldDirectly = async (
    field: keyof EMoURecord,
    value: string | number,
  ) => {
    if (!editingCell || !user) return;

    // Ensure number fields are stored as numbers, not strings
    const numberFields = [
      "placementOpportunity",
      "internshipOpportunity",
      "perStudentCost",
      "eventsOrganised",
    ];
    const coercedValue = numberFields.includes(field)
      ? typeof value === "string"
        ? parseInt(value, 10) || 0
        : value
      : value;

    try {
      const record = [
        ...draftRecords,
        ...pendingRecords,
        ...approvedRecords,
        ...rejectedRecords,
      ].find((r) => r.id === editingCell.recordId);
      if (!record) return;

      const updateData: Partial<EMoURecord> = {
        [field]: coercedValue,
        updatedAt: new Date(),
        updatedBy: user.uid,
        updatedByName: user.displayName,
      };

      if (field === "maintainedBy") {
        if (value === "Institution") {
          updateData.department = "Institution";
        } else if (value === "Incubation") {
          updateData.department = "Incubation";
        }
      }

      // Optimistic local state update FIRST for smooth UI
      const updateRecordInList = (records: EMoURecord[]) =>
        records.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updateData } : r,
        );
      setDraftRecords(updateRecordInList);
      setPendingRecords(updateRecordInList);
      setApprovedRecords(updateRecordInList);
      setRejectedRecords(updateRecordInList);

      setEditingCell(null);
      setInlineEditData({});

      await updateEMoU(editingCell.recordId, updateData);
    } catch (error) {
      console.error("Failed to update:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setInlineEditData({});
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't start dragging if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    const container = e.currentTarget;
    setScrollStart({ left: container.scrollLeft, top: container.scrollTop });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const container = e.currentTarget;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    container.scrollLeft = scrollStart.left - dx;
    container.scrollTop = scrollStart.top - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const renderRecordsTable = (
    records: EMoURecord[],
    showDocumentUpload: boolean = false,
  ) => {
    if (records.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          No records in this category
        </div>
      );
    }

    return (
      <div
        className="flex-1 overflow-auto"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <style jsx global>{`
          .sheet-table {
            min-width: 4000px;
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
          }
          .sheet-table th,
          .sheet-table td {
            padding: 4px 8px;
            font-size: 11px;
            border-bottom: 1px solid #e5e7eb;
          }
          .sheet-table th {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            color: #4b5563;
            background: #f9fafb;
          }
          .sheet-table td {
            max-width: 300px;
            overflow-x: auto;
            white-space: nowrap;
          }
          .sheet-table td::-webkit-scrollbar {
            height: 3px;
          }
          .sheet-table td::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 2px;
          }
          .sheet-table tbody tr {
            height: 34px;
          }
          .sheet-table tbody tr:hover {
            background-color: #f9fafb;
          }
        `}</style>
        <table className="sheet-table">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              <th style={{ width: "60px" }}>S.No</th>
              <th style={{ width: "100px" }}>ID</th>
              <th style={{ minWidth: "200px" }}>Company Name</th>
              <th style={{ width: "100px" }}>Department</th>
              <th style={{ width: "120px" }}>Scope</th>
              <th style={{ width: "140px" }}>Maintained By</th>
              <th style={{ width: "100px" }}>From Date</th>
              <th style={{ width: "100px" }}>To Date</th>
              <th style={{ width: "110px" }}>Status</th>
              <th style={{ minWidth: "250px" }}>Description</th>
              <th style={{ minWidth: "200px" }}>About Company</th>
              <th style={{ minWidth: "200px" }}>Company Address</th>
              <th style={{ width: "180px" }}>Company Website</th>
              <th style={{ width: "90px" }}>Relationship</th>
              <th style={{ width: "100px" }}>Events Organised</th>
              <th style={{ width: "150px" }}>Industry Contact</th>
              <th style={{ width: "120px" }}>Industry Mobile</th>
              <th style={{ width: "180px" }}>Industry Email</th>
              <th style={{ width: "150px" }}>Institution Contact</th>
              <th style={{ width: "120px" }}>Institution Mobile</th>
              <th style={{ width: "180px" }}>Institution Email</th>
              <th style={{ width: "150px" }}>Clubs Aligned</th>
              <th style={{ width: "150px" }}>SDG Goals</th>
              <th style={{ minWidth: "200px" }}>Skills/Technologies</th>
              <th style={{ width: "90px" }}>Per Student Cost</th>
              <th style={{ width: "90px" }}>Placement</th>
              <th style={{ width: "90px" }}>Internship</th>
              <th style={{ width: "80px" }}>Renewal</th>
              <th style={{ minWidth: "200px" }}>Benefits Achieved</th>
              <th style={{ minWidth: "200px" }}>IEEE Society</th>
              <th style={{ minWidth: "200px" }}>IEEE Community</th>
              <th style={{ minWidth: "220px" }}>EMoU Outcome</th>
              <th style={{ minWidth: "220px" }}>Domain</th>
              <th
                style={{
                  width: "180px",
                  ...getStickyPosition("createdBy", showDocumentUpload, true),
                  boxShadow: showDocumentUpload
                    ? "-2px 0 4px rgba(0,0,0,0.08)"
                    : "none",
                }}
              >
                Created By
              </th>
              {showDocumentUpload && (
                <>
                  <th
                    style={{
                      minWidth: "160px",
                      ...getStickyPosition(
                        "hodApproval",
                        showDocumentUpload,
                        true,
                      ),
                    }}
                  >
                    HO Approval Doc
                  </th>
                  <th
                    style={{
                      minWidth: "160px",
                      ...getStickyPosition(
                        "signedAgreement",
                        showDocumentUpload,
                        true,
                      ),
                      boxShadow: "-2px 0 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    Signed Agreement
                  </th>
                </>
              )}
              {!showDocumentUpload && (
                <>
                  <th
                    style={{
                      width: "150px",
                      ...getStickyPosition(
                        "docAvailability",
                        showDocumentUpload,
                        true,
                      ),
                    }}
                  >
                    Doc Availability
                  </th>
                  <th
                    style={{
                      width: "250px",
                      ...getStickyPosition(
                        "hodApproval",
                        showDocumentUpload,
                        true,
                      ),
                    }}
                  >
                    HO Approval
                  </th>
                  <th
                    style={{
                      width: "300px",
                      ...getStickyPosition(
                        "signedAgreement",
                        showDocumentUpload,
                        true,
                      ),
                      boxShadow: "-2px 0 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    Signed Agreement
                  </th>
                </>
              )}
              <th
                style={{
                  width: "200px",
                  ...getStickyPosition(
                    "approvalStatus",
                    showDocumentUpload,
                    true,
                  ),
                }}
              >
                Approval Status
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const isEditable = canEdit(record.createdBy, record.department);

              const getFieldTypeIcon = (field: keyof EMoURecord) => {
                const dateFields = ["fromDate", "toDate"];
                const selectFields = [
                  "scope",
                  "maintainedBy",
                  "department",
                  "goingForRenewal",
                  "documentAvailability",
                ];
                const numberFields = [
                  "placementOpportunity",
                  "internshipOpportunity",
                  "perStudentCost",
                  "eventsOrganised",
                ];
                const largeTextFields = [
                  "description",
                  "aboutCompany",
                  "companyAddress",
                  "benefitsAchieved",
                  "skillsTechnologies",
                  "companyWebsite",
                  "industryContactEmail",
                  "institutionContactEmail",
                ];

                if (largeTextFields.includes(field as string)) {
                  return null;
                } else if (dateFields.includes(field as string)) {
                  return (
                    <FiCalendar
                      className="inline-block ml-1 text-blue-500"
                      size={12}
                    />
                  );
                } else if (selectFields.includes(field as string)) {
                  return (
                    <FiChevronDown
                      className="inline-block ml-1 text-blue-600"
                      size={14}
                    />
                  );
                } else if (numberFields.includes(field as string)) {
                  return null;
                } else {
                  return null;
                }
              };

              const renderEditableCell = (
                field: keyof EMoURecord,
                content: React.ReactNode,
                className: string = "text-xs",
                truncateLength?: number,
              ) => {
                const isEditing =
                  editingCell?.recordId === record.id &&
                  editingCell?.field === field;
                const cellStyle = isEditing
                  ? {
                      border: "3px solid #000000",
                      outline: "none",
                      padding: "4px",
                      backgroundColor: "#f5f5f5",
                    }
                  : {};

                let displayContent = content;
                if (
                  truncateLength &&
                  typeof content === "string" &&
                  content.length > truncateLength
                ) {
                  displayContent = content.substring(0, truncateLength) + "...";
                }

                if (displayContent === "file chosen") {
                  displayContent = "";
                }

                return (
                  <td
                    className={`${className} ${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onClick={() => isEditable && handleCellClick(record, field)}
                    onBlur={(e) => {
                      if (isEditing) {
                        const rawValue = e.currentTarget.textContent || "";
                        const numberFields = [
                          "placementOpportunity",
                          "internshipOpportunity",
                          "perStudentCost",
                          "eventsOrganised",
                        ];
                        const finalValue = numberFields.includes(field)
                          ? parseInt(rawValue, 10) || 0
                          : rawValue;
                        saveFieldDirectly(field, finalValue);
                      }
                    }}
                    style={cellStyle}
                    title={
                      truncateLength && typeof content === "string"
                        ? content
                        : isEditable && !isEditing
                          ? "Click to edit"
                          : ""
                    }
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span>{displayContent}</span>
                      {!isEditing && getFieldTypeIcon(field)}
                    </span>
                  </td>
                );
              };

              return (
                <tr key={record.id}>
                  <td className="text-center text-xs text-[#6b7280]">
                    {index + 1}
                  </td>
                  <td className="font-medium text-[#2563eb] font-mono">
                    {record.id}
                  </td>
                  {renderEditableCell(
                    "companyName",
                    record.companyName,
                    "font-medium",
                  )}

                  {/* Department Cell */}
                  {(() => {
                    const maintainedByValue =
                      record.maintainedBy || "Departments";
                    const isDeptEditable = maintainedByValue === "Departments";
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "department";
                    const cellStyle = isEditing
                      ? {
                          padding: 0,
                          overflow: "visible" as const,
                        }
                      : {};

                    return (
                      <td
                        className={`text-xs relative ${isEditable && isDeptEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          isDeptEditable &&
                          handleCellClick(record, "department")
                        }
                        style={cellStyle}
                        title={
                          isDeptEditable
                            ? isEditable && !isEditing
                              ? "Click to edit"
                              : ""
                            : `Set by Maintained By: ${maintainedByValue}`
                        }
                      >
                        {isDeptEditable ? (
                          isEditing ? (
                            <CellDropdown
                              options={departments.map((dept) => ({
                                value: dept,
                                label: dept,
                              }))}
                              value={
                                (inlineEditData.department as string) ||
                                record.department
                              }
                              onChange={(value) =>
                                saveFieldDirectly("department", value)
                              }
                              onClose={cancelInlineEdit}
                              placeholder={record.department}
                            />
                          ) : (
                            <span className="flex items-center justify-between gap-1">
                              <span>{record.department}</span>
                              <FiChevronDown
                                className="text-blue-600"
                                size={14}
                              />
                            </span>
                          )
                        ) : (
                          <span className="text-[#6b7280] italic">
                            {maintainedByValue}
                          </span>
                        )}
                      </td>
                    );
                  })()}

                  {/* Scope Cell */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "scope";
                    const cellStyle = isEditing
                      ? {
                          padding: 0,
                          overflow: "visible" as const,
                        }
                      : {};

                    return (
                      <td
                        className={`text-center relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable && handleCellClick(record, "scope")
                        }
                        style={cellStyle}
                        title={isEditable && !isEditing ? "Click to edit" : ""}
                      >
                        {isEditing ? (
                          <CellDropdown
                            options={[
                              { value: "National", label: "National" },
                              {
                                value: "International",
                                label: "International",
                              },
                            ]}
                            value={
                              inlineEditData.scope || record.scope || "National"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("scope", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="National"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1">
                            <span>{record.scope || "National"}</span>
                            <FiChevronDown
                              className="text-blue-600"
                              size={14}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })()}

                  {/* Maintained By Cell */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "maintainedBy";
                    const cellStyle = isEditing
                      ? {
                          padding: 0,
                          overflow: "visible" as const,
                        }
                      : {};

                    return (
                      <td
                        className={`text-center relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable && handleCellClick(record, "maintainedBy")
                        }
                        style={cellStyle}
                        title={isEditable && !isEditing ? "Click to edit" : ""}
                      >
                        {isEditing ? (
                          <CellDropdown
                            options={[
                              { value: "Institution", label: "Institution" },
                              { value: "Incubation", label: "Incubation" },
                              { value: "Departments", label: "Departments" },
                              { value: "NGO", label: "NGO" },
                              {
                                value: "Innovation Eco System",
                                label: "Innovation Eco System",
                              },
                              {
                                value: "Placement Cell",
                                label: "Placement Cell",
                              },
                            ]}
                            value={
                              inlineEditData.maintainedBy ||
                              record.maintainedBy ||
                              "Departments"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("maintainedBy", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="Departments"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1">
                            <span>{record.maintainedBy || "Departments"}</span>
                            <FiChevronDown
                              className="text-blue-600"
                              size={14}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })()}

                  {/* From Date Cell */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "fromDate";
                    const cellStyle = isEditing
                      ? {
                          border: "3px solid #000000",
                          outline: "none",
                          padding: "0",
                          backgroundColor: "#f5f5f5",
                        }
                      : {};

                    const convertToInputFormat = (dateStr: string) => {
                      if (!dateStr) return "";
                      const [day, month, year] = dateStr.split(".");
                      return `${year}-${month}-${day}`;
                    };

                    return (
                      <td
                        className={`${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable && handleCellClick(record, "fromDate")
                        }
                        style={cellStyle}
                        title={isEditable && !isEditing ? "Click to edit" : ""}
                      >
                        {isEditing ? (
                          <input
                            type="date"
                            defaultValue={convertToInputFormat(
                              record.fromDate === "file chosen"
                                ? ""
                                : record.fromDate,
                            )}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const [year, month, day] = val.split("-");
                                handleInlineFieldChange(
                                  "fromDate",
                                  `${day}.${month}.${year}`,
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveInlineEdit();
                              } else if (e.key === "Escape") {
                                cancelInlineEdit();
                              }
                            }}
                            autoFocus
                            className="w-full h-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : record.fromDate === "file chosen" ? (
                          ""
                        ) : (
                          <span className="flex items-center justify-between gap-1">
                            <span>{record.fromDate}</span>
                            <FiCalendar className="text-blue-500" size={12} />
                          </span>
                        )}
                      </td>
                    );
                  })()}

                  {/* To Date Cell */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "toDate";
                    const cellStyle = isEditing
                      ? {
                          border: "3px solid #000000",
                          outline: "none",
                          padding: "0",
                          backgroundColor: "#f5f5f5",
                        }
                      : {};

                    const convertToInputFormat = (dateStr: string) => {
                      if (!dateStr) return "";
                      const [day, month, year] = dateStr.split(".");
                      return `${year}-${month}-${day}`;
                    };

                    return (
                      <td
                        className={`${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable && handleCellClick(record, "toDate")
                        }
                        style={cellStyle}
                        title={isEditable && !isEditing ? "Click to edit" : ""}
                      >
                        {isEditing ? (
                          <input
                            type="date"
                            defaultValue={convertToInputFormat(
                              record.toDate === "file chosen"
                                ? ""
                                : record.toDate,
                            )}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const [year, month, day] = val.split("-");
                                handleInlineFieldChange(
                                  "toDate",
                                  `${day}.${month}.${year}`,
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveInlineEdit();
                              } else if (e.key === "Escape") {
                                cancelInlineEdit();
                              }
                            }}
                            autoFocus
                            className="w-full h-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        ) : record.toDate === "file chosen" ? (
                          ""
                        ) : (
                          <span className="flex items-center justify-between gap-1">
                            <span>{formatDisplayDate(record.toDate)}</span>
                            <FiCalendar className="text-blue-500" size={12} />
                          </span>
                        )}
                      </td>
                    );
                  })()}

                  {/* Status Cell */}
                  {(() => {
                    const displayStatus = getDisplayStatus(record);
                    return (
                      <td
                        className="text-center"
                        title="Status is auto-calculated based on expiry date"
                      >
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                    );
                  })()}

                  {renderEditableCell(
                    "description",
                    record.description,
                    "text-xs",
                    80,
                  )}
                  {renderEditableCell(
                    "aboutCompany",
                    record.aboutCompany || "-",
                    "text-xs",
                    50,
                  )}
                  {renderEditableCell(
                    "companyAddress",
                    record.companyAddress || "-",
                    "text-xs",
                    50,
                  )}

                  {/* Company Website Cell */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "companyWebsite";
                    const cellStyle = isEditing
                      ? {
                          border: "3px solid #000000",
                          outline: "none",
                          padding: "4px",
                          backgroundColor: "#f5f5f5",
                        }
                      : {};

                    return (
                      <td
                        className={`text-xs ${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onClick={() =>
                          isEditable &&
                          handleCellClick(record, "companyWebsite")
                        }
                        onBlur={(e) => {
                          if (isEditing) {
                            saveFieldDirectly(
                              "companyWebsite",
                              e.currentTarget.textContent || "",
                            );
                          }
                        }}
                        style={cellStyle}
                        title={isEditable && !isEditing ? "Click to edit" : ""}
                      >
                        {isEditing ? (
                          record.companyWebsite || ""
                        ) : record.companyWebsite ? (
                          <a
                            href={record.companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            {record.companyWebsite.length > 30
                              ? record.companyWebsite.substring(0, 30) + "..."
                              : record.companyWebsite}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  })()}

                  {renderEditableCell(
                    "companyRelationship",
                    record.companyRelationship?.toString() || "-",
                    "text-xs",
                  )}
                  {renderEditableCell(
                    "eventsOrganised",
                    String(record.eventsOrganised ?? 0),
                    "text-xs text-center",
                  )}
                  {renderEditableCell(
                    "industryContactName",
                    record.industryContactName || "-",
                    "text-xs",
                  )}
                  {renderEditableCell(
                    "industryContactMobile",
                    record.industryContactMobile || "-",
                    "text-xs",
                  )}
                  {renderEditableCell(
                    "industryContactEmail",
                    record.industryContactEmail || "-",
                    "text-xs",
                  )}
                  {renderEditableCell(
                    "institutionContactName",
                    record.institutionContactName || "-",
                    "text-xs",
                  )}
                  {renderEditableCell(
                    "institutionContactMobile",
                    record.institutionContactMobile || "-",
                    "text-xs",
                  )}
                  {renderEditableCell(
                    "institutionContactEmail",
                    record.institutionContactEmail || "-",
                    "text-xs",
                  )}
                  {/* Clubs Aligned - Searchable Dropdown */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "clubsAligned";
                    const cellStyle = isEditing
                      ? { padding: 0, overflow: "visible" as const }
                      : {};
                    const isEditable = canEdit(
                      record.createdBy,
                      record.department,
                    );
                    return (
                      <td
                        className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          !isEditing &&
                          handleCellClick(record, "clubsAligned")
                        }
                        style={cellStyle}
                        title={
                          isEditable && !isEditing ? "Click to select" : ""
                        }
                      >
                        {isEditing ? (
                          <SearchableCellDropdown
                            options={CLUB_OPTIONS.map((c) => ({
                              value: c,
                              label: c,
                            }))}
                            value={
                              (inlineEditData.clubsAligned as string) ||
                              record.clubsAligned ||
                              "Not Applicable"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("clubsAligned", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="Club"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1 px-1">
                            <span
                              className="truncate"
                              title={record.clubsAligned || "-"}
                            >
                              {(() => {
                                const val = record.clubsAligned || "-";
                                return val.length > 30
                                  ? val.substring(0, 30) + "..."
                                  : val;
                              })()}
                            </span>
                            {isEditable && (
                              <FiChevronDown
                                className="text-blue-600 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  {/* SDG Goals - Multi-Select Dropdown */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "sdgGoals";
                    const cellStyle = isEditing
                      ? { padding: 0, overflow: "visible" as const }
                      : {};
                    return (
                      <td
                        className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable && handleCellClick(record, "sdgGoals")
                        }
                        style={cellStyle}
                        title={
                          isEditable && !isEditing ? "Click to select" : ""
                        }
                      >
                        {isEditing ? (
                          <MultiSelectCellDropdown
                            predefinedOptions={[...SDG_GOALS]}
                            value={
                              (inlineEditData.sdgGoals as string) ||
                              record.sdgGoals ||
                              "Not Applicable"
                            }
                            onChange={(value) => {
                              setInlineEditData((prev) => ({
                                ...prev,
                                sdgGoals: value,
                              }));
                            }}
                            onClose={(currentValue) => {
                              saveFieldDirectly("sdgGoals", currentValue);
                            }}
                            placeholder="SDG Goals"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1 px-1">
                            <span
                              className="truncate"
                              title={record.sdgGoals || "-"}
                            >
                              {(() => {
                                const val = record.sdgGoals || "-";
                                return val.length > 30
                                  ? val.substring(0, 30) + "..."
                                  : val;
                              })()}
                            </span>
                            {isEditable && (
                              <FiChevronDown
                                className="text-blue-600 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  {renderEditableCell(
                    "skillsTechnologies",
                    record.skillsTechnologies || "-",
                    "text-xs",
                    50,
                  )}
                  {renderEditableCell(
                    "perStudentCost",
                    record.perStudentCost?.toString() || "0",
                    "text-center",
                  )}
                  {renderEditableCell(
                    "placementOpportunity",
                    record.placementOpportunity?.toString() || "0",
                    "text-center",
                  )}
                  {renderEditableCell(
                    "internshipOpportunity",
                    record.internshipOpportunity?.toString() || "0",
                    "text-center",
                  )}

                  {/* Renewal Cell */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "goingForRenewal";
                    const cellStyle = isEditing
                      ? {
                          padding: 0,
                          overflow: "visible" as const,
                        }
                      : {};

                    return (
                      <td
                        className={`text-center relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          handleCellClick(record, "goingForRenewal")
                        }
                        style={cellStyle}
                        title={isEditable && !isEditing ? "Click to edit" : ""}
                      >
                        {isEditing ? (
                          <CellDropdown
                            options={[
                              { value: "Yes", label: "Yes" },
                              { value: "No", label: "No" },
                            ]}
                            value={
                              inlineEditData.goingForRenewal ||
                              record.goingForRenewal ||
                              "No"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("goingForRenewal", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="No"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1">
                            <span>{record.goingForRenewal || "No"}</span>
                            <FiChevronDown
                              className="text-blue-600"
                              size={14}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })()}

                  {renderEditableCell(
                    "benefitsAchieved",
                    record.benefitsAchieved || "-",
                    "text-xs",
                    50,
                  )}
                  {/* IEEE Society - Searchable Dropdown */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "ieeeSociety";
                    const cellStyle = isEditing
                      ? { padding: 0, overflow: "visible" as const }
                      : {};
                    const isEditable = canEdit(
                      record.createdBy,
                      record.department,
                    );
                    return (
                      <td
                        className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          !isEditing &&
                          handleCellClick(record, "ieeeSociety")
                        }
                        style={cellStyle}
                        title={
                          isEditable && !isEditing ? "Click to select" : ""
                        }
                      >
                        {isEditing ? (
                          <SearchableCellDropdown
                            options={IEEE_SOCIETIES.map((s) => ({
                              value: s,
                              label: s,
                            }))}
                            value={
                              (inlineEditData.ieeeSociety as string) ||
                              record.ieeeSociety ||
                              "Not Applicable"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("ieeeSociety", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="IEEE Society"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1 px-1">
                            <span
                              className="truncate"
                              title={record.ieeeSociety || "Not Applicable"}
                            >
                              {(() => {
                                const val =
                                  record.ieeeSociety || "Not Applicable";
                                return val.length > 30
                                  ? val.substring(0, 30) + "..."
                                  : val;
                              })()}
                            </span>
                            {isEditable && (
                              <FiChevronDown
                                className="text-blue-600 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  {/* IEEE Community - Searchable Dropdown */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "ieeeCommunity";
                    const cellStyle = isEditing
                      ? { padding: 0, overflow: "visible" as const }
                      : {};
                    const isEditable = canEdit(
                      record.createdBy,
                      record.department,
                    );
                    return (
                      <td
                        className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          !isEditing &&
                          handleCellClick(record, "ieeeCommunity")
                        }
                        style={cellStyle}
                        title={
                          isEditable && !isEditing ? "Click to select" : ""
                        }
                      >
                        {isEditing ? (
                          <SearchableCellDropdown
                            options={IEEE_COMMUNITIES.map((c) => ({
                              value: c,
                              label: c,
                            }))}
                            value={
                              (inlineEditData.ieeeCommunity as string) ||
                              record.ieeeCommunity ||
                              "Not Applicable"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("ieeeCommunity", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="IEEE Community"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1 px-1">
                            <span
                              className="truncate"
                              title={record.ieeeCommunity || "Not Applicable"}
                            >
                              {(() => {
                                const val =
                                  record.ieeeCommunity || "Not Applicable";
                                return val.length > 30
                                  ? val.substring(0, 30) + "..."
                                  : val;
                              })()}
                            </span>
                            {isEditable && (
                              <FiChevronDown
                                className="text-blue-600 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  {/* EMoU Outcome - Multi-Select Dropdown */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "emouOutcome";
                    const cellStyle = isEditing
                      ? { padding: 0, overflow: "visible" as const }
                      : {};
                    const isEditable = canEdit(
                      record.createdBy,
                      record.department,
                    );
                    return (
                      <td
                        className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          !isEditing &&
                          handleCellClick(record, "emouOutcome")
                        }
                        style={cellStyle}
                        title={
                          isEditable && !isEditing ? "Click to select" : ""
                        }
                      >
                        {isEditing ? (
                          <MultiSelectCellDropdown
                            predefinedOptions={[...EMOU_OUTCOME_OPTIONS]}
                            value={
                              (inlineEditData.emouOutcome as string) ||
                              record.emouOutcome ||
                              "Not Applicable"
                            }
                            onChange={(value) => {
                              setInlineEditData((prev) => ({
                                ...prev,
                                emouOutcome: value,
                              }));
                            }}
                            onClose={(currentValue) => {
                              saveFieldDirectly("emouOutcome", currentValue);
                            }}
                            placeholder="EMoU Outcome"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1 px-1">
                            <span
                              className="truncate"
                              title={record.emouOutcome || "Not Applicable"}
                            >
                              {(() => {
                                const val =
                                  record.emouOutcome || "Not Applicable";
                                return val.length > 40
                                  ? val.substring(0, 40) + "..."
                                  : val;
                              })()}
                            </span>
                            {isEditable && (
                              <FiChevronDown
                                className="text-blue-600 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  {/* Domain - Searchable Dropdown */}
                  {(() => {
                    const isEditing =
                      editingCell?.recordId === record.id &&
                      editingCell?.field === "domain";
                    const cellStyle = isEditing
                      ? { padding: 0, overflow: "visible" as const }
                      : {};
                    const isEditable = canEdit(
                      record.createdBy,
                      record.department,
                    );
                    return (
                      <td
                        className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                        onClick={() =>
                          isEditable &&
                          !isEditing &&
                          handleCellClick(record, "domain")
                        }
                        style={cellStyle}
                        title={
                          isEditable && !isEditing ? "Click to select" : ""
                        }
                      >
                        {isEditing ? (
                          <SearchableCellDropdown
                            options={DOMAIN_OPTIONS.map((d) => ({
                              value: d,
                              label: d,
                            }))}
                            value={
                              (inlineEditData.domain as string) ||
                              record.domain ||
                              "Not Applicable"
                            }
                            onChange={(value) =>
                              saveFieldDirectly("domain", value)
                            }
                            onClose={cancelInlineEdit}
                            placeholder="Domain"
                          />
                        ) : (
                          <span className="flex items-center justify-between gap-1 px-1">
                            <span
                              className="truncate"
                              title={record.domain || "Not Applicable"}
                            >
                              {(() => {
                                const val = record.domain || "Not Applicable";
                                return val.length > 30
                                  ? val.substring(0, 30) + "..."
                                  : val;
                              })()}
                            </span>
                            {isEditable && (
                              <FiChevronDown
                                className="text-blue-600 flex-shrink-0"
                                size={14}
                              />
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })()}
                  <td
                    className="text-xs text-[#6b7280]"
                    style={{
                      ...getStickyPosition(
                        "createdBy",
                        showDocumentUpload,
                        false,
                      ),
                      boxShadow: "-2px 0 4px rgba(0,0,0,0.08)",
                    }}
                  >
                    {record.createdByName}
                  </td>

                  {/* Document Upload/View Section */}
                  {showDocumentUpload ? (
                    <>
                      <td
                        style={{
                          ...getStickyPosition(
                            "hodApproval",
                            showDocumentUpload,
                            false,
                          ),
                        }}
                      >
                        <div className="flex gap-1 items-center justify-center">
                          {record.hodApprovalDoc && (
                            <button
                              onClick={() =>
                                setViewingDocument({
                                  url: record.hodApprovalDoc!,
                                  title: `HO Approval - ${record.companyName}`,
                                })
                              }
                              className="text-blue-600 hover:underline cursor-pointer text-xs"
                            >
                              View
                            </button>
                          )}
                          {record.hodApprovalDoc && (
                            <span className="text-gray-300">|</span>
                          )}
                          <label
                            className={`relative cursor-pointer px-2 py-1 text-white rounded transition-colors flex items-center gap-1 text-xs ${
                              record.hodApprovalDoc
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {uploadingDoc?.recordId === record.id &&
                            uploadingDoc?.field === "hodApprovalDoc" ? (
                              <span className="flex items-center gap-1">
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                                Uploading...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <FiUpload />
                                {record.hodApprovalDoc ? "Replace" : "Upload"}
                              </span>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(
                                    record.id,
                                    "hodApprovalDoc",
                                    file,
                                  );
                                }
                                e.target.value = "";
                              }}
                              disabled={
                                uploadingDoc?.recordId === record.id &&
                                uploadingDoc?.field === "hodApprovalDoc"
                              }
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                        </div>
                      </td>
                      <td
                        style={{
                          ...getStickyPosition(
                            "signedAgreement",
                            showDocumentUpload,
                            false,
                          ),
                          boxShadow: "-2px 0 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div className="flex gap-1 items-center justify-center">
                          {record.signedAgreementDoc && (
                            <button
                              onClick={() =>
                                setViewingDocument({
                                  url: record.signedAgreementDoc!,
                                  title: `Signed Agreement - ${record.companyName}`,
                                })
                              }
                              className="text-blue-600 hover:underline cursor-pointer text-xs"
                            >
                              View
                            </button>
                          )}
                          {record.signedAgreementDoc && (
                            <span className="text-gray-300">|</span>
                          )}
                          <label
                            className={`relative cursor-pointer px-2 py-1 text-white rounded transition-colors flex items-center gap-1 text-xs ${
                              record.signedAgreementDoc
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {uploadingDoc?.recordId === record.id &&
                            uploadingDoc?.field === "signedAgreementDoc" ? (
                              <span className="flex items-center gap-1">
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                                Uploading...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <FiUpload />
                                {record.signedAgreementDoc
                                  ? "Replace"
                                  : "Upload"}
                              </span>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(
                                    record.id,
                                    "signedAgreementDoc",
                                    file,
                                  );
                                }
                                e.target.value = "";
                              }}
                              disabled={
                                uploadingDoc?.recordId === record.id &&
                                uploadingDoc?.field === "signedAgreementDoc"
                              }
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Doc Availability */}
                      {(() => {
                        const isEditing =
                          editingCell?.recordId === record.id &&
                          editingCell?.field === "documentAvailability";
                        const cellStyle = isEditing
                          ? {
                              padding: 0,
                              overflow: "visible" as const,
                            }
                          : {};

                        return (
                          <td
                            className={`text-center relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                            onClick={() =>
                              isEditable &&
                              handleCellClick(record, "documentAvailability")
                            }
                            style={{
                              ...cellStyle,
                              ...getStickyPosition(
                                "docAvailability",
                                showDocumentUpload,
                                false,
                              ),
                            }}
                            title={
                              isEditable && !isEditing ? "Click to edit" : ""
                            }
                          >
                            {isEditing ? (
                              <CellDropdown
                                options={[
                                  { value: "Yes", label: "Yes" },
                                  { value: "No", label: "No" },
                                  { value: "Partial", label: "Partial" },
                                ]}
                                value={
                                  inlineEditData.documentAvailability ||
                                  record.documentAvailability ||
                                  "No"
                                }
                                onChange={(value) =>
                                  saveFieldDirectly(
                                    "documentAvailability",
                                    value,
                                  )
                                }
                                onClose={cancelInlineEdit}
                                placeholder="No"
                              />
                            ) : (
                              <span className="flex items-center justify-between gap-1">
                                <span>
                                  {record.documentAvailability || "No"}
                                </span>
                                <FiChevronDown
                                  className="text-blue-600"
                                  size={14}
                                />
                              </span>
                            )}
                          </td>
                        );
                      })()}

                      {/* HO Approval Doc View */}
                      <td
                        className="text-center"
                        style={{
                          ...getStickyPosition(
                            "hodApproval",
                            showDocumentUpload,
                            false,
                          ),
                        }}
                      >
                        {record.hodApprovalDoc ? (
                          <button
                            onClick={() =>
                              setViewingDocument({
                                url: record.hodApprovalDoc!,
                                title: `HO Approval - ${record.companyName}`,
                              })
                            }
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View Document
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      {/* Signed Agreement Doc View */}
                      <td
                        className="text-center"
                        style={{
                          ...getStickyPosition(
                            "signedAgreement",
                            showDocumentUpload,
                            false,
                          ),
                          boxShadow: "-2px 0 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        {record.signedAgreementDoc ? (
                          <button
                            onClick={() =>
                              setViewingDocument({
                                url: record.signedAgreementDoc!,
                                title: `Signed Agreement - ${record.companyName}`,
                              })
                            }
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View Document
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </>
                  )}

                  {/* Approval Status */}
                  <td
                    className="text-center"
                    style={{
                      ...getStickyPosition(
                        "approvalStatus",
                        showDocumentUpload,
                        false,
                      ),
                    }}
                  >
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded uppercase ${getStatusBadge(record.approvalStatus)}`}
                    >
                      {record.approvalStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
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
      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <header className="bg-white border-b border-[#d1d5db] sticky top-0 z-20">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-[#1f2937]">
                  HOD Dashboard - {user?.department}
                </h1>
                <p className="text-xs text-[#6b7280]">
                  Manage department eMoU records and document uploads
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="btn btn-secondary flex items-center"
              >
                <MdArrowBack className="mr-2" /> Back to eMoUs
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-[#d1d5db] mb-6">
            <div className="flex border-b border-[#d1d5db]">
              <button
                onClick={() => setActiveTab("drafts")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "drafts"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Draft Records
                {draftRecords.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                    {draftRecords.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "pending"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pending Approval
                {pendingRecords.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                    {pendingRecords.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("approved")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "approved"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Approved
                {approvedRecords.length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    {approvedRecords.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("rejected")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "rejected"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Rejected
                {rejectedRecords.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                    {rejectedRecords.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Draft Records Tab */}
          {activeTab === "drafts" && (
            <div
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{
                height: "calc(100vh - 255px)",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Draft Records ({draftRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Upload both required documents to submit for approval
                </p>
              </div>
              {loading ? (
                <TabContentSkeleton rows={10} columns={8} />
              ) : draftRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No draft records. All records have been submitted for
                  approval.
                </div>
              ) : (
                renderRecordsTable(draftRecords, true)
              )}
            </div>
          )}

          {/* Pending Approval Tab */}
          {activeTab === "pending" && (
            <div
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{
                height: "calc(100vh - 255px)",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Pending Approval ({pendingRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Records submitted and awaiting admin/master approval
                </p>
              </div>
              {loading ? (
                <TabContentSkeleton rows={10} columns={8} />
              ) : pendingRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending records
                </div>
              ) : (
                renderRecordsTable(pendingRecords, false)
              )}
            </div>
          )}

          {/* Approved Records Tab */}
          {activeTab === "approved" && (
            <div
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{
                height: "calc(100vh - 255px)",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Approved Records ({approvedRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Records approved by admin/master
                </p>
              </div>
              {loading ? (
                <TabContentSkeleton rows={10} columns={8} />
              ) : approvedRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No approved records yet
                </div>
              ) : (
                renderRecordsTable(approvedRecords, false)
              )}
            </div>
          )}

          {/* Rejected Records Tab */}
          {activeTab === "rejected" && (
            <div
              className="bg-white rounded-lg shadow-sm overflow-hidden"
              style={{
                height: "calc(100vh - 255px)",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Rejected Records ({rejectedRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Records rejected by admin/master - needs revision
                </p>
              </div>
              {loading ? (
                <TabContentSkeleton rows={10} columns={8} />
              ) : rejectedRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No rejected records
                </div>
              ) : (
                renderRecordsTable(rejectedRecords, false)
              )}
            </div>
          )}
        </div>

        {viewingDocument && (
          <DocumentViewer
            url={viewingDocument.url}
            title={viewingDocument.title}
            onClose={() => setViewingDocument(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default HODPage;
