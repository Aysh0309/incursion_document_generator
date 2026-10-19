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

    try {
      setProcessing(true);
      setFeedbackMsg(null);

      const res = await fetch(`/api/documents/${docId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comments: comments.trim() || undefined,
          reviewerName,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to process review.");
      }

      setFeedbackMsg(
        action === "APPROVED"
          ? `Document "${selectedDoc.title}" officially approved and signed off!`
          : action === "CHANGES_REQUESTED"
          ? `Changes requested for "${selectedDoc.title}". Student lead notified.`
          : `Document "${selectedDoc.title}" marked as rejected.`
      );

      // Refresh list and auto-select next pending item
      await fetchDocs(docId);
    } catch (err: any) {
      alert("Error processing review: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-5 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-[#1F6954] uppercase tracking-wider">
                Faculty Coordinator Workflow
              </span>
              <span className="h-1 w-1 rounded-full bg-[#D8D2C7]" />
              <span className="text-[11px] text-[#7A8A81]">Official Sign-off Queue</span>
            </div>
            <h1 className="text-base font-bold text-[#1C2622] tracking-tight">
              Administrative Review & Endorsements
            </h1>
            <p className="text-xs text-[#7A8A81]">
              Only student submissions formally submitted for review appear in your active queue.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-[#66756D]">Active Reviewer:</span>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="p-1.5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F4] text-xs font-semibold text-[#1C2622] w-44 focus:bg-white focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
            />
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3.5 rounded-xl bg-[#E7F3ED] border border-[#BCD8CB] text-xs text-[#1A5A48] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1F6954]" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Submissions List (4 Cols) */}
          <div className="lg:col-span-4 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden flex flex-col">
            {/* Filter Tabs */}
            <div className="flex border-b border-[#E5DFD5] bg-[#FAF8F4]">
              <button
                onClick={() => handleTabChange("pending")}
                className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "pending"
                    ? "border-[#1F6954] text-[#1F6954] bg-white"
                    : "border-transparent text-[#66756D] hover:text-[#1C2622]"
                }`}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>Pending Queue</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    pendingDocs.length > 0
                      ? "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                      : "bg-[#EFECE6] text-[#66756D]"
                  }`}
                >
                  {pendingDocs.length}
                </span>
              </button>

              <button
                onClick={() => handleTabChange("history")}
                className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-[#1F6954] text-[#1F6954] bg-white"
                    : "border-transparent text-[#66756D] hover:text-[#1C2622]"
                }`}
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Reviewed History</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#EFECE6] text-[#66756D] font-bold">
                  {historyDocs.length}
                </span>
              </button>
            </div>

            <div className="divide-y divide-[#E5DFD5] max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#7A8A81]">Loading submissions...</div>
              ) : displayedDocs.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckSquare className="h-8 w-8 text-[#A3B0A8] mx-auto" />
                  <p className="text-xs font-medium text-[#1C2622]">
                    {activeTab === "pending"
                      ? "All caught up! No pending documents."
                      : "No past reviews recorded yet."}
                  </p>
                  <p className="text-[11px] text-[#7A8A81]">
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
                    className={`p-3.5 cursor-pointer transition-all ${
                      selectedDoc?.id === d.id ? "bg-[#E7F3ED] border-l-2 border-[#1F6954]" : "hover:bg-[#FAF8F4]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-[#1C2622] line-clamp-1">
                        {d.title}
                      </span>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          d.status === "APPROVED"
                            ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                            : d.status === "SUBMITTED"
                            ? "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                            : d.status === "CHANGES_REQUESTED"
                            ? "bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]"
                            : d.status === "REJECTED"
                            ? "bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]"
                            : "bg-[#EFECE6] text-[#55645C]"
                        }`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#7A8A81] flex items-center justify-between">
                      <span>{d.documentType.replace(/_/g, " ")}</span>
                      <span className="font-mono">v{d.currentVersion}</span>
                    </div>

                    {d.reviewComments && (
                      <p className="text-[10px] text-[#66756D] line-clamp-1 mt-1 bg-white/70 p-1 rounded-md border border-[#E5DFD5]">
                        <span className="font-semibold">Remark:</span> {d.reviewComments}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Inspection & Decision Action (8 Cols) */}
          <div className="lg:col-span-8 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden flex flex-col space-y-4 p-5">
            {selectedDoc ? (
              <>
                <div className="border-b border-[#E5DFD5] pb-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#1C2622]">{selectedDoc.title}</h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          selectedDoc.status === "APPROVED"
                            ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                            : selectedDoc.status === "SUBMITTED"
                            ? "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                            : selectedDoc.status === "CHANGES_REQUESTED"
                            ? "bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]"
                            : selectedDoc.status === "REJECTED"
                            ? "bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]"
                            : "bg-[#EFECE6] text-[#55645C]"
                        }`}
                      >
                        {selectedDoc.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A8A81] mt-0.5">
                      Event Date: {selectedDoc.dataSnapshot.startDate || "TBD"} • Venue:{" "}
                      {selectedDoc.dataSnapshot.venue || "TBD"} • Version: {selectedDoc.currentVersion}
                    </p>
                  </div>

                  <Link
                    href={`/documents/${selectedDoc.id}`}
                    className="text-xs text-[#1F6954] hover:text-[#175342] flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>Open in Review Studio</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* PDF Document Preview Canvas */}
                <div className="h-96 rounded-xl border border-[#E5DFD5] bg-[#EFECE6] overflow-hidden">
                  {selectedDoc.pdfUrl ? (
                    <iframe
                      src={`${selectedDoc.pdfUrl}#toolbar=0&navpanes=0`}
                      title={selectedDoc.title}
                      className="w-full h-full bg-white"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#7A8A81]">
                      Preview unavailable
                    </div>
                  )}
                </div>

                {/* If viewing a document in Reviewed History, display recorded feedback card */}
                {activeTab === "history" ||
                selectedDoc.status === "APPROVED" ||
                selectedDoc.status === "CHANGES_REQUESTED" ||
                selectedDoc.status === "REJECTED" ? (
                  <div className="p-3.5 rounded-xl border border-[#E5DFD5] bg-[#FAF8F4] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#1C2622] flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-[#1F6954]" />
                        <span>Recorded Faculty Decision</span>
                      </span>
                      <span className="text-[11px] text-[#7A8A81]">
                        {selectedDoc.approvedAt
                          ? new Date(selectedDoc.approvedAt).toLocaleString()
                          : new Date(selectedDoc.updatedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#55645C] space-y-1">
                      <div>
                        <span className="font-medium text-[#1C2622]">Reviewed By: </span>
                        {selectedDoc.approvedBy || "Faculty Coordinator"}
                      </div>
                      <div>
                        <span className="font-medium text-[#1C2622]">Official Remarks: </span>
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
                      <label className="font-semibold text-[#1C2622] flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-[#66756D]" />
                        <span>Faculty Review Feedback / Remarks for Student Leads:</span>
                      </label>
                      <textarea
                        rows={2}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="e.g. Approved. Please ensure participants carry college ID cards to CS Lab 3..."
                        className="w-full p-2.5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F4] text-xs text-[#1C2622] focus:bg-white focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                      />
                    </div>

                    {/* Formal Action Decision Buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleReviewAction("REJECTED")}
                        disabled={processing}
                        className="px-3.5 py-2 rounded-lg border border-[#F7C8C4] bg-[#FDF2F0] hover:bg-[#FCE8E6] text-[#C24138] text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleReviewAction("CHANGES_REQUESTED")}
                        disabled={processing}
                        className="px-3.5 py-2 rounded-lg border border-[#FBD8B3] bg-[#FEF3E6] hover:bg-[#FDE68A] text-[#D9822B] text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Request Changes
                      </button>

                      <button
                        onClick={() => handleReviewAction("APPROVED")}
                        disabled={processing}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
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
                <CheckSquare className="h-8 w-8 text-[#A3B0A8] mx-auto" />
                <p className="text-xs font-medium text-[#1C2622]">
                  {activeTab === "pending"
                    ? "No pending document selected."
                    : "No document selected."}
                </p>
                <p className="text-[11px] text-[#7A8A81]">
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
