"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import DocumentViewer from "@/components/DocumentViewer";
import { User, UserRole, DepartmentCode, EMoURecord } from "@/types";
import { getAllUsers, getEMoUs, updateEMoU } from "@/lib/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

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
      setPendingRecords(
        allRecords.filter((r) => r.approvalStatus === "pending"),
      );
      setDraftRecords(allRecords.filter((r) => r.approvalStatus === "draft"));
      setApprovedRecords(
        allRecords.filter((r) => r.approvalStatus === "approved"),
      );
    } catch (error) {
      console.error("Failed to load approval records:", error);
    }
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
                  className="btn btn-secondary"
                >
                  ← Back to eMoUs
                </button>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="btn btn-primary"
                >
                  {showForm ? "Cancel" : "+ New User"}
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
              {/* Users Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
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
                          <td colSpan={6} className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr key="empty">
                          <td
                            colSpan={6}
                            className="text-center py-8 text-[#6b7280]"
                          >
                            No users found. Click &quot;+ New User&quot; to
                            create one.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.uid}>
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

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mt-6">
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
            </>
          )}

          {/* Pending Approvals Tab */}
          {activeTab === "pending" && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-[#d1d5db]">
                <h3 className="text-xs font-semibold text-[#1f2937] uppercase tracking-wide">
                  Pending Approvals ({pendingRecords.length})
                </h3>
              </div>
              {pendingRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending approvals
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>Department</th>
                        <th style={{ width: "130px" }}>Maintained By</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "150px" }}>HO Approval</th>
                        <th style={{ width: "150px" }}>Signed Agreement</th>
                        <th style={{ width: "200px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td>{record.department}</td>
                          <td>{record.maintainedBy}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td>
                            <div className="flex gap-1 items-center justify-center">
                              {record.hodApprovalDoc && (
                                <button
                                  onClick={() =>
                                    setViewingDocument({
                                      url: record.hodApprovalDoc!,
                                      title: `HO Approval - ${record.companyName}`,
                                    })
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View
                                </button>
                              )}
                              {record.hodApprovalDoc && (
                                <span className="text-gray-300">|</span>
                              )}
                              <label className="cursor-pointer text-green-600 hover:text-green-800 relative">
                                {uploadingDoc?.recordId === record.id &&
                                uploadingDoc?.field === "hodApprovalDoc" ? (
                                  <span className="text-xs">Uploading...</span>
                                ) : (
                                  <span className="text-xs">
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
                                    uploadingDoc?.recordId === record.id &&
                                    uploadingDoc?.field === "hodApprovalDoc"
                                  }
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </label>
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-1 items-center justify-center">
                              {record.signedAgreementDoc && (
                                <button
                                  onClick={() =>
                                    setViewingDocument({
                                      url: record.signedAgreementDoc!,
                                      title: `Signed Agreement - ${record.companyName}`,
                                    })
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View
                                </button>
                              )}
                              {record.signedAgreementDoc && (
                                <span className="text-gray-300">|</span>
                              )}
                              <label className="cursor-pointer text-green-600 hover:text-green-800 relative">
                                {uploadingDoc?.recordId === record.id &&
                                uploadingDoc?.field === "signedAgreementDoc" ? (
                                  <span className="text-xs">Uploading...</span>
                                ) : (
                                  <span className="text-xs">
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
                          <td>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleApproveRecord(record.id)}
                                className="px-2.5 py-1 text-[10px] font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRecord(record.id)}
                                className="px-2.5 py-1 text-[10px] font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Draft Records Tab */}
          {activeTab === "drafts" && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-[#d1d5db]">
                <h3 className="text-xs font-semibold text-[#1f2937] uppercase tracking-wide">
                  Draft Records ({draftRecords.length})
                </h3>
              </div>
              {draftRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No draft records
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>Department</th>
                        <th style={{ width: "130px" }}>Maintained By</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "150px" }}>HO Approval</th>
                        <th style={{ width: "150px" }}>Signed Agreement</th>
                        <th style={{ width: "200px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td>{record.department}</td>
                          <td>{record.maintainedBy}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td>
                            <div className="flex gap-1 items-center justify-center">
                              {record.hodApprovalDoc && (
                                <button
                                  onClick={() =>
                                    setViewingDocument({
                                      url: record.hodApprovalDoc!,
                                      title: `HO Approval - ${record.companyName}`,
                                    })
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View
                                </button>
                              )}
                              {record.hodApprovalDoc && (
                                <span className="text-gray-300">|</span>
                              )}
                              <label className="cursor-pointer text-green-600 hover:text-green-800 relative">
                                {uploadingDoc?.recordId === record.id &&
                                uploadingDoc?.field === "hodApprovalDoc" ? (
                                  <span className="text-xs">Uploading...</span>
                                ) : (
                                  <span className="text-xs">
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
                                    uploadingDoc?.recordId === record.id &&
                                    uploadingDoc?.field === "hodApprovalDoc"
                                  }
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </label>
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-1 items-center justify-center">
                              {record.signedAgreementDoc && (
                                <button
                                  onClick={() =>
                                    setViewingDocument({
                                      url: record.signedAgreementDoc!,
                                      title: `Signed Agreement - ${record.companyName}`,
                                    })
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View
                                </button>
                              )}
                              {record.signedAgreementDoc && (
                                <span className="text-gray-300">|</span>
                              )}
                              <label className="cursor-pointer text-green-600 hover:text-green-800 relative">
                                {uploadingDoc?.recordId === record.id &&
                                uploadingDoc?.field === "signedAgreementDoc" ? (
                                  <span className="text-xs">Uploading...</span>
                                ) : (
                                  <span className="text-xs">
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
                          <td>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleMoveToPending(record.id)}
                                className="px-2.5 py-1 text-[10px] font-medium bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                              >
                                To Pending
                              </button>
                              <button
                                onClick={() => handleApproveRecord(record.id)}
                                className="px-2.5 py-1 text-[10px] font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                              >
                                Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Approved Records Tab */}
          {activeTab === "approved" && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-[#d1d5db]">
                <h3 className="text-xs font-semibold text-[#1f2937] uppercase tracking-wide">
                  Approved Records ({approvedRecords.length})
                </h3>
              </div>
              {approvedRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No approved records
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>Department</th>
                        <th style={{ width: "130px" }}>Maintained By</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "120px" }}>To Date</th>
                        <th style={{ width: "100px" }}>Status</th>
                        <th style={{ width: "150px" }}>HO Approval</th>
                        <th style={{ width: "150px" }}>Signed Agreement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td>{record.department}</td>
                          <td>{record.maintainedBy}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td className="text-xs">{record.toDate}</td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                record.status === "Active"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "Expired"
                                    ? "bg-red-100 text-red-800"
                                    : record.status === "Renewal Pending"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td>
                            {record.hodApprovalDoc ? (
                              <button
                                onClick={() =>
                                  setViewingDocument({
                                    url: record.hodApprovalDoc!,
                                    title: `HO Approval - ${record.companyName}`,
                                  })
                                }
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400">
                                —
                              </span>
                            )}
                          </td>
                          <td>
                            {record.signedAgreementDoc ? (
                              <button
                                onClick={() =>
                                  setViewingDocument({
                                    url: record.signedAgreementDoc!,
                                    title: `Signed Agreement - ${record.companyName}`,
                                  })
                                }
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

export default AdminPage;
