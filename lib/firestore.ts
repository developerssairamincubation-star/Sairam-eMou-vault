import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  setDoc,
  limit,
  startAfter,
  getCountFromServer,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { EMoURecord, User, DepartmentCode, FilterOptions } from '@/types';

// Collections
const EMOU_COLLECTION = 'emous';
const USERS_COLLECTION = 'users';
const COUNTERS_COLLECTION = 'counters';

// Helper function to remove undefined values from objects
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}

// Get short department code for ID generation (2 characters)
function getShortDeptCode(department: DepartmentCode): string {
  const deptCodeMap: Record<DepartmentCode, string> = {
    'CSE': 'CS',
    'ECE': 'EC',
    'MECH': 'ME',
    'CIVIL': 'CE',
    'EEE': 'EE',
    'IT': 'IT',
    'AIDS': 'AD',
    'CSBS': 'CB',
    'E&I': 'EI',
    'MECHATRONICS': 'MZ',
    'CCE': 'CO',
    'AIML': 'AM',
    'CYBERSECURITY': 'SC',
    'IOT': 'CI',
    'EICE': 'IX',
    'CSE MTECH': 'CJ',
    'Institution': 'IN',
    'Incubation': 'IB',
  };
  return deptCodeMap[department] || department.slice(0, 2);
}

// Generate unique eMoU ID: YY + DEPARTMENT_CODE + SEQUENTIAL_NUMBER
// If fromDate is provided, uses year from fromDate, otherwise uses current year
export async function generateEMoUId(department: DepartmentCode, fromDate?: string): Promise<string> {
  let year: string;
  
  // Extract year from fromDate if provided (format: dd.mm.yyyy)
  if (fromDate && fromDate !== "Perpetual") {
    const parts = fromDate.split('.');
    if (parts.length === 3) {
      year = parts[2].slice(-2); // Last 2 digits of year
    } else {
      year = new Date().getFullYear().toString().slice(-2);
    }
  } else {
    year = new Date().getFullYear().toString().slice(-2);
  }
  
  const deptCode = getShortDeptCode(department);
  const counterId = `${year}_${deptCode}`;
  const counterRef = doc(db, COUNTERS_COLLECTION, counterId);
  
  const counterDoc = await getDoc(counterRef);
  let nextNumber = 1;
  
  if (counterDoc.exists()) {
    nextNumber = (counterDoc.data().count || 0) + 1;
  }
  
  await setDoc(counterRef, { count: nextNumber, year, department: deptCode });
  
  const sequentialNumber = nextNumber.toString().padStart(3, '0');
  return `${year}SEC${deptCode}${sequentialNumber}`;
}

// eMoU CRUD Operations
export async function createEMoU(data: Omit<EMoURecord, 'id'>): Promise<string> {
  const id = await generateEMoUId(data.department, data.fromDate);
  const emouData = {
    ...data,
    id,
    createdAt: Timestamp.fromDate(data.createdAt),
    updatedAt: data.updatedAt ? Timestamp.fromDate(data.updatedAt) : null,
  };
  
  // Remove undefined values before saving to Firestore
  const cleanedData = removeUndefined(emouData);
  
  await setDoc(doc(db, EMOU_COLLECTION, id), cleanedData);
  return id;
}

export async function getEMoU(id: string): Promise<EMoURecord | null> {
  const docRef = doc(db, EMOU_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as EMoURecord;
  }
  
  return null;
}

export async function updateEMoU(id: string, data: Partial<EMoURecord>): Promise<void> {
  const docRef = doc(db, EMOU_COLLECTION, id);
  const updateData: Record<string, unknown> = { ...data };
  
  if (data.updatedAt) {
    updateData.updatedAt = Timestamp.fromDate(data.updatedAt);
  }
  
  // Remove undefined values before updating Firestore
  const cleanedData = removeUndefined(updateData);
  
  await updateDoc(docRef, cleanedData);
}

export async function deleteEMoU(id: string): Promise<void> {
  const docRef = doc(db, EMOU_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function getEMoUs(filters?: FilterOptions): Promise<EMoURecord[]> {
  const constraints: QueryConstraint[] = [];
  
  if (filters?.department && filters.department !== 'all') {
    constraints.push(where('department', '==', filters.department));
  }
  
  if (filters?.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  }
  
  constraints.push(orderBy('createdAt', 'desc'));
  
  const q = query(collection(db, EMOU_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as EMoURecord;
  });
}

// Paginated result interface
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

// Pagination options interface
export interface PaginationOptions {
  pageSize: number;
  lastDoc?: DocumentSnapshot | null;
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected';
}

// Get total count of eMoUs with filters
export async function getEMoUsCount(filters?: FilterOptions, approvalStatus?: string): Promise<number> {
  const constraints: QueryConstraint[] = [];
  
  if (filters?.department && filters.department !== 'all') {
    constraints.push(where('department', '==', filters.department));
  }
  
  if (filters?.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  }
  
  if (approvalStatus) {
    constraints.push(where('approvalStatus', '==', approvalStatus));
  }
  
  const q = query(collection(db, EMOU_COLLECTION), ...constraints);
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

// Get paginated eMoUs
export async function getEMoUsPaginated(
  filters?: FilterOptions,
  pagination?: PaginationOptions
): Promise<PaginatedResult<EMoURecord>> {
  const constraints: QueryConstraint[] = [];
  
  if (filters?.department && filters.department !== 'all') {
    constraints.push(where('department', '==', filters.department));
  }
  
  if (filters?.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  }
  
  if (pagination?.approvalStatus) {
    constraints.push(where('approvalStatus', '==', pagination.approvalStatus));
  }
  
  // Order by department first, then by createdAt for consistent pagination
  constraints.push(orderBy('department', 'asc'));
  constraints.push(orderBy('createdAt', 'desc'));
  
  // Apply cursor if provided
  if (pagination?.lastDoc) {
    constraints.push(startAfter(pagination.lastDoc));
  }
  
  // Apply page size limit
  const pageSize = pagination?.pageSize || 20;
  constraints.push(limit(pageSize + 1)); // Fetch one extra to check if there's more
  
  const q = query(collection(db, EMOU_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);
  
  const docs = querySnapshot.docs;
  const hasMore = docs.length > pageSize;
  const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
  
  const data = resultDocs.map(doc => {
    const docData = doc.data();
    return {
      ...docData,
      createdAt: docData.createdAt.toDate(),
      updatedAt: docData.updatedAt?.toDate(),
    } as EMoURecord;
  });
  
  // Get total count
  const totalCount = await getEMoUsCount(filters, pagination?.approvalStatus);
  
  return {
    data,
    totalCount,
    hasMore,
    lastDoc: resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null,
  };
}

// Get eMoUs for a specific page (offset-based pagination)
export async function getEMoUsPage(
  page: number,
  pageSize: number,
  filters?: FilterOptions,
  approvalStatus?: 'draft' | 'pending' | 'approved' | 'rejected'
): Promise<{ data: EMoURecord[]; totalCount: number; totalPages: number }> {
  const constraints: QueryConstraint[] = [];
  
  if (filters?.department && filters.department !== 'all') {
    constraints.push(where('department', '==', filters.department));
  }
  
  if (filters?.status && filters.status !== 'all') {
    constraints.push(where('status', '==', filters.status));
  }
  
  if (approvalStatus) {
    constraints.push(where('approvalStatus', '==', approvalStatus));
  }
  
  // Order by department first for sorting, then by createdAt
  constraints.push(orderBy('department', 'asc'));
  constraints.push(orderBy('createdAt', 'desc'));
  
  // Get total count first
  const totalCount = await getEMoUsCount(filters, approvalStatus);
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // For offset-based pagination, we need to skip records
  // Firestore doesn't have offset, so we fetch all and slice (not ideal for large datasets)
  // Alternative: use cursor-based pagination with cached cursors
  const q = query(collection(db, EMOU_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);
  
  const allDocs = querySnapshot.docs;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageDocs = allDocs.slice(startIndex, endIndex);
  
  const data = pageDocs.map(doc => {
    const docData = doc.data();
    return {
      ...docData,
      createdAt: docData.createdAt.toDate(),
      updatedAt: docData.updatedAt?.toDate(),
    } as EMoURecord;
  });
  
  return {
    data,
    totalCount,
    totalPages,
  };
}

// User CRUD Operations
export async function createUser(uid: string, userData: Omit<User, 'uid'>): Promise<void> {
  const userDoc = {
    ...userData,
    uid,
    createdAt: Timestamp.fromDate(userData.createdAt),
    updatedAt: Timestamp.fromDate(userData.updatedAt),
  };
  
  await setDoc(doc(db, USERS_COLLECTION, uid), userDoc);
}

export async function getUser(uid: string): Promise<User | null> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as User;
  }
  
  return null;
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const updateData: Record<string, unknown> = { ...data };
  
  if (data.updatedAt) {
    updateData.updatedAt = Timestamp.fromDate(data.updatedAt);
  }
  
  await updateDoc(docRef, updateData);
}

export async function getAllUsers(): Promise<User[]> {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id, // Add the document ID as uid
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as User;
  });
}

export async function deleteUser(uid: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(docRef);
}
