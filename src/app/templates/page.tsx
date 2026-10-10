"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileStack,
  Upload,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Download,
} from "lucide-react";
import { DocumentType, TemplateMetadata } from "@/types";

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("EVENT_PROPOSAL");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !templateName) {
      setUploadError("Please provide both a template name and a .docx file.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", templateName);
      formData.append("documentType", documentType);
      formData.append("description", description);

      const res = await fetch("/api/templates", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Upload failed");
      }

      setUploadSuccess(`Template "${templateName}" successfully parsed! Detected tags: ${data.data.placeholdersDetected.join(", ")}`);
      setShowUploadModal(false);
      setTemplateName("");
      setDescription("");
      setFile(null);
      await fetchTemplates();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload template");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (template: TemplateMetadata) => {
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTemplates();
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#18181B] tracking-tight">
              Institutional Template Engine
            </h1>
            <p className="text-xs text-[#64748B]">
              Upload standard .docx files, detect placeholders like &#123;eventName&#125;, and configure required fields without code changes.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload New DOCX Template</span>
          </button>
        </div>

        {uploadSuccess && (
          <div className="p-3.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#059669] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full p-8 text-center text-xs text-[#64748B]">Loading templates...</div>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                      {tmpl.documentType.replace(/_/g, " ")}
                    </span>

                    <button
                      onClick={() => handleToggleActive(tmpl)}
                      className="text-xs text-[#64748B] hover:text-[#18181B] flex items-center gap-1"
                      title={tmpl.isActive ? "Deactivate" : "Activate"}
                    >
                      {tmpl.isActive ? (
                        <ToggleRight className="h-5 w-5 text-[#059669]" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-[#94A3B8]" />
                      )}
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-[#18181B] mb-1">{tmpl.name}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{tmpl.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-[#64748B] tracking-wider block mb-1">
                      Detected Placeholders ({tmpl.placeholdersDetected?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.placeholdersDetected?.slice(0, 6).map((tag, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
                        >
                          &#123;{tag}&#125;
                        </span>
                      ))}
                      {(tmpl.placeholdersDetected?.length || 0) > 6 && (
                        <span className="text-[9px] text-[#94A3B8] self-center">
                          +{(tmpl.placeholdersDetected?.length || 0) - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                    <span>Version {tmpl.version} {tmpl.isSystemDefault ? "• System Core" : "• Custom"}</span>
                    {tmpl.fileUrl && (
                      <a
                        href={tmpl.fileUrl}
                        download
                        className="text-[#4F46E5] hover:underline flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Source DOCX</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Template Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#4F46E5]" />
                  <h3 className="font-bold text-sm text-[#18181B]">Upload New DOCX Template</h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs text-[#64748B] hover:text-[#18181B]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Dean Sanction Letterhead"
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Document Category *</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  >
                    <option value="EVENT_PROPOSAL">Event Proposal</option>
                    <option value="PERMISSION_LETTER">Permission Letter</option>
                    <option value="INVITATION_LETTER">Invitation Letter</option>
                    <option value="SPONSORSHIP_LETTER">Sponsorship Letter</option>
                    <option value="VOLUNTEER_NOTICE">Volunteer Notice</option>
                    <option value="POST_EVENT_REPORT">Post-Event Report</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="MEETING_MINUTES">Meeting Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Standard format for room requisitions"
                    className="w-full p-2 rounded border border-[#E2E8F0]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#18181B] block mb-1">DOCX File (*.docx) *</label>
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full p-2 rounded border border-[#E2E8F0] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#EEF2FF] file:text-[#4F46E5]"
                  />
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Use tags like &#123;eventName&#125;, &#123;venue&#125;, &#123;startDate&#125; in Word.
                  </span>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48]">
                    {uploadError}
                  </div>
                )}

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3 py-1.5 rounded border border-[#E2E8F0] text-xs text-[#64748B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#4F46E5] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{uploading ? "Parsing XML & Uploading..." : "Upload & Parse"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
