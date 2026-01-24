# Cloudinary Setup Guide for eMoU Document Uploads

This guide will help you set up Cloudinary for document uploads in the Sairam eMoU Vault application.

## Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email address

## Step 2: Get Your Cloud Name

1. After logging in, you'll see your **Dashboard**
2. Copy your **Cloud name** (you'll need this later)
   - Example: `democloud` or `mycompany-prod`

## Step 3: Create an Upload Preset

1. Go to **Settings** (gear icon in top right)
2. Click on **Upload** tab
3. Scroll down to **Upload presets**
4. Click **Add upload preset**
5. Configure the preset:
   - **Preset name**: `emou_docs`
   - **Signing mode**: Select **Unsigned** (important!)
   - **Folder**: `emou-documents`
   - **Allowed formats**: Select `pdf`, `jpg`, `jpeg`, `png`
   - **File size limit**: Set to `10 MB`
   - **Access mode**: `public`
6. Click **Save**

## Step 4: Get Your API Credentials

1. Go to **Settings** (gear icon in top right)
2. On the **Account** tab, scroll to **API Keys** section
3. You'll see:
   - **API Key** (a long number)
   - **API Secret** (click to reveal)
4. Copy both values - you'll need them for server-side operations

## Step 5: Configure Environment Variables

1. In your project root, create a file named `.env.local`
2. Add the following lines (replace with your actual values):

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=emou_docs

# Server-side Cloudinary credentials (for signed URLs and secure operations)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

3. Replace the placeholder values:
   - `your_cloud_name_here` - Cloud name from Step 2
   - `your_api_key_here` - API Key from Step 4
   - `your_api_secret_here` - API Secret from Step 4
4. Save the file
5. **IMPORTANT**: Never commit `.env.local` to version control

## Step 6: Restart Your Development Server

```bash
pnpm dev
```

## Testing the Upload

1. Go to the eMoU form (click "+ New Record")
2. Scroll down to "Document Information" section
3. Try uploading a PDF or image file in the "HO Approval Document" field
4. If successful, you should see "File uploaded successfully!" and a "View Uploaded Document" link

## Troubleshooting

### "Upload failed" Error

- Check that your Cloud Name is correct in `.env.local`
- Verify the upload preset name is exactly `emou_docs`
- Make sure the preset is set to **Unsigned**

### "File size should not exceed 10MB"

- The file is too large
- Compress the PDF or reduce image quality

### "Please upload only PDF or image files"

- Only `.pdf`, `.jpg`, `.jpeg`, and `.png` files are allowed
- Convert your document to one of these formats

## Security Notes

- The upload preset is unsigned for convenience but limited to specific folder and file types
- For production, consider using signed uploads with backend validation
- Set up usage limits in Cloudinary dashboard to prevent abuse

## Free Tier Limits

Cloudinary free tier includes:

- 25 GB storage
- 25 GB monthly bandwidth
- 25,000 monthly transformations

This should be sufficient for most use cases.
