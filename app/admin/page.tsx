"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import { User, UserRole, DepartmentCode } from "@/types";
import { getAllUsers, createUser, deleteUser } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getSecondaryAuth } from "@/lib/firebase";

function AdminPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/");
    } else {
      loadUsers();
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

  const parseEmailAndGenerateCredentials = (email: string, role: UserRole) => {
    const currentYear = new Date().getFullYear();

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
        const generatedPass = `${deptUpper}${currentYear}hod`;

        setFormData((prev) => ({
          ...prev,
          displayName: `${deptUpper} HOD`,
          password: generatedPass,
          department: deptUpper as DepartmentCode,
        }));
      } else {
        // Invalid department
        const randomNum = Math.floor(100 + Math.random() * 900);
        const generatedPass = `user${currentYear}${randomNum}`;
        setFormData((prev) => ({
          ...prev,
          password: generatedPass,
        }));
      }
    } else if (role === "master") {
      // For master users
      const randomNum = Math.floor(100 + Math.random() * 900);
      const generatedPass = `master@${currentYear}${randomNum}`;

      setFormData((prev) => ({
        ...prev,
        password: generatedPass,
      }));
    } else if (role === "admin") {
      // For admin users
      const randomNum = Math.floor(100 + Math.random() * 900);
      const generatedPass = `admin@${currentYear}${randomNum}`;

      setFormData((prev) => ({
        ...prev,
        password: generatedPass,
      }));
    } else {
      // Default password
      const randomNum = Math.floor(100 + Math.random() * 900);
      const generatedPass = `user${currentYear}${randomNum}`;
      setFormData((prev) => ({
        ...prev,
        password: generatedPass,
      }));
    }
  };

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email });
    if (email.includes("@")) {
      parseEmailAndGenerateCredentials(email, formData.role);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({ ...formData, role });
    if (formData.email.includes("@")) {
      parseEmailAndGenerateCredentials(formData.email, role);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Use secondary auth to create user without signing out admin
      const secondaryAuth = getSecondaryAuth();

      if (!secondaryAuth) {
        throw new Error("Failed to initialize secondary authentication");
      }

      // Create Firebase Auth user using secondary app
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        formData.email,
        formData.password,
      );

      await updateProfile(userCredential.user, {
        displayName: formData.displayName,
      });

      // Create Firestore user document
      const now = new Date();
      await createUser(userCredential.user.uid, {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        department: formData.department || undefined,
        createdAt: now,
        updatedAt: now,
      });

      // Sign out the newly created user from secondary auth
      await secondaryAuth.signOut();

      setShowForm(false);
      setFormData({
        email: "",
        password: "",
        displayName: "",
        role: "hod",
        department: "",
      });
      loadUsers();
      setAlert({ message: "User created successfully!", type: "success" });
    } catch (error) {
      const err = error as Error;
      console.error("Failed to create user:", err);
      setAlert({
        message: `Failed to create user: ${err.message}`,
        type: "error",
      });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const user = users.find((u) => u.uid === uid);
    setConfirmDialog({
      title: "Delete User",
      message: `Are you sure you want to delete user "${user?.displayName || user?.email}"?\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteUser(uid);
          loadUsers();
          setAlert({ message: "User deleted successfully!", type: "success" });
        } catch (error) {
          console.error("Failed to delete user:", error);
          setAlert({ message: "Failed to delete user", type: "error" });
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
                  Admin Dashboard
                </h1>
                <p className="text-xs text-[#6b7280]">
                  User Management & System Administration
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
          {/* New User Form */}
          {showForm && (
            <div className="bg-white p-6 rounded-lg border border-[#d1d5db] mb-6">
              <h3 className="text-sm font-semibold text-[#1f2937] mb-4 uppercase tracking-wide">
                Create New User
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                      className="w-full"
                      placeholder="hod.cse@sairam.edu.in or user@sairam.edu.in"
                    />
                    <p className="text-xs text-[#6b7280] mt-1">
                      For HOD: use hod.dept@sairam.edu.in (e.g.,
                      hod.cse@sairam.edu.in)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required
                      minLength={6}
                      className="w-full"
                      placeholder="Auto-generated based on role"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Display Name <span className="text-red-500">*</span>
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
                      className="w-full"
                      placeholder="Dr. John Doe or CSE HOD"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4b5563] mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        handleRoleChange(e.target.value as UserRole)
                      }
                      required
                      className="w-full"
                    >
                      <option value="hod">HOD User</option>
                      <option value="master">Master User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {formData.role === "hod" && (
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
                        className="w-full"
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
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>
                </div>
              </form>
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
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                  {!loading && users.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-[#6b7280]"
                      >
                        No users found. Click &quot;+ New User&quot; to create
                        one.
                      </td>
                    </tr>
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
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default AdminPage;
