import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export async function DELETE(request: NextRequest) {
  try {
    // Get the current user's ID token from the request
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    // Verify the token and check if user is admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    // Get the current user's data from Firestore to check role
    const currentUserDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();
    
    const currentUserData = currentUserDoc.data();
    
    if (!currentUserData || currentUserData.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get uid from query params
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json(
        { error: "Missing required parameter: uid" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (uid === decodedToken.uid) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user data before deletion for logging
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Delete user from Firebase Authentication
    let authUserDeleted = false;
    try {
      await adminAuth.getUser(uid);
      await adminAuth.deleteUser(uid);
      authUserDeleted = true;
    } catch (error) {
      const err = error as { code?: string };
      if (err.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // Delete user from Firestore
    await adminDb.collection("users").doc(uid).delete();

    // Log audit trail
    const now = new Date();
    await adminDb.collection("audit_logs").add({
      action: "USER_DELETED",
      performedBy: decodedToken.uid,
      performedByEmail: decodedToken.email,
      targetUserId: uid,
      targetUserEmail: userData?.email || "unknown",
      targetUserRole: userData?.role || "unknown",
      authUserDeleted,
      timestamp: now,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      message: authUserDeleted
        ? "User deleted successfully from both Auth and Firestore"
        : "User deleted from Firestore only (Auth user was not found)",
      authUserDeleted,
    });

  } catch (error) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
