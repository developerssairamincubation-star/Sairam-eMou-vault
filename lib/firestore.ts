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
} from 'firebase/firestore';
import { db } from './firebase';
import { EMoURecord, User, DepartmentCode, FilterOptions } from '@/types';

// Collections
const EMOU_COLLECTION = 'emous';
const USERS_COLLECTION = 'users';
const COUNTERS_COLLECTION = 'counters';

// Generate unique eMoU ID: YY + DEPARTMENT_CODE + SEQUENTIAL_NUMBER
export async function generateEMoUId(department: DepartmentCode): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const counterId = `${year}_${department}`;
  const counterRef = doc(db, COUNTERS_COLLECTION, counterId);
  
  const counterDoc = await getDoc(counterRef);
  let nextNumber = 1;
  
  if (counterDoc.exists()) {
    nextNumber = (counterDoc.data().count || 0) + 1;
  }
  
  await setDoc(counterRef, { count: nextNumber, year, department });
  
  const sequentialNumber = nextNumber.toString().padStart(3, '0');
  return `${year}${department}${sequentialNumber}`;
}

// eMoU CRUD Operations
export async function createEMoU(data: Omit<EMoURecord, 'id'>): Promise<string> {
  const id = await generateEMoUId(data.department);
  const emouData = {
    ...data,
    id,
    createdAt: Timestamp.fromDate(data.createdAt),
    updatedAt: data.updatedAt ? Timestamp.fromDate(data.updatedAt) : null,
  };
  
  await setDoc(doc(db, EMOU_COLLECTION, id), emouData);
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
  
  await updateDoc(docRef, updateData);
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
