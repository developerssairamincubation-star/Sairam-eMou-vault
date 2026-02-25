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
export type DepartmentCode = 'CSE' | 'ECE' | 'MECH' | 'CIVIL' | 'EEE' | 'IT' | 'AIDS' | 'CSBS' | 'E&I' | 'MECHATRONICS' | 'CCE' | 'AIML' | 'CYBERSECURITY' | 'IOT' | 'EICE' | 'CSE MTECH' | 'Institution' | 'Incubation';

// eMoU Status
export type EMoUStatus = 'Active' | 'Expired' | 'Renewal Pending' | 'Draft';

// Document Availability
export type DocumentAvailability = 'Available' | 'Not Available';

// Scope
export type ScopeType = 'National' | 'International';

// Maintained By
export type MaintainedBy = 'Institution' | 'Incubation' | 'Departments';

// IEEE Societies
export const IEEE_SOCIETIES = [
  "IEEE Aerospace and Electronic Systems Society",
  "IEEE Antennas and Propagation Society",
  "IEEE Broadcast Technology Society",
  "IEEE Circuits and Systems Society",
  "IEEE Communications Society",
  "IEEE Components, Packaging and Manufacturing Technology Society",
  "IEEE Computational Intelligence Society",
  "IEEE Computer Society",
  "IEEE Consumer Technology Society",
  "IEEE Control Systems Society",
  "IEEE Dielectrics and Electrical Insulation Society",
  "IEEE Education Society",
  "IEEE Electromagnetic Compatibility Society",
  "IEEE Electron Devices Society",
  "IEEE Electronics Packaging Society",
  "IEEE Engineering in Medicine and Biology Society",
  "IEEE Geoscience and Remote Sensing Society",
  "IEEE Industrial Electronics Society",
  "IEEE Industry Applications Society",
  "IEEE Information Theory Society",
  "IEEE Instrumentation and Measurement Society",
  "IEEE Intelligent Transportation Systems Society",
  "IEEE Magnetics Society",
  "IEEE Microwave Theory and Technology Society",
  "IEEE Nuclear and Plasma Sciences Society",
  "IEEE Oceanic Engineering Society",
  "IEEE Photonics Society",
  "IEEE Power Electronics Society",
  "IEEE Power and Energy Society",
  "IEEE Product Safety Engineering Society",
  "IEEE Professional Communication Society",
  "IEEE Reliability Society",
  "IEEE Robotics and Automation Society",
  "IEEE Signal Processing Society",
  "IEEE Society on Social Implications of Technology",
  "IEEE Solid-State Circuits Society",
  "IEEE Systems, Man, and Cybernetics Society",
  "IEEE Technology and Engineering Management Society",
  "IEEE Ultrasonics, Ferroelectrics, and Frequency Control Society",
  "IEEE Vehicular Technology Society",
  "Not Applicable",
] as const;

export type IEEESociety = typeof IEEE_SOCIETIES[number];

// EMoU Outcome predefined options
export const EMOU_OUTCOME_OPTIONS = [
  "Faculty Internship Training",
  "Student Internship Training",
  "Deputation of Industry Person",
  "BoS Members",
  "Curriculum Development",
] as const;

export type EMoUOutcomeOption = typeof EMOU_OUTCOME_OPTIONS[number];

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
  scope: ScopeType; // National or International
  maintainedBy: MaintainedBy; // Institution, Incubation, or Departments
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected'; // Approval workflow status
  hodApprovalDoc?: string; // Cloudinary link to HO approval document
  signedAgreementDoc?: string; // Cloudinary link to signed agreement document
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
  ieeeSociety?: string; // Selected IEEE society
  emouOutcome?: string; // Comma-separated outcomes (predefined + custom)
  
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
  goingForRenewal?: 'Yes' | 'No';
  fromDate?: string;
  toDate?: string;
  searchTerm?: string;
}
