"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Alert from "@/components/Alert";
import DocumentViewer from "@/components/DocumentViewer";
import { EMoURecord } from "@/types";
import { getEMoUs, updateEMoU } from "@/lib/firestore";
import { useRouter } from "next/navigation";

function HODPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [draftRecords, setDraftRecords] = useState<EMoURecord[]>([]);
  const [pendingRecords, setPendingRecords] = useState<EMoURecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<EMoURecord[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<EMoURecord[]>([]);
  const [activeTab, setActiveTab] = useState<'drafts' | 'pending' | 'approved' | 'rejected'>('drafts');
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<{ recordId: string; field: 'hodApprovalDoc' | 'signedAgreementDoc' } | null>(null);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  useEffect(() => {
    if (user?.role !== 'hod') {
      router.push("/");
    } else {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const allRecords = await getEMoUs();
      // Filter records by HOD's department
      const myRecords = allRecords.filter(r => r.department === user?.department);
      
      setDraftRecords(myRecords.filter(r => r.approvalStatus === 'draft'));
      setPendingRecords(myRecords.filter(r => r.approvalStatus === 'pending'));
      setApprovedRecords(myRecords.filter(r => r.approvalStatus === 'approved'));
      setRejectedRecords(myRecords.filter(r => r.approvalStatus === 'rejected'));
    } catch (error) {
      console.error("Failed to load records:", error);
      setAlert({ message: "Failed to load records", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'emou-documents');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, recordId: string, fieldName: 'hodApprovalDoc' | 'signedAgreementDoc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setAlert({ message: 'Please upload only PDF or image files', type: 'error' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setAlert({ message: 'File size should not exceed 10MB', type: 'error' });
      return;
    }

    setUploadingDoc({ recordId, field: fieldName });

    try {
      const url = await uploadToCloudinary(file);
      
      // Get the current record
      const currentRecord = draftRecords.find(r => r.id === recordId);
      if (!currentRecord) return;

      // Update the record
      const updatedData: Partial<EMoURecord> = {
        [fieldName]: url,
        updatedAt: new Date(),
        updatedBy: user?.uid,
        updatedByName: user?.displayName,
      };

      // Check if both documents are now uploaded
      const bothDocsUploaded = fieldName === 'hodApprovalDoc' 
        ? url && currentRecord.signedAgreementDoc
        : currentRecord.hodApprovalDoc && url;

      if (bothDocsUploaded) {
        updatedData.approvalStatus = 'pending';
      }

      await updateEMoU(recordId, updatedData);
      
      if (bothDocsUploaded) {
        setAlert({ 
          message: 'Both documents uploaded! Record submitted for admin approval.', 
          type: 'success' 
        });
      } else {
        setAlert({ message: 'File uploaded successfully!', type: 'success' });
      }
      
      await loadRecords();
    } catch (error) {
      setAlert({ message: 'Failed to upload file. Please try again.', type: 'error' });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRemoveDocument = async (recordId: string, fieldName: 'hodApprovalDoc' | 'signedAgreementDoc') => {
    try {
      await updateEMoU(recordId, {
        [fieldName]: null,
        approvalStatus: 'draft', // Move back to draft if document is removed
        updatedAt: new Date(),
        updatedBy: user?.uid,
        updatedByName: user?.displayName,
      });
      
      setAlert({ message: 'Document removed successfully', type: 'info' });
      await loadRecords();
    } catch (error) {
      setAlert({ message: 'Failed to remove document', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
                className="btn btn-secondary"
              >
                ← Back to eMoUs
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg border border-[#d1d5db] mb-6">
            <div className="flex border-b border-[#d1d5db]">
              <button
                onClick={() => setActiveTab('drafts')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'drafts'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
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
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'pending'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
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
                onClick={() => setActiveTab('approved')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'approved'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
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
                onClick={() => setActiveTab('rejected')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'rejected'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
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
          {activeTab === 'drafts' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Draft Records ({draftRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Upload both required documents to submit for approval
                </p>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : draftRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No draft records. All records have been submitted for approval.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "120px" }}>To Date</th>
                        <th style={{ width: "200px" }}>HO Approval Doc</th>
                        <th style={{ width: "200px" }}>Signed Agreement</th>
                        <th style={{ width: "100px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td className="text-xs">{record.toDate}</td>
                          <td>
                            {record.hodApprovalDoc ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewingDocument({
                                    url: record.hodApprovalDoc!,
                                    title: `HO Approval - ${record.companyName}`
                                  })}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleRemoveDocument(record.id, 'hodApprovalDoc')}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileUpload(e, record.id, 'hodApprovalDoc')}
                                  disabled={uploadingDoc?.recordId === record.id && uploadingDoc?.field === 'hodApprovalDoc'}
                                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {uploadingDoc?.recordId === record.id && uploadingDoc?.field === 'hodApprovalDoc' && (
                                  <p className="text-xs text-blue-600">Uploading...</p>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            {record.signedAgreementDoc ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewingDocument({
                                    url: record.signedAgreementDoc!,
                                    title: `Signed Agreement - ${record.companyName}`
                                  })}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleRemoveDocument(record.id, 'signedAgreementDoc')}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileUpload(e, record.id, 'signedAgreementDoc')}
                                  disabled={uploadingDoc?.recordId === record.id && uploadingDoc?.field === 'signedAgreementDoc'}
                                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {uploadingDoc?.recordId === record.id && uploadingDoc?.field === 'signedAgreementDoc' && (
                                  <p className="text-xs text-blue-600">Uploading...</p>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded uppercase ${getStatusBadge(record.approvalStatus)}`}>
                              {record.approvalStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pending Approval Tab */}
          {activeTab === 'pending' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Pending Approval ({pendingRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Records submitted and awaiting admin/master approval
                </p>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : pendingRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No pending records
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "120px" }}>To Date</th>
                        <th style={{ width: "150px" }}>HO Approval Doc</th>
                        <th style={{ width: "150px" }}>Signed Agreement</th>
                        <th style={{ width: "100px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td className="text-xs">{record.toDate}</td>
                          <td>
                            <button
                              onClick={() => setViewingDocument({
                                url: record.hodApprovalDoc!,
                                title: `HO Approval - ${record.companyName}`
                              })}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View Document
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={() => setViewingDocument({
                                url: record.signedAgreementDoc!,
                                title: `Signed Agreement - ${record.companyName}`
                              })}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View Document
                            </button>
                          </td>
                          <td>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded uppercase ${getStatusBadge(record.approvalStatus)}`}>
                              {record.approvalStatus}
                            </span>
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
          {activeTab === 'approved' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Approved Records ({approvedRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Records approved by admin/master
                </p>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : approvedRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No approved records yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "120px" }}>To Date</th>
                        <th style={{ width: "100px" }}>Status</th>
                        <th style={{ width: "150px" }}>HO Approval</th>
                        <th style={{ width: "150px" }}>Agreement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td className="text-xs">{record.toDate}</td>
                          <td>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded uppercase ${getStatusBadge(record.approvalStatus)}`}>
                              {record.approvalStatus}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => setViewingDocument({
                                url: record.hodApprovalDoc!,
                                title: `HO Approval - ${record.companyName}`
                              })}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={() => setViewingDocument({
                                url: record.signedAgreementDoc!,
                                title: `Signed Agreement - ${record.companyName}`
                              })}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Rejected Records Tab */}
          {activeTab === 'rejected' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#d1d5db]">
                <h3 className="text-sm font-semibold text-[#1f2937] uppercase tracking-wide">
                  Rejected Records ({rejectedRecords.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">
                  Records rejected by admin/master - needs revision
                </p>
              </div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : rejectedRecords.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No rejected records
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="sheet-table">
                    <thead>
                      <tr>
                        <th style={{ width: "100px" }}>ID</th>
                        <th style={{ width: "200px" }}>Company Name</th>
                        <th style={{ width: "120px" }}>From Date</th>
                        <th style={{ width: "120px" }}>To Date</th>
                        <th style={{ width: "100px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="font-mono text-xs">{record.id}</td>
                          <td className="font-medium">{record.companyName}</td>
                          <td className="text-xs">{record.fromDate}</td>
                          <td className="text-xs">{record.toDate}</td>
                          <td>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded uppercase ${getStatusBadge(record.approvalStatus)}`}>
                              {record.approvalStatus}
                            </span>
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

export default HODPage;
