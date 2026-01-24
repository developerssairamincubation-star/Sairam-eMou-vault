"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewRecordDialog from "@/components/ViewRecordDialog";
import DocumentViewer from "@/components/DocumentViewer";
import EMoUForm from "@/components/EMoUForm";
import ImportDialog from "@/components/ImportDialog";
import { EMoURecord } from "@/types";
import { getEMoUs, createEMoU, updateEMoU, deleteEMoU } from "@/lib/firestore";
import { useRouter } from "next/navigation";

function HomePage() {
  const { user, signOut, canEdit, canDelete } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<EMoURecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<EMoURecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EMoURecord | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
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
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<EMoURecord>>({});
  const [editingCell, setEditingCell] = useState<{ recordId: string; field: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [showAddButton, setShowAddButton] = useState(false);
  const [creatingNewRecord, setCreatingNewRecord] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Partial<EMoURecord>>({});
  const [editingNewCell, setEditingNewCell] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);

  const departments = [
    "CSE",
    "ECE",
    "MECH",
    "CIVIL",
    "EEE",
    "IT",
    "AIDS",
    "CSBS",
  ];

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, selectedDepartment, selectedStatus, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!editingCell) return;

      const target = event.target as HTMLElement;
      
      // Check if click is on an editable cell or date input
      const isEditableCell = target.hasAttribute('contenteditable') || target.closest('[contenteditable="true"]');
      const isDateInput = target.tagName === 'INPUT' && target.getAttribute('type') === 'date';
      const isWithinDateInput = target.closest('input[type="date"]');

      // If clicking outside editing cell (and not on a date input), auto-save
      if (!isEditableCell && !isDateInput && !isWithinDateInput) {
        saveInlineEdit();
      }
    };

    if (editingCell) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCell, inlineEditData, user]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getEMoUs();
      setRecords(data);
    } catch (error) {
      console.error("Failed to load records:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Only show approved records for non-admin users
    if (user?.role !== 'admin') {
      filtered = filtered.filter((r) => r.approvalStatus === 'approved');
    }

    if (selectedDepartment !== "all") {
      filtered = filtered.filter((r) => r.department === selectedDepartment);
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.companyName.toLowerCase().includes(term) ||
          r.description.toLowerCase().includes(term) ||
          r.id.toLowerCase().includes(term),
      );
    }

    // Sort by department alphabetically (A-Z), then by ID sequential number (last 3 digits)
    filtered.sort((a, b) => {
      const deptCompare = a.department.localeCompare(b.department);
      if (deptCompare !== 0) return deptCompare;
      
      // Extract last 3 digits from ID (e.g., "26CSE001" -> 1)
      const aSeq = parseInt(a.id.slice(-3));
      const bSeq = parseInt(b.id.slice(-3));
      return aSeq - bSeq;
    });

    setFilteredRecords(filtered);
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

  const handleDoubleClick = (record: EMoURecord) => {
    // Deprecated - using single click on cells now
  };

  const handleCellClick = (record: EMoURecord, field: keyof EMoURecord) => {
    if (canEdit(record.createdBy, record.department) && field !== 'id' && field !== 'createdBy' && field !== 'createdByName' && field !== 'createdAt') {
      setEditingCell({ recordId: record.id, field });
      setInlineEditData(record);
    }
  };

  const handleInlineFieldChange = (
    field: keyof EMoURecord,
    value: string | number,
  ) => {
    setInlineEditData((prev) => ({ ...prev, [field]: value }));
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
            : record
        )
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

  const handleNewRecordFieldChange = (field: string, value: string | number) => {
    setNewRecordData({ ...newRecordData, [field]: value });
  };

  const saveNewRecord = async (data: Partial<EMoURecord>) => {
    if (!user) return;

    // Validate required fields
    if (!data.companyName || !data.department) {
      setAlert({ message: "Company Name and Department are required!", type: "error" });
      return;
    }

    try {
      const now = new Date();
      const recordData = {
        department: data.department,
        companyName: data.companyName,
        fromDate: data.fromDate || "",
        toDate: data.toDate || "",
        scope: data.scope || "National",
        maintainedBy: data.maintainedBy || "Departments",
        approvalStatus: (data.hodApprovalDoc && data.signedAgreementDoc) ? "pending" : "draft",
        status: data.status || "Draft",
        description: data.description || "",
        documentAvailability: data.documentAvailability || "Not Available",
        hodApprovalDoc: data.hodApprovalDoc,
        signedAgreementDoc: data.signedAgreementDoc,
        goingForRenewal: data.goingForRenewal || "No",
        perStudentCost: data.perStudentCost || 0,
        placementOpportunity: data.placementOpportunity || 0,
        internshipOpportunity: data.internshipOpportunity || 0,
        companyRelationship: (data.companyRelationship || 3) as 1 | 2 | 3 | 4 | 5,
        aboutCompany: data.aboutCompany,
        companyAddress: data.companyAddress,
        companyWebsite: data.companyWebsite,
        industryContactName: data.industryContactName,
        industryContactMobile: data.industryContactMobile,
        industryContactEmail: data.industryContactEmail,
        institutionContactName: data.institutionContactName,
        institutionContactMobile: data.institutionContactMobile,
        institutionContactEmail: data.institutionContactEmail,
        clubsAligned: data.clubsAligned,
        sdgGoals: data.sdgGoals,
        skillsTechnologies: data.skillsTechnologies,
        benefitsAchieved: data.benefitsAchieved,
        scannedCopy: data.scannedCopy,
        createdBy: user.uid,
        createdByName: user.displayName,
        createdAt: now,
      };

      await createEMoU(recordData as Omit<EMoURecord, "id">);
      
      setCreatingNewRecord(false);
      setNewRecordData({});
      setEditingNewCell(null);
      loadRecords();
      setAlert({ message: "Record created successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to create record:", error);
      setAlert({ message: "Failed to create record", type: "error" });
    }
  };

  const handleExport = () => {
    const csv = generateCSV(filteredRecords);
    downloadCSV(
      csv,
      `emou-records-${new Date().toISOString().split("T")[0]}.csv`,
    );
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

  const stats = {
    total: filteredRecords.length,
    active: filteredRecords.filter((r) => r.status === "Active").length,
    expiring: filteredRecords.filter((r) => {
      const toDate = parseDate(r.toDate);
      const daysUntilExpiry = Math.floor(
        (toDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
      return (
        daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && r.status === "Active"
      );
    }).length,
    expired: filteredRecords.filter((r) => r.status === "Expired").length,
  };

  function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split(".").map(Number);
    return new Date(year, month - 1, day);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Expired":
        return "bg-red-100 text-red-800";
      case "Renewal Pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
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
                  className="btn btn-secondary"
                >
                  Dashboard
                </button>
                {user?.role === "admin" && (
                  <button
                    onClick={() => router.push("/admin")}
                    className="btn btn-secondary"
                  >
                    Admin
                  </button>
                )}
                <button onClick={handleExport} className="btn btn-secondary">
                  Export
                </button>
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="btn btn-secondary"
                >
                  Import
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary"
                >
                  + New MOU
                </button>
                <button onClick={signOut} className="btn btn-secondary">
                  Logout
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
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#4b5563]">
                Status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Renewal Pending">Renewal Pending</option>
                <option value="Draft">Draft</option>
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
            <div className="text-xs text-[#6b7280]">
              {filteredRecords.length} records
            </div>
          </div>
        </div>

        {/* Main Content - Spreadsheet Table */}
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
              <div
                className="overflow-x-auto bg-white rounded-lg shadow-sm relative"
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { handleMouseLeave(); setShowAddButton(false); }}
                onMouseEnter={() => setShowAddButton(true)}
              >
                <table className="sheet-table">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr>
                      <th style={{ width: "100px" }}>ID</th>
                      <th style={{ minWidth: "200px" }}>Company Name</th>
                      <th style={{ width: "100px" }}>Department</th>
                      <th style={{ width: "120px" }}>Scope</th>
                      <th style={{ width: "130px" }}>Maintained By</th>
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
                      <th style={{ width: "100px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Inline New Record Row
                    {!creatingNewRecord ? (
                      <tr className="bg-blue-50 border-b-2 border-blue-200">
                        <td className="text-center">
                          <button
                            onClick={() => {
                              setCreatingNewRecord(true);
                              setNewRecordData({});
                            }}
                            className="text-blue-600 hover:text-blue-800 font-bold text-lg"
                            title="Add new record"
                          >
                            +
                          </button>
                        </td>
                        <td colSpan={28} className="text-xs text-blue-600 italic">
                          Click + to add a new eMoU record inline
                        </td>
                      </tr>
                    ) : (
                      <tr 
                        className="bg-green-50 border-b-2 border-green-300"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setCreatingNewRecord(false);
                            setNewRecordData({});
                            setEditingNewCell(null);
                          }
                        }}
                      >
                        <td className="text-center text-xs text-gray-500">Auto</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('companyName', e.currentTarget.textContent || '')} className="cursor-text bg-white border-2 border-green-400" style={{ minWidth: '200px' }}>{newRecordData.companyName || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('department', e.currentTarget.textContent || '')} className="cursor-text bg-white border-2 border-green-400">{newRecordData.department || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('scope', e.currentTarget.textContent || '')} className="cursor-text bg-white">{newRecordData.scope || 'National'}</td>
                        <td className="bg-white p-0"><input type="date" onChange={(e) => { const val = e.target.value; if (val) { const [year, month, day] = val.split('-'); handleNewRecordFieldChange('fromDate', `${day}.${month}.${year}`); } }} className="w-full h-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-400" /></td>
                        <td className="bg-white p-0"><input type="date" onChange={(e) => { const val = e.target.value; if (val) { const [year, month, day] = val.split('-'); handleNewRecordFieldChange('toDate', `${day}.${month}.${year}`); } }} className="w-full h-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-400" /></td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('status', e.currentTarget.textContent || '')} className="cursor-text bg-white">{newRecordData.status || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('description', e.currentTarget.textContent || '')} className="cursor-text bg-white" style={{ minWidth: '250px' }}>{newRecordData.description || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('aboutCompany', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.aboutCompany || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('companyAddress', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.companyAddress || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('companyWebsite', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.companyWebsite || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('companyRelationship', parseInt(e.currentTarget.textContent || '3'))} className="cursor-text bg-white text-center">{newRecordData.companyRelationship || 3}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('industryContactName', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.industryContactName || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('industryContactMobile', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.industryContactMobile || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('industryContactEmail', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.industryContactEmail || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('institutionContactName', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.institutionContactName || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('institutionContactMobile', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.institutionContactMobile || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('institutionContactEmail', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.institutionContactEmail || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('clubsAligned', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.clubsAligned || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('sdgGoals', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.sdgGoals || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('skillsTechnologies', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.skillsTechnologies || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('perStudentCost', parseInt(e.currentTarget.textContent || '0'))} className="cursor-text bg-white text-center">{newRecordData.perStudentCost || 0}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('placementOpportunity', parseInt(e.currentTarget.textContent || '0'))} className="cursor-text bg-white text-center">{newRecordData.placementOpportunity || 0}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('internshipOpportunity', parseInt(e.currentTarget.textContent || '0'))} className="cursor-text bg-white text-center">{newRecordData.internshipOpportunity || 0}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('goingForRenewal', e.currentTarget.textContent || '')} className="cursor-text bg-white text-center">{newRecordData.goingForRenewal || 'No'}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('benefitsAchieved', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.benefitsAchieved || ''}</td>
                        <td contentEditable suppressContentEditableWarning onBlur={(e) => handleNewRecordFieldChange('documentAvailability', e.currentTarget.textContent || '')} className="cursor-text bg-white text-xs">{newRecordData.documentAvailability || 'Not Available'}</td>
                        <td className="text-xs text-gray-500 text-center">-</td>
                        <td className="text-xs text-gray-500 text-center">-</td>
                        <td className="text-xs">{user?.displayName}</td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => saveNewRecord(newRecordData)} className="text-xs text-green-600 hover:text-green-800 font-semibold">Save</button>
                            <span className="text-[#d1d5db]">|</span>
                            <button onClick={() => { setCreatingNewRecord(false); setNewRecordData({}); setEditingNewCell(null); }} className="text-xs text-red-600 hover:text-red-800">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )} */}
                    {filteredRecords.map((record) => {
                      const isEditable = canEdit(record.createdBy, record.department);

                      const renderEditableCell = (
                        field: keyof EMoURecord, 
                        content: React.ReactNode, 
                        className: string = "text-xs",
                        truncateLength?: number
                      ) => {
                        const isEditing = editingCell?.recordId === record.id && editingCell?.field === field;
                        const cellStyle = isEditing 
                          ? { 
                              border: '3px solid #000000', 
                              outline: 'none',
                              padding: '4px',
                              backgroundColor: '#f5f5f5'
                            } 
                          : {};
                        
                        let displayContent = content;
                        if (truncateLength && typeof content === 'string' && content.length > truncateLength) {
                          displayContent = content.substring(0, truncateLength) + '...';
                        }
                        
                        return (
                          <td
                            className={`${className} ${isEditable ? 'cursor-text hover:bg-blue-50' : ''}`}
                            contentEditable={isEditing}
                            suppressContentEditableWarning
                            onClick={() => isEditable && handleCellClick(record, field)}
                            onBlur={(e) => {
                              if (isEditing) {
                                handleInlineFieldChange(field, e.currentTarget.textContent || '');
                              }
                            }}
                            style={cellStyle}
                            title={truncateLength && typeof content === 'string' ? content : (isEditable && !isEditing ? "Click to edit" : "")}
                          >
                            {displayContent}
                          </td>
                        );
                      };

                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-gray-50"
                        >
                          <td className="font-medium text-[#2563eb] font-mono">
                            {record.id}
                          </td>
                          {renderEditableCell("companyName", record.companyName, "")}
                          {renderEditableCell("department", record.department, "")}
                          {renderEditableCell("scope", record.scope || "National", "text-center")}
                          {renderEditableCell("maintainedBy", record.maintainedBy || "Departments", "text-center")}
                          {(() => {
                            const isEditing = editingCell?.recordId === record.id && editingCell?.field === 'fromDate';
                            const cellStyle = isEditing 
                              ? { border: '3px solid #000000', outline: 'none', padding: '0', backgroundColor: '#f5f5f5' } 
                              : {};
                            
                            // Convert dd.mm.yyyy to yyyy-mm-dd for date input
                            const convertToInputFormat = (dateStr: string) => {
                              if (!dateStr) return '';
                              const [day, month, year] = dateStr.split('.');
                              return `${year}-${month}-${day}`;
                            };
                            
                            return (
                              <td
                                className={`${isEditable ? 'cursor-text hover:bg-blue-50' : ''}`}
                                onClick={() => isEditable && handleCellClick(record, 'fromDate')}
                                style={cellStyle}
                                title={isEditable && !isEditing ? "Click to edit" : ""}
                              >
                                {isEditing ? (
                                  <input
                                    type="date"
                                    defaultValue={convertToInputFormat(record.fromDate)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        const [year, month, day] = val.split('-');
                                        handleInlineFieldChange('fromDate', `${day}.${month}.${year}`);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveInlineEdit();
                                      } else if (e.key === 'Escape') {
                                        cancelInlineEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="w-full h-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                ) : (
                                  record.fromDate
                                )}
                              </td>
                            );
                          })()}
                          {(() => {
                            const isEditing = editingCell?.recordId === record.id && editingCell?.field === 'toDate';
                            const cellStyle = isEditing 
                              ? { border: '3px solid #000000', outline: 'none', padding: '0', backgroundColor: '#f5f5f5' } 
                              : {};
                            
                            // Convert dd.mm.yyyy to yyyy-mm-dd for date input
                            const convertToInputFormat = (dateStr: string) => {
                              if (!dateStr) return '';
                              const [day, month, year] = dateStr.split('.');
                              return `${year}-${month}-${day}`;
                            };
                            
                            return (
                              <td
                                className={`${isEditable ? 'cursor-text hover:bg-blue-50' : ''}`}
                                onClick={() => isEditable && handleCellClick(record, 'toDate')}
                                style={cellStyle}
                                title={isEditable && !isEditing ? "Click to edit" : ""}
                              >
                                {isEditing ? (
                                  <input
                                    type="date"
                                    defaultValue={convertToInputFormat(record.toDate)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        const [year, month, day] = val.split('-');
                                        handleInlineFieldChange('toDate', `${day}.${month}.${year}`);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveInlineEdit();
                                      } else if (e.key === 'Escape') {
                                        cancelInlineEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="w-full h-full px-1 py-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                ) : (
                                  record.toDate
                                )}
                              </td>
                            );
                          })()}
                          {(() => {
                            const isEditing = editingCell?.recordId === record.id && editingCell?.field === 'status';
                            const cellStyle = isEditing 
                              ? { border: '3px solid #000000', outline: 'none', padding: '4px', backgroundColor: '#f5f5f5' } 
                              : {};
                            
                            return (
                              <td
                                className={`${isEditable ? 'cursor-text hover:bg-blue-50' : ''}`}
                                contentEditable={isEditing}
                                suppressContentEditableWarning
                                onClick={() => isEditable && handleCellClick(record, 'status')}
                                onBlur={(e) => {
                                  if (isEditing) {
                                    handleInlineFieldChange('status', e.currentTarget.textContent || '');
                                  }
                                }}
                                style={cellStyle}
                                title={isEditable && !isEditing ? "Click to edit" : ""}
                              >
                                {isEditing ? (
                                  record.status
                                ) : (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                    {record.status}
                                  </span>
                                )}
                              </td>
                            );
                          })()}
                          {renderEditableCell("description", record.description, "text-xs", 80)}
                          {renderEditableCell("aboutCompany", record.aboutCompany || "-", "text-xs", 50)}
                          {renderEditableCell("companyAddress", record.companyAddress || "-", "text-xs", 50)}
                          {(() => {
                            const isEditing = editingCell?.recordId === record.id && editingCell?.field === 'companyWebsite';
                            const cellStyle = isEditing 
                              ? { border: '3px solid #000000', outline: 'none', padding: '4px', backgroundColor: '#f5f5f5' } 
                              : {};
                            
                            return (
                              <td
                                className={`text-xs ${isEditable ? 'cursor-text hover:bg-blue-50' : ''}`}
                                contentEditable={isEditing}
                                suppressContentEditableWarning
                                onClick={() => isEditable && handleCellClick(record, 'companyWebsite')}
                                onBlur={(e) => {
                                  if (isEditing) {
                                    handleInlineFieldChange('companyWebsite', e.currentTarget.textContent || '');
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
                                    onClick={(e) => { e.stopPropagation(); }}
                                  >
                                    {record.companyWebsite.length > 30 ? record.companyWebsite.substring(0, 30) + "..." : record.companyWebsite}
                                  </a>
                                ) : "-"}
                              </td>
                            );
                          })()}
                          {renderEditableCell("companyRelationship", record.companyRelationship || 3, "text-center")}
                          {renderEditableCell("industryContactName", record.industryContactName || "-", "text-xs")}
                          {renderEditableCell("industryContactMobile", record.industryContactMobile || "-", "text-xs")}
                          {renderEditableCell("industryContactEmail", record.industryContactEmail || "-", "text-xs")}
                          {renderEditableCell("institutionContactName", record.institutionContactName || "-", "text-xs")}
                          {renderEditableCell("institutionContactMobile", record.institutionContactMobile || "-", "text-xs")}
                          {renderEditableCell("institutionContactEmail", record.institutionContactEmail || "-", "text-xs")}
                          {renderEditableCell("clubsAligned", record.clubsAligned || "-", "text-xs")}
                          {renderEditableCell("sdgGoals", record.sdgGoals || "-", "text-xs")}
                          {renderEditableCell("skillsTechnologies", record.skillsTechnologies || "-", "text-xs", 50)}
                          {renderEditableCell("perStudentCost", record.perStudentCost || 0, "text-center")}
                          {renderEditableCell("placementOpportunity", record.placementOpportunity || 0, "text-center")}
                          {renderEditableCell("internshipOpportunity", record.internshipOpportunity || 0, "text-center")}
                          {renderEditableCell("goingForRenewal", record.goingForRenewal || "No", "text-center")}
                          {renderEditableCell("benefitsAchieved", record.benefitsAchieved || "-", "text-xs", 50)}
                          {renderEditableCell("documentAvailability", record.documentAvailability || "Not Available", "text-xs")}
                          <td className="text-xs text-center">
                            {record.hodApprovalDoc ? (
                              <button
                                onClick={() => setViewingDocument({ url: record.hodApprovalDoc!, title: `HO Approval - ${record.companyName}` })}
                                className="text-blue-600 hover:underline cursor-pointer"
                              >
                                View
                              </button>
                            ) : "-"}
                          </td>
                          <td className="text-xs text-center">
                            {record.signedAgreementDoc ? (
                              <button
                                onClick={() => setViewingDocument({ url: record.signedAgreementDoc!, title: `Signed Agreement - ${record.companyName}` })}
                                className="text-blue-600 hover:underline cursor-pointer"
                              >
                                View
                              </button>
                            ) : "-"}
                          </td>
                          <td className="text-xs">{record.createdByName}</td>
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
                                    onClick={() => handleDeleteRecord(record.id)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    Del
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td
                          colSpan={29}
                          className="text-center py-8 text-[#6b7280]"
                        >
                          No records found. Click &quot;+ New Record&quot; to
                          add your first eMoU.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-[#1f2937]">
                    {stats.total}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">Total eMoUs</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-green-600">
                    {stats.active}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">Active</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-orange-600">
                    {stats.expiring}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">
                    Expiring Soon
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#d1d5db]">
                  <div className="text-2xl font-semibold text-red-600">
                    {stats.expired}
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">Expired</div>
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
