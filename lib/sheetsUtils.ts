import { EMoURecord, EMoUStatus } from "@/types";

/**
 * Parse date in DD.MM.YYYY format
 */
export function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if a date has a very large year (like 9999) - treat as perpetual
 */
export function isPerpetualDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split(".");
  if (parts.length === 3) {
    const year = parseInt(parts[2], 10);
    return year >= 9000; // Years 9000+ are treated as perpetual
  }
  return false;
}

/**
 * Format date for display - show "Perpetual" for large year dates
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr || dateStr === "file chosen") return "";
  if (
    dateStr.toLowerCase().includes("perpetual") ||
    dateStr.toLowerCase().includes("indefinite") ||
    isPerpetualDate(dateStr)
  ) {
    return "Perpetual";
  }
  return dateStr;
}

/**
 * Get status color classes based on status
 */
export function getStatusColor(status: string): string {
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
}

/**
 * Calculate display status - shows "Expiring" instead of "Active" for records expiring within 2 months
 */
export function getDisplayStatus(record: EMoURecord): string {
  // Handle "file chosen" placeholder
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
}

/**
 * Calculate status updates when toDate changes
 */
export function calculateStatusFromToDate(
  toDate: string
): EMoUStatus | undefined {
  const dateStr = toDate.toLowerCase();
  const parts = toDate.split(".");
  const isLargeYear = parts.length === 3 && parseInt(parts[2], 10) >= 9000;

  if (dateStr === "perpetual" || dateStr === "indefinite" || isLargeYear) {
    return "Active" as EMoUStatus;
  } else if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const expiryDate = new Date(year, month - 1, day);
      expiryDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        return "Expired" as EMoUStatus;
      } else {
        return "Active" as EMoUStatus;
      }
    }
  }

  return undefined;
}

/**
 * Get role badge color classes
 */
export function getRoleBadgeColor(role: string): string {
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
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Filter out invalid placeholder values
 */
export function cleanDisplayValue(value: unknown): string | number | boolean | null | undefined {
  if (value === "file chosen") return "";
  return value as string | number | boolean | null | undefined;
}
