"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileText,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileDown,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { DocumentRecord, EventRecord, UserRole } from "@/types";

export default function DashboardPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole>("CLUB_ADMIN");

  useEffect(() => {
    const saved = localStorage.getItem("incursion_user_role") as UserRole;
    if (saved) setCurrentRole(saved);

    const onRoleChange = (e: any) => {
      if (e.detail) setCurrentRole(e.detail);
    };
    window.addEventListener("roleChange", onRoleChange);

    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/documents").then((r) => r.json()),
    ])
      .then(([evtsData, docsData]) => {
        if (evtsData.success) setEvents(evtsData.data || []);
        if (docsData.success) setDocuments(docsData.data || []);
      })
      .catch((err) => console.error("Dashboard fetch error:", err))
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("roleChange", onRoleChange);
    };
  }, []);

  const isAdmin = currentRole === "CLUB_ADMIN";

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!confirm(`Permanently delete event "${name}" and all its documents?`)) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setDocuments((prev) => prev.filter((d) => d.eventId !== id));
      } else {
        alert(data.error?.message || "Failed to delete event");
      }
    } catch (err: any) {
      alert("Error deleting event: " + err.message);
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert(data.error?.message || "Failed to delete document");
      }
    } catch (err: any) {
      alert("Error deleting document: " + err.message);
    }
  };

  const totalGenerated = documents.length;
  const activeEvents = events.length;
  const pendingApprovals = documents.filter((d) => d.status === "SUBMITTED" || d.status === "UNDER_REVIEW").length;
  const approvedDocs = documents.filter((d) => d.status === "APPROVED").length;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Metric Cards Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-medium">Total Documents</span>
              <FileText className="h-4 w-4 text-[#4F46E5]" />
            </div>
            <div className="text-2xl font-bold text-[#18181B]">{totalGenerated}</div>
            <div className="text-[11px] text-[#64748B] mt-1">All created documents</div>
          </div>

          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-medium">Active Events</span>
              <CalendarDays className="h-4 w-4 text-[#059669]" />
            </div>
            <div className="text-2xl font-bold text-[#18181B]">{activeEvents}</div>
            <div className="text-[11px] text-[#64748B] mt-1">Registered club events</div>
          </div>

          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-medium">Pending Approvals</span>
              <Clock className="h-4 w-4 text-[#D97706]" />
            </div>
            <div className="text-2xl font-bold text-[#18181B]">{pendingApprovals}</div>
            <div className="text-[11px] text-[#64748B] mt-1">Awaiting faculty review</div>
          </div>

          <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-medium">Approved & Finalized</span>
              <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            </div>
            <div className="text-2xl font-bold text-[#18181B]">{approvedDocs}</div>
            <div className="text-[11px] text-[#059669] font-medium mt-1">Approved by faculty</div>
          </div>
        </div>

        {/* Two Column Layout: Recent Documents & Recent Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents Table (2 Cols) */}
          <div className="lg:col-span-2 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FCFDFE]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4F46E5]" />
                <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                  Generated Documents
                </h2>
              </div>
              <Link
                href="/documents"
                className="text-xs font-medium text-[#4F46E5] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex-1 divide-y divide-[#E2E8F0] overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#64748B]">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <FileText className="h-8 w-8 text-[#94A3B8] mx-auto" />
                  <p className="text-xs font-medium text-[#18181B]">No documents generated yet</p>
                  <p className="text-[11px] text-[#64748B]">
                    Describe an event to generate your first proposal or permission letter.
                  </p>
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#4F46E5] text-white text-xs font-medium mt-2"
                  >
                    <span>Create Now</span>
                  </Link>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Document Title</th>
                      <th className="py-2.5 px-3 font-medium">Version</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium text-right">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {documents.slice(0, 5).map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-medium text-[#18181B] hover:text-[#4F46E5] flex items-center gap-1.5"
                          >
                            <span>{doc.title}</span>
                          </Link>
                          <span className="text-[10px] text-[#64748B] block mt-0.5">
                            {doc.documentType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-semibold">
                            v{doc.currentVersion}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              doc.status === "APPROVED"
                                ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                                : doc.status === "CHANGES_REQUESTED"
                                ? "bg-[#FEF2F2] text-[#E11D48] border border-[#FECDD3]"
                                : doc.status === "SUBMITTED"
                                ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                                : "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]"
                            }`}
                          >
                            {doc.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {doc.docxUrl && (
                              <a
                                href={doc.docxUrl}
                                download
                                className="px-2 py-1 rounded border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#475569] text-[10px] font-medium inline-flex items-center gap-1"
                                title="Download DOCX"
                              >
                                <span>DOCX</span>
                              </a>
                            )}
                            {doc.pdfUrl && (
                              <a
                                href={doc.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] text-[10px] font-medium inline-flex items-center gap-1"
                                title="View / Download PDF"
                              >
                                <span>PDF</span>
                              </a>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.title)}
                                className="p-1 rounded text-[#94A3B8] hover:text-[#E11D48] hover:bg-[#FEF2F2] transition-colors ml-0.5"
                                title="Delete Document (Admin)"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Events (1 Col) */}
          <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FCFDFE]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#059669]" />
                <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                  Event Profiles
                </h2>
              </div>
              <Link
                href="/events/new"
                className="text-xs font-medium text-[#4F46E5] hover:underline"
              >
                + New
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#64748B]">No events added yet.</div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-[#18181B] line-clamp-1">
                        {evt.eventName}
                      </span>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          evt.completenessStatus === "COMPLETED" || evt.completenessStatus === "VALIDATED"
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                            : "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                        }`}
                      >
                        {evt.completenessStatus === "INCOMPLETE" ? "INCOMPLETE" : "COMPLETED"}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#64748B] flex items-center gap-2">
                      <span>{evt.structuredData.startDate || "Date TBD"}</span>
                      <span>•</span>
                      <span className="truncate">{evt.structuredData.venue || "Venue TBD"}</span>
                    </div>

                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">
                        {evt.missingFields.length > 0
                          ? `${evt.missingFields.length} missing fields`
                          : "Ready to generate"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/events/new?eventId=${evt.id}`}
                          className="text-[#4F46E5] hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          <span>Open Studio</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteEvent(evt.id, evt.eventName)}
                            className="p-1 rounded text-[#94A3B8] hover:text-[#E11D48] hover:bg-[#FEF2F2] transition-colors"
                            title="Delete Event (Admin)"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
