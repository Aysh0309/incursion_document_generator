"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileText,
  FileDown,
  Download,
  Plus,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
} from "lucide-react";
import { DocumentRecord, DocumentStatus } from "@/types";

export default function DocumentsLibraryPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setDocuments(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

  const batchZipUrl = selectedDocIds.length > 0
    ? `/api/documents/batch-download?documentIds=${selectedDocIds.join(",")}`
    : `/api/documents/batch-download?documentIds=${documents.map((d) => d.id).join(",")}`;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#18181B] tracking-tight">
              Document Archive & Outputs
            </h1>
            <p className="text-xs text-[#64748B]">
              Browse, inspect, and export compiled OpenXML (.docx) and Vectorized (.pdf) documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {documents.length > 0 && (
              <a
                href={batchZipUrl}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#18181B] shadow-2xs transition-colors"
              >
                <Package className="h-3.5 w-3.5 text-[#4F46E5]" />
                <span>
                  {selectedDocIds.length > 0
                    ? `Download Selected ZIP (${selectedDocIds.length})`
                    : "Download All as ZIP"}
                </span>
              </a>
            )}

            <Link
              href="/events/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Document</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B] font-medium flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Filter by:</span>
          </span>
          {["ALL", "DRAFT", "SUBMITTED", "APPROVED", "CHANGES_REQUESTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === st
                  ? "bg-[#4F46E5] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Documents Table */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#64748B]">Loading archive...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="h-8 w-8 text-[#94A3B8] mx-auto" />
              <p className="text-xs font-medium text-[#18181B]">No documents matching filter</p>
              <p className="text-[11px] text-[#64748B]">
                Generate an event document from the studio to view it here.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#4F46E5] text-white text-xs font-medium mt-2"
              >
                <span>Create Documents</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-[#4F46E5]"
                    />
                  </th>
                  <th className="py-2.5 px-4 font-medium">Document Title</th>
                  <th className="py-2.5 px-3 font-medium">Document Type</th>
                  <th className="py-2.5 px-3 font-medium">Version</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Engine</th>
                  <th className="py-2.5 px-4 font-medium text-right">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="rounded text-[#4F46E5]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="font-semibold text-[#18181B] hover:text-[#4F46E5] block"
                      >
                        {doc.title}
                      </Link>
                      <span className="text-[10px] text-[#64748B]">
                        Created {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-[#475569]">
                        {doc.documentType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-bold">
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
                    <td className="py-3 px-3">
                      <span className="text-[10px] text-[#64748B]">
                        {doc.pdfEngineUsed === "libreoffice" ? "LibreOffice" : "PDFKit Vector"}
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
                            download
                            className="px-2 py-1 rounded bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] text-[10px] font-medium inline-flex items-center gap-1"
                            title="Download PDF"
                          >
                            <span>PDF</span>
                          </a>
                        )}
                        <Link
                          href={`/documents/${doc.id}`}
                          className="p-1 text-[#64748B] hover:text-[#18181B]"
                          title="Open Review Studio"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
