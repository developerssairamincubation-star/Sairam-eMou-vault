import { useState, useEffect, useCallback } from "react";
import { EMoURecord, DepartmentCode } from "@/types";
import { calculateStatusFromToDate } from "@/lib/sheetsUtils";

interface EditingCell {
  recordId: string;
  field: string;
}

interface UseSheetEditorProps {
  onSave: (
    recordId: string,
    updates: Partial<EMoURecord>
  ) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useSheetEditor({ onSave, onError }: UseSheetEditorProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [inlineEditData, setInlineEditData] = useState<Partial<EMoURecord>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  /**
   * Handle cell click to start editing
   */
  const handleCellClick = useCallback(
    (record: EMoURecord, field: keyof EMoURecord, canEdit: boolean = true) => {
      // Non-editable fields
      const nonEditableFields = [
        "id",
        "status",
        "createdBy",
        "createdByName",
        "createdAt",
        "updatedBy",
        "updatedByName",
        "updatedAt",
      ];

      if (canEdit && !nonEditableFields.includes(field as string)) {
        setEditingCell({ recordId: record.id, field });
        setInlineEditData(record);
      }
    },
    []
  );

  /**
   * Handle inline field changes
   */
  const handleInlineFieldChange = useCallback(
    (field: keyof EMoURecord, value: string | number) => {
      setInlineEditData((prev) => {
        const updates: Partial<EMoURecord> = { [field]: value };

        // Auto-update status when toDate changes (but preserve Draft status)
        if (field === "toDate" && typeof value === "string" && prev.status !== "Draft") {
          const newStatus = calculateStatusFromToDate(value);
          if (newStatus) {
            updates.status = newStatus;
          }
        }

        // Auto-update department when maintainedBy changes
        if (field === "maintainedBy" && typeof value === "string") {
          if (value === "Institution" || value === "Incubation") {
            updates.department = value as DepartmentCode;
          } else if (value === "Departments") {
            const currentDept = (prev.department as string) || "";
            if (currentDept === "Institution" || currentDept === "Incubation") {
              updates.department = "" as DepartmentCode;
            }
          }
        }

        return { ...prev, ...updates };
      });
    },
    []
  );

  /**
   * Save inline edit
   */
  const saveInlineEdit = useCallback(async () => {
    if (!editingCell) return;

    try {
      await onSave(editingCell.recordId, inlineEditData);
      setEditingCell(null);
      setInlineEditData({});
    } catch (error) {
      console.error("Failed to update record:", error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [editingCell, inlineEditData, onSave, onError]);

  /**
   * Save a specific field value directly
   */
  const saveFieldDirectly = useCallback(
    async (field: keyof EMoURecord, value: string | number) => {
      if (!editingCell) return;

      try {
        const updates: Partial<EMoURecord> = {
          ...inlineEditData,
          [field]: value,
        };

        // Auto-update status when toDate changes (but preserve Draft status)
        if (field === "toDate" && typeof value === "string" && inlineEditData.status !== "Draft") {
          const newStatus = calculateStatusFromToDate(value);
          if (newStatus) {
            updates.status = newStatus;
          }
        }

        // Auto-update department when maintainedBy changes
        if (field === "maintainedBy" && typeof value === "string") {
          if (value === "Institution" || value === "Incubation") {
            updates.department = value as DepartmentCode;
          } else if (value === "Departments") {
            const currentDept = (inlineEditData.department as string) || "";
            if (currentDept === "Institution" || currentDept === "Incubation") {
              updates.department = "" as DepartmentCode;
            }
          }
        }

        await onSave(editingCell.recordId, updates);
        setEditingCell(null);
        setInlineEditData({});
      } catch (error) {
        console.error("Failed to update record:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    },
    [editingCell, inlineEditData, onSave, onError]
  );

  /**
   * Cancel inline edit
   */
  const cancelInlineEdit = useCallback(() => {
    setEditingCell(null);
    setInlineEditData({});
  }, []);

  /**
   * Drag-to-scroll handlers
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      const container = e.currentTarget;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      container.scrollLeft = scrollStart.left - dx;
      container.scrollTop = scrollStart.top - dy;
    },
    [isDragging, dragStart, scrollStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Auto-save on click outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!editingCell) return;

      const target = event.target as HTMLElement;

      const isEditableCell =
        target.hasAttribute("contenteditable") ||
        target.closest('[contenteditable="true"]');
      const isDateInput =
        target.tagName === "INPUT" && target.getAttribute("type") === "date";
      const isWithinDateInput = target.closest('input[type="date"]');
      const isSelectElement =
        target.tagName === "SELECT" || target.closest("select");
      const isSelectOption = target.tagName === "OPTION";

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
  }, [editingCell, saveInlineEdit]);

  return {
    // State
    editingCell,
    inlineEditData,
    isDragging,

    // Cell editing
    handleCellClick,
    handleInlineFieldChange,
    saveInlineEdit,
    saveFieldDirectly,
    cancelInlineEdit,

    // Drag-to-scroll
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
