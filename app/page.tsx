"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import CustomDropdown, { CellDropdown } from "@/components/CustomDropdown";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewRecordDialog from "@/components/ViewRecordDialog";
import DocumentViewer from "@/components/DocumentViewer";
import EMoUForm from "@/components/EMoUForm";
import ImportDialog from "@/components/ImportDialog";
import { EMoURecord, FilterOptions } from "@/types";
import {
  getEMoUsPage,
  createEMoU,
  updateEMoU,
  deleteEMoU,
  getEMoUsCount,
} from "@/lib/firestore";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { useRouter } from "next/navigation";
import {
  FiUpload,
  FiDownload,
  FiPlus,
  FiLogOut,
  FiGrid,
  FiList,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";
import { MdDashboard, MdAdminPanelSettings } from "react-icons/md";

function HomePage() {
  const { user, signOut, canEdit, canDelete, firebaseUser } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<EMoURecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EMoURecord | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [viewingRecord, setViewingRecord] = useState<EMoURecord | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<EMoURecord>>({});
  const [editingCell, setEditingCell] = useState<{
    recordId: string;
    field: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState<{
    recordId: string;
    field: "hodApprovalDoc" | "signedAgreementDoc";
  } | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Stats state for server-side calculation
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    draft: 0,
    renewal: 0,
    withDocs: 0,
  });

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
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    selectedDepartment,
    selectedStatus,
    debouncedSearchTerm,
    user,
    showAll,
  ]);

  // Debounce search term to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDepartment, selectedStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!editingCell) return;

      const target = event.target as HTMLElement;

      // Check if click is on an editable cell or date input or select
      const isEditableCell =
        target.hasAttribute("contenteditable") ||
        target.closest('[contenteditable="true"]');
      const isDateInput =
        target.tagName === "INPUT" && target.getAttribute("type") === "date";
      const isWithinDateInput = target.closest('input[type="date"]');
      const isSelectElement =
        target.tagName === "SELECT" || target.closest("select");
      const isSelectOption = target.tagName === "OPTION";

      // If clicking outside editing cell (and not on a date input or select), auto-save
      if (
        !isEditableCell &&
        !isDateInput &&
        !isWithinDateInput &&
        !isSelectElement &&
        !isSelectOption
      ) {
        saveInlineEdit();
      }
    };

    if (editingCell) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, inlineEditData, user]);

  const loadRecords = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const filters: FilterOptions = {};

      // Apply the filter for renewal pending status
      if (selectedStatus === "Renewal Pending") {
        filters.goingForRenewal = "Yes";
      }

      if (selectedDepartment !== "all") {
        filters.department = selectedDepartment as FilterOptions["department"];
      }

      // Special handling for "Expiring", "Renewal Pending", and "With Docs" - these need client-side or special filtering
      if (selectedStatus === "Expiring") {
        filters.status = "Active";
      } else if (selectedStatus === "Renewal Pending") {
        // Already handled above with goingForRenewal filter - don't set status filter
      } else if (selectedStatus === "With Docs") {
        // Don't filter by status - we'll filter by document presence client-side
      } else if (selectedStatus !== "all") {
        filters.status = selectedStatus as FilterOptions["status"];
      }

      if (debouncedSearchTerm) {
        filters.searchTerm = debouncedSearchTerm;
      }

      // Show only approved records for all users (including admin on main sheet)
      const approvalStatus = "approved";

      const result = await getEMoUsPage(
        showAll ? 1 : currentPage,
        showAll ? 10000 : itemsPerPage,
        filters,
        approvalStatus,
      );

      let data = result.data;

      // Client-side search filtering (global across all fields)
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        data = data.filter((r) => {
          const searchableFields = [
            r.id,
            r.companyName,
            r.department,
            r.description,
            r.fromDate,
            r.toDate,
            r.status,
            r.scope,
            r.maintainedBy,
            r.aboutCompany,
            r.companyAddress,
            r.companyWebsite,
            r.industryContactName,
            r.industryContactMobile,
            r.industryContactEmail,
            r.institutionContactName,
            r.institutionContactMobile,
            r.institutionContactEmail,
            r.clubsAligned,
            r.sdgGoals,
            r.skillsTechnologies,
            r.benefitsAchieved,
            r.goingForRenewal,
            r.documentAvailability,
            r.createdByName,
          ];
          return searchableFields.some(
            (field) => field && String(field).toLowerCase().includes(term),
          );
        });
      }

      // Filter for expiring records (within 2 months)
      if (selectedStatus === "Expiring") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        data = data.filter((record) => {
          if (
            !record.toDate ||
            record.toDate.toLowerCase().includes("perpetual") ||
            record.toDate.toLowerCase().includes("indefinite")
          ) {
            return false;
          }

          // Check for large year dates (9999 etc.)
          const parts = record.toDate.split(".");
          if (parts.length === 3) {
            const year = parseInt(parts[2], 10);
            if (year >= 9000) return false; // Perpetual dates don't expire
          }

          try {
            const toDate = parseDate(record.toDate);
            toDate.setHours(0, 0, 0, 0);

            // Record is expiring if toDate is between today and 2 months from now
            return toDate > today && toDate <= twoMonthsFromNow;
          } catch {
            return false;
          }
        });
      }

      // Filter to only show records with at least one document uploaded
      data = data.filter((r) => r.hodApprovalDoc || r.signedAgreementDoc);

      // Sort by department alphabetically (A-Z), then by ID sequential number
      data.sort((a, b) => {
        const deptCompare = a.department.localeCompare(b.department);
        if (deptCompare !== 0) return deptCompare;
        const aSeq = parseInt(a.id.slice(-3));
        const bSeq = parseInt(b.id.slice(-3));
        return aSeq - bSeq;
      });

      setRecords(data);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);

      // Load stats separately
      loadStats();
    } catch (error) {
      console.error("Failed to load records:", error);
      setAlert({ message: "Failed to load records", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Show only approved records stats for all users
      const approvalStatus = "approved";

      // Get counts for different statuses
      const [total, active, expired, draft] = await Promise.all([
        getEMoUsCount(
          selectedDepartment !== "all"
            ? { department: selectedDepartment as FilterOptions["department"] }
            : undefined,
          approvalStatus,
        ),
        getEMoUsCount(
          {
            department:
              selectedDepartment !== "all"
                ? (selectedDepartment as FilterOptions["department"])
                : undefined,
            status: "Active",
          },
          approvalStatus,
        ),
        getEMoUsCount(
          {
            department:
              selectedDepartment !== "all"
                ? (selectedDepartment as FilterOptions["department"])
                : undefined,
            status: "Expired",
          },
          approvalStatus,
        ),
        getEMoUsCount(
          {
            department:
              selectedDepartment !== "all"
                ? (selectedDepartment as FilterOptions["department"])
                : undefined,
            status: "Draft",
          },
          approvalStatus,
        ),
      ]);

      // Calculate expiring records (Active records expiring within 2 months)
      let expiringCount = 0;
      try {
        const filters: FilterOptions = {
          status: "Active",
        };
        if (selectedDepartment !== "all") {
          filters.department =
            selectedDepartment as FilterOptions["department"];
        }

        // Fetch active records to check expiration dates
        const activeRecords = await getEMoUsPage(
          1,
          10000,
          filters,
          approvalStatus,
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoMonthsFromNow = new Date(today);
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

        expiringCount = activeRecords.data.filter((record) => {
          if (
            !record.toDate ||
            record.toDate.toLowerCase().includes("perpetual") ||
            record.toDate.toLowerCase().includes("indefinite")
          ) {
            return false;
          }

          // Check for large year dates (9999 etc.)
          const parts = record.toDate.split(".");
          if (parts.length === 3) {
            const year = parseInt(parts[2], 10);
            if (year >= 9000) return false; // Perpetual dates don't expire
          }

          try {
            const toDate = parseDate(record.toDate);
            toDate.setHours(0, 0, 0, 0);

            // Record is expiring if toDate is between today and 2 months from now
            return toDate > today && toDate <= twoMonthsFromNow;
          } catch {
            return false;
          }
        }).length;
      } catch (error) {
        console.error("Failed to calculate expiring records:", error);
      }

      // Calculate withDocs count and renewal count from all approved records
      let withDocsCount = 0;
      let renewalCount = 0;
      try {
        const allApprovedFilters: FilterOptions = {};
        if (selectedDepartment !== "all") {
          allApprovedFilters.department =
            selectedDepartment as FilterOptions["department"];
        }
        const allApproved = await getEMoUsPage(
          1,
          10000,
          allApprovedFilters,
          approvalStatus,
        );
        withDocsCount = allApproved.data.filter(
          (r) => r.documentAvailability === "Available",
        ).length;
        renewalCount = allApproved.data.filter(
          (r) => r.goingForRenewal === "Yes",
        ).length;
      } catch (error) {
        console.error("Failed to calculate withDocs count:", error);
      }

      setStats({
        total,
        active,
        expiring: expiringCount,
        expired,
        draft,
        renewal: renewalCount,
        withDocs: withDocsCount,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleCreateRecord = async (data: Partial<EMoURecord>) => {
    if (!user) {
      console.error("No user available");
      setAlert({ message: "Please log in to create records", type: "error" });
      return;
    }

    if (!user.uid) {
      console.error("User object missing uid:", user);
      setAlert({
        message: "User session is invalid. Please log out and log back in.",
        type: "error",
      });
      return;
    }

    try {
      const now = new Date();
      const recordData = {
        ...data,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: now,
      };

      console.log("Creating record with data:", {
        createdBy: user.uid,
        createdByName: user.displayName,
      });

      await createEMoU(recordData as Omit<EMoURecord, "id">);

      setShowForm(false);
      loadRecords();
      setAlert({ message: "Record created successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to create record:", error);
      setAlert({
        message: "Failed to create record. Check console for details.",
        type: "error",
      });
    }
  };

  const handleUpdateRecord = async (data: Partial<EMoURecord>) => {
    if (!user || !editingRecord) return;

    try {
      await updateEMoU(editingRecord.id, {
        ...data,
        updatedBy: user.uid,
        updatedByName: user.displayName,
        updatedAt: new Date(),
      });

      setShowForm(false);
      setEditingRecord(null);
      loadRecords();
      setAlert({ message: "Record updated successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to update record:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const record = records.find((r) => r.id === id);
    setConfirmDialog({
      title: "Delete eMoU Record",
      message: `Are you sure you want to delete this eMoU record?\n\nCompany: ${record?.companyName || "Unknown"}\nID: ${id}\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteEMoU(id);
          loadRecords();
          setAlert({
            message: "Record deleted successfully!",
            type: "success",
          });
        } catch (error) {
          console.error("Failed to delete record:", error);
          setAlert({ message: "Failed to delete record", type: "error" });
        }
      },
    });
  };

  const handleBulkImport = async (records: Partial<EMoURecord>[]) => {
    if (!user) {
      setAlert({ message: "Please log in to import records", type: "error" });
      return;
    }

    if (!user.uid) {
      console.error("User object missing uid:", user);
      setAlert({
        message: "User session is invalid. Please log out and log back in.",
        type: "error",
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const record of records) {
      try {
        const now = new Date();
        await createEMoU({
          ...record,
          createdBy: user.uid,
          createdByName: user.displayName,
          createdAt: now,
        } as Omit<EMoURecord, "id">);
        successCount++;
      } catch (error) {
        console.error("Failed to import record:", error);
        failCount++;
      }
    }

    const message = `Import completed!\n✓ Successfully imported: ${successCount}\n${failCount > 0 ? `✗ Failed: ${failCount}` : ""}`;
    setAlert({
      message,
      type: failCount > 0 ? "warning" : "success",
    });
    loadRecords();
  };

  const handleEdit = (record: EMoURecord) => {
    setEditingRecord(record);
    setShowForm(true);
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

      // Auto-update status when toDate changes
      if (field === "toDate" && typeof value === "string") {
        // Check for perpetual text or large year dates
        const parts = value.split(".");
        const isLargeYear =
          parts.length === 3 && parseInt(parts[2], 10) >= 9000;

        if (
          value.toLowerCase().includes("perpetual") ||
          value.toLowerCase().includes("indefinite") ||
          isLargeYear
        ) {
          updated.status = "Active";
        } else {
          try {
            const [day, month, year] = value.split(".").map(Number);
            const toDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            toDate.setHours(0, 0, 0, 0);

            if (toDate >= today) {
              updated.status = "Active";
            } else {
              updated.status = "Expired";
            }
          } catch {
            // Keep current status if date parsing fails
          }
        }
      }

      return updated;
    });
  };

  const saveInlineEdit = async () => {
    if (!editingCell || !user) return;

    try {
      const updatedData = {
        ...inlineEditData,
        updatedBy: user.uid,
        updatedByName: user.displayName,
        updatedAt: new Date(),
      };

      await updateEMoU(editingCell.recordId, updatedData);

      // Update local state instead of reloading from database
      setRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === editingCell.recordId
            ? { ...record, ...updatedData }
            : record,
        ),
      );

      setEditingCell(null);
      setInlineEditData({});
    } catch (error) {
      console.error("Failed to update record:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
  };

  // Save a specific field value directly, bypassing stale state issues with onBlur
  const saveFieldDirectly = async (
    field: keyof EMoURecord,
    value: string | number,
  ) => {
    if (!editingCell || !user) return;

    try {
      const updates: Partial<EMoURecord> = {
        ...inlineEditData,
        [field]: value,
      };

      // Auto-update status when toDate changes
      if (field === "toDate" && typeof value === "string") {
        // Check for perpetual text or large year dates
        const parts = value.split(".");
        const isLargeYear =
          parts.length === 3 && parseInt(parts[2], 10) >= 9000;

        if (
          value.toLowerCase().includes("perpetual") ||
          value.toLowerCase().includes("indefinite") ||
          isLargeYear
        ) {
          updates.status = "Active";
        } else {
          try {
            const [day, month, year] = value.split(".").map(Number);
            const toDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            toDate.setHours(0, 0, 0, 0);
            if (toDate >= today) {
              updates.status = "Active";
            } else {
              updates.status = "Expired";
            }
          } catch {
            // Keep current status if date parsing fails
          }
        }
      }

      // Auto-update department when maintainedBy changes
      if (field === "maintainedBy" && typeof value === "string") {
        if (value === "Institution" || value === "Incubation") {
          updates.department = value;
        } else if (value === "Departments") {
          // If department is currently Institution/Incubation, reset to first department
          const currentDept = (inlineEditData.department as string) || "";
          if (currentDept === "Institution" || currentDept === "Incubation") {
            updates.department = "CSE";
          }
        }
      }

      const updatedData = {
        ...updates,
        updatedBy: user.uid,
        updatedByName: user.displayName,
        updatedAt: new Date(),
      };

      await updateEMoU(editingCell.recordId, updatedData);

      setRecords((prevRecords) =>
        prevRecords.map((record) =>
          record.id === editingCell.recordId
            ? { ...record, ...updatedData }
            : record,
        ),
      );

      setEditingCell(null);
      setInlineEditData({});
    } catch (error) {
      console.error("Failed to update record:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
    setInlineEditData({});
  };

  const handleExport = async () => {
    // For export, we need to fetch all records (without pagination)
    try {
      setAlert({ message: "Preparing export...", type: "info" });
      const filters: FilterOptions = {};
      if (selectedDepartment !== "all") {
        filters.department = selectedDepartment as FilterOptions["department"];
      }
      if (selectedStatus !== "all") {
        filters.status = selectedStatus as FilterOptions["status"];
      }
      const approvalStatus = "approved";

      // Fetch a large page for export (or implement a separate export endpoint)
      const result = await getEMoUsPage(1, 10000, filters, approvalStatus);

      // Filter to only export records with at least one document
      const filteredData = result.data.filter(
        (r) => r.hodApprovalDoc || r.signedAgreementDoc,
      );

      const csv = generateCSV(filteredData);
      downloadCSV(
        csv,
        `emou-records-${new Date().toISOString().split("T")[0]}.csv`,
      );
      setAlert({ message: "Export completed!", type: "success" });
    } catch (error) {
      console.error("Export failed:", error);
      setAlert({ message: "Failed to export records", type: "error" });
    }
  };

  const generateCSV = (data: EMoURecord[]) => {
    const headers = [
      "ID",
      "Company Name",
      "From Date",
      "To Date",
      "Status",
      "Description",
      "Placement Opportunities",
      "Internship Opportunities",
      "Created By",
      "Created At",
    ];

    const rows = data.map((r) => [
      r.id,
      r.companyName,
      r.fromDate,
      r.toDate,
      r.status,
      r.description,
      r.placementOpportunity || 0,
      r.internshipOpportunity || 0,
      r.createdByName,
      r.createdAt.toLocaleDateString(),
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
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

  const handleFileUpload = async (
    recordId: string,
    field: "hodApprovalDoc" | "signedAgreementDoc",
    file: File,
  ) => {
    if (!user) return;

    setUploadingDoc({ recordId, field });
    try {
      // Delete old file from Cloudinary if replacing (non-blocking)
      const existingRecord = records.find((r) => r.id === recordId);
      const oldUrl = existingRecord?.[field];
      if (oldUrl && firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        // Don't block on delete - proceed with upload even if delete fails
        deleteFromCloudinary(oldUrl, idToken).catch((err) => {
          console.warn("Failed to delete old file (non-critical):", err);
        });
      }

      const result = await uploadToCloudinary(file);

      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed");
      }

      // Update the record with the new document URL
      await updateEMoU(recordId, {
        [field]: result.url,
        updatedBy: user.uid,
        updatedByName: user.displayName,
        updatedAt: new Date(),
      });

      // Refresh records
      loadRecords();
      setAlert({
        message: `Document uploaded successfully!`,
        type: "success",
      });
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

  function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split(".").map(Number);
    return new Date(year, month - 1, day);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Expiring":
        return "bg-yellow-100 text-yellow-800";
      case "Expired":
        return "bg-red-100 text-red-800";
      case "Renewal Pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

  // Format date for display - show "Perpetual" for large year dates
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

  // Calculate display status - shows "Expiring" instead of "Active" for records expiring within 2 months
  const getDisplayStatus = (record: EMoURecord): string => {
    // Check if toDate is perpetual - always show Active for perpetual dates
    const toDate = record.toDate;
    if (
      toDate &&
      (toDate.toLowerCase().includes("perpetual") ||
        toDate.toLowerCase().includes("indefinite") ||
        isPerpetualDate(toDate))
    ) {
      return "Active";
    }

    // If not Active, return as-is
    if (record.status !== "Active") return record.status;

    // Check if Active record is expiring
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

  if (showForm) {
    return (
      <ProtectedRoute>
        {alert && (
          <Alert
            message={alert.message}
            type={alert.type}
            onClose={() => setAlert(null)}
          />
        )}
        <div className="min-h-screen bg-[#f8f9fa] p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#1f2937]">
                {editingRecord ? "Edit eMoU Record" : "New eMoU Record"}
              </h2>
            </div>
            <EMoUForm
              initialData={editingRecord || undefined}
              onSubmit={editingRecord ? handleUpdateRecord : handleCreateRecord}
              onCancel={() => {
                setShowForm(false);
                setEditingRecord(null);
              }}
            />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="danger"
        />
      )}
      {viewingRecord && (
        <ViewRecordDialog
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
        />
      )}
      {viewingDocument && (
        <DocumentViewer
          url={viewingDocument.url}
          title={viewingDocument.title}
          onClose={() => setViewingDocument(null)}
        />
      )}
      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <header className="bg-white border-b border-[#d1d5db] sticky top-0 z-20">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-[#1f2937]">
                  Sairam eMoU Vault
                </h1>
                <p className="text-xs text-[#6b7280]">
                  Centralized eMoU Sheet Management System
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-[#6b7280]">
                  {user?.displayName} ({user?.role})
                </div>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <MdDashboard /> Dashboard
                </button>
                {user?.role === "admin" && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <MdAdminPanelSettings /> Admin
                  </button>
                )}
                {user?.role === "master" && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <MdAdminPanelSettings /> Approvals
                  </button>
                )}
                {user?.role === "hod" && (
                  <button
                    onClick={() => router.push("/hod")}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <MdDashboard /> HOD Dashboard
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FiDownload /> Export
                </button>
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FiUpload /> Import
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <FiPlus /> New MOU
                </button>
                <button
                  onClick={signOut}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FiLogOut /> Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Filters Bar */}
        <div className="bg-white border-b border-[#d1d5db] px-6 py-3">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#4b5563]">
                Department:
              </label>
              <CustomDropdown
                options={[
                  { value: "all", label: "All Departments" },
                  ...departments.map((dept) => ({ value: dept, label: dept })),
                ]}
                value={selectedDepartment}
                onChange={(value) => setSelectedDepartment(value)}
                placeholder="All Departments"
                className="min-w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#4b5563]">
                Status:
              </label>
              <CustomDropdown
                options={[
                  { value: "all", label: "All Status" },
                  { value: "Active", label: "Active" },
                  { value: "Expired", label: "Expired" },
                  { value: "Renewal Pending", label: "Renewal Pending" },
                  { value: "Draft", label: "Draft" },
                ]}
                value={selectedStatus}
                onChange={(value) => setSelectedStatus(value)}
                placeholder="All Status"
                className="min-w-[160px]"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company name, ID, or description..."
                className="w-full max-w-md"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-[#6b7280]">{totalCount} records</div>
              {totalCount > itemsPerPage && (
                <button
                  onClick={() => {
                    setShowAll(!showAll);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-xs border border-[#3b82f6] bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] cursor-pointer flex items-center gap-1.5"
                >
                  {showAll ? <FiList /> : <FiGrid />}
                  {showAll ? "Show Paginated" : "Show All"}
                </button>
              )}
              {totalCount > 0 && !showAll && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1 || loading}
                    className="px-2 py-1 text-xs border border-[#d1d5db] rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-50"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-[#6b7280]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage >= totalPages || loading}
                    className="px-2 py-1 text-xs border border-[#d1d5db] rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-50"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-sm text-gray-600">Loading records...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "all"
                      ? "border-[#1f2937] ring-2 ring-[#1f2937]"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("all")}
                >
                  <div className="text-base font-semibold text-[#1f2937]">
                    {stats.total}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Total</div>
                </div>
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "Active"
                      ? "border-green-600 ring-2 ring-green-600"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("Active")}
                >
                  <div className="text-base font-semibold text-green-600">
                    {stats.active}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Active</div>
                </div>
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "Expiring"
                      ? "border-orange-600 ring-2 ring-orange-600"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("Expiring")}
                >
                  <div className="text-base font-semibold text-orange-600">
                    {stats.expiring}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Expiring</div>
                </div>
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "Expired"
                      ? "border-red-600 ring-2 ring-red-600"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("Expired")}
                >
                  <div className="text-base font-semibold text-red-600">
                    {stats.expired}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Expired</div>
                </div>
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "Draft"
                      ? "border-gray-600 ring-2 ring-gray-600"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("Draft")}
                >
                  <div className="text-base font-semibold text-gray-600">
                    {stats.draft}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Draft</div>
                </div>
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "Renewal Pending"
                      ? "border-purple-600 ring-2 ring-purple-600"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("Renewal Pending")}
                >
                  <div className="text-base font-semibold text-purple-600">
                    {stats.renewal}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Renewal</div>
                </div>
                <div
                  className={`bg-white p-1.5 rounded border cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === "With Docs"
                      ? "border-blue-600 ring-2 ring-blue-600"
                      : "border-[#d1d5db]"
                  }`}
                  onClick={() => setSelectedStatus("With Docs")}
                >
                  <div className="text-base font-semibold text-blue-600">
                    {stats.withDocs}
                  </div>
                  <div className="text-[10px] text-[#6b7280]">Docs</div>
                </div>
              </div>

              {/* Scrollable Table Container */}
              <div
                className="bg-white rounded-lg shadow-sm border border-gray-200"
                style={{
                  height: "calc(100vh - 220px)",
                  minHeight: "400px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
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
                  <style jsx>{`
                    .sheet-table {
                      min-width: 4000px;
                      border-collapse: collapse;
                    }
                    .sheet-table th,
                    .sheet-table td {
                      padding: 4px 8px;
                      font-size: 11px;
                    }
                    .sheet-table th {
                      font-size: 10px;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
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
                      height: 35.5px;
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
                        <th style={{ width: "150px" }}>Doc Availability</th>
                        <th style={{ width: "180px" }}>HO Approval</th>
                        <th style={{ width: "180px" }}>Signed Agreement</th>
                        <th style={{ width: "100px" }}>Actions</th>
                        <th style={{ minWidth: "250px" }}>Description</th>
                        <th style={{ minWidth: "200px" }}>About Company</th>
                        <th style={{ minWidth: "200px" }}>Company Address</th>
                        <th style={{ width: "180px" }}>Company Website</th>
                        <th style={{ width: "90px" }}>Relationship</th>
                        <th style={{ width: "150px" }}>Industry Contact</th>
                        <th style={{ width: "120px" }}>Industry Mobile</th>
                        <th style={{ width: "180px" }}>Industry Email</th>
                        <th style={{ width: "150px" }}>Institution Contact</th>
                        <th style={{ width: "120px" }}>Institution Mobile</th>
                        <th style={{ width: "180px" }}>Institution Email</th>
                        <th style={{ width: "150px" }}>Clubs Aligned</th>
                        <th style={{ width: "150px" }}>SDG Goals</th>
                        <th style={{ minWidth: "200px" }}>
                          Skills/Technologies
                        </th>
                        <th style={{ width: "90px" }}>Per Student Cost</th>
                        <th style={{ width: "90px" }}>Placement</th>
                        <th style={{ width: "90px" }}>Internship</th>
                        <th style={{ width: "80px" }}>Renewal</th>
                        <th style={{ minWidth: "200px" }}>Benefits Achieved</th>

                        <th style={{ width: "120px" }}>Created By</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, index) => {
                        const globalIndex =
                          (currentPage - 1) * itemsPerPage + index;
                        const isEditable = canEdit(
                          record.createdBy,
                          record.department,
                        );

                        // Helper function to get field type icon
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
                          ];
                          // Large text fields that shouldn't show icons
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
                            return (
                              <span
                                className="inline-block ml-1 text-orange-600 font-bold"
                                style={{ fontSize: "10px" }}
                              >
                                123
                              </span>
                            );
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
                            displayContent =
                              content.substring(0, truncateLength) + "...";
                          }

                          // Filter out invalid placeholder values
                          if (displayContent === "file chosen") {
                            displayContent = "";
                          }

                          return (
                            <td
                              className={`${className} ${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                              contentEditable={isEditing}
                              suppressContentEditableWarning
                              onClick={() =>
                                isEditable && handleCellClick(record, field)
                              }
                              onBlur={(e) => {
                                if (isEditing) {
                                  handleInlineFieldChange(
                                    field,
                                    e.currentTarget.textContent || "",
                                  );
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
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="text-center text-xs text-[#6b7280]">
                              {globalIndex + 1}
                            </td>
                            <td className="font-medium text-[#2563eb] font-mono">
                              {record.id}
                            </td>
                            {renderEditableCell(
                              "companyName",
                              record.companyName,
                              "",
                            )}
                            {(() => {
                              const maintainedByValue =
                                record.maintainedBy || "Departments";
                              const isDeptEditable =
                                maintainedByValue === "Departments";
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
                                    isEditable &&
                                    handleCellClick(record, "scope")
                                  }
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
                                >
                                  {isEditing ? (
                                    <CellDropdown
                                      options={[
                                        {
                                          value: "National",
                                          label: "National",
                                        },
                                        {
                                          value: "International",
                                          label: "International",
                                        },
                                      ]}
                                      value={
                                        inlineEditData.scope ||
                                        record.scope ||
                                        "National"
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
                                    isEditable &&
                                    handleCellClick(record, "maintainedBy")
                                  }
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
                                >
                                  {isEditing ? (
                                    <CellDropdown
                                      options={[
                                        {
                                          value: "Institution",
                                          label: "Institution",
                                        },
                                        {
                                          value: "Incubation",
                                          label: "Incubation",
                                        },
                                        {
                                          value: "Departments",
                                          label: "Departments",
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
                                      <span>
                                        {record.maintainedBy || "Departments"}
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

                              // Convert dd.mm.yyyy to yyyy-mm-dd for date input
                              const convertToInputFormat = (
                                dateStr: string,
                              ) => {
                                if (!dateStr) return "";
                                const [day, month, year] = dateStr.split(".");
                                return `${year}-${month}-${day}`;
                              };

                              return (
                                <td
                                  className={`${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                                  onClick={() =>
                                    isEditable &&
                                    handleCellClick(record, "fromDate")
                                  }
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
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
                                          const [year, month, day] =
                                            val.split("-");
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
                                      <FiCalendar
                                        className="text-blue-500"
                                        size={12}
                                      />
                                    </span>
                                  )}
                                </td>
                              );
                            })()}
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

                              // Convert dd.mm.yyyy to yyyy-mm-dd for date input
                              const convertToInputFormat = (
                                dateStr: string,
                              ) => {
                                if (!dateStr) return "";
                                const [day, month, year] = dateStr.split(".");
                                return `${year}-${month}-${day}`;
                              };

                              return (
                                <td
                                  className={`${isEditable ? "cursor-text hover:bg-blue-50" : ""}`}
                                  onClick={() =>
                                    isEditable &&
                                    handleCellClick(record, "toDate")
                                  }
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
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
                                          const [year, month, day] =
                                            val.split("-");
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
                                      <span>
                                        {formatDisplayDate(record.toDate)}
                                      </span>
                                      <FiCalendar
                                        className="text-blue-500"
                                        size={12}
                                      />
                                    </span>
                                  )}
                                </td>
                              );
                            })()}
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
                                  className={`text-xs relative ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}`}
                                  onClick={() =>
                                    isEditable &&
                                    handleCellClick(
                                      record,
                                      "documentAvailability",
                                    )
                                  }
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
                                >
                                  {isEditing ? (
                                    <CellDropdown
                                      options={[
                                        {
                                          value: "Available",
                                          label: "Available",
                                        },
                                        {
                                          value: "Not Available",
                                          label: "Not Available",
                                        },
                                      ]}
                                      value={
                                        inlineEditData.documentAvailability ||
                                        record.documentAvailability ||
                                        "Not Available"
                                      }
                                      onChange={(value) =>
                                        saveFieldDirectly(
                                          "documentAvailability",
                                          value,
                                        )
                                      }
                                      onClose={cancelInlineEdit}
                                      placeholder="Not Available"
                                    />
                                  ) : (
                                    <span className="flex items-center justify-between gap-1">
                                      <span>
                                        {record.documentAvailability ||
                                          "Not Available"}
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
                            <td className="text-xs text-center">
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
                                {user?.role === "admin" && (
                                  <>
                                    {record.hodApprovalDoc && (
                                      <span className="text-gray-300">|</span>
                                    )}
                                    <label
                                      className={`relative cursor-pointer px-2 py-1 text-white rounded transition-colors flex items-center gap-1 text-xs ${record.hodApprovalDoc ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
                                    >
                                      {uploadingDoc?.recordId === record.id &&
                                      uploadingDoc?.field ===
                                        "hodApprovalDoc" ? (
                                        <span className="flex items-center gap-1">
                                          <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                                          Uploading...
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <FiUpload />
                                          {record.hodApprovalDoc
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
                                              "hodApprovalDoc",
                                              file,
                                            );
                                          }
                                          e.target.value = "";
                                        }}
                                        disabled={
                                          uploadingDoc?.recordId ===
                                            record.id &&
                                          uploadingDoc?.field ===
                                            "hodApprovalDoc"
                                        }
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </label>
                                  </>
                                )}
                                {!record.hodApprovalDoc &&
                                  user?.role !== "admin" &&
                                  "-"}
                              </div>
                            </td>
                            <td className="text-xs text-center">
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
                                {user?.role === "admin" && (
                                  <>
                                    {record.signedAgreementDoc && (
                                      <span className="text-gray-300">|</span>
                                    )}
                                    <label
                                      className={`relative cursor-pointer px-2 py-1 text-white rounded transition-colors flex items-center gap-1 text-xs ${record.signedAgreementDoc ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
                                    >
                                      {uploadingDoc?.recordId === record.id &&
                                      uploadingDoc?.field ===
                                        "signedAgreementDoc" ? (
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
                                          uploadingDoc?.recordId ===
                                            record.id &&
                                          uploadingDoc?.field ===
                                            "signedAgreementDoc"
                                        }
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </label>
                                  </>
                                )}
                                {!record.signedAgreementDoc &&
                                  user?.role !== "admin" &&
                                  "-"}
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-1">
                                {isEditable && (
                                  <>
                                    <button
                                      onClick={() => handleEdit(record)}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Form
                                    </button>
                                    <span className="text-[#d1d5db]">|</span>
                                  </>
                                )}
                                <button
                                  onClick={() => setViewingRecord(record)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  View
                                </button>
                                {canDelete() && (
                                  <>
                                    <span className="text-[#d1d5db]">|</span>
                                    <button
                                      onClick={() =>
                                        handleDeleteRecord(record.id)
                                      }
                                      className="text-xs text-red-600 hover:text-red-800"
                                    >
                                      Del
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
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
                                      handleInlineFieldChange(
                                        "companyWebsite",
                                        e.currentTarget.textContent || "",
                                      );
                                    }
                                  }}
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
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
                                        ? record.companyWebsite.substring(
                                            0,
                                            30,
                                          ) + "..."
                                        : record.companyWebsite}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              );
                            })()}
                            {(() => {
                              const isEditing =
                                editingCell?.recordId === record.id &&
                                editingCell?.field === "companyRelationship";
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
                                    handleCellClick(
                                      record,
                                      "companyRelationship",
                                    )
                                  }
                                  style={cellStyle}
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
                                >
                                  {isEditing ? (
                                    <CellDropdown
                                      options={[
                                        { value: "1", label: "1 - Poor" },
                                        { value: "2", label: "2 - Fair" },
                                        { value: "3", label: "3 - Good" },
                                        { value: "4", label: "4 - Very Good" },
                                        { value: "5", label: "5 - Excellent" },
                                      ]}
                                      value={String(
                                        inlineEditData.companyRelationship ||
                                          record.companyRelationship ||
                                          3,
                                      )}
                                      onChange={(value) =>
                                        saveFieldDirectly(
                                          "companyRelationship",
                                          parseInt(value),
                                        )
                                      }
                                      onClose={cancelInlineEdit}
                                      placeholder="3 - Good"
                                    />
                                  ) : (
                                    record.companyRelationship || 3
                                  )}
                                </td>
                              );
                            })()}
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
                            {renderEditableCell(
                              "clubsAligned",
                              record.clubsAligned || "-",
                              "text-xs",
                            )}
                            {renderEditableCell(
                              "sdgGoals",
                              record.sdgGoals || "-",
                              "text-xs",
                            )}
                            {renderEditableCell(
                              "skillsTechnologies",
                              record.skillsTechnologies || "-",
                              "text-xs",
                              50,
                            )}
                            {renderEditableCell(
                              "perStudentCost",
                              record.perStudentCost || 0,
                              "text-center",
                            )}
                            {renderEditableCell(
                              "placementOpportunity",
                              record.placementOpportunity || 0,
                              "text-center",
                            )}
                            {renderEditableCell(
                              "internshipOpportunity",
                              record.internshipOpportunity || 0,
                              "text-center",
                            )}
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
                                  title={
                                    isEditable && !isEditing
                                      ? "Click to edit"
                                      : ""
                                  }
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
                                        saveFieldDirectly(
                                          "goingForRenewal",
                                          value,
                                        )
                                      }
                                      onClose={cancelInlineEdit}
                                      placeholder="No"
                                    />
                                  ) : (
                                    <span className="flex items-center justify-between gap-1">
                                      <span>
                                        {record.goingForRenewal || "No"}
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
                            {renderEditableCell(
                              "benefitsAchieved",
                              record.benefitsAchieved || "-",
                              "text-xs",
                              50,
                            )}
                            <td className="text-xs">{record.createdByName}</td>
                            
                          </tr>
                        );
                      })}
                      {records.length === 0 && (
                        <tr>
                          <td
                            colSpan={33}
                            className="text-center py-8 text-[#6b7280]"
                          >
                            No records found. Click &quot;+ New Mou&quot; to add
                            your first eMoU.
                          </td>
                        </tr>
                      )}
                      {/* Empty rows to ensure scrollbar is always visible */}
                      {records.length > 0 &&
                        records.length < 20 &&
                        [...Array(20 - records.length)].map((_, i) => (
                          <tr
                            key={`empty-${i}`}
                            className="h-10 border-b border-gray-100"
                          >
                            {[...Array(33)].map((_, j) => (
                              <td
                                key={`empty-cell-${i}-${j}`}
                                className="bg-gray-50/30"
                              >
                                &nbsp;
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <ImportDialog
          onImport={handleBulkImport}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </ProtectedRoute>
  );
}

export default function Home() {
  return <HomePage />;
}
