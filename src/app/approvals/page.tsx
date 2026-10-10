"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  CheckSquare,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { DocumentRecord, DocumentStatus } from "@/types";

export default function ApprovalsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [comments, setComments] = useState("");
  const [reviewerName, setReviewerName] = useState("Dr. Sunita Sharma");
  const [processing, setProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success && data.data) {
        setDocuments(data.data);
        if (data.data.length > 0 && !selectedDoc) {
          // Select first submitted doc or first doc
          const pending = data.data.find((d: any) => d.status === "SUBMITTED" || d.status === "UNDER_REVIEW");
          setSelectedDoc(pending || data.data[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (action: DocumentStatus) => {
    if (!selectedDoc) return;
    setProcessing(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/documents/${selectedDoc.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comments,
          reviewerName,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Action failed");
      }

      setFeedbackMsg(`Document successfully updated to "${action.replace(/_/g, " ")}"!`);
      setComments("");
      await fetchDocs();
    } catch (err: any) {
      alert(err.message || "Failed to submit review");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider">
                Faculty Coordinator Workflow
              </span>
              <span className="h-1 w-1 rounded-full bg-[#CBD5E1]" />
              <span className="text-[11px] text-[#64748B]">Official Sign-off Queue</span>
            </div>
            <h1 className="text-base font-bold text-[#18181B] tracking-tight">
              Administrative Review & Endorsements
            </h1>
            <p className="text-xs text-[#64748B]">
              Review club documents, leave feedback remarks, and grant formal departmental approvals.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-[#64748B]">Active Reviewer:</span>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="p-1.5 rounded border border-[#E2E8F0] text-xs font-semibold text-[#18181B] w-44"
            />
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#059669] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Submissions List (4 Cols) */}
          <div className="lg:col-span-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#FCFDFE] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                Review Submissions ({documents.length})
              </h2>
            </div>

            <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-xs text-[#64748B]">Loading queue...</div>
              ) : documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B]">No documents in queue.</div>
              ) : (
                documents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDoc(d)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      selectedDoc?.id === d.id ? "bg-[#EEF2FF]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-[#18181B] line-clamp-1">
                        {d.title}
                      </span>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          d.status === "APPROVED"
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                            : d.status === "SUBMITTED"
                            ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                            : d.status === "CHANGES_REQUESTED"
                            ? "bg-[#FEF2F2] text-[#E11D48] border border-[#FECDD3]"
                            : "bg-[#F1F5F9] text-[#475569]"
                        }`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#64748B] flex items-center justify-between">
                      <span>{d.documentType.replace(/_/g, " ")}</span>
                      <span className="font-mono">v{d.currentVersion}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Inspection & Decision Action (8 Cols) */}
          <div className="lg:col-span-8 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden flex flex-col space-y-4 p-5">
            {selectedDoc ? (
              <>
                <div className="border-b border-[#E2E8F0] pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#18181B]">{selectedDoc.title}</h3>
                    <p className="text-[11px] text-[#64748B]">
                      Event Date: {selectedDoc.dataSnapshot.startDate || "TBD"} • Venue: {selectedDoc.dataSnapshot.venue || "TBD"}
                    </p>
                  </div>

                  <Link
                    href={`/documents/${selectedDoc.id}`}
                    className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Open in Review Studio</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* PDF Document Preview Canvas */}
                <div className="h-96 rounded border border-[#E2E8F0] bg-[#F1F5F9] overflow-hidden">
                  {selectedDoc.pdfUrl ? (
                    <iframe
                      src={`${selectedDoc.pdfUrl}#toolbar=0&navpanes=0`}
                      title={selectedDoc.title}
                      className="w-full h-full bg-white"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                      Preview unavailable
                    </div>
                  )}
                </div>

                {/* Review Feedback Box */}
                <div className="space-y-2 text-xs">
                  <label className="font-semibold text-[#18181B] flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#64748B]" />
                    <span>Review Comments / Instructions for Student Leads:</span>
                  </label>
                  <textarea
                    rows={2}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="e.g. Approved. Please ensure participants carry college ID cards to CS Lab 3..."
                    className="w-full p-2.5 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                {/* Formal Action Decision Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleReviewAction("REJECTED")}
                    disabled={processing}
                    className="px-3 py-2 rounded-md border border-[#FECDD3] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#E11D48] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => handleReviewAction("CHANGES_REQUESTED")}
                    disabled={processing}
                    className="px-3 py-2 rounded-md border border-[#FDE68A] bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Request Changes
                  </button>

                  <button
                    onClick={() => handleReviewAction("APPROVED")}
                    disabled={processing}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Endorse Document</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-xs text-[#64748B]">
                Select a document from the queue to inspect and review.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
