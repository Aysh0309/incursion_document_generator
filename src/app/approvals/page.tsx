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
  Inbox,
  Archive,
  UserCheck,
} from "lucide-react";
import { DocumentRecord, DocumentStatus } from "@/types";

export default function ApprovalsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [comments, setComments] = useState("");
  const [reviewerName, setReviewerName] = useState("Dr. Sunita Sharma");
  const [processing, setProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async (selectNextAfterId?: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success && data.data) {
        const allDocs: DocumentRecord[] = data.data;
        setDocuments(allDocs);

        // Filter only submitted / under-review documents for active queue
        const pendingDocs = allDocs.filter(
          (d) => d.status === "SUBMITTED" || d.status === "UNDER_REVIEW"
        );

        if (selectNextAfterId) {
          // Find next pending document that isn't the one just processed
          const next = pendingDocs.find((d) => d.id !== selectNextAfterId);
          setSelectedDoc(next || null);
        } else {
          // Default selection if not already selected or current selection is invalid
          setSelectedDoc((prev) => {
            if (prev) {
              const updatedCurrent = allDocs.find((d) => d.id === prev.id);
              if (updatedCurrent) return updatedCurrent;
            }
            return pendingDocs[0] || null;
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const pendingDocs = documents.filter(
    (d) => d.status === "SUBMITTED" || d.status === "UNDER_REVIEW"
  );
  const historyDocs = documents.filter(
    (d) =>
      d.status === "APPROVED" ||
      d.status === "CHANGES_REQUESTED" ||
      d.status === "REJECTED"
  );

  const displayedDocs = activeTab === "pending" ? pendingDocs : historyDocs;

  // When tab changes, automatically select the first document in that tab
  const handleTabChange = (tab: "pending" | "history") => {
    setActiveTab(tab);
    setComments("");
    setFeedbackMsg(null);
    const list = tab === "pending" ? pendingDocs : historyDocs;
    setSelectedDoc(list[0] || null);
  };

  const handleSelectDoc = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setComments("");
    setFeedbackMsg(null);
  };

  const handleReviewAction = async (action: DocumentStatus) => {
    if (!selectedDoc) return;
    const docId = selectedDoc.id;
    const docTitle = selectedDoc.title;
    setProcessing(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/documents/${docId}/review`, {
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

      setFeedbackMsg(
        `Document "${docTitle}" marked as "${action.replace(/_/g, " ")}". It has been moved to Reviewed History.`
      );
      setComments("");
      await fetchDocs(docId);
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
              Only student submissions formally submitted for review appear in your active queue.
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
            {/* Filter Tabs */}
            <div className="flex border-b border-[#E2E8F0] bg-[#FCFDFE]">
              <button
                onClick={() => handleTabChange("pending")}
                className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "pending"
                    ? "border-[#4F46E5] text-[#4F46E5] bg-white"
                    : "border-transparent text-[#64748B] hover:text-[#18181B]"
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>Pending Queue</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    pendingDocs.length > 0
                      ? "bg-[#FEF3C7] text-[#D97706]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {pendingDocs.length}
                </span>
              </button>

              <button
                onClick={() => handleTabChange("history")}
                className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-[#4F46E5] text-[#4F46E5] bg-white"
                    : "border-transparent text-[#64748B] hover:text-[#18181B]"
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Reviewed History</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[#64748B] font-bold">
                  {historyDocs.length}
                </span>
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0] max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#64748B]">Loading submissions...</div>
              ) : displayedDocs.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckSquare className="h-8 w-8 text-[#94A3B8] mx-auto" />
                  <p className="text-xs font-medium text-[#18181B]">
                    {activeTab === "pending"
                      ? "All caught up! No pending documents."
                      : "No past reviews recorded yet."}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {activeTab === "pending"
                      ? "Documents will appear here only when students click 'Submit to Faculty for Approval'."
                      : "Completed endorsements and change requests will be archived here."}
                  </p>
                </div>
              ) : (
                displayedDocs.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDoc(d)}
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
                            : d.status === "REJECTED"
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

                    {d.reviewComments && (
                      <p className="text-[10px] text-[#64748B] line-clamp-1 mt-1 bg-white/60 p-1 rounded border border-[#E2E8F0]">
                        <span className="font-semibold">Remark:</span> {d.reviewComments}
                      </p>
                    )}
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#18181B]">{selectedDoc.title}</h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          selectedDoc.status === "APPROVED"
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                            : selectedDoc.status === "SUBMITTED"
                            ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                            : selectedDoc.status === "CHANGES_REQUESTED"
                            ? "bg-[#FEF2F2] text-[#E11D48] border border-[#FECDD3]"
                            : selectedDoc.status === "REJECTED"
                            ? "bg-[#FEF2F2] text-[#E11D48] border border-[#FECDD3]"
                            : "bg-[#F1F5F9] text-[#475569]"
                        }`}
                      >
                        {selectedDoc.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Event Date: {selectedDoc.dataSnapshot.startDate || "TBD"} • Venue:{" "}
                      {selectedDoc.dataSnapshot.venue || "TBD"} • Version: {selectedDoc.currentVersion}
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

                {/* If viewing a document in Reviewed History, display recorded feedback card */}
                {activeTab === "history" ||
                selectedDoc.status === "APPROVED" ||
                selectedDoc.status === "CHANGES_REQUESTED" ||
                selectedDoc.status === "REJECTED" ? (
                  <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#18181B] flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-[#4F46E5]" />
                        <span>Recorded Faculty Decision</span>
                      </span>
                      <span className="text-[11px] text-[#64748B]">
                        {selectedDoc.approvedAt
                          ? new Date(selectedDoc.approvedAt).toLocaleString()
                          : new Date(selectedDoc.updatedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#475569] space-y-1">
                      <div>
                        <span className="font-medium text-[#18181B]">Reviewed By: </span>
                        {selectedDoc.approvedBy || "Faculty Coordinator"}
                      </div>
                      <div>
                        <span className="font-medium text-[#18181B]">Official Remarks: </span>
                        <span className="italic">
                          {selectedDoc.reviewComments || "No specific feedback entered."}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Active Review Feedback Box & Action Buttons (Only for Pending Submissions) */}
                {(selectedDoc.status === "SUBMITTED" || selectedDoc.status === "UNDER_REVIEW") && (
                  <>
                    <div className="space-y-2 text-xs">
                      <label className="font-semibold text-[#18181B] flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-[#64748B]" />
                        <span>Faculty Review Feedback / Remarks for Student Leads:</span>
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
                )}
              </>
            ) : (
              <div className="p-16 text-center space-y-2">
                <CheckSquare className="h-8 w-8 text-[#94A3B8] mx-auto" />
                <p className="text-xs font-medium text-[#18181B]">
                  {activeTab === "pending"
                    ? "No pending document selected."
                    : "No document selected."}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {activeTab === "pending"
                    ? "Select an item from the pending list on the left to review."
                    : "Select a previously reviewed document to inspect remarks."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
