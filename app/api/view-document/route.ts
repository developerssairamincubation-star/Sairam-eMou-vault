import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Check if it's a Cloudinary URL
    if (!url.includes('cloudinary.com')) {
      return NextResponse.json(
        { error: 'Not a Cloudinary URL' },
        { status: 400 }
      );
    }

    // Extract resource type and public_id from URL
    // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{folder}/{public_id}.{format}
    const urlParts = url.split('/upload/');
    if (urlParts.length < 2) {
      return NextResponse.json(
        { error: 'Invalid Cloudinary URL format' },
        { status: 400 }
      );
    }

    // Determine resource type from URL path
    const resourceType = url.includes('/raw/') ? 'raw' : 
                        url.includes('/video/') ? 'video' : 
                        url.includes('/image/') ? 'image' : 'raw'; // Default to raw for PDFs

    // Extract public_id from the path after /upload/
    // Example: v1769250303/emou-documents/kl0lzvbxnwgd9jihtlyi.pdf
    const afterUpload = urlParts[1];
    const pathParts = afterUpload.split('/');
    
    // Skip version (vXXXXXXXXXX) and reconstruct the path
    const startIndex = pathParts.findIndex(part => !part.startsWith('v'));
    const pathWithExtension = pathParts.slice(startIndex).join('/');
    
    // Remove file extension to get public_id
    const lastDotIndex = pathWithExtension.lastIndexOf('.');
    const publicId = lastDotIndex > -1 ? pathWithExtension.substring(0, lastDotIndex) : pathWithExtension;
    const fileExtension = lastDotIndex > -1 ? pathWithExtension.substring(lastDotIndex + 1) : '';
    
    // For PDFs, force resource type to 'raw' regardless of URL
    // This handles legacy uploads that were incorrectly uploaded as 'image'
    const isPDF = fileExtension.toLowerCase() === 'pdf';
    
    // Try to get actual resource info from Cloudinary API for existing uploads
    let actualResourceType = resourceType;
    try {
      // First try with the detected resource type
      const resourceInfo = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
        type: 'upload',
      });
      actualResourceType = resourceInfo.resource_type;
    } catch (apiError) {
      // If that fails and it's a PDF, try 'raw' type
      if (isPDF) {
        try {
          await cloudinary.api.resource(publicId, {
            resource_type: 'raw',
            type: 'upload',
          });
          actualResourceType = 'raw';
        } catch {
          // Keep the original resource type if both fail
          actualResourceType = resourceType;
        }
      }
    }

    // Generate a signed URL that's valid for 1 hour
    const signedUrl = cloudinary.url(publicId, {
      resource_type: actualResourceType,
      type: 'upload',
      sign_url: true,
      secure: true,
      format: isPDF ? 'pdf' : undefined, // Explicitly set format for PDFs
      flags: isPDF ? undefined : 'attachment:false', // PDFs don't support this flag
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    });

    return NextResponse.json({
      success: true,
      signedUrl,
      resourceType: actualResourceType, // Return for debugging
      publicId, // Return for debugging
    });
  } catch (error) {
    console.error('View document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate signed URL' },
      { status: 500 }
    );
  }
}
