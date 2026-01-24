"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewRecordDialog from "@/components/ViewRecordDialog";
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
    if (canEdit(record.createdBy, record.department)) {
      setInlineEditingId(record.id);
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
    if (!inlineEditingId || !user) return;

    try {
      await updateEMoU(inlineEditingId, {
        ...inlineEditData,
        updatedBy: user.uid,
        updatedByName: user.displayName,
        updatedAt: new Date(),
      });

      setInlineEditingId(null);
      setInlineEditData({});
      loadRecords();
      setAlert({ message: "Record updated successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to update record:", error);
      setAlert({ message: "Failed to update record", type: "error" });
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineEditData({});
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
                  + New Record
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
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th style={{ width: "100px" }}>ID</th>
                      <th style={{ minWidth: "200px" }}>Company Name</th>
                      <th style={{ width: "100px" }}>Department</th>
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
                      <th style={{ width: "180px" }}>Scanned Copy</th>
                      <th style={{ width: "120px" }}>Created By</th>
                      <th style={{ width: "100px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => {
                      const isEditing = inlineEditingId === record.id;
                      const editData = isEditing ? inlineEditData : record;

                      return (
                        <tr
                          key={record.id}
                          onDoubleClick={() => handleDoubleClick(record)}
                          className={`${
                            isEditing
                              ? "bg-blue-50 border-l-4 border-blue-500"
                              : "hover:bg-gray-50 cursor-pointer"
                          }`}
                          title={
                            !isEditing &&
                            canEdit(record.createdBy, record.department)
                              ? "Double-click to edit"
                              : ""
                          }
                        >
                          <td className="font-medium text-[#2563eb] font-mono">
                            {record.id}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.companyName || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "companyName",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              record.companyName
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                value={editData.department || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "department",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {departments.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              record.department
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.fromDate || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "fromDate",
                                    e.target.value,
                                  )
                                }
                                placeholder="DD.MM.YYYY"
                                className="w-full px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.fromDate
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.toDate || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "toDate",
                                    e.target.value,
                                  )
                                }
                                placeholder="DD.MM.YYYY"
                                className="w-full px-1 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.toDate
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select
                                value={editData.status || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "status",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="Active">Active</option>
                                <option value="Expired">Expired</option>
                                <option value="Renewal Pending">
                                  Renewal Pending
                                </option>
                                <option value="Draft">Draft</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(record.status)}`}
                              >
                                {record.status}
                              </span>
                            )}
                          </td>
                          <td className="text-xs" title={record.description}>
                            {isEditing ? (
                              <textarea
                                value={editData.description || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "description",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : record.description.length > 80 ? (
                              record.description.substring(0, 80) + "..."
                            ) : (
                              record.description
                            )}
                          </td>
                          <td className="text-xs" title={record.aboutCompany}>
                            {isEditing ? (
                              <textarea
                                value={editData.aboutCompany || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "aboutCompany",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : record.aboutCompany &&
                              record.aboutCompany.length > 50 ? (
                              record.aboutCompany.substring(0, 50) + "..."
                            ) : (
                              record.aboutCompany || "-"
                            )}
                          </td>
                          <td className="text-xs" title={record.companyAddress}>
                            {isEditing ? (
                              <textarea
                                value={editData.companyAddress || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "companyAddress",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : record.companyAddress &&
                              record.companyAddress.length > 50 ? (
                              record.companyAddress.substring(0, 50) + "..."
                            ) : (
                              record.companyAddress || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="url"
                                value={editData.companyWebsite || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "companyWebsite",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : record.companyWebsite ? (
                              <a
                                href={record.companyWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {record.companyWebsite.length > 30
                                  ? record.companyWebsite.substring(0, 30) +
                                    "..."
                                  : record.companyWebsite}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-center">
                            {isEditing ? (
                              <select
                                value={editData.companyRelationship || 3}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "companyRelationship",
                                    parseInt(e.target.value),
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                                <option value={5}>5</option>
                              </select>
                            ) : (
                              record.companyRelationship || 3
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.industryContactName || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "industryContactName",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.industryContactName || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="tel"
                                value={editData.industryContactMobile || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "industryContactMobile",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.industryContactMobile || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="email"
                                value={editData.industryContactEmail || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "industryContactEmail",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.industryContactEmail || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.institutionContactName || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "institutionContactName",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.institutionContactName || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="tel"
                                value={editData.institutionContactMobile || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "institutionContactMobile",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.institutionContactMobile || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="email"
                                value={editData.institutionContactEmail || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "institutionContactEmail",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.institutionContactEmail || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.clubsAligned || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "clubsAligned",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.clubsAligned || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.sdgGoals || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "sdgGoals",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.sdgGoals || "-"
                            )}
                          </td>
                          <td
                            className="text-xs"
                            title={record.skillsTechnologies}
                          >
                            {isEditing ? (
                              <textarea
                                value={editData.skillsTechnologies || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "skillsTechnologies",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : record.skillsTechnologies &&
                              record.skillsTechnologies.length > 50 ? (
                              record.skillsTechnologies.substring(0, 50) + "..."
                            ) : (
                              record.skillsTechnologies || "-"
                            )}
                          </td>
                          <td className="text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editData.perStudentCost || 0}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "perStudentCost",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                className="w-16 px-1 py-0.5 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.perStudentCost || 0
                            )}
                          </td>
                          <td className="text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editData.placementOpportunity || 0}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "placementOpportunity",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                className="w-16 px-1 py-0.5 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.placementOpportunity || 0
                            )}
                          </td>
                          <td className="text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editData.internshipOpportunity || 0}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "internshipOpportunity",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                min="0"
                                className="w-16 px-1 py-0.5 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              record.internshipOpportunity || 0
                            )}
                          </td>
                          <td className="text-center">
                            {isEditing ? (
                              <select
                                value={editData.goingForRenewal || "No"}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "goingForRenewal",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              record.goingForRenewal || "No"
                            )}
                          </td>
                          <td
                            className="text-xs"
                            title={record.benefitsAchieved}
                          >
                            {isEditing ? (
                              <textarea
                                value={editData.benefitsAchieved || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "benefitsAchieved",
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : record.benefitsAchieved &&
                              record.benefitsAchieved.length > 50 ? (
                              record.benefitsAchieved.substring(0, 50) + "..."
                            ) : (
                              record.benefitsAchieved || "-"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <select
                                value={
                                  editData.documentAvailability ||
                                  "Not Available"
                                }
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "documentAvailability",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="Available">Available</option>
                                <option value="Not Available">
                                  Not Available
                                </option>
                              </select>
                            ) : (
                              record.documentAvailability || "Not Available"
                            )}
                          </td>
                          <td className="text-xs">
                            {isEditing ? (
                              <input
                                type="url"
                                value={editData.scannedCopy || ""}
                                onChange={(e) =>
                                  handleInlineFieldChange(
                                    "scannedCopy",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Drive link"
                              />
                            ) : record.scannedCopy ? (
                              <a
                                href={record.scannedCopy}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Doc
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-xs">{record.createdByName}</td>
                          <td>
                            {isEditing ? (
                              <div className="flex gap-1 whitespace-nowrap">
                                <button
                                  onClick={saveInlineEdit}
                                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                                >
                                  ✓ Save
                                </button>
                                <span className="text-[#d1d5db]">|</span>
                                <button
                                  onClick={cancelInlineEdit}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  ✕ Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                {canEdit(
                                  record.createdBy,
                                  record.department,
                                ) && (
                                  <>
                                    <button
                                      onClick={() => handleEdit(record)}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Edit
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
                            )}
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
