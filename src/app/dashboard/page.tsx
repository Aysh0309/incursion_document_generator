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
          <div className="p-4 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#66756D] mb-2">
              <span className="text-xs font-medium">Total Documents</span>
              <FileText className="h-4 w-4 text-[#1F6954]" />
            </div>
            <div className="text-2xl font-bold text-[#1C2622]">{totalGenerated}</div>
            <div className="text-[11px] text-[#7A8A81] mt-1">All created documents</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#66756D] mb-2">
              <span className="text-xs font-medium">Active Events</span>
              <CalendarDays className="h-4 w-4 text-[#1F6954]" />
            </div>
            <div className="text-2xl font-bold text-[#1C2622]">{activeEvents}</div>
            <div className="text-[11px] text-[#7A8A81] mt-1">Registered club events</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#66756D] mb-2">
              <span className="text-xs font-medium">Pending Approvals</span>
              <Clock className="h-4 w-4 text-[#D9822B]" />
            </div>
            <div className="text-2xl font-bold text-[#1C2622]">{pendingApprovals}</div>
            <div className="text-[11px] text-[#7A8A81] mt-1">Awaiting faculty review</div>
          </div>

          <div className="p-4 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs">
            <div className="flex items-center justify-between text-[#66756D] mb-2">
              <span className="text-xs font-medium">Approved & Finalized</span>
              <CheckCircle2 className="h-4 w-4 text-[#1F6954]" />
            </div>
            <div className="text-2xl font-bold text-[#1C2622]">{approvedDocs}</div>
            <div className="text-[11px] text-[#1F6954] font-medium mt-1">Approved by faculty</div>
          </div>
        </div>

        {/* Two Column Layout: Recent Documents & Recent Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents Table (2 Cols) */}
          <div className="lg:col-span-2 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E5DFD5] flex items-center justify-between bg-[#FAF8F4]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#1F6954]" />
                <h2 className="text-xs font-semibold text-[#1C2622] uppercase tracking-wider">
                  Generated Documents
                </h2>
              </div>
              <Link
                href="/documents"
                className="text-xs font-medium text-[#1F6954] hover:text-[#175342] flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="flex-1 divide-y divide-[#E5DFD5] overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-[#7A8A81]">Loading documents...</div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <FileText className="h-8 w-8 text-[#A3B0A8] mx-auto" />
                  <p className="text-xs font-medium text-[#1C2622]">No documents generated yet</p>
                  <p className="text-[11px] text-[#7A8A81]">
                    Describe an event to generate your first proposal or permission letter.
                  </p>
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-medium mt-2 shadow-2xs"
                  >
                    <span>Create Now</span>
                  </Link>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F2EC] text-[#66756D] border-b border-[#E5DFD5]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Document Title</th>
                      <th className="py-2.5 px-3 font-medium">Version</th>
                      <th className="py-2.5 px-3 font-medium">Status</th>
                      <th className="py-2.5 px-4 font-medium text-right">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DFD5]">
                    {documents.slice(0, 5).map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#FAF8F4] transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-medium text-[#1C2622] hover:text-[#1F6954] flex items-center gap-1.5 transition-colors"
                          >
                            <span>{doc.title}</span>
                          </Link>
                          <span className="text-[10px] text-[#7A8A81] block mt-0.5">
                            {doc.documentType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#55645C] font-semibold border border-[#E5DFD5]">
                            v{doc.currentVersion}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              doc.status === "APPROVED"
                                ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                                : doc.status === "CHANGES_REQUESTED"
                                ? "bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]"
                                : doc.status === "SUBMITTED"
                                ? "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                                : "bg-[#EFECE6] text-[#55645C] border border-[#E5DFD5]"
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
                                className="px-2 py-1 rounded-md border border-[#E5DFD5] hover:bg-[#EFECE6] text-[#55645C] text-[10px] font-medium inline-flex items-center gap-1 transition-colors"
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
                                className="px-2 py-1 rounded-md bg-[#E7F3ED] hover:bg-[#DDF0E6] text-[#1A5A48] border border-[#BCD8CB] text-[10px] font-medium inline-flex items-center gap-1 transition-colors"
                                title="View / Download PDF"
                              >
                                <span>PDF</span>
                              </a>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.title)}
                                className="p-1 rounded text-[#A3B0A8] hover:text-[#C24138] hover:bg-[#FDF2F0] transition-colors ml-0.5"
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
          <div className="rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E5DFD5] flex items-center justify-between bg-[#FAF8F4]">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#1F6954]" />
                <h2 className="text-xs font-semibold text-[#1C2622] uppercase tracking-wider">
                  Event Profiles
                </h2>
              </div>
              <Link
                href="/events/new"
                className="text-xs font-medium text-[#1F6954] hover:text-[#175342] transition-colors"
              >
                + New
              </Link>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#7A8A81]">No events added yet.</div>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-xl border border-[#E5DFD5] bg-[#FAF8F4] hover:bg-white hover:border-[#BCD8CB] transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-[#1C2622] line-clamp-1">
                        {evt.eventName}
                      </span>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          evt.completenessStatus === "COMPLETED" || evt.completenessStatus === "VALIDATED"
                            ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                            : "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                        }`}
                      >
                        {evt.completenessStatus === "INCOMPLETE" ? "INCOMPLETE" : "COMPLETED"}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#7A8A81] flex items-center gap-2">
                      <span>{evt.structuredData.startDate || "Date TBD"}</span>
                      <span>•</span>
                      <span className="truncate">{evt.structuredData.venue || "Venue TBD"}</span>
                    </div>

                    <div className="pt-2 border-t border-[#E5DFD5] flex items-center justify-between text-[11px]">
                      <span className="text-[#66756D]">
                        {evt.missingFields.length > 0
                          ? `${evt.missingFields.length} missing fields`
                          : "Ready to generate"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/events/new?eventId=${evt.id}`}
                          className="text-[#1F6954] hover:text-[#175342] font-medium inline-flex items-center gap-0.5 transition-colors"
                        >
                          <span>Open Studio</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteEvent(evt.id, evt.eventName)}
                            className="p-1 rounded text-[#A3B0A8] hover:text-[#C24138] hover:bg-[#FDF2F0] transition-colors"
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
