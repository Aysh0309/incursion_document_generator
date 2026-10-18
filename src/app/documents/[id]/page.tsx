
"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileText,
  FileDown,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Send,
  History,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Download,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DocumentRecord, DocumentVersionRecord, StructuredEventData, UserRole } from "@/types";

function DocumentReviewContent({ id }: { id: string }) {

  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable fields state
  const [editableData, setEditableData] = useState<Partial<StructuredEventData>>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("CLUB_ADMIN");
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("incursion_user_role") as UserRole;
    if (saved) setCurrentRole(saved);

    const onRoleChange = (e: any) => {
      if (e.detail) setCurrentRole(e.detail);
    };
    window.addEventListener("roleChange", onRoleChange);

    fetchDocData();

    return () => {
      window.removeEventListener("roleChange", onRoleChange);
    };
  }, [id]);

  const isAdmin = currentRole === "CLUB_ADMIN";

  const handleDeleteDoc = async () => {
    if (!doc || !confirm(`Are you sure you want to permanently delete "${doc.title}"?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/documents");
      } else {
        setErrorMsg(data.error?.message || "Failed to delete document");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const fetchDocData = async () => {
    try {
      setLoading(true);
      const [docRes, versRes] = await Promise.all([
        fetch(`/api/documents/${id}`).then((r) => r.json()),
        fetch(`/api/documents/${id}/versions`).then((r) => r.json()),
      ]);

      if (docRes.success && docRes.data) {
        setDoc(docRes.data);
        setEditableData(docRes.data.dataSnapshot || {});
      }
      if (versRes.success && versRes.data) {
        setVersions(versRes.data);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Regenerate with modified fields
  const handleRegenerate = async () => {
    setRegenerating(true);
    setActionSuccess(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/documents/${id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updatedEventData: editableData,
          changeSummary: `Updated venue/schedule fields in Version ${(doc?.currentVersion || 1) + 1}`,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Regeneration failed");
      }

      setActionSuccess(`Document successfully regenerated! Created Version ${data.versionNumber}.`);
      await fetchDocData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to regenerate document");
    } finally {
      setRegenerating(false);
    }
  };

  // Handler: Submit for Faculty Approval
  const handleSubmitApproval = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMITTED",
          comments: "Submitted for faculty coordinator review and venue sign-off.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess("Document submitted to Faculty Coordinator for official review.");
        await fetchDocData();
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-xs text-[#64748B]">Loading document review studio...</div>
      </AppShell>
    );
  }

  if (!doc) {
    return (
      <AppShell>
        <div className="p-12 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-[#E11D48] mx-auto" />
          <h2 className="text-sm font-semibold text-[#18181B]">Document Not Found</h2>
          <Link href="/documents" className="text-xs text-[#4F46E5] hover:underline">
            ← Return to Documents Library
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/documents"
              className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#18181B] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#18181B] tracking-tight">{doc.title}</h1>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                  Version {doc.currentVersion}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${doc.status === "APPROVED"
                      ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                      : doc.status === "SUBMITTED"
                        ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                        : "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                    }`}
                >
                  {doc.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Type: {doc.documentType.replace(/_/g, " ")} • Event:{" "}
                <Link
                  href={`/events/new?eventId=${doc.eventId}`}
                  className="text-[#4F46E5] hover:underline font-medium"
                >
                  {doc.dataSnapshot?.eventName || "View Associated Event"}
                </Link>
              </p>
            </div>
          </div>

          {/* Action Downloads */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white text-xs font-medium text-[#475569] shadow-2xs transition-colors"
            >
              <History className="h-3.5 w-3.5 text-[#64748B]" />
              <span>Versions ({versions.length})</span>
            </button>

            {doc.docxUrl && (
              <a
                href={doc.docxUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-xs font-medium text-[#18181B] shadow-2xs transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-[#64748B]" />
                <span>DOCX</span>
              </a>
            )}

            {doc.pdfUrl && (
              <a
                href={doc.pdfUrl}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>PDF</span>
              </a>
            )}

            {isAdmin && (
              <button
                onClick={handleDeleteDoc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#FECDD3] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-xs font-medium text-[#E11D48] shadow-2xs transition-colors"
                title="Delete Document (Admin)"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Callout Banner */}
        {doc.status === "DRAFT" && (
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] flex items-start gap-3 shadow-2xs">
            <Clock className="h-5 w-5 text-[#64748B] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#18181B] block">
                Private Draft • Not Submitted to Faculty
              </span>
              <p className="text-[#475569]">
                This document is strictly in draft status and has NOT been sent to the faculty coordinator.
                You can freely edit the parameters below and regenerate. When you are finished, click{" "}
                <strong className="text-[#18181B]">"Submit to Faculty for Approval"</strong> to send it for formal review.
              </p>
            </div>
          </div>
        )}

        {doc.status === "SUBMITTED" && (
          <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-3 shadow-2xs">
            <Clock className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#92400E] block">
                Submitted to Faculty Coordinator • In Review Queue
              </span>
              <p className="text-[#B45309]">
                This document is currently in the administrative review queue. The faculty coordinator
                will review it and provide remarks or formal endorsement.
              </p>
            </div>
          </div>
        )}

        {doc.status === "CHANGES_REQUESTED" && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#9F1239] flex items-start gap-3 shadow-2xs">
            <AlertCircle className="h-5 w-5 text-[#E11D48] shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <span className="font-bold text-[#9F1239] block text-sm">
                Action Required: Faculty Coordinator Requested Changes
              </span>
              {doc.reviewComments && (
                <div className="p-2.5 rounded bg-white/80 border border-[#FECDD3] text-xs text-[#881337]">
                  <span className="font-semibold block mb-0.5">Faculty Remarks:</span>
                  <p className="italic">"{doc.reviewComments}"</p>
                  {doc.approvedBy && (
                    <span className="text-[10px] text-[#9F1239] block mt-1">
                      — {doc.approvedBy}
                    </span>
                  )}
                </div>
              )}
              <p className="text-[#BE123C]">
                Please update the parameters on the left, click <strong>"Save Edits & Regenerate"</strong> to update the document, and then click <strong>"Re-submit to Faculty for Approval"</strong>.
              </p>
            </div>
          </div>
        )}

        {doc.status === "APPROVED" && (
          <div className="p-4 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] flex items-start gap-3 shadow-2xs">
            <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#065F46] block text-sm">
                Officially Approved & Endorsed
              </span>
              <p className="text-[#047857]">
                Signed off by <strong>{doc.approvedBy || "Faculty Coordinator"}</strong>
                {doc.approvedAt && ` on ${new Date(doc.approvedAt).toLocaleDateString()}`}.
              </p>
              {doc.reviewComments && (
                <p className="text-[11px] italic text-[#065F46] mt-0.5">
                  Endorsement Note: "{doc.reviewComments}"
                </p>
              )}
            </div>
          </div>
        )}

        {doc.status === "REJECTED" && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#9F1239] flex items-start gap-3 shadow-2xs">
            <AlertCircle className="h-5 w-5 text-[#E11D48] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#9F1239] block">Document Rejected</span>
              <p className="text-[#BE123C]">
                Rejected by {doc.approvedBy || "Faculty Coordinator"}.
                {doc.reviewComments && ` Reason: "${doc.reviewComments}"`}
              </p>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {actionSuccess && (
          <div className="p-3.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#059669] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-md bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Side-by-Side Split Review: Left Editable Parameters, Right PDF Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Structured Field Editor (5 Cols) */}
          <div className="lg:col-span-5 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FCFDFE] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                1. Edit Document Parameters
              </h2>
              <span className="text-[10px] text-[#64748B]">Auto-synced</span>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[560px] overflow-y-auto">
              {Object.keys(editableData).length === 0 ? (
                <div className="text-gray-400 py-4 text-center">No editable fields found</div>
              ) : (
                Object.entries(editableData).map(([key, value]) => {
                  if (
                    key === "formattedBudget" ||
                    key === "formattedDateRange" ||
                    key === "currentDate" ||
                    key === "universityName" ||
                    key === "department" ||
                    key === "clubName"
                  ) {
                    return null;
                  }

                  const formattedLabel = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/_/g, " ")
                    .replace(/^./, (s) => s.toUpperCase());

                  const isMultiline =
                    key.toLowerCase().includes("description") ||
                    key.toLowerCase().includes("objective") ||
                    (typeof value === "string" && value.length > 60);

                  const isDateField = key.toLowerCase().includes("date");
                  const isNumberField =
                    typeof value === "number" ||
                    key.toLowerCase().includes("budget") ||
                    key.toLowerCase().includes("participants");

                  return (
                    <div key={key}>
                      <label className="font-semibold text-[#18181B] block mb-1">
                        {formattedLabel}
                      </label>
                      {isMultiline ? (
                        <textarea
                          rows={2}
                          value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                          onChange={(e) =>
                            setEditableData({ ...editableData, [key]: e.target.value })
                          }
                          className="w-full p-2 rounded border border-[#E2E8F0] focus:ring-1 focus:ring-[#4F46E5] focus:outline-hidden"
                        />
                      ) : (
                        <input
                          type={isDateField ? "date" : isNumberField ? "number" : "text"}
                          value={typeof value === "object" ? JSON.stringify(value) : (value ?? "") as string | number}
                          onChange={(e) =>
                            setEditableData({
                              ...editableData,
                              [key]: isNumberField && e.target.value !== "" ? Number(e.target.value) : e.target.value,
                            })
                          }
                          className="w-full p-2 rounded border border-[#E2E8F0] focus:ring-1 focus:ring-[#4F46E5] focus:outline-hidden"
                        />
                      )}
                    </div>
                  );
                })
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
                  <span>
                    {regenerating ? "Regenerating Vectorized Files..." : "Save Edits & Regenerate (New Version)"}
                  </span>
                </button>

                {(doc.status === "DRAFT" || doc.status === "CHANGES_REQUESTED") && (
                  <button
                    onClick={handleSubmitApproval}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {submitting
                        ? "Submitting to Queue..."
                        : doc.status === "CHANGES_REQUESTED"
                        ? "Re-submit to Faculty for Approval"
                        : "Submit to Faculty for Approval"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Embedded PDF Preview & Viewer (7 Cols) */}
          <div className="lg:col-span-7 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden flex flex-col h-[680px]">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FCFDFE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4F46E5]" />
                <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                  2. Rendered PDF Output
                </h2>
              </div>

              {doc.pdfUrl && (
                <a
                  href={doc.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open in Full Tab</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="flex-1 bg-[#F1F5F9] p-3 overflow-hidden flex items-center justify-center">
              {doc.pdfUrl ? (
                <iframe
                  src={`${doc.pdfUrl}#toolbar=0&navpanes=0`}
                  title={doc.title}
                  className="w-full h-full rounded border border-[#CBD5E1] bg-white shadow-xs"
                />
              ) : (
                <div className="text-center text-xs text-[#64748B]">
                  PDF preview not generated yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Version History Modal */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[#4F46E5]" />
                  <h3 className="font-bold text-sm text-[#18181B]">Document Version History</h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-xs text-[#64748B] hover:text-[#18181B]"
                >
                  ✕ Close
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#18181B]">Version {ver.versionNumber}</span>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[#475569]">{ver.changeSummary}</p>
                    <div className="pt-2 flex items-center gap-3 text-[11px]">
                      {ver.docxUrl && (
                        <a href={ver.docxUrl} download className="text-[#4F46E5] hover:underline">
                          Download DOCX
                        </a>
                      )}
                      {ver.pdfUrl && (
                        <a
                          href={ver.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#4F46E5] hover:underline"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DocumentReviewPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentReviewContent id={id} />;
}

export default function DocumentReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#64748B]">Loading review studio...</div>}>
      <DocumentReviewPageInner params={params} />
    </Suspense>
  );
}
