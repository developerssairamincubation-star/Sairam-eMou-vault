# eMoU System Updates - National/International Classification & Document Upload

## Changes Implemented

### 1. New Fields Added

#### Scope Classification
- **Field**: `scope` (National | International)
- **Type**: Required dropdown field
- **Default**: National
- **Location**: Basic Information section of the form

#### Document Uploads
- **HO Approval Document**: Upload field for HO approval documents
- **Signed Agreement Document**: Upload field for signed MoU agreements
- **Format**: Cloudinary-hosted files (PDF, JPG, JPEG, PNG)
- **Size Limit**: 10MB per file

### 2. Files Modified

#### Type Definitions (types/index.ts)
- Added `ScopeType` type
- Added `scope` field to `EMoURecord`
- Added `hodApprovalDoc` and `signedAgreementDoc` optional string fields

#### Form Component (components/EMoUForm.tsx)
- Added scope dropdown selector
- Added Cloudinary upload integration
- Added file upload fields for both documents
- Added upload progress indicators
- Added document preview links
- Added remove document functionality

#### Main Table (app/page.tsx)
- Added "Scope" column in table header
- Added "HO Approval" column with clickable viewer
- Added "Signed Agreement" column with clickable viewer
- Added scope field to inline record creation
- Updated `saveNewRecord` function to include new fields
- Added DocumentViewer component integration

#### Import Dialog (components/ImportDialog.tsx)
- Added scope parsing (defaults to National if not specified)
- Added hodApprovalDoc and signedAgreementDoc fields (optional, empty if not in Excel)
- Smart detection: "international" in scope column → International, otherwise → National

#### Document Viewer Component (NEW: components/DocumentViewer.tsx)
- Modal popup for viewing documents
- PDF viewer integration
- Image viewer for JPG/PNG files
- Fallback for unsupported formats
- "Open in New Tab" option
- Responsive design

#### Firestore Functions (lib/firestore.ts)
- Updated to pass scope and document fields when creating records

### 3. New Dependencies

- `cloudinary-core` - For document upload integration

### 4. Configuration Files

#### .env.local.example
- Added Cloudinary configuration template
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

#### CLOUDINARY_SETUP.md
- Complete setup guide for Cloudinary
- Step-by-step instructions
- Troubleshooting section
- Security notes

## Usage Guide

### For Users

#### Creating a New Record
1. Click "+ New Record"
2. Fill in basic information
3. Select **Scope**: National or International
4. Scroll to "Document Information" section
5. Click "Choose File" for HO Approval Document
6. Upload PDF or image file (max 10MB)
7. Repeat for Signed Agreement Document
8. Save the record

#### Viewing Documents
1. In the main table, find the record
2. Click "View" in HO Approval or Signed Agreement column
3. Document opens in a popup viewer
4. Use "Open in New Tab" for full-screen view
5. Click "✕ Close" to close the viewer

#### Importing Records
- Add `scope` column to your Excel file
- Values: "National" or "International"
- Leave `hodApprovalDoc` and `signedAgreementDoc` columns empty
- Documents can be uploaded later through the form

### For Developers

#### Setting Up Cloudinary

1. Create Cloudinary account at https://cloudinary.com
2. Copy your Cloud Name from dashboard
3. Create upload preset named `emou_docs` (unsigned mode)
4. Create `.env.local` file with:
   ```env
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=emou_docs
   ```
5. Restart development server

See CLOUDINARY_SETUP.md for detailed instructions.

#### Document Storage

- All documents stored in Cloudinary cloud storage
- Organized in `emou-documents` folder
- Secure HTTPS URLs stored in Firestore
- URLs are publicly accessible (read-only)

#### Security Considerations

- Upload preset is unsigned for convenience
- Limited to specific file types (PDF, images)
- 10MB file size limit enforced
- Consider adding backend validation for production
- Monitor Cloudinary usage to prevent abuse

## Excel Import Format

### Required Columns
- `companyName`
- `department`

### New Optional Columns
- `scope` - "National" or "International" (defaults to National if missing)
- `hodApprovalDoc` - Cloudinary URL (leave empty, fill via form)
- `signedAgreementDoc` - Cloudinary URL (leave empty, fill via form)

### Example Excel Row
```
| companyName | department | scope        | fromDate   | toDate     | ... |
|-------------|-----------|--------------|------------|------------|-----|
| TCS         | CSE       | National     | 01.01.2024 | 31.12.2024 | ... |
| Google      | AIDS      | International| 15.03.2024 | Perpetual  | ... |
```

## Database Schema Updates

### New Fields in EMoURecord
```typescript
{
  scope: "National" | "International",        // Required
  hodApprovalDoc?: string,                    // Optional Cloudinary URL
  signedAgreementDoc?: string,                // Optional Cloudinary URL
}
```

### Migration Notes
- Existing records will need `scope` field added (default: "National")
- Run a migration script or update manually
- Document upload fields are optional, no migration needed

## Testing Checklist

- [ ] Create new record with National scope
- [ ] Create new record with International scope
- [ ] Upload PDF for HO Approval
- [ ] Upload image for Signed Agreement
- [ ] View uploaded documents in popup
- [ ] Remove uploaded document
- [ ] Import Excel with scope column
- [ ] Import Excel without scope column (defaults to National)
- [ ] Inline record creation with scope
- [ ] Edit existing record's scope
- [ ] Verify documents persist after page reload

## Known Limitations

1. **File Upload Only in Form**: Document uploads only available in the form, not inline editing
2. **No Bulk Upload**: Cannot upload documents during Excel import
3. **Public URLs**: Uploaded documents are publicly accessible via URL
4. **Free Tier**: Limited to Cloudinary free tier quotas (25GB storage, 25GB bandwidth)

## Future Enhancements

- [ ] Backend validation for document uploads
- [ ] Document versioning
- [ ] Bulk document upload feature
- [ ] Document encryption
- [ ] Signed upload URLs for better security
- [ ] Document expiry/cleanup automation
- [ ] Document preview thumbnails in table

## Support

For issues or questions:
- Check CLOUDINARY_SETUP.md for setup help
- Review console errors in browser DevTools
- Verify .env.local configuration
- Check Cloudinary dashboard for usage/errors
