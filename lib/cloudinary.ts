/**
 * Direct Cloudinary upload from frontend
 * This bypasses the API route to avoid Vercel's 4.5MB payload limit
 */

interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  error?: string;
}

interface CloudinaryDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Extract public_id and resource_type from a Cloudinary URL.
 * Handles both image and raw (PDF) upload URLs.
 *
 * Image URL pattern: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{public_id}.{ext}
 * Raw URL pattern:   https://res.cloudinary.com/{cloud}/raw/upload/v{ver}/{public_id}
 */
export function parseCloudinaryUrl(url: string): {
  public_id: string;
  resource_type: string;
} | null {
  if (!url || !url.includes("res.cloudinary.com")) return null;

  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");

    // Find the resource_type (image/raw/video) and "upload" in the path
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    const resource_type = parts[uploadIndex - 1] || "image";

    // Everything after "upload" and the version (v1234...) is the public_id
    const afterUpload = parts.slice(uploadIndex + 1);

    // Skip version segment if present (starts with 'v' followed by digits)
    const startIdx =
      afterUpload.length > 0 && /^v\d+$/.test(afterUpload[0]) ? 1 : 0;
    const publicIdParts = afterUpload.slice(startIdx);

    if (publicIdParts.length === 0) return null;

    let public_id = publicIdParts.join("/");

    // URL-decode the public_id (handles %20, %2F, etc.)
    public_id = decodeURIComponent(public_id);

    // For image types, strip the file extension
    if (resource_type === "image") {
      public_id = public_id.replace(/\.[^/.]+$/, "");
    }

    return { public_id, resource_type };
  } catch {
    return null;
  }
}

/**
 * Delete a file from Cloudinary via the server-side API route.
 * Requires the user to be authenticated (passes Firebase ID token).
 */
export async function deleteFromCloudinary(
  url: string,
  idToken: string
): Promise<CloudinaryDeleteResult> {
  try {
    const parsed = parseCloudinaryUrl(url);
    if (!parsed) {
      return { success: false, error: "Invalid Cloudinary URL" };
    }

    const response = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        public_id: parsed.public_id,
        resource_type: parsed.resource_type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Delete failed");
    }

    return { success: true };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration missing');
    }

    // Determine resource type - PDFs must be 'raw' for proper access
    const isPDF = file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
    const resourceType = isPDF ? 'raw' : 'image';

    // Create FormData for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // Upload directly to Cloudinary using unsigned upload
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();

    return {
      success: true,
      url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
