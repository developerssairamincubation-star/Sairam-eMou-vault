"use client";

import React from "react";
import {
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCalendar,
  FiChevronDown,
  FiUpload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
} from "react-icons/fi";
import { EMoURecord } from "@/types";
import { useSheetEditor } from "@/hooks/useSheetEditor";
import {
  getStatusColor,
  getDisplayStatus,
  formatDisplayDate,
  cleanDisplayValue,
  truncateText,
} from "@/lib/sheetsUtils";

export interface SheetsTableColumn {
  key: keyof EMoURecord;
  label: string;
  width?: string;
  editable?: boolean;
  type?: "text" | "date" | "select" | "number" | "textarea";
  selectOptions?: string[];
  render?: (record: EMoURecord) => React.ReactNode;
  truncate?: number;
}

export interface SheetsTableAction {
  icon: React.ReactNode;
  label: string;
  onClick: (record: EMoURecord) => void;
  show?: (record: EMoURecord) => boolean;
  color?: string;
}

export interface SheetsTableProps {
  records: EMoURecord[];
  columns: SheetsTableColumn[];
  actions?: SheetsTableAction[];
  onEdit?: (record: EMoURecord) => void;
  onDelete?: (recordId: string) => void;
  onView?: (record: EMoURecord) => void;
  onViewDocument?: (url: string, title: string) => void;
  onFileUpload?: (
    recordId: string,
    field: "hodApprovalDoc" | "signedAgreementDoc",
    file: File,
  ) => void;
  onSaveCell: (recordId: string, updates: Partial<EMoURecord>) => Promise<void>;
  canEdit?: (createdBy: string, department: string) => boolean;
  canDelete?: (createdBy: string, department: string) => boolean;
  uploadingDoc?: { recordId: string; field: string } | null;
  showActions?: boolean;
  showApprovalActions?: boolean;
  onApprove?: (recordId: string) => void;
  onReject?: (recordId: string) => void;
  onMoveToPending?: (recordId: string) => void;
  height?: string;
  showSerialNo?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  customCellRenderer?: (
    record: EMoURecord,
    column: SheetsTableColumn,
    defaultRenderer: () => React.ReactNode,
  ) => React.ReactNode;
}

// Columns that should stick to the right
const STICKY_RIGHT_KEYS: (keyof EMoURecord)[] = [
  "documentAvailability",
  "hodApprovalDoc",
  "signedAgreementDoc",
];

// Widths for sticky columns (must match column defs) + actions
const STICKY_WIDTHS: Record<string, number> = {
  signedAgreementDoc: 180,
  hodApprovalDoc: 180,
  documentAvailability: 150,
};
const ACTION_COL_WIDTH = 100;

function getStickyRight(key: string, hasActions: boolean): number {
  // Order from rightmost: actions(if any) -> signedAgreementDoc -> hodApprovalDoc -> documentAvailability
  const order: string[] = ["signedAgreementDoc", "hodApprovalDoc", "documentAvailability"];
  const idx = order.indexOf(key);
  if (idx === -1) return 0;
  let right = hasActions ? ACTION_COL_WIDTH : 0;
  for (let i = 0; i < idx; i++) {
    right += STICKY_WIDTHS[order[i]];
  }
  return right;
}

function getActionsStickyRight(): number {
  return 0; // actions are the rightmost column
}

export function SheetsTable({
  records,
  columns,
  actions = [],
  onEdit,
  onDelete,
  onView,
  onViewDocument,
  onFileUpload,
  onSaveCell,
  canEdit = () => true,
  canDelete = () => true,
  uploadingDoc,
  showActions = true,
  showApprovalActions = false,
  onApprove,
  onReject,
  onMoveToPending,
  height = "calc(100vh - 220px)",
  showSerialNo = true,
  currentPage = 1,
  itemsPerPage = 20,
  customCellRenderer,
}: SheetsTableProps) {
  const hasActions = showActions || showApprovalActions;
  const {
    editingCell,
    inlineEditData,
    isDragging,
    handleCellClick,
    handleInlineFieldChange,
    saveFieldDirectly,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useSheetEditor({
    onSave: onSaveCell,
    onError: (error) => console.error("Save error:", error),
  });

  /**
   * Get field type icon
   */
  const getFieldTypeIcon = (column: SheetsTableColumn) => {
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

    if (largeTextFields.includes(column.key as string)) {
      return null;
    } else if (column.type === "date") {
      return (
        <FiCalendar className="inline-block ml-1 text-blue-500" size={12} />
      );
    } else if (column.type === "select") {
      return (
        <FiChevronDown className="inline-block ml-1 text-blue-600" size={14} />
      );
    } else if (column.type === "number") {
      return (
        <span
          className="inline-block ml-1 text-orange-600 font-bold"
          style={{ fontSize: "10px" }}
        >
          123
        </span>
      );
    }
    return null;
  };

  /**
   * Render editable cell
   */
  const renderEditableCell = (
    record: EMoURecord,
    column: SheetsTableColumn,
  ) => {
    const field = column.key;
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

    const canEditCell =
      column.editable !== false && canEdit(record.createdBy, record.department);

    const content = record[field];
    let displayContent: React.ReactNode = cleanDisplayValue(
      content,
    ) as React.ReactNode;

    // Format date display
    if (column.type === "date" && typeof content === "string") {
      displayContent = formatDisplayDate(content);
    }

    // Truncate if needed
    if (
      column.truncate &&
      typeof displayContent === "string" &&
      displayContent.length > column.truncate
    ) {
      displayContent = truncateText(displayContent, column.truncate);
    }

    // Custom renderer
    if (column.render) {
      displayContent = column.render(record);
    }

    // Date input for editing
    if (isEditing && column.type === "date") {
      // Convert DD.MM.YYYY to YYYY-MM-DD for input
      let inputValue = "";
      if (inlineEditData[field] && typeof inlineEditData[field] === "string") {
        const dateStr = inlineEditData[field] as string;
        if (
          !dateStr.toLowerCase().includes("perpetual") &&
          !dateStr.toLowerCase().includes("indefinite")
        ) {
          const parts = dateStr.split(".");
          if (parts.length === 3) {
            inputValue = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }
      }

      return (
        <td
          key={field}
          className={`px-3 py-2 text-xs ${column.width || ""}`}
          style={cellStyle}
        >
          <input
            type="date"
            value={inputValue}
            onChange={(e) => {
              const dateValue = e.target.value; // YYYY-MM-DD
              if (dateValue) {
                const [year, month, day] = dateValue.split("-");
                const formatted = `${day}.${month}.${year}`;
                handleInlineFieldChange(field, formatted);
              }
            }}
            onBlur={(e) => {
              const dateValue = e.target.value;
              if (dateValue) {
                const [year, month, day] = dateValue.split("-");
                const formatted = `${day}.${month}.${year}`;
                saveFieldDirectly(field, formatted);
              }
            }}
            className="w-full px-2 py-1 border rounded text-xs"
            autoFocus
          />
        </td>
      );
    }

    // Select input for editing
    if (isEditing && column.type === "select" && column.selectOptions) {
      return (
        <td
          key={field}
          className={`px-3 py-2 text-xs ${column.width || ""}`}
          style={cellStyle}
        >
          <select
            value={(inlineEditData[field] as string) || ""}
            onChange={(e) => {
              handleInlineFieldChange(field, e.target.value);
              saveFieldDirectly(field, e.target.value);
            }}
            className="w-full px-2 py-1 border rounded text-xs"
            autoFocus
          >
            {column.selectOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>
      );
    }

    // Number input for editing
    if (isEditing && column.type === "number") {
      return (
        <td
          key={field}
          className={`px-3 py-2 text-xs ${column.width || ""}`}
          style={cellStyle}
        >
          <input
            type="number"
            value={(inlineEditData[field] as number) || 0}
            onChange={(e) => {
              const numValue = parseInt(e.target.value) || 0;
              handleInlineFieldChange(field, numValue);
            }}
            onBlur={(e) => {
              const numValue = parseInt(e.target.value) || 0;
              saveFieldDirectly(field, numValue);
            }}
            className="w-full px-2 py-1 border rounded text-xs"
            autoFocus
          />
        </td>
      );
    }

    // Default contentEditable for text
    return (
      <td
        key={field}
        className={`px-3 py-2 text-xs ${column.width || ""} ${canEditCell ? "cursor-text hover:bg-blue-50" : ""}`}
        contentEditable={
          isEditing && column.type !== "date" && column.type !== "select"
        }
        suppressContentEditableWarning
        onClick={() => handleCellClick(record, field, canEditCell)}
        onBlur={(e) => {
          if (isEditing) {
            saveFieldDirectly(field, e.currentTarget.textContent || "");
          }
        }}
        style={cellStyle}
        title={
          column.truncate && typeof content === "string"
            ? content
            : !isEditing && canEditCell
              ? "Click to edit"
              : ""
        }
      >
        {isEditing && !column.render
          ? (inlineEditData[field] as string) || ""
          : displayContent}
      </td>
    );
  };

  /**
   * Render status badge
   */
  const renderStatusBadge = (record: EMoURecord) => {
    const displayStatus = getDisplayStatus(record);
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}
      >
        {displayStatus}
      </span>
    );
  };

  /**
   * Render document upload/view cell
   */
  const renderDocumentCell = (
    record: EMoURecord,
    field: "hodApprovalDoc" | "signedAgreementDoc",
    label: string,
  ) => {
    const url = record[field];
    const isUploading =
      uploadingDoc?.recordId === record.id && uploadingDoc?.field === field;

    const stickyRight = getStickyRight(field, hasActions);

    return (
      <td
        className="px-3 py-2 text-xs bg-white border-l border-gray-200"
        style={{
          position: "sticky",
          right: `${stickyRight}px`,
          zIndex: 2,
          minWidth: `${STICKY_WIDTHS[field]}px`,
          width: `${STICKY_WIDTHS[field]}px`,
        }}
      >
        <div className="flex items-center gap-2">
          {url ? (
            <>
              <button
                onClick={() => onViewDocument && onViewDocument(url, label)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                title="View document"
              >
                <FiEye size={13} />
                View
              </button>
              {canEdit(record.createdBy, record.department) && onFileUpload && (
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm cursor-pointer">
                  <FiUpload size={13} />
                  Replace
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onFileUpload) {
                        onFileUpload(record.id, field, file);
                      }
                    }}
                  />
                </label>
              )}
            </>
          ) : (
            <>
              {canEdit(record.createdBy, record.department) && onFileUpload ? (
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer">
                  <FiUpload size={13} />
                  {isUploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onFileUpload) {
                        onFileUpload(record.id, field, file);
                      }
                    }}
                    disabled={isUploading}
                  />
                </label>
              ) : (
                <span className="text-gray-400 text-xs">No document</span>
              )}
            </>
          )}
        </div>
      </td>
    );
  };

  /**
   * Render action buttons
   */
  const renderActions = (record: EMoURecord) => {
    return (
      <td className="px-3 py-2 text-xs bg-white border-l border-gray-200" style={{ position: "sticky", right: `${getActionsStickyRight()}px`, zIndex: 2, minWidth: `${ACTION_COL_WIDTH}px` }}>
        <div className="flex items-center gap-2 justify-end">
          {onView && (
            <button
              onClick={() => onView(record)}
              className="text-blue-600 hover:text-blue-800"
              title="View details"
            >
              <FiEye size={16} />
            </button>
          )}
          {onEdit && canEdit(record.createdBy, record.department) && (
            <button
              onClick={() => onEdit(record)}
              className="text-yellow-600 hover:text-yellow-800"
              title="Edit"
            >
              <FiEdit2 size={16} />
            </button>
          )}
          {onDelete && canDelete(record.createdBy, record.department) && (
            <button
              onClick={() => onDelete(record.id)}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <FiTrash2 size={16} />
            </button>
          )}
          {actions.map((action, idx) => {
            const shouldShow = action.show ? action.show(record) : true;
            if (!shouldShow) return null;
            return (
              <button
                key={idx}
                onClick={() => action.onClick(record)}
                className={action.color || "text-gray-600 hover:text-gray-800"}
                title={action.label}
              >
                {action.icon}
              </button>
            );
          })}
        </div>
      </td>
    );
  };

  /**
   * Render approval actions
   */
  const renderApprovalActions = (record: EMoURecord) => {
    return (
      <td className="px-3 py-2 text-xs bg-white border-l border-gray-200" style={{ position: "sticky", right: `${getActionsStickyRight()}px`, zIndex: 2, minWidth: `${ACTION_COL_WIDTH}px` }}>
        <div className="flex items-center gap-2 justify-end">
          {onView && (
            <button
              onClick={() => onView(record)}
              className="text-blue-600 hover:text-blue-800"
              title="View details"
            >
              <FiEye size={16} />
            </button>
          )}
          {record.approvalStatus === "pending" && (
            <>
              {onApprove && (
                <button
                  onClick={() => onApprove(record.id)}
                  className="text-green-600 hover:text-green-800"
                  title="Approve"
                >
                  <FiCheckCircle size={16} />
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(record.id)}
                  className="text-red-600 hover:text-red-800"
                  title="Reject"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </>
          )}
          {(record.approvalStatus === "draft" ||
            record.approvalStatus === "approved") &&
            onMoveToPending && (
              <button
                onClick={() => onMoveToPending(record.id)}
                className="text-orange-600 hover:text-orange-800"
                title="Move to Pending"
              >
                <FiClock size={16} />
              </button>
            )}
        </div>
      </td>
    );
  };

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200"
      style={{
        height,
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
              {showSerialNo && <th style={{ width: "60px" }}>S.No</th>}
              {columns.map((column) => {
                const isSticky = STICKY_RIGHT_KEYS.includes(column.key);
                const stickyStyle = isSticky
                  ? {
                      position: "sticky" as const,
                      right: `${getStickyRight(column.key as string, hasActions)}px`,
                      zIndex: 12,
                      backgroundColor: "#fff",
                      borderLeft: "1px solid #e5e7eb",
                      minWidth: column.width,
                      width: column.width,
                    }
                  : { width: column.width, minWidth: column.width };
                return (
                  <th
                    key={column.key}
                    style={stickyStyle}
                  >
                    {column.label}
                    {getFieldTypeIcon(column)}
                  </th>
                );
              })}
              {(showActions || showApprovalActions) && (
                <th style={{ width: `${ACTION_COL_WIDTH}px`, position: "sticky" as const, right: `${getActionsStickyRight()}px`, zIndex: 12, backgroundColor: "#fff", borderLeft: "1px solid #e5e7eb" }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (showActions || showApprovalActions ? 1 : 0) +
                    (showSerialNo ? 1 : 0)
                  }
                  className="text-center py-8 text-[#6b7280]"
                >
                  No records found
                </td>
              </tr>
            ) : (
              records.map((record, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index;
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {showSerialNo && (
                      <td className="text-center text-xs text-[#6b7280]">
                        {globalIndex + 1}
                      </td>
                    )}
                    {columns.map((column) => {
                      // Custom cell renderer
                      if (customCellRenderer) {
                        const customCell = customCellRenderer(
                          record,
                          column,
                          () => renderEditableCell(record, column),
                        );
                        if (customCell) return customCell;
                      }

                      const isSticky = STICKY_RIGHT_KEYS.includes(column.key);
                      const stickyStyle = isSticky
                        ? {
                            position: "sticky" as const,
                            right: `${getStickyRight(column.key as string, hasActions)}px`,
                            zIndex: 2,
                            backgroundColor: "#fff",
                            borderLeft: "1px solid #e5e7eb",
                            minWidth: STICKY_WIDTHS[column.key as string] ? `${STICKY_WIDTHS[column.key as string]}px` : column.width,
                          }
                        : undefined;

                      // Special handling for ID column
                      if (column.key === "id") {
                        return (
                          <td
                            key={column.key}
                            className="font-medium text-[#2563eb] font-mono"
                          >
                            {record.id}
                          </td>
                        );
                      }

                      // Special handling for status
                      if (column.key === "status") {
                        return (
                          <td
                            key={column.key}
                            className="text-center"
                            title="Status is auto-calculated based on expiry date"
                          >
                            {renderStatusBadge(record)}
                          </td>
                        );
                      }

                      // Special handling for documents
                      if (column.key === "hodApprovalDoc") {
                        return (
                          <React.Fragment key={column.key}>
                            {renderDocumentCell(
                              record,
                              "hodApprovalDoc",
                              `HO Approval - ${record.companyName}`,
                            )}
                          </React.Fragment>
                        );
                      }
                      if (column.key === "signedAgreementDoc") {
                        return (
                          <React.Fragment key={column.key}>
                            {renderDocumentCell(
                              record,
                              "signedAgreementDoc",
                              `Signed Agreement - ${record.companyName}`,
                            )}
                          </React.Fragment>
                        );
                      }

                      // Special handling for documentAvailability (sticky)
                      if (column.key === "documentAvailability" && isSticky) {
                        return (
                          <td
                            key={column.key}
                            className={`px-3 py-2 text-xs bg-white border-l border-gray-200 ${
                              column.editable !== false && canEdit(record.createdBy, record.department)
                                ? "cursor-text hover:bg-blue-50"
                                : ""
                            }`}
                            style={stickyStyle}
                            onClick={() =>
                              handleCellClick(
                                record,
                                column.key,
                                column.editable !== false && canEdit(record.createdBy, record.department),
                              )
                            }
                          >
                            {editingCell?.recordId === record.id && editingCell?.field === column.key && column.type === "select" && column.selectOptions ? (
                              <select
                                value={(inlineEditData[column.key] as string) || ""}
                                onChange={(e) => {
                                  handleInlineFieldChange(column.key, e.target.value);
                                  saveFieldDirectly(column.key, e.target.value);
                                }}
                                className="w-full px-2 py-1 border rounded text-xs"
                                autoFocus
                              >
                                {column.selectOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              cleanDisplayValue(record[column.key]) as React.ReactNode
                            )}
                          </td>
                        );
                      }

                      // Special handling for createdByName
                      if (column.key === "createdByName") {
                        return (
                          <td key={column.key} className="text-xs">
                            {record.createdByName}
                          </td>
                        );
                      }

                      // Default editable cell
                      return renderEditableCell(record, column);
                    })}
                    {showActions && renderActions(record)}
                    {showApprovalActions && renderApprovalActions(record)}
                  </tr>
                );
              })
            )}
            {/* Empty rows to ensure scrollbar is always visible */}
            {records.length > 0 &&
              records.length < 20 &&
              [...Array(20 - records.length)].map((_, i) => (
                <tr
                  key={`empty-${i}`}
                  className="h-10 border-b border-gray-100"
                >
                  {showSerialNo && <td className="bg-gray-50/30">&nbsp;</td>}
                  {columns.map((_, j) => (
                    <td key={`empty-cell-${i}-${j}`} className="bg-gray-50/30">
                      &nbsp;
                    </td>
                  ))}
                  {(showActions || showApprovalActions) && (
                    <td className="bg-gray-50/30">&nbsp;</td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
