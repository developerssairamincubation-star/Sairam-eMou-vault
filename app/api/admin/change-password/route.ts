import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import crypto from "crypto";
import nodemailer from "nodemailer";

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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

// Generate a random strong password
function generateRandomPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  const pick = (chars: string) =>
    chars[crypto.randomInt(0, chars.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(special)];
  const rest = Array.from({ length: 10 }, () => pick(all));

  return [...required, ...rest].sort(() => crypto.randomInt(-1, 2)).join("");
}

async function sendPasswordChangedEmail(
  email: string,
  displayName: string,
  password: string,
) {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const mailOptions = {
    from: `"Sairam eMoU System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Password Has Been Reset - Sairam eMoU System",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937; margin: 0; padding: 0; background-color: #f8f9fa;">
        <div style="max-width: 560px; margin: 0 auto; background: white;">
          <div style="background: #1f2937; color: white; padding: 20px; border-bottom: 3px solid #2563eb;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 600;">Sairam eMoU Management System</h1>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 12px 0; font-size: 14px;">Dear <strong>${displayName}</strong>,</p>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #4b5563;">An administrator has reset your password. Use the new credentials below to log in.</p>
            <div style="background: #f8f9fa; border: 1px solid #d1d5db; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6b7280; width: 100px;">Email</td>
                  <td style="padding: 6px 12px; font-size: 13px; font-family: 'Courier New', monospace; font-weight: 500;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #6b7280;">New Password</td>
                  <td style="padding: 6px 12px; font-size: 13px; font-family: 'Courier New', monospace; font-weight: 500;">${password}</td>
                </tr>
              </table>
            </div>
            <p style="font-size: 13px; color: #4b5563;">Please log in and change your password if needed.</p>
            <p style="font-size: 13px; color: #6b7280;">Login URL: <a href="${loginUrl}/login" style="color: #2563eb;">${loginUrl}/login</a></p>
          </div>
          <div style="background: #f8f9fa; padding: 16px 24px; border-top: 1px solid #d1d5db; font-size: 11px; color: #6b7280; text-align: center;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Sri Sairam College. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your password has been reset by an administrator.\n\nEmail: ${email}\nNew Password: ${password}\n\nLogin: ${loginUrl}/login`,
  };

  await transporter.sendMail(mailOptions);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 },
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 },
      );
    }

    const currentUserDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();
    const currentUserData = currentUserDoc.data();

    if (!currentUserData || currentUserData.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { uid, newPassword } = body;

    if (!uid) {
      return NextResponse.json(
        { error: "Missing required field: uid" },
        { status: 400 },
      );
    }

    if (newPassword && newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    const targetUserDoc = await adminDb.collection("users").doc(uid).get();
    const targetUserData = targetUserDoc.data();

    if (!targetUserData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const password = newPassword || generateRandomPassword();

    await adminAuth.updateUser(uid, { password });

    let emailSent = false;
    try {
      await sendPasswordChangedEmail(
        targetUserData.email,
        targetUserData.displayName || targetUserData.email,
        password,
      );
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    const now = new Date();
    await adminDb.collection("audit_logs").add({
      action: "PASSWORD_CHANGED",
      performedBy: decodedToken.uid,
      performedByEmail: decodedToken.email,
      targetUserId: uid,
      targetUserEmail: targetUserData.email,
      timestamp: now,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      emailSent,
    });

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Password changed successfully and emailed to the user."
        : "Password changed successfully. Email notification could not be sent.",
      password,
      emailSent,
    });
  } catch (error) {
    console.error("Error changing password:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to change password" },
      { status: 500 },
    );
  }
}
