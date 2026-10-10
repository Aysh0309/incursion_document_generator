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
} from "lucide-react";
import { DocumentRecord, DocumentVersionRecord, StructuredEventData } from "@/types";

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

  useEffect(() => {
    fetchDocData();
  }, [id]);

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
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    doc.status === "APPROVED"
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
                Type: {doc.documentType.replace(/_/g, " ")} • Generated via {doc.pdfEngineUsed === "libreoffice" ? "LibreOffice Headless" : "Institutional PDFKit Engine"}
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
          </div>
        </div>

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

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Event Title</label>
                <input
                  type="text"
                  value={editableData.eventName || ""}
                  onChange={(e) => setEditableData({ ...editableData, eventName: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editableData.startDate || ""}
                    onChange={(e) => setEditableData({ ...editableData, startDate: e.target.value })}
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Time Range</label>
                  <input
                    type="text"
                    value={editableData.startTime || ""}
                    onChange={(e) => setEditableData({ ...editableData, startTime: e.target.value })}
                    placeholder="e.g. 09:30 AM"
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Venue / Specific Lab</label>
                <input
                  type="text"
                  value={editableData.venue || ""}
                  onChange={(e) => setEditableData({ ...editableData, venue: e.target.value })}
                  placeholder="e.g. CS Lab 3"
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Faculty Coordinator</label>
                  <input
                    type="text"
                    value={editableData.facultyCoordinator || ""}
                    onChange={(e) => setEditableData({ ...editableData, facultyCoordinator: e.target.value })}
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Department HOD</label>
                  <input
                    type="text"
                    value={editableData.departmentHOD || ""}
                    onChange={(e) => setEditableData({ ...editableData, departmentHOD: e.target.value })}
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Budget (INR)</label>
                <input
                  type="number"
                  value={editableData.budgetRequested || 0}
                  onChange={(e) => setEditableData({ ...editableData, budgetRequested: Number(e.target.value) })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Description & Objectives</label>
                <textarea
                  rows={3}
                  value={editableData.eventDescription || ""}
                  onChange={(e) => setEditableData({ ...editableData, eventDescription: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

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

                {doc.status === "DRAFT" && (
                  <button
                    onClick={handleSubmitApproval}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#18181B] font-medium transition-colors"
                  >
                    <Send className="h-3.5 w-3.5 text-[#4F46E5]" />
                    <span>Submit to Faculty for Approval</span>
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
