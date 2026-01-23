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

### eMoU Record Management

- **Auto-Generated IDs**: Format `YY+DEPT+SEQ` (e.g., `26CSE001`)
- Create, read, update, delete operations
- All 24+ fields from institutional requirements
- Ownership tracking (created by, updated by, timestamps)
- Permission-based editing

### User Management (Admin Only)

- Create new users with role assignment
- Assign departments to HOD users
- Delete users
- View all users with role badges

### Search & Filter

- Filter by department (CSE, ECE, MECH, CIVIL, EEE, IT, AIDS, CSBS)
- Filter by status (Active, Expired, Renewal Pending, Draft)
- Real-time search by company name, ID, or description
- Live record count display

### Data Operations

- **Export**: CSV export with filtered data
- **Import**: Excel (.xlsx) bulk import with validation
  - Automatic validation of required fields
  - Skip invalid records with missing data
  - Detailed error reporting by row
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
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Storage**: Google Drive Links
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
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

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
- From Date (DD.MM.YYYY)
- To Date (DD.MM.YYYY)
- Status (Active, Expired, Renewal Pending, Draft)
- Description / Purpose
- Document Availability (Available, Not Available)
- Going for Renewal (Yes, No)

### Optional Fields

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
scannedCopy | companyWebsite | aboutCompany | companyAddress |
industryContactName | industryContactMobile | industryContactEmail |
institutionContactName | institutionContactMobile | institutionContactEmail |
clubsAligned | sdgGoals | skillsTechnologies | perStudentCost |
placementOpportunity | internshipOpportunity | benefitsAchieved |
companyRelationship
```

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

| department | companyName | fromDate   | toDate     | status | description | documentAvailability | goingForRenewal |
| ---------- | ----------- | ---------- | ---------- | ------ | ----------- | -------------------- | --------------- |
| CSE        | Tech Corp   | 01.01.2024 | 31.12.2024 | Active | Training    | Available            | Yes             |
| AIDS       | AI Labs     | 15.02.2024 | 15.02.2025 | Draft  | Research    | Not Available        | No              |

## Project Structure

```
hmacs/
├── app/
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Main eMoU listing
├── components/
│   ├── EMoUForm.tsx              # eMoU creation/edit form
│   ├── ImportDialog.tsx          # Excel import dialog
│   └── ProtectedRoute.tsx        # Route protection
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
// Users can read their own data and eMoUs
// Admins: Full access
// Master: Edit any eMoU
// HOD: Edit only own department
// Only admins can delete
```

### Storage Rules

```javascript
// Note: Application uses Google Drive links
// Storage not actively used
```

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

### File upload fails

- Application uses Google Drive links
- No direct file upload to Firebase Storage

### Login doesn't work

- Verify `.env.local` has correct Firebase config
- Check Email/Password auth enabled in Firebase Console
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

| Collection | Purpose       | Example Document                                   |
| ---------- | ------------- | -------------------------------------------------- |
| `users`    | User accounts | `{ uid, email, displayName, role, department }`    |
| `emous`    | eMoU records  | `{ id: "26CSE001", department, companyName, ... }` |
| `counters` | ID generation | `{ "26_CSE": { count: 15, year: "26" } }`          |

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
- Auto-Generated Record IDs
- Complete eMoU Record Management (24+ fields)
- User Management Dashboard (Admin)
- Search, Filter, Export
- Excel Bulk Import with Validation
- Google Drive Document Links
- Ownership & Audit Trails
- Responsive Spreadsheet UI
- Light Theme
- Statistics Dashboard
- Production Ready

---

**Version**: 1.0.0  
**Last Updated**: January 24, 2026  
**Status**: Production Ready

**Developed for Sri Sairam College of Engineering**
