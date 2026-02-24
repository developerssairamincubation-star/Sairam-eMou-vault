import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
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

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // You can change this to your email provider
  auth: {
    user: process.env.EMAIL_USER, // e.g., your-email@gmail.com
    pass: process.env.EMAIL_PASSWORD, // App-specific password for Gmail
  },
  tls: {
    // Allow self-signed certificates (for development)
    // In production, consider setting rejectUnauthorized to true
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

const adminAuth = getAuth();
const adminDb = getFirestore();

// Generate strong password with prefix pattern
function generateStrongPassword(role: string, department?: string): string {
  const currentYear = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specialChars = "!@#$%&*";
  
  // Generate random suffix (8 chars + 2 special chars)
  let randomPart = "";
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 2; i++) {
    randomPart += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  // Shuffle the random part
  randomPart = randomPart.split('').sort(() => Math.random() - 0.5).join('');
  
  // Create password with prefix pattern
  let prefix = "";
  if (role === "hod" && department) {
    prefix = `${department}${currentYear}`;
  } else if (role === "master") {
    prefix = `Master${currentYear}`;
  } else if (role === "admin") {
    prefix = `Admin${currentYear}`;
  } else {
    prefix = `User${currentYear}`;
  }
  
  return `${prefix}${randomPart}`;
}

// Parse notify emails from env
function getNotifyEmails(): string[] {
  const raw = process.env.NOTIFY_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

// Send welcome email with credentials
async function sendWelcomeEmail(
  email: string,
  displayName: string,
  password: string,
  verificationLink: string
) {
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const notifyEmails = getNotifyEmails();
  
  const mailOptions = {
    from: `"Sairam eMoU System" <${process.env.EMAIL_USER}>`,
    to: email,
    cc: notifyEmails.length > 0 ? notifyEmails.join(", ") : undefined,
    subject: "Account Created - Sairam eMoU System",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Gabarito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #1f2937; margin: 0; padding: 0; background-color: #f8f9fa; }
          .container { max-width: 560px; margin: 0 auto; background: white; }
          .header { background: #1f2937; color: white; padding: 20px; border-bottom: 3px solid #2563eb; }
          .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
          .content { padding: 24px; }
          .section { margin-bottom: 20px; }
          .credentials { background: #f8f9fa; border: 1px solid #d1d5db; padding: 16px; border-radius: 4px; }
          .credentials table { width: 100%; border-collapse: collapse; }
          .credentials td { padding: 6px 12px; font-size: 13px; }
          .credentials td:first-child { color: #6b7280; width: 100px; }
          .credentials td:last-child { font-family: 'Courier New', monospace; font-weight: 500; }
          .alert { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px; font-size: 13px; color: #92400e; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500; }
          .button:hover { background: #1d4ed8; }
          .footer { background: #f8f9fa; padding: 16px 24px; border-top: 1px solid #d1d5db; font-size: 11px; color: #6b7280; text-align: center; }
          ul { margin: 8px 0; padding-left: 20px; font-size: 13px; }
          ul li { margin: 4px 0; }
        </link>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sairam eMoU Management System</h1>
          </div>
          <div class="content">
            <div class="section">
              <p style="margin: 0 0 12px 0; font-size: 14px;">Dear <strong>${displayName}</strong>,</p>
              <p style="margin: 0; font-size: 13px; color: #4b5563;">Your account has been created. Use the credentials below to access the system.</p>
            </div>
            
            <div class="section credentials">
              <table>
                <tr>
                  <td>Email</td>
                  <td>${email}</td>
                </tr>
                <tr>
                  <td>Password</td>
                  <td>${password}</td>
                </tr>
              </table>
            </div>
            
            <div class="section alert">
              <strong>⚠ Action Required:</strong> Verify your email before logging in.
            </div>
            
            <div class="section" style="text-align: center; margin: 24px 0;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            
            <div class="section" style="font-size: 13px; color: #4b5563;">
              <strong style="color: #1f2937;">Security Notes:</strong>
              <ul>
                <li>Change your password after first login</li>
                <li>Do not share your credentials</li>
                <li>Delete this email after changing password</li>
              </ul>
            </div>
            
            <div class="section" style="font-size: 13px; color: #6b7280;">
              Login URL: <a href="${loginUrl}/login" style="color: #2563eb;">${loginUrl}/login</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px 0;">Sairam eMoU Management System</p>
            <p style="margin: 0;">© ${new Date().getFullYear()} Sri Sairam College. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Sairam eMoU System

Dear ${displayName},

Your account has been successfully created. Here are your login credentials:

Email: ${email}
Temporary Password: ${password}

IMPORTANT: You must verify your email before logging in.
Verification Link: ${verificationLink}

After verification, login here: ${loginUrl}/login

Security Recommendations:
- Change your password immediately after first login
- Do not share your credentials with anyone
- Keep this email secure

If you have any questions, please contact the system administrator.

© ${new Date().getFullYear()} Sri Sairam College
    `.trim(),
  };

  await transporter.sendMail(mailOptions);

  // Send a separate admin notification to notify emails
  if (notifyEmails.length > 0) {
    const adminNotification = {
      from: `"Sairam eMoU System" <${process.env.EMAIL_USER}>`,
      to: notifyEmails.join(", "),
      subject: `[Admin Notice] New User Created - ${displayName}`,
      html: `
        <div style="font-family: 'Gabarito', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #1f2937; color: white; padding: 16px 24px; border-bottom: 3px solid #2563eb;">
            <h2 style="margin: 0; font-size: 16px;">New User Created</h2>
          </div>
          <div style="padding: 20px 24px; font-size: 14px; color: #374151;">
            <p style="margin: 0 0 12px;">A new user account has been created in the eMoU system:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280;">Name</td><td style="padding: 6px 0; font-weight: 600;">${displayName}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;">${email}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280;">Created At</td><td style="padding: 6px 0;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
            </table>
          </div>
          <div style="background: #f9fafb; padding: 12px 24px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb;">
            This is an automated notification from Sairam eMoU System.
          </div>
        </div>
      `,
      text: `New User Created\n\nName: ${displayName}\nEmail: ${email}\nCreated At: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n\nThis is an automated notification from Sairam eMoU System.`,
    };

    await transporter.sendMail(adminNotification);
  }
}

export async function POST(request: NextRequest) {
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
    
    if (!currentUserData || (currentUserData.role !== "admin" && currentUserData.role !== "master")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, displayName, role, department } = body;

    // Validate input
    if (!email || !displayName || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, displayName, role" },
        { status: 400 }
      );
    }

    if (role === "hod" && !department) {
      return NextResponse.json(
        { error: "Department is required for HOD role" },
        { status: 400 }
      );
    }

    // Check if user already exists
    try {
      await adminAuth.getUserByEmail(email);
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    } catch (error) {
      // User doesn't exist, which is what we want
      const err = error as { code?: string };
      if (err.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // Generate strong password with prefix
    const password = generateStrongPassword(role, department);

    // Create user with Firebase Admin
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    // Set custom claims for role-based access
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      department: department || null,
    });

    // Create Firestore user document
    const now = new Date();
    await adminDb.collection("users").doc(userRecord.uid).set({
      email,
      displayName,
      role,
      department: department || null,
      createdAt: now,
      updatedAt: now,
      createdBy: decodedToken.uid,
    });

    // Generate email verification link
    const verificationLink = await adminAuth.generateEmailVerificationLink(email);

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, displayName, password, verificationLink);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue even if email fails - we'll still return the data
    }

    // Log audit trail
    await adminDb.collection("audit_logs").add({
      action: "USER_CREATED",
      performedBy: decodedToken.uid,
      performedByEmail: decodedToken.email,
      targetUserId: userRecord.uid,
      targetUserEmail: email,
      role,
      department: department || null,
      timestamp: now,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      emailSent: true,
    });

    // Return success with temporary password and verification link
    return NextResponse.json({
      success: true,
      message: "User created successfully",
      userId: userRecord.uid,
      email,
      temporaryPassword: password,
      emailVerificationLink: verificationLink,
    });

  } catch (error) {
    console.error("Error creating user:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
