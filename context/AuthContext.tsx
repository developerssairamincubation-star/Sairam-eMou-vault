"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, createUser as createUserInDb } from "@/lib/firestore";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    department?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  canEdit: (recordCreatorUid: string, recordDepartment: string) => boolean;
  canDelete: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userData = await getUser(firebaseUser.uid);
        if (userData) {
          // Ensure all required fields are available
          const enrichedUserData: User = {
            ...userData,
            uid: firebaseUser.uid, // Explicitly set from Firebase Auth
            displayName:
              userData.displayName ||
              firebaseUser.displayName ||
              userData.email,
          };
          setUser(enrichedUserData);
        } else {
          setUser(null);
        }
        setFirebaseUser(firebaseUser);
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    department?: string,
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await updateProfile(userCredential.user, { displayName });

    // Create user document in Firestore
    const now = new Date();
    await createUserInDb(userCredential.user.uid, {
      email,
      displayName,
      role,
      department,
      createdAt: now,
      updatedAt: now,
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // Check if user can edit a record
  const canEdit = (
    recordCreatorUid: string,
    recordDepartment: string,
  ): boolean => {
    if (!user) return false;

    // Admin can edit everything
    if (user.role === "admin") return true;

    // Master user can edit everything
    if (user.role === "master") return true;

    // HOD can only edit records from their department
    if (user.role === "hod") {
      return user.department === recordDepartment;
    }

    return false;
  };

  // Check if user can delete a record (only admin)
  const canDelete = (): boolean => {
    if (!user) return false;
    return user.role === "admin";
  };

  // Check if user is admin
  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const value = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    canEdit,
    canDelete,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
