"use client";

import { EMoURecord } from "@/types";

interface ViewRecordDialogProps {
  record: EMoURecord;
  onClose: () => void;
}

export default function ViewRecordDialog({
  record,
  onClose,
}: ViewRecordDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Expired":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Renewal Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getRelationshipLabel = (rating?: number) => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "Not Rated";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-white">
            <h2 className="text-lg font-semibold">eMoU Record Details</h2>
            <p className="text-sm text-gray-400 mt-0.5 font-mono">
              {record.id}
            </p>
          </div>
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

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            {/* Left Column */}
            <div className="col-span-2 space-y-4">
              {/* Company Info */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Company Information
                  </h3>
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-md border ${getStatusColor(record.status)}`}
                  >
                    {record.status}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {record.companyName}
                </h4>
                {record.aboutCompany && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {record.aboutCompany}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {record.companyWebsite && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 block mb-1">
                        Website
                      </span>
                      <a
                        href={record.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline block truncate"
                      >
                        {record.companyWebsite}
                      </a>
                    </div>
                  )}
                  {record.companyRelationship && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 block mb-1">
                        Relationship Rating
                      </span>
                      <p className="text-gray-900 font-medium">
                        {getRelationshipLabel(record.companyRelationship)} (
                        {record.companyRelationship}/5)
                      </p>
                    </div>
                  )}
                </div>
                {record.companyAddress && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      Address
                    </span>
                    <p className="text-sm text-gray-700">
                      {record.companyAddress}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                  Description / Purpose
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {record.description}
                </p>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                {/* Industry Contact */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                    Industry Contact
                  </h3>
                  {record.industryContactName ? (
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">
                          Name
                        </span>
                        <p className="text-gray-900 font-medium">
                          {record.industryContactName}
                        </p>
                      </div>
                      {record.industryContactEmail && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">
                            Email
                          </span>
                          <a
                            href={`mailto:${record.industryContactEmail}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline block text-xs"
                          >
                            {record.industryContactEmail}
                          </a>
                        </div>
                      )}
                      {record.industryContactMobile && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">
                            Mobile
                          </span>
                          <a
                            href={`tel:${record.industryContactMobile}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline block"
                          >
                            {record.industryContactMobile}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No contact information
                    </p>
                  )}
                </div>

                {/* Institution Contact */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                    Institution Contact
                  </h3>
                  {record.institutionContactName ? (
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-0.5">
                          Name
                        </span>
                        <p className="text-gray-900 font-medium">
                          {record.institutionContactName}
                        </p>
                      </div>
                      {record.institutionContactEmail && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">
                            Email
                          </span>
                          <a
                            href={`mailto:${record.institutionContactEmail}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline block text-xs"
                          >
                            {record.institutionContactEmail}
                          </a>
                        </div>
                      )}
                      {record.institutionContactMobile && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-0.5">
                            Mobile
                          </span>
                          <a
                            href={`tel:${record.institutionContactMobile}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline block"
                          >
                            {record.institutionContactMobile}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No contact information
                    </p>
                  )}
                </div>
              </div>

              {/* Academic Details */}
              {(record.skillsTechnologies ||
                record.clubsAligned ||
                record.sdgGoals ||
                record.ieeeSociety ||
                record.emouOutcome) && (
                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                    Academic & Learning
                  </h3>
                  <div className="space-y-3 text-sm">
                    {record.skillsTechnologies && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          Skills & Technologies
                        </span>
                        <p className="text-gray-700">
                          {record.skillsTechnologies}
                        </p>
                      </div>
                    )}
                    {record.clubsAligned && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          Aligned Clubs
                        </span>
                        <p className="text-gray-700">{record.clubsAligned}</p>
                      </div>
                    )}
                    {record.sdgGoals && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          SDG Goals
                        </span>
                        <p className="text-gray-700">{record.sdgGoals}</p>
                      </div>
                    )}
                    {record.ieeeSociety &&
                      record.ieeeSociety !== "Not Applicable" && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 block mb-1">
                            IEEE Society
                          </span>
                          <p className="text-gray-700">{record.ieeeSociety}</p>
                        </div>
                      )}
                    {record.emouOutcome && (
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          EMoU Outcome
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {record.emouOutcome.split(",").map((outcome, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {outcome.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {record.benefitsAchieved && (
                <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                  <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                    Benefits Achieved
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {record.benefitsAchieved}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4">
              {/* MoU Period */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                  MoU Period
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      Department
                    </span>
                    <p className="text-gray-900 font-semibold">
                      {record.department}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      From Date
                    </span>
                    <p className="text-gray-900 font-mono text-xs">
                      {record.fromDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      To Date
                    </span>
                    <p className="text-gray-900 font-mono text-xs">
                      {record.toDate}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      Renewal Plan
                    </span>
                    <p
                      className={`font-medium text-sm ${record.goingForRenewal === "Yes" ? "text-emerald-600" : "text-gray-600"}`}
                    >
                      {record.goingForRenewal === "Yes"
                        ? "Going for Renewal"
                        : "Not Renewing"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Opportunities */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                  Opportunities
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">
                      {record.placementOpportunity || 0}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      Placements
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">
                      {record.internshipOpportunity || 0}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      Internships
                    </p>
                  </div>
                  {record.perStudentCost !== undefined &&
                    record.perStudentCost > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                        <p className="text-xl font-bold text-gray-900">
                          ₹{record.perStudentCost.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          Per Student Cost
                        </p>
                      </div>
                    )}
                </div>
              </div>

              {/* Document */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                  Document
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs font-medium text-gray-500 block mb-1">
                      Availability
                    </span>
                    <p
                      className={`font-medium text-sm ${record.documentAvailability === "Available" ? "text-emerald-600" : "text-gray-600"}`}
                    >
                      {record.documentAvailability}
                    </p>
                  </div>
                  {record.scannedCopy && (
                    <a
                      href={record.scannedCopy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 hover:underline"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                      View Document
                    </a>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm text-xs">
                <h3 className="font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                  Record Info
                </h3>
                <div className="space-y-2.5 text-gray-600">
                  <div>
                    <span className="font-medium text-gray-500 block mb-0.5">
                      Created by
                    </span>
                    <p className="text-gray-900 font-medium">
                      {record.createdByName}
                    </p>
                    <p className="text-gray-400 text-[10px] mt-0.5">
                      {record.createdAt.toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  {record.updatedBy && (
                    <div className="pt-2.5 border-t border-gray-100">
                      <span className="font-medium text-gray-500 block mb-0.5">
                        Updated by
                      </span>
                      <p className="text-gray-900 font-medium">
                        {record.updatedByName}
                      </p>
                      <p className="text-gray-400 text-[10px] mt-0.5">
                        {record.updatedAt?.toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="btn btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
