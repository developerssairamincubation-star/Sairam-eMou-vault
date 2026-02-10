"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import DocumentViewer from "@/components/DocumentViewer";
import ViewRecordDialog from "@/components/ViewRecordDialog";
import { CellDropdown } from "@/components/CustomDropdown";
import {
  User,
  UserRole,
  DepartmentCode,
  EMoURecord,
  EMoUStatus,
} from "@/types";
import { getAllUsers, getEMoUs, updateEMoU } from "@/lib/firestore";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  FiUpload,
  FiCheck,
  FiX,
  FiClock,
  FiEye,
  FiArrowLeft,
  FiUserPlus,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";

function AdminPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRecords, setPendingRecords] = useState<EMoURecord[]>([]);
  const [draftRecords, setDraftRecords] = useState<EMoURecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<EMoURecord[]>([]);
  const [activeTab, setActiveTab] = useState<
    "users" | "pending" | "drafts" | "approved"
  >(currentUser?.role === "master" ? "pending" : "users");
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [viewingRecord, setViewingRecord] = useState<EMoURecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "hod" as UserRole,
    department: "" as DepartmentCode | "",
  });
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<{
    recordId: string;
    field: "hodApprovalDoc" | "signedAgreementDoc";
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    recordId: string;
    field: string;
  } | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<EMoURecord>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
  ];

  useEffect(() => {
    // Allow both admin and master roles
    if (currentUser?.role !== "admin" && currentUser?.role !== "master") {
      router.push("/");
    } else {
      loadUsers();
      loadApprovalRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [editingCell, inlineEditData]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalRecords = async () => {
    try {
      const allRecords = await getEMoUs();

      // Filter based on department and status
      let filtered = allRecords;

      if (selectedDepartment !== "all") {
        filtered = filtered.filter((r) => r.department === selectedDepartment);
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((r) => {
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

      setPendingRecords(filtered.filter((r) => r.approvalStatus === "pending"));
      setDraftRecords(filtered.filter((r) => r.approvalStatus === "draft"));
      setApprovedRecords(
        filtered.filter((r) => r.approvalStatus === "approved"),
      );
    } catch (error) {
      console.error("Failed to load approval records:", error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin" || currentUser?.role === "master") {
      loadApprovalRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, searchTerm]);

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

  // Helper function to parse date in DD.MM.YYYY format
  function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split(".").map(Number);
    return new Date(year, month - 1, day);
  }

  const handleCellClick = (record: EMoURecord, field: keyof EMoURecord) => {
    // Non-editable fields - same restrictions as main page
    if (
      field !== "id" &&
      field !== "status" &&
      field !== "createdBy" &&
      field !== "createdByName" &&
      field !== "createdAt" &&
      field !== "updatedBy" &&
      field !== "updatedByName" &&
      field !== "updatedAt"
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
      const updates: Partial<EMoURecord> = { [field]: value };

      // Auto-update status when toDate changes
      if (field === "toDate" && typeof value === "string") {
        const dateStr = value.toLowerCase();
        if (dateStr === "perpetual" || dateStr === "indefinite") {
          updates.status = "Active" as EMoUStatus;
        } else {
          // Parse DD.MM.YYYY format
          const parts = value.split(".");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            const toDate = new Date(year, month, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (toDate >= today) {
              updates.status = "Active" as EMoUStatus;
            } else {
              updates.status = "Expired" as EMoUStatus;
            }
          }
        }
      }

      return { ...prev, ...updates };
    });
  };

  const saveInlineEdit = async () => {
    if (!editingCell || !currentUser) return;

    try {
      const updatedData = {
        ...inlineEditData,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: new Date(),
      };

      await updateEMoU(editingCell.recordId, updatedData);

      // Update local state
      setPendingRecords((prev) =>
        prev.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updatedData } : r,
        ),
      );
      setDraftRecords((prev) =>
        prev.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updatedData } : r,
        ),
      );
      setApprovedRecords((prev) =>
        prev.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updatedData } : r,
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

  // Save a specific field value directly, bypassing stale state issues with onBlur
  const saveFieldDirectly = async (
    field: keyof EMoURecord,
    value: string | number,
  ) => {
    if (!editingCell || !currentUser) return;

    try {
      const updates: Partial<EMoURecord> = {
        ...inlineEditData,
        [field]: value,
      };

      // Auto-update status when toDate changes
      if (field === "toDate" && typeof value === "string") {
        const dateStr = value.toLowerCase();
        // Check for perpetual text or large year dates
        const parts = value.split(".");
        const isLargeYear =
          parts.length === 3 && parseInt(parts[2], 10) >= 9000;

        if (
          dateStr === "perpetual" ||
          dateStr === "indefinite" ||
          isLargeYear
        ) {
          updates.status = "Active" as EMoUStatus;
        } else {
          const parts = value.split(".");
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const toDate = new Date(year, month, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (toDate >= today) {
              updates.status = "Active" as EMoUStatus;
            } else {
              updates.status = "Expired" as EMoUStatus;
            }
          }
        }
      }

      // Auto-update department when maintainedBy changes
      if (field === "maintainedBy" && typeof value === "string") {
        if (value === "Institution" || value === "Incubation") {
          updates.department = value as DepartmentCode;
        } else if (value === "Departments") {
          const currentDept = (inlineEditData.department as string) || "";
          if (currentDept === "Institution" || currentDept === "Incubation") {
            updates.department = "CSE" as DepartmentCode;
          }
        }
      }

      const updatedData = {
        ...updates,
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName,
        updatedAt: new Date(),
      };

      await updateEMoU(editingCell.recordId, updatedData);

      setPendingRecords((prev) =>
        prev.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updatedData } : r,
        ),
      );
      setDraftRecords((prev) =>
        prev.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updatedData } : r,
        ),
      );
      setApprovedRecords((prev) =>
        prev.map((r) =>
          r.id === editingCell.recordId ? { ...r, ...updatedData } : r,
        ),
      );

      setEditingCell(null);
      setInlineEditData({});
    } catch (error) {
      console.error("Failed to update record:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
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

  const handleApproveRecord = async (recordId: string) => {
    try {
      await updateEMoU(recordId, { approvalStatus: "approved" });
      setAlert({ message: "Record approved successfully!", type: "success" });
      await loadApprovalRecords();
    } catch (error) {
      console.error("Failed to approve record:", error);
      setAlert({ message: "Failed to approve record", type: "error" });
    }
  };

  const handleRejectRecord = async (recordId: string) => {
    setConfirmDialog({
      title: "Reject Record",
      message: "Are you sure you want to reject this record?",
      onConfirm: async () => {
        try {
          await updateEMoU(recordId, { approvalStatus: "rejected" });
          setAlert({ message: "Record rejected", type: "info" });
          await loadApprovalRecords();
        } catch (error) {
          console.error("Failed to reject record:", error);
          setAlert({ message: "Failed to reject record", type: "error" });
        }
        setConfirmDialog(null);
      },
    });
  };

  const handleMoveToPending = async (recordId: string) => {
    try {
      await updateEMoU(recordId, { approvalStatus: "pending" });
      setAlert({
        message: "Record moved to pending approval!",
        type: "success",
      });
      await loadApprovalRecords();
    } catch (error) {
      console.error("Failed to move record:", error);
      setAlert({ message: "Failed to move record", type: "error" });
    }
  };

  const handleFileUpload = async (
    recordId: string,
    field: "hodApprovalDoc" | "signedAgreementDoc",
    file: File,
  ) => {
    setUploadingDoc({ recordId, field });
    try {
      // Delete old file from Cloudinary if replacing
      const allRecords = [
        ...pendingRecords,
        ...draftRecords,
        ...approvedRecords,
      ];
      const existingRecord = allRecords.find((r) => r.id === recordId);
      const oldUrl = existingRecord?.[field];
      if (oldUrl) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const idToken = await currentUser.getIdToken();
          await deleteFromCloudinary(oldUrl, idToken);
        }
      }

      const result = await uploadToCloudinary(file);

      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed");
      }

      await updateEMoU(recordId, {
        [field]: result.url,
      });

      await loadApprovalRecords();
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

  const parseEmailAndSetDefaults = (email: string, role: UserRole) => {
    // Check if email matches pattern: hod.dept@sairam.edu.in
    const hodEmailPattern = /^hod\.([a-z]+)@sairam\.edu\.in$/i;
    const hodMatch = email.toLowerCase().match(hodEmailPattern);

    if (hodMatch && role === "hod") {
      const deptLower = hodMatch[1];
      const deptUpper = deptLower.toUpperCase();

      // Check if dept is valid
      const validDepts = [
        "CSE",
        "ECE",
        "MECH",
        "CIVIL",
        "EEE",
        "IT",
        "AIDS",
        "CSBS",
      ];
      if (validDepts.includes(deptUpper)) {
        setFormData((prev) => ({
          ...prev,
          displayName: `${deptUpper} HOD`,
          department: deptUpper as DepartmentCode,
        }));
      }
    }
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });
    if (email.includes("@")) {
      parseEmailAndSetDefaults(email, formData.role);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({ ...formData, role });
    if (formData.email.includes("@")) {
      parseEmailAndSetDefaults(formData.email, role);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Get current user's ID token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const idToken = await user.getIdToken();

      // Call secure API endpoint with Admin SDK
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          department: formData.department || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setShowForm(false);
      setFormData({
        email: "",
        displayName: "",
        role: "hod",
        department: "",
      });

      await loadUsers();
      setAlert({
        message: `User created successfully! Welcome email with credentials sent to ${data.email}`,
        type: "success",
      });
    } catch (error) {
      const err = error as Error;
      console.error("Failed to create user:", err);
      setAlert({
        message: `Failed to create user: ${err.message}`,
        type: "error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!uid) {
      setAlert({ message: "Error: User ID is missing", type: "error" });
      return;
    }

    const user = users.find((u) => u.uid === uid);

    setConfirmDialog({
      title: "Delete User",
      message: `Are you sure you want to delete user "${user?.displayName || user?.email}"?\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          // Get current user's ID token
          const currentAuthUser = auth.currentUser;
          if (!currentAuthUser) {
            throw new Error("Not authenticated");
          }

          const idToken = await currentAuthUser.getIdToken();

          // Call secure API endpoint to delete user
          const response = await fetch(
            `/api/admin/delete-user?uid=${encodeURIComponent(uid)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to delete user");
          }

          await loadUsers();
          setAlert({ message: "User deleted successfully!", type: "success" });
        } catch (error) {
          const err = error as Error;
          console.error("Failed to delete user:", err);
          setAlert({
            message: `Failed to delete user: ${err.message}`,
            type: "error",
          });
        }
      },
    });
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "master":
        return "bg-blue-100 text-blue-800";
      case "hod":
        return "bg-green-100 text-green-800";
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

  const getDisplayStatus = (record: EMoURecord): string => {
    // Handle "file chosen" placeholder (cast to string to avoid type error)
    const statusStr = record.status as string;
    if (statusStr === "file chosen") {
      return "Draft";
    }

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

  // Render comprehensive table with all fields
  const renderRecordTable = (
    records: EMoURecord[],
    showApprovalActions: boolean,
  ) => {
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
          <FiCalendar className="inline-block ml-1 text-blue-500" size={12} />
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
      record: EMoURecord,
      field: keyof EMoURecord,
      content: React.ReactNode,
      className: string = "text-xs",
      truncateLength?: number,
    ) => {
      const isEditing =
        editingCell?.recordId === record.id && editingCell?.field === field;
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

      // Filter out invalid placeholder values
      if (
        displayContent === "file chosen" ||
        displayContent === "file chosen"
      ) {
        displayContent = "";
      }

      return (
        <td
          className={`${className} cursor-text hover:bg-blue-50`}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onClick={() => handleCellClick(record, field)}
          onBlur={(e) => {
            if (isEditing) {
              handleInlineFieldChange(field, e.currentTarget.textContent || "");
            }
          }}
          style={cellStyle}
          title={
            truncateLength && typeof content === "string"
              ? content
              : !isEditing
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
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200"
        style={{
          height: "calc(100vh - 290px)",
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
              height: 32px;
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
                <th style={{ width: "150px" }}>Doc Availability</th>
                <th style={{ width: "180px" }}>HO Approval</th>
                <th style={{ width: "180px" }}>Signed Agreement</th>
                <th style={{ width: "120px" }}>Created By</th>
                <th style={{ width: showApprovalActions ? "200px" : "100px" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                const renderSelectCell = (
                  field: keyof EMoURecord,
                  options: { value: string; label: string }[],
                  defaultValue: string,
                ) => {
                  const isEditing =
                    editingCell?.recordId === record.id &&
                    editingCell?.field === field;

                  const currentValue = String(
                    (record[field] as string) === "file chosen"
                      ? defaultValue
                      : (record[field] as string) || defaultValue,
                  );

                  return (
                    <td
                      className="text-center cursor-pointer hover:bg-blue-50 relative"
                      onClick={() => {
                        if (!isEditing) {
                          handleCellClick(record, field);
                        }
                      }}
                      style={
                        isEditing ? { padding: 0, overflow: "visible" } : {}
                      }
                      title={!isEditing ? "Click to select" : ""}
                    >
                      {isEditing ? (
                        <CellDropdown
                          options={options}
                          value={currentValue}
                          onChange={(value) => saveFieldDirectly(field, value)}
                          onClose={cancelInlineEdit}
                          placeholder={defaultValue}
                        />
                      ) : (
                        <span className="flex items-center justify-between gap-1 px-2 py-1">
                          <span className="text-xs">{currentValue}</span>
                          <FiChevronDown
                            className="text-blue-600 flex-shrink-0"
                            size={14}
                          />
                        </span>
                      )}
                    </td>
                  );
                };

                const renderDateCell = (field: "fromDate" | "toDate") => {
                  const isEditing =
                    editingCell?.recordId === record.id &&
                    editingCell?.field === field;
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
                      className="cursor-text hover:bg-blue-50"
                      onClick={() => handleCellClick(record, field)}
                      style={cellStyle}
                      title="Click to edit"
                    >
                      {isEditing ? (
                        <input
                          type="date"
                          defaultValue={convertToInputFormat(
                            record[field] === "file chosen" ||
                              record[field] === "file chosen"
                              ? ""
                              : record[field],
                          )}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const [year, month, day] = val.split("-");
                              handleInlineFieldChange(
                                field,
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
                      ) : (
                        <span className="flex items-center justify-between gap-1">
                          <span>
                            {record[field] === "file chosen" ||
                            record[field] === "file chosen"
                              ? ""
                              : formatDisplayDate(record[field])}
                          </span>
                          <FiCalendar className="text-blue-500" size={12} />
                        </span>
                      )}
                    </td>
                  );
                };

                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="text-center text-xs text-[#6b7280]">
                      {index + 1}
                    </td>
                    <td className="font-medium text-[#2563eb] font-mono">
                      {record.id}
                    </td>
                    {renderEditableCell(
                      record,
                      "companyName",
                      record.companyName,
                      "",
                    )}
                    {(() => {
                      const maintainedByValue =
                        record.maintainedBy || "Departments";
                      const isDeptEditable =
                        maintainedByValue === "Departments";

                      if (isDeptEditable) {
                        return renderSelectCell(
                          "department",
                          departments.map((d) => ({ value: d, label: d })),
                          record.department,
                        );
                      }

                      return (
                        <td
                          className="text-center text-xs"
                          title={`Set by Maintained By: ${maintainedByValue}`}
                        >
                          <span className="text-[#6b7280] italic">
                            {maintainedByValue}
                          </span>
                        </td>
                      );
                    })()}
                    {renderSelectCell(
                      "scope",
                      [
                        { value: "National", label: "National" },
                        { value: "International", label: "International" },
                      ],
                      "National",
                    )}
                    {renderSelectCell(
                      "maintainedBy",
                      [
                        { value: "Institution", label: "Institution" },
                        { value: "Incubation", label: "Incubation" },
                        { value: "Departments", label: "Departments" },
                      ],
                      "Departments",
                    )}
                    {renderDateCell("fromDate")}
                    {renderDateCell("toDate")}
                    {/* Status is auto-calculated - NOT editable */}
                    <td
                      className="text-center"
                      title="Status is auto-calculated based on expiry date"
                    >
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          getDisplayStatus(record),
                        )}`}
                      >
                        {getDisplayStatus(record)}
                      </span>
                    </td>
                    {renderEditableCell(
                      record,
                      "description",
                      record.description,
                      "text-xs",
                      80,
                    )}
                    {renderEditableCell(
                      record,
                      "aboutCompany",
                      record.aboutCompany || "-",
                      "text-xs",
                      50,
                    )}
                    {renderEditableCell(
                      record,
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
                          className="text-xs cursor-text hover:bg-blue-50"
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          onClick={() =>
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
                          title="Click to edit"
                        >
                          {isEditing ? (
                            record.companyWebsite || ""
                          ) : record.companyWebsite ? (
                            <a
                              href={record.companyWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                              onClick={(e) => e.stopPropagation()}
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
                    {renderSelectCell(
                      "companyRelationship",
                      [
                        { value: "1", label: "1 - Poor" },
                        { value: "2", label: "2 - Fair" },
                        { value: "3", label: "3 - Good" },
                        { value: "4", label: "4 - Very Good" },
                        { value: "5", label: "5 - Excellent" },
                      ],
                      "3",
                    )}
                    {renderEditableCell(
                      record,
                      "industryContactName",
                      record.industryContactName || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "industryContactMobile",
                      record.industryContactMobile || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "industryContactEmail",
                      record.industryContactEmail || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "institutionContactName",
                      record.institutionContactName || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "institutionContactMobile",
                      record.institutionContactMobile || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "institutionContactEmail",
                      record.institutionContactEmail || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "clubsAligned",
                      record.clubsAligned || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "sdgGoals",
                      record.sdgGoals || "-",
                      "text-xs",
                    )}
                    {renderEditableCell(
                      record,
                      "skillsTechnologies",
                      record.skillsTechnologies || "-",
                      "text-xs",
                      50,
                    )}
                    {renderEditableCell(
                      record,
                      "perStudentCost",
                      record.perStudentCost || 0,
                      "text-center",
                    )}
                    {renderEditableCell(
                      record,
                      "placementOpportunity",
                      record.placementOpportunity || 0,
                      "text-center",
                    )}
                    {renderEditableCell(
                      record,
                      "internshipOpportunity",
                      record.internshipOpportunity || 0,
                      "text-center",
                    )}
                    {renderSelectCell(
                      "goingForRenewal",
                      [
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" },
                      ],
                      "No",
                    )}
                    {renderEditableCell(
                      record,
                      "benefitsAchieved",
                      record.benefitsAchieved || "-",
                      "text-xs",
                      50,
                    )}
                    {renderSelectCell(
                      "documentAvailability",
                      [
                        { value: "Available", label: "Available" },
                        { value: "Not Available", label: "Not Available" },
                      ],
                      "Not Available",
                    )}
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
                            className="text-blue-600 hover:underline cursor-pointer text-xs flex items-center gap-1"
                          >
                            <FiEye /> View
                          </button>
                        )}
                        {record.hodApprovalDoc && (
                          <span className="text-gray-300">|</span>
                        )}
                        <label
                          className={`relative cursor-pointer px-2 py-1 text-white rounded transition-colors flex items-center gap-1 text-xs ${record.hodApprovalDoc ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
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
                        {!record.hodApprovalDoc}
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
                            className="text-blue-600 hover:underline cursor-pointer text-xs flex items-center gap-1"
                          >
                            <FiEye /> View
                          </button>
                        )}
                        {record.signedAgreementDoc && (
                          <span className="text-gray-300">|</span>
                        )}
                        <label
                          className={`relative cursor-pointer px-2 py-1 text-white rounded transition-colors flex items-center gap-1 text-xs ${record.signedAgreementDoc ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
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
                              {record.signedAgreementDoc ? "Replace" : "Upload"}
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
                        {!record.signedAgreementDoc}
                      </div>
                    </td>
                    <td className="text-xs">{record.createdByName}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {showApprovalActions && (
                          <>
                            <button
                              onClick={() => handleApproveRecord(record.id)}
                              className="px-2 py-1 text-[10px] font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1"
                            >
                              <FiCheck /> Approve
                            </button>
                            {record.approvalStatus === "draft" && (
                              <button
                                onClick={() => handleMoveToPending(record.id)}
                                className="px-2 py-1 text-[10px] font-medium bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors flex items-center gap-1"
                              >
                                <FiClock /> To Pending
                              </button>
                            )}
                            {record.approvalStatus === "pending" && (
                              <button
                                onClick={() => handleRejectRecord(record.id)}
                                className="px-2 py-1 text-[10px] font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-1"
                              >
                                <FiX /> Reject
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => setViewingRecord(record)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <FiEye /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={33} className="text-center py-8 text-[#6b7280]">
                    No records found.
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
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <div className="min-h-screen bg-[#f8f9fa]">
        {/* Header */}
        <header className="bg-white border-b border-[#d1d5db] sticky top-0 z-20">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-[#1f2937]">
                  {currentUser?.role === "master"
                    ? "Master Approval Dashboard"
                    : "Admin Dashboard"}
                </h1>
                <p className="text-xs text-[#6b7280]">
                  {currentUser?.role === "master"
                    ? "Review and approve eMoU records"
                    : "User Management & System Administration"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/")}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FiArrowLeft /> Back to eMoUs
                </button>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {showForm ? (
                    <>
                      <FiX /> Cancel
                    </>
                  ) : (
                    <>
                      <FiUserPlus /> New User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-[#d1d5db] mb-6">
            <div className="flex border-b border-[#d1d5db]">
              {currentUser?.role === "admin" && (
                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === "users"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  User Management
                </button>
              )}
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "pending"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pending Approvals
                {pendingRecords.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                    {pendingRecords.length}
                  </span>
                )}
              </button>
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
                onClick={() => setActiveTab("approved")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "approved"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Approved Records
                {approvedRecords.length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    {approvedRecords.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters Bar - Show for record tabs only */}
          {activeTab !== "users" && (
            <div className="bg-white border border-[#d1d5db] rounded-lg px-6 py-3 mb-6">
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-[#4b5563]">
                    Department:
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
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
              </div>
            </div>
          )}

          {/* User Management Tab - Admin Only */}
          {activeTab === "users" && currentUser?.role === "admin" && (
            <>
              {/* New User Form - Professional Dialog */}
              {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                      <div className="text-white">
                        <h2 className="text-lg font-semibold">
                          Create New User
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Add a new user to the system
                        </p>
                      </div>
                      <button
                        onClick={() => setShowForm(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
                        aria-label="Close"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleCreateUser}>
                      <div className="px-6 py-5 bg-gray-50 space-y-4">
                        {/* Info Banner */}
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                          <div className="flex items-start">
                            <svg
                              className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <div>
                              <p className="text-xs font-medium text-blue-900">
                                Automated Email Delivery
                              </p>
                              <p className="text-xs text-blue-700 mt-0.5">
                                Welcome email with credentials and verification
                                link will be sent automatically
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Form Fields */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Email */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Email Address{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                  handleEmailChange(e.target.value)
                                }
                                required
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="user@sairam.edu.in"
                                disabled={isCreating}
                              />
                            </div>

                            {/* Display Name */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Display Name{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    displayName: e.target.value,
                                  })
                                }
                                required
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Dr. John Doe"
                                disabled={isCreating}
                              />
                            </div>

                            {/* Role */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Role <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={formData.role}
                                onChange={(e) =>
                                  handleRoleChange(e.target.value as UserRole)
                                }
                                required
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isCreating}
                              >
                                <option value="hod">HOD User</option>
                                <option value="master">Master User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>

                            {/* Department */}
                            {formData.role === "hod" && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Department{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={formData.department}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      department: e.target
                                        .value as DepartmentCode,
                                    })
                                  }
                                  required
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={isCreating}
                                >
                                  <option value="">Select Department</option>
                                  <option value="CSE">CSE</option>
                                  <option value="ECE">ECE</option>
                                  <option value="MECH">MECH</option>
                                  <option value="CIVIL">CIVIL</option>
                                  <option value="EEE">EEE</option>
                                  <option value="IT">IT</option>
                                  <option value="AIDS">AIDS</option>
                                  <option value="CSBS">CSBS</option>
                                  <option value="E&I">E&I</option>
                                  <option value="MECHATRONICS">
                                    MECHATRONICS
                                  </option>
                                  <option value="CCE">CCE</option>
                                  <option value="AIML">AIML</option>
                                  <option value="CYBERSECURITY">
                                    CYBERSECURITY
                                  </option>
                                  <option value="IOT">IOT</option>
                                  <option value="EICE">EICE</option>
                                  <option value="CSE MTECH">CSE MTECH</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                          disabled={isCreating}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Creating...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                              </svg>
                              Create User
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mt-6 mb-4">
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-[#1f2937]">
                    {users.length}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">Total Users</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-purple-600">
                    {users.filter((u) => u.role === "admin").length}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">Admins</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-green-600">
                    {users.filter((u) => u.role === "hod").length}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">HOD Users</div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>S.No</th>
                        <th style={{ width: "250px" }}>Name</th>
                        <th style={{ width: "250px" }}>Email</th>
                        <th style={{ width: "120px" }}>Role</th>
                        <th style={{ width: "120px" }}>Department</th>
                        <th style={{ width: "150px" }}>Created At</th>
                        <th style={{ width: "100px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr key="loading">
                          <td colSpan={7} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr key="empty">
                          <td
                            colSpan={7}
                            className="text-center py-8 text-[#6b7280]"
                          >
                            No users found. Click &quot;+ New User&quot; to
                            create one.
                          </td>
                        </tr>
                      ) : (
                        users.map((user, index) => (
                          <tr key={user.uid}>
                            <td className="text-center text-xs text-[#6b7280]">
                              {index + 1}
                            </td>
                            <td className="font-medium">{user.displayName}</td>
                            <td>{user.email}</td>
                            <td>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded uppercase ${getRoleBadgeColor(user.role)}`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td>{user.department || "-"}</td>
                            <td className="text-xs">
                              {user.createdAt.toLocaleDateString()}
                            </td>
                            <td>
                              {user.uid !== currentUser?.uid && (
                                <button
                                  onClick={() => handleDeleteUser(user.uid)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Pending Approvals Tab */}
          {activeTab === "pending" && (
            <div>{renderRecordTable(pendingRecords, true)}</div>
          )}

          {/* Draft Records Tab */}
          {activeTab === "drafts" && (
            <div>{renderRecordTable(draftRecords, true)}</div>
          )}

          {/* Approved Records Tab */}
          {activeTab === "approved" && (
            <div>{renderRecordTable(approvedRecords, false)}</div>
          )}
        </div>

        {viewingDocument && (
          <DocumentViewer
            url={viewingDocument.url}
            title={viewingDocument.title}
            onClose={() => setViewingDocument(null)}
          />
        )}

        {viewingRecord && (
          <ViewRecordDialog
            record={viewingRecord}
            onClose={() => setViewingRecord(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default AdminPage;
