"use client";

import Image from "next/image";
import { useState } from "react";

interface DocumentViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function DocumentViewer({
  url,
  title,
  onClose,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // For unsigned Cloudinary uploads, the URL is already publicly accessible
  // No need to fetch signed URLs
  const viewableUrl = url;

  // Better detection for Cloudinary URLs that may not have extensions
  const isPDF =
    url.toLowerCase().includes(".pdf") ||
    url.includes("/raw/") ||
    url.toLowerCase().includes("pdf");
  const isImage =
    /\.(jpg|jpeg|png|gif|webp)/i.test(url) ||
    (url.includes("/image/upload") && !isPDF);

  // Use Google Docs Viewer as fallback for PDFs with authentication issues
  const googleViewerUrl = isPDF
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(viewableUrl)}&embedded=true`
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-white flex-1 mr-4">
            <h2 className="text-lg font-semibold truncate">{title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Document Viewer</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={viewableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Open in New Tab
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 overflow-hidden relative bg-gray-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          )}

          {isPDF ? (
            <>
              {!error ? (
                <iframe
                  src={viewableUrl}
                  className="w-full h-full border-0"
                  title={title}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    console.error(
                      "Failed to load PDF directly, trying Google Viewer:",
                      viewableUrl,
                    );
                    setError(true);
                    setLoading(false);
                  }}
                />
              ) : (
                <iframe
                  src={googleViewerUrl!}
                  className="w-full h-full border-0"
                  title={title}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    console.error(
                      "Failed to load PDF with Google Viewer:",
                      viewableUrl,
                    );
                  }}
                />
              )}
            </>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <Image
                width={800}
                height={800}
                src={viewableUrl}
                alt={title}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  console.error("Failed to load image:", viewableUrl);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg
                className="w-24 h-24 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <h4 className="text-xl font-semibold text-gray-700 mb-2">
                Document Preview Not Available
              </h4>
              <p className="text-gray-500 mb-6 max-w-md">
                This file type cannot be previewed in the browser. Please use
                the button above to open it in a new tab or download it.
              </p>
              <a
                href={viewableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
