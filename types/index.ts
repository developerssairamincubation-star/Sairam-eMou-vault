// User roles
export type UserRole = 'admin' | 'hod' | 'master';

// User interface
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string; // Required for HOD users
  createdAt: Date;
  updatedAt: Date;
}

// Department codes
export type DepartmentCode = 'CSE' | 'ECE' | 'MECH' | 'CIVIL' | 'EEE' | 'IT' | 'AIDS' | 'CSBS';

// eMoU Status
export type EMoUStatus = 'Active' | 'Expired' | 'Renewal Pending' | 'Draft';

// Document Availability
export type DocumentAvailability = 'Available' | 'Not Available';

// eMoU Record interface - matches all fields from README
export interface EMoURecord {
  id: string; // Format: YY + DEPARTMENT_CODE + SEQUENTIAL_NUMBER (e.g., 26CSE001)
  department: DepartmentCode;
  companyName: string;
  fromDate: string; // DD.MM.YYYY
  toDate: string; // DD.MM.YYYY
  status: EMoUStatus;
  scannedCopy?: string; // Google Drive link to scanned document
  documentAvailability: DocumentAvailability;
  description: string;
  companyWebsite?: string;
  aboutCompany?: string;
  companyAddress?: string;
  industryContactName?: string;
  industryContactMobile?: string;
  industryContactEmail?: string;
  institutionContactName?: string;
  institutionContactMobile?: string;
  institutionContactEmail?: string;
  clubsAligned?: string;
  sdgGoals?: string;
  skillsTechnologies?: string;
  perStudentCost?: number;
  placementOpportunity?: number;
  internshipOpportunity?: number;
  goingForRenewal: 'Yes' | 'No';
  benefitsAchieved?: string;
  companyRelationship?: 1 | 2 | 3 | 4 | 5;
  
  // Audit fields
  createdBy: string; // User UID
  createdByName: string; // User display name
  createdAt: Date;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: Date;
}

// Form data type (before submission)
export type EMoUFormData = Omit<EMoURecord, 'id' | 'createdBy' | 'createdByName' | 'createdAt' | 'updatedBy' | 'updatedByName' | 'updatedAt'>;

// Filter options
export interface FilterOptions {
  department?: DepartmentCode | 'all';
  status?: EMoUStatus | 'all';
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
}
