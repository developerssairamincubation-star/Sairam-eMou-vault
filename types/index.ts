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
  "IEEE Communication Society",
  "IEEE Computer Society",
  "IEEE Computational Intelligence Society",
  "IEEE Consumer Technology Society",
  "IEEE Control Systems Society",
  "IEEE Dielectrics and Electrical Insulation Society",
  "IEEE Education Society",
  "IEEE Electron Devices Society",
  "IEEE Electronics Packaging Society",
  "IEEE Electromagnetic Compatibility Society",
  "IEEE Engineering in Medicine and Biology Society",
  "IEEE Geoscience and Remote Sensing Society",
  "IEEE Industrial Applications Society",
  "IEEE Industrial Electronics Society",
  "IEEE Information Theory Society",
  "IEEE Instrumentation and Measurement Society",
  "IEEE Intelligent Transportation Systems Society",
  "IEEE Magnetics Society",
  "IEEE Microwave Theory and Technology Society",
  "IEEE Nuclear and Plasma Sciences Society",
  "IEEE Oceanic Engineering Society",
  "IEEE Power Electronics Society",
  "IEEE Power & Energy Society",
  "IEEE Product Safety Engineering Society",
  "IEEE Professional Communication Society",
  "IEEE Photonics Society",
  "IEEE Reliability Society",
  "IEEE Robotics and Automation Society",
  "IEEE Signal Processing Society",
  "IEEE Society on Social Implications of Technology",
  "IEEE Solid-State Circuits Society",
  "IEEE Systems, Man and Cybernetics Society",
  "IEEE Technology & Engineering Management Society",
  "IEEE Ultrasonics, Ferroelectrics, and Frequency Control Society",
  "IEEE Vehicular Technology Society",
  "IEEE Women In Engineering (WiE)",
  "IEEE Nano Technology Council",
  "IEEE SIGHT (Special Interest Group on Humanitarian Technology)",
  "Not Applicable",
] as const;

export type IEEESociety = typeof IEEE_SOCIETIES[number];

// IEEE Communities
export const IEEE_COMMUNITIES = [
  "Blockchain Community",
  "Brain Community",
  "Digital Privacy Community",
  "Digital Reality Community",
  "Entrepreneurship Community",
  "Future Networks Community",
  "Intl Roadmap for Devices and Systems",
  "Internet of Things Community",
  "Public Safety Technology Community",
  "Quantum Community",
  "Smart Cities Community",
  "Tech Ethics Community",
  "IEEE Technology for a Sustainable Climate Community",
  "Not Applicable",
] as const;

export type IEEECommunity = typeof IEEE_COMMUNITIES[number];

// Club options
export const CLUB_OPTIONS = [
  "Technoculture Club",
  "Automobile Club",
  "Code Club",
  "Cyber Club",
  "Disaster Management & Safety Club",
  "ECO and Swacch Bharat",
  "ENSAV Club",
  "English Language & Literature Club",
  "Foreign Language Club",
  "Fine Arts Association",
  "Health & Yoga Club",
  "M-apps Club",
  "Maths Club",
  "Photography Club",
  "Robotics Club",
  "Rotaract Club",
  "Science Club",
  "Skill Development Club",
  "Sai Muthamizh Mandram",
  "Young Indians Club",
  "Red Ribbon Club",
  "Game Development Club",
  "AI Club",
  "Entrepreneurship Cell",
  "Higher Education Cell",
  "NCC",
  "NSS",
  "Women Empowerment Cell (WOWWW)",
  "YRC",
  "IPR",
  "Not Applicable",
] as const;

export type ClubOption = typeof CLUB_OPTIONS[number];

// EMoU Outcome predefined options
export const EMOU_OUTCOME_OPTIONS = [
  "Faculty Internship Training",
  "Student Internship Training",
  "Deputation of Industry Person",
  "BoS Members",
  "Curriculum Development",
] as const;

// Domain options
export const DOMAIN_OPTIONS = [
  "Not Applicable",
  "Advanced Control & Automation",
  "Applied Electronics",
  "Applied Instrumentation",
  "Artificial Intelligence (AI)",
  "Cloud Computing",
  "Computer Networks",
  "Construction Engineering & Management",
  "Cyber Security",
  "Data Science",
  "Electric Vehicles & Intelligent Mobility System",
  "Energy Engineering",
  "Engineering Design",
  "Environmental & Sustainability Engineering",
  "FinTech & Blockchain",
  "Green Energy",
  "Image Processing",
  "Industrial Engineering",
  "Industrial Internet of Things (IIoT)",
  "Machine Learning",
  "Materials & Manufacturing",
  "Power Electronics",
  "Power Systems",
  "Quantum Computing",
  "RF & Green Communication",
  "Robotics & Automation",
  "Signal Processing & Biomedical Engineering",
  "Structural Engineering",
  "Transportation & Urban Planning",
  "VLSI & Embedded System",
  "WEB & APP Development",
  "Wireless Communication",
  "Cognitive Computing",
  "Smart & Secure System",
] as const;

export type DomainOption = typeof DOMAIN_OPTIONS[number];

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
  ieeeCommunity?: string; // Selected IEEE community
  emouOutcome?: string; // Comma-separated outcomes (predefined + custom)
  domain?: string; // Selected domain
  
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
