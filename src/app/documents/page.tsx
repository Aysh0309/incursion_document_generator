"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileText,
  Package,
  ArrowRight,
  Filter,
  Plus,
  Trash2,
} from "lucide-react";
import { DocumentRecord, UserRole } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function DocumentsLibraryPage() {
  const { user, isAdmin: authIsAdmin } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("CLUB_ADMIN");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Sync current role with localStorage / simulator
    const savedRole = localStorage.getItem("incursion_user_role") as UserRole;
    if (savedRole) {
      setCurrentRole(savedRole);
    }

    const onRoleChange = (e: any) => {
      if (e.detail) setCurrentRole(e.detail);
    };

    window.addEventListener("roleChange", onRoleChange);

    fetch("/api/documents")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setDocuments(res.data);
        }
      })
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("roleChange", onRoleChange);
    };
  }, []);

  const isAdmin = authIsAdmin || currentRole === "CLUB_ADMIN" || user?.role === "CLUB_ADMIN";

  const filteredDocs = documents.filter((d) => {
    if (statusFilter === "ALL") return true;
    return d.status === statusFilter;
  });

  const toggleSelect = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((d) => d !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map((d) => d.id));
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setSelectedDocIds((prev) => prev.filter((dId) => dId !== id));
      } else {
        alert(data.error?.message || "Failed to delete document.");
      }
    } catch (err: any) {
      alert("Error deleting document: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBatchDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedDocIds.length} selected document(s)?`
      )
    ) {
      return;
    }

    for (const id of selectedDocIds) {
      try {
        await fetch(`/api/documents/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error(err);
      }
    }

    setDocuments((prev) => prev.filter((d) => !selectedDocIds.includes(d.id)));
    setSelectedDocIds([]);
  };

  const batchZipUrl =
    selectedDocIds.length > 0
      ? `/api/documents/batch-download?documentIds=${selectedDocIds.join(",")}`
      : `/api/documents/batch-download?documentIds=${documents.map((d) => d.id).join(",")}`;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#1C2622] tracking-tight">
              Document Archive & Outputs
            </h1>
            <p className="text-xs text-[#7A8A81] mt-0.5">
              Browse, inspect, and export compiled OpenXML (.docx) and Vectorized (.pdf) documents.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && selectedDocIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#F7C8C4] bg-[#FDF2F0] hover:bg-[#FCE8E6] text-xs font-semibold text-[#C24138] shadow-2xs transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedDocIds.length})</span>
              </button>
            )}

            {documents.length > 0 && (
              <a
                href={batchZipUrl}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5DFD5] bg-white hover:bg-[#FAF8F4] text-xs font-semibold text-[#1C2622] shadow-2xs transition-colors"
              >
                <Package className="h-3.5 w-3.5 text-[#1F6954]" />
                <span>
                  {selectedDocIds.length > 0
                    ? `Download Selected ZIP (${selectedDocIds.length})`
                    : "Download All as ZIP"}
                </span>
              </a>
            )}

            <Link
              href="/events/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Document</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-[#66756D] font-medium flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3" />
            <span>Filter by:</span>
          </span>
          {["ALL", "DRAFT", "SUBMITTED", "APPROVED", "CHANGES_REQUESTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? "bg-[#1F6954] text-white shadow-2xs"
                  : "bg-white border border-[#E5DFD5] text-[#66756D] hover:bg-[#FAF8F4]"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Documents Table */}
        <div className="rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#7A8A81]">Loading archive...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="h-8 w-8 text-[#A3B0A8] mx-auto" />
              <p className="text-xs font-medium text-[#1C2622]">No documents matching filter</p>
              <p className="text-[11px] text-[#7A8A81]">
                Generate an event document from the studio to view it here.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-medium mt-2 shadow-2xs"
              >
                <span>Create Documents</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F2EC] text-[#66756D] border-b border-[#E5DFD5]">
                  <tr>
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          selectedDocIds.length === filteredDocs.length &&
                          filteredDocs.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded accent-[#1F6954]"
                      />
                    </th>
                    <th className="py-2.5 px-4 font-medium">Document Title</th>
                    <th className="py-2.5 px-3 font-medium">Document Type</th>
                    <th className="py-2.5 px-3 font-medium">Version</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD5]">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="rounded accent-[#1F6954]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-semibold text-[#1C2622] hover:text-[#1F6954] block transition-colors"
                        >
                          {doc.title}
                        </Link>
                        <span className="text-[10px] text-[#7A8A81]">
                          Created {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-[#55645C]">
                          {doc.documentType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#55645C] font-bold border border-[#E5DFD5]">
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
                              download
                              className="px-2 py-1 rounded-md bg-[#E7F3ED] hover:bg-[#DDF0E6] text-[#1A5A48] border border-[#BCD8CB] text-[10px] font-medium inline-flex items-center gap-1 transition-colors"
                              title="Download PDF"
                            >
                              <span>PDF</span>
                            </a>
                          )}
                          <Link
                            href={`/documents/${doc.id}`}
                            className="p-1 text-[#7A8A81] hover:text-[#1F6954] transition-colors"
                            title="Open Review Studio"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(doc.id, doc.title)}
                              disabled={deletingId === doc.id}
                              className="p-1 rounded text-[#A3B0A8] hover:text-[#C24138] hover:bg-[#FDF2F0] transition-colors ml-1 disabled:opacity-50"
                              title="Delete Document (Admin)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
