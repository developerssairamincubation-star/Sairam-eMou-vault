# Sairam eMoU Vault

Centralized eMoU Sheet Management and Governance System for Sri Sairam College of Engineering

## Overview

A secure, role-based web application to centrally manage Educational Memorandum of Understanding (eMoU) records. Built with Next.js and Firebase, it provides structured, auditable, and permission-controlled platform ensuring data integrity, traceability, and institutional compliance.

## Key Features

### Authentication & Authorization

- Firebase Authentication with email/password
- Role-based access control (Admin, Master User, HOD User)
- Protected routes and session management
- Secure logout functionality
- Email verification needed

### Secure User Creation (Admin Only)

- **Firebase Admin SDK** - Server-side user creation (cannot be bypassed)
- **Strong Password Generation** - Role-based prefix + 10 random characters
- **Email Verification** - Users must verify email before access
- **Token-Based Authentication** - API protected with Firebase ID tokens
- **Custom Claims** - Role stored in Firebase Auth for secure access control
- **Audit Logging** - All user creations are logged
- **Automated Welcome Emails** - Credentials sent directly to user's email

### eMoU Record Management

- **Auto-Generated IDs**: Format `YY+DEPT+SEQ` (e.g., `26CSE001`)
- **Scope Classification**: National or International
- Create, read, update, delete operations
- All 24+ fields from institutional requirements
- Ownership tracking (created by, updated by, timestamps)
- Permission-based editing

### Document Management

- **HO Approval Document**: Upload field for HO approval documents
- **Signed Agreement Document**: Upload field for signed MoU agreements
- **Cloudinary Integration**: Cloud-hosted documents (PDF, JPG, JPEG, PNG)
- **Document Viewer**: In-app preview for uploaded documents
- **Size Limit**: 10MB per file

### User Management (Admin Only)

- Create new users with role assignment
- Assign departments to HOD users
- Delete users
- View all users with role badges
- Automatic welcome email with credentials

### Search & Filter

- Filter by department (CSE, ECE, MECH, CIVIL, EEE, IT, AIDS, CSBS)
- Filter by status (Active, Expired, Renewal Pending, Draft)
- Filter by scope (National, International)
- Real-time search by company name, ID, or description
- Live record count display

### Data Operations

- **Export**: CSV export with filtered data
- **Import**: Excel (.xlsx) bulk import with validation
  - Automatic validation of required fields
  - Skip invalid records with missing data
  - Detailed error reporting by row
  - Scope column support (defaults to National)
- Google Drive links for document storage

### UI/UX

- Clean spreadsheet-like layout (Excel/Sheets style)
- Gabarito font throughout
- Light theme optimized for readability
- Responsive design for all devices
- Compact, minimal design

### Statistics Dashboard

- Total eMoUs count
- Active eMoUs
- Expiring soon (within 30 days)
- Expired eMoUs

## Technology Stack

- **Frontend**: Next.js 16.1, React 19.2, TypeScript 5
- **Styling**: Tailwind CSS 4
- **Authentication**: Firebase Auth + Firebase Admin SDK
- **Database**: Cloud Firestore
- **Document Storage**: Cloudinary
- **Email**: Nodemailer (Gmail/SMTP)
- **Package Manager**: pnpm
- **Font**: Gabarito (Google Fonts)

## Installation

### Prerequisites

- Node.js 18 or higher
- pnpm package manager
- Firebase account

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd hmacs

# Install dependencies
pnpm install

# Copy environment file
cp .env.local.example .env.local

# Update .env.local with your Firebase credentials
# Then run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name: "Sairam eMoU Vault"
4. Follow setup wizard

### 2. Enable Services

**Authentication:**

- Go to Authentication → Sign-in method
- Enable Email/Password

**Firestore Database:**

- Go to Firestore Database → Create Database
- Start in production mode
- Choose region (asia-south1 for India)

**Storage (Optional):**

- Go to Storage → Get Started
- Note: Application uses Google Drive links

### 3. Get Configuration

1. Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click web icon (</>)
4. Register app
5. Copy configuration

### 4. Configure Environment

Create `.env.local`:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (from downloaded JSON)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"

# Cloudinary (for document uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=emou_docs

# Email Configuration (for automated emails)
EMAIL_USER=your-college-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important Notes:**

- Keep the `\n` characters in the Firebase private key
- Never commit `.env.local` to Git
- For Gmail, use App Password (not regular password)

### 5. Deploy Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init
# Select: Firestore, Storage
# Use existing project
# Accept defaults

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

### 6. Create First Admin User

**Method 1: Firebase Console**

1. Firebase Console → Authentication → Add user
2. Enter email and password
3. Copy the UID
4. Go to Firestore Database → Start collection: `users`
5. Add document with UID as document ID:

```json
{
  "uid": "copied-uid-here",
  "email": "admin@sairam.edu.in",
  "displayName": "System Administrator",
  "role": "admin",
  "createdAt": [current timestamp],
  "updatedAt": [current timestamp]
}
```

## User Roles

| Role       | Create | Edit         | Delete | Manage Users | Department Access  |
| ---------- | ------ | ------------ | ------ | ------------ | ------------------ |
| **Admin**  | ✅ All | ✅ All       | ✅ All | ✅ Yes       | All Departments    |
| **Master** | ✅ Yes | ✅ All Depts | ❌ No  | ❌ No        | All Departments    |
| **HOD**    | Yes    | Own Dept     | No     | No           | Assigned Dept Only |

## eMoU Record Fields

### Required Fields

- Department (CSE, ECE, MECH, CIVIL, EEE, IT, AIDS, CSBS)
- Company Name
- Scope (National, International)
- From Date (DD.MM.YYYY)
- To Date (DD.MM.YYYY)
- Status (Active, Expired, Renewal Pending, Draft)
- Description / Purpose
- Document Availability (Available, Not Available)
- Going for Renewal (Yes, No)

### Optional Fields

- HO Approval Document (Cloudinary upload)
- Signed Agreement Document (Cloudinary upload)
- Google Drive Link (Scanned Copy)
- Company Website
- About Company
- Company Address
- Industry Contact Name
- Industry Contact Mobile
- Industry Contact Email
- Institution Contact Name
- Institution Contact Mobile
- Institution Contact Email
- Clubs Aligned
- Aligned to Sairam SDG Goals
- Skills / Technologies to Learn
- Per Student Registration Cost (₹)
- Placement Opportunity (Numbers)
- Internship Opportunity (Numbers)
- Benefits Achieved So Far
- Company Relationship (1-5 scale)

## Auto-Generated ID System

Format: **YY + DEPARTMENT + SEQUENCE**

```
26CSE001
││ │  └── Sequential number (001, 002, ...)
││ └────── Department code (CSE, AIDS, etc.)
└└──────── Year (26 = 2026)
```

### Examples

- `26CSE001` - First CSE eMoU in 2026
- `26AIDS015` - 15th AIDS eMoU in 2026
- `27MECH001` - First MECH eMoU in 2027

### Features

- Unique per department per year
- Automatically increments
- Resets each new year
- Cannot be manually edited
- Department locked after creation

## Excel Import Guide

### Required Excel Columns

Your Excel file must include these exact column names:

```
department | companyName | fromDate | toDate | status |
description | documentAvailability | goingForRenewal
```

### Optional Excel Columns

```
scope | scannedCopy | companyWebsite | aboutCompany | companyAddress |
industryContactName | industryContactMobile | industryContactEmail |
institutionContactName | institutionContactMobile | institutionContactEmail |
clubsAligned | sdgGoals | skillsTechnologies | perStudentCost |
placementOpportunity | internshipOpportunity | benefitsAchieved |
companyRelationship | hodApprovalDoc | signedAgreementDoc
```

**Note:** `scope` defaults to "National" if not specified. Document URLs can be left empty and uploaded later via the form.

### Import Process

1. Click **Import** button
2. Select Excel file (.xlsx)
3. Click **Validate File**
4. Review validation results:
   - Green: Valid records (will import)
   - Orange: Invalid records (will skip)
5. Click **Import X Records**
6. Records with missing required fields are automatically skipped

### Example Excel Structure

| department | companyName | scope         | fromDate   | toDate     | status | description | documentAvailability | goingForRenewal |
| ---------- | ----------- | ------------- | ---------- | ---------- | ------ | ----------- | -------------------- | --------------- |
| CSE        | Tech Corp   | National      | 01.01.2024 | 31.12.2024 | Active | Training    | Available            | Yes             |
| AIDS       | AI Labs     | International | 15.02.2024 | 15.02.2025 | Draft  | Research    | Not Available        | No              |

## Project Structure

```
emou-sairam/
├── app/
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard
│   ├── api/
│   │   ├── admin/
│   │   │   ├── create-user/
│   │   │   │   └── route.ts      # Secure user creation API
│   │   │   └── delete-user/
│   │   │       └── route.ts      # User deletion API
│   │   ├── upload/
│   │   │   └── route.ts          # Document upload API
│   │   └── view-document/
│   │       └── route.ts          # Document viewing API
│   ├── dashboard/
│   │   └── page.tsx              # User dashboard
│   ├── hod/
│   │   └── page.tsx              # HOD dashboard
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Main eMoU listing
├── components/
│   ├── Alert.tsx                 # Alert component
│   ├── ConfirmDialog.tsx         # Confirmation dialog
│   ├── DocumentViewer.tsx        # Document preview modal
│   ├── EMoUForm.tsx              # eMoU creation/edit form
│   ├── ImportDialog.tsx          # Excel import dialog
│   ├── ProtectedRoute.tsx        # Route protection
│   ├── RecordDetailPopup.tsx     # Record detail view
│   └── ViewRecordDialog.tsx      # Record viewing dialog
├── context/
│   └── AuthContext.tsx           # Authentication context
├── lib/
│   ├── firebase.ts               # Firebase initialization
│   └── firestore.ts              # CRUD operations
├── types/
│   └── index.ts                  # TypeScript definitions
├── .env.local.example            # Environment template
├── firestore.rules               # Database security rules
├── storage.rules                 # Storage security rules
├── package.json                  # Dependencies
└── README.md                     # This file
```

## Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - Admin only can create
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow list: if request.auth != null &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'master']);
      allow create: if false; // Handled by Admin SDK only
      allow update: if request.auth != null &&
        (request.auth.uid == userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Audit logs - Admin write, Admin/Master read
    match /audit_logs/{logId} {
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'master'];
      allow create: if false; // Only via Admin SDK
    }
  }
}
```

### Security Layers

| Layer           | Protection                |
| --------------- | ------------------------- |
| Frontend        | Client-side validation    |
| API Route       | Token verification        |
| Admin SDK       | Server-side only access   |
| Firestore Rules | Database-level security   |
| Custom Claims   | Role-based access control |
| Audit Logs      | Accountability trail      |

## Secure User Creation

### Password Generation Algorithm

```
Format: [PREFIX][YEAR][RANDOM_10_CHARS]

Examples:
- HOD (CSE):    CSE2026xK7m@P#q3nL
- Admin:        Admin2026L9$xR#4vM2
- Master:       Master2026p@3Q#7kN9
```

**Security:**

- 18+ characters total
- Mix of uppercase, lowercase, numbers, special chars
- Unpredictable random portion
- Prefix maintains familiarity for admins

### User Creation Flow

```
1. Admin clicks "Create User" → Frontend
2. Frontend gets current user's ID token
3. POST to /api/admin/create-user with token
4. API verifies token & checks admin role
5. API checks for duplicate email
6. API generates strong password
7. Firebase Admin SDK creates user
8. Custom claims set (role, department)
9. Firestore document created
10. Email verification link generated
11. Welcome email sent automatically
12. Audit log created
13. Admin sees success message
14. User receives credentials via email
```

### Automated Email Delivery

When an admin creates a new user, the system automatically sends a welcome email containing:

- ✉️ Email address
- 🔐 Temporary password (strong with role prefix)
- ✅ Email verification link
- 🔗 Login link to the application
- 🔒 Security recommendations

### Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Visit https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Copy the 16-character password
5. Add it to `.env.local` as `EMAIL_PASSWORD`

## Cloudinary Setup (Document Uploads)

### Setup Steps

1. Create Cloudinary account at https://cloudinary.com
2. Copy your Cloud Name from dashboard
3. Create upload preset named `emou_docs` (unsigned mode)
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=emou_docs
   ```
5. Restart development server

### Document Storage

- All documents stored in Cloudinary cloud storage
- Organized in `emou-documents` folder
- Secure HTTPS URLs stored in Firestore
- Supported formats: PDF, JPG, JPEG, PNG
- 10MB file size limit

## Available Scripts

```bash
pnpm dev              # Development server (localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import repository
4. Add environment variables
5. Deploy

### Firebase Hosting

```bash
firebase init hosting
firebase deploy --only hosting
```

## Troubleshooting

### "Permission denied" errors

- Check Firestore security rules deployed
- Verify user role in Firestore `users` collection
- Ensure user is authenticated

### "Unauthorized - No token provided"

- Make sure you're logged in as admin
- Logout and login again
- Check that frontend is sending Authorization header

### "Failed to initialize secondary authentication"

- The new code uses Admin SDK via API route
- This error shouldn't appear with current implementation

### "User with this email already exists"

- Use a different email or delete the existing user first

### Email not received

- Check spam folder
- Verify EMAIL_USER and EMAIL_PASSWORD in `.env.local`
- Ensure Gmail App Password is valid (not regular password)
- Check server logs for email delivery errors

### Document upload fails

- Verify Cloudinary credentials in `.env.local`
- Check file size (max 10MB)
- Ensure file format is supported (PDF, JPG, JPEG, PNG)

### Login doesn't work

- Verify `.env.local` has correct Firebase config
- Check Email/Password auth enabled in Firebase Console
- Ensure email is verified (check verification link)
- Check browser console for errors

### Build fails

```bash
rm -rf .next node_modules
pnpm install
pnpm build
```

## Common Tasks

### Add New Department

1. Update `types/index.ts`:

```typescript
export type DepartmentCode =
  | "CSE"
  | "ECE"
  | "MECH"
  | "CIVIL"
  | "EEE"
  | "IT"
  | "AIDS"
  | "CSBS"
  | "NEW_DEPT";
```

2. Update department arrays in components

### Add New Status

1. Update `types/index.ts`:

```typescript
export type EMoUStatus =
  | "Active"
  | "Expired"
  | "Renewal Pending"
  | "Draft"
  | "NEW_STATUS";
```

### Add New Field

1. Update `types/index.ts` - Add to `EMoURecord` interface
2. Update `components/EMoUForm.tsx` - Add form field
3. Update `app/page.tsx` - Add to table display (optional)

## Database Collections

| Collection   | Purpose       | Example Document                                          |
| ------------ | ------------- | --------------------------------------------------------- |
| `users`      | User accounts | `{ uid, email, displayName, role, department }`           |
| `emous`      | eMoU records  | `{ id: "26CSE001", department, companyName, scope, ... }` |
| `counters`   | ID generation | `{ "26_CSE": { count: 15, year: "26" } }`                 |
| `audit_logs` | Audit trail   | `{ action, performedBy, targetUserId, timestamp }`        |

## Quality Metrics

- TypeScript: 0 errors
- Build: Successful
- ESLint: 0 errors
- Type Coverage: 100%
- Production Ready: Yes

## Support

For issues or questions:

- Check Firebase Console logs
- Check browser developer console
- Review Firestore security rules
- Verify environment variables

## License

Developed for Sri Sairam College of Engineering for institutional use.

## Development

### Adding New Features

1. Update types in `types/index.ts`
2. Modify components as needed
3. Update Firestore operations in `lib/firestore.ts`
4. Test with different user roles
5. Update security rules if needed

### Code Standards

- TypeScript strict mode enabled
- ESLint configured
- Consistent formatting
- Proper error handling
- Type safety enforced

## Features Summary

- Authentication & Role-Based Access Control
- Secure User Creation with Firebase Admin SDK
- Automated Welcome Emails with Credentials
- Auto-Generated Record IDs
- National/International Scope Classification
- Complete eMoU Record Management (24+ fields)
- Document Uploads with Cloudinary
- User Management Dashboard (Admin)
- Search, Filter, Export
- Excel Bulk Import with Validation
- Google Drive Document Links
- Ownership & Audit Trails
- Responsive Spreadsheet UI
- Light Theme
- Statistics Dashboard
- Email Verification
- Production Ready

## Security Best Practices

### ✅ DO

- Copy passwords immediately after user creation
- Share credentials through secure channels
- Require users to change password after first login
- Monitor audit logs regularly
- Rotate admin credentials periodically
- Use environment variables for secrets

### ❌ DON'T

- Email passwords in plain text
- Screenshot credentials
- Share passwords in public channels
- Hardcode Firebase credentials in code
- Commit `.env.local` to Git
- Reuse passwords across users
- Skip email verification

---

**Version**: 1.1.0  
**Last Updated**: January 27, 2026  
**Status**: Production Ready

**Developed for Sri Sairam College of Engineering**
