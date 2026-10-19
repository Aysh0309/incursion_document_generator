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
  Edit3,
  Trash2,
  Eye,
  Sliders,
  Image as ImageIcon,
  Save,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  PenTool,
} from "lucide-react";
import { DocumentType, TemplateField, TemplateMetadata, FieldDataType, TemplateSignatureField, AuthorityRecord } from "@/types";

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

  // Template Review & Field Correction Studio
  const [reviewingTemplate, setReviewingTemplate] = useState<TemplateMetadata | null>(null);
  const [isNewDraft, setIsNewDraft] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [editableFields, setEditableFields] = useState<TemplateField[]>([]);
  const [editableSigFields, setEditableSigFields] = useState<TemplateSignatureField[]>([]);
  const [signingWorkflow, setSigningWorkflow] = useState<"SEQUENTIAL" | "PARALLEL">("SEQUENTIAL");
  const [studioTab, setStudioTab] = useState<"fields" | "signatures">("fields");
  const [authoritiesList, setAuthoritiesList] = useState<AuthorityRecord[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Template Deletion
  const [templateToDelete, setTemplateToDelete] = useState<TemplateMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetch("/api/authorities")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setAuthoritiesList(d.data);
      })
      .catch(() => {});
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
      setUploadError("Please provide both a template name and a valid .docx or .pdf file.");
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
      formData.append("analyzeOnly", "true");

      const res = await fetch("/api/templates?analyzeOnly=true", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Upload failed");
      }

      const analyzed: TemplateMetadata = data.data;
      setUploadSuccess(`Template "${templateName}" analyzed! Review candidate fields below and click "Save & Publish Schema" to save.`);
      setShowUploadModal(false);
      setTemplateName("");
      setDescription("");
      setFile(null);

      // Open review studio in draft mode WITHOUT saving to library yet
      openReviewStudio(analyzed, true);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload template");
    } finally {
      setUploading(false);
    }
  };

  const openReviewStudio = (tmpl: TemplateMetadata, isDraft: boolean = false) => {
    setIsNewDraft(isDraft);
    setReviewingTemplate(tmpl);
    setEditableFields(tmpl.fields || []);
    setEditableSigFields(tmpl.signatureFields || []);
    setSigningWorkflow(tmpl.signingWorkflow || "SEQUENTIAL");
    setSelectedFieldId(tmpl.fields?.[0]?.id || null);
    setStudioTab("fields");
    setSaveSuccess(null);
  };

  const handleAddSigField = () => {
    const order = editableSigFields.length + 1;
    const isLeft = order % 2 === 1;
    const newSig: TemplateSignatureField = {
      id: "sig_" + Math.random().toString(36).substring(2, 8),
      name: `signature_${order}`,
      printedName: "",
      designation: `Signature of Authority ${order}`,
      assignedRole: "FACULTY_COORDINATOR",
      pageNumber: 1,
      position: { x: isLeft ? 72 : 380, y: 120, width: 140, height: 45 },
      required: true,
      signingOrder: order,
      actionType: "SIGNATURE_ONLY",
    };
    setEditableSigFields([...editableSigFields, newSig]);
  };

  const handleUpdateSigField = (id: string, updates: Partial<TemplateSignatureField>) => {
    setEditableSigFields(
      editableSigFields.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveSigField = (id: string) => {
    setEditableSigFields(editableSigFields.filter((s) => s.id !== id));
  };

  const handleDiscardDraft = async () => {
    if (!reviewingTemplate) return;
    try {
      setDiscarding(true);
      if (reviewingTemplate.fileUrl?.startsWith("/templates/custom_")) {
        await fetch(`/api/templates?fileUrl=${encodeURIComponent(reviewingTemplate.fileUrl)}`, {
          method: "DELETE",
        });
      }
    } catch (e) {
      console.warn("Discard cleanup error:", e);
    } finally {
      setDiscarding(false);
      setReviewingTemplate(null);
      setIsNewDraft(false);
      setUploadSuccess("Draft upload discarded. Template was NOT saved to the library.");
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

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setDeleting(true);
      // Optimistically remove template from view immediately
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (reviewingTemplate?.id === templateId) {
        setReviewingTemplate(null);
      }
      setTemplateToDelete(null);

      const res = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to delete template");
      }
      await fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to delete template");
      await fetchTemplates();
    } finally {
      setDeleting(false);
    }
  };

  // Field manipulation helpers
  const handleAddField = () => {
    const newField: TemplateField = {
      id: "fld_" + Math.random().toString(36).substring(2, 8),
      name: `field_${editableFields.length + 1}`,
      label: `New Field ${editableFields.length + 1}`,
      type: "text",
      required: true,
      confidence: 1.0,
      adminConfirmed: true,
      pageNumber: 1,
      boundingBox: reviewingTemplate?.format === "pdf" ? { x: 54, y: 700 - editableFields.length * 20, width: 200, height: 16 } : undefined,
    };
    setEditableFields([...editableFields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateField = (id: string, updates: Partial<TemplateField>) => {
    setEditableFields(
      editableFields.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        if (updates.label !== undefined && (!f.name || f.name.startsWith("field_"))) {
          const autoKey = updates.label
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
          if (autoKey) {
            updated.name = autoKey;
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveField = (id: string) => {
    setEditableFields(editableFields.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(editableFields.find((f) => f.id !== id)?.id || null);
    }
  };

  const handleSaveFieldConfiguration = async () => {
    if (!reviewingTemplate) return;
    setSavingConfig(true);
    setSaveSuccess(null);

    try {
      let savedData: TemplateMetadata;

      if (isNewDraft) {
        // Save & Publish newly uploaded template
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...reviewingTemplate,
            fields: editableFields,
            signatureFields: editableSigFields,
            signingWorkflow,
            status: "PUBLISHED",
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || "Failed to publish template");
        }

        savedData = data.data;
        setIsNewDraft(false);
        setSaveSuccess(`Template "${savedData.name}" verified, saved, and published to library!`);
      } else {
        // Update existing published template
        const res = await fetch(`/api/templates/${reviewingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: editableFields,
            signatureFields: editableSigFields,
            signingWorkflow,
            status: "PUBLISHED",
            version: reviewingTemplate.version + 1,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error?.message || "Failed to save configuration");
        }

        savedData = data.data;
        setSaveSuccess(`Template configuration saved! Version updated to v${savedData.version}.`);
      }

      setReviewingTemplate(savedData);
      await fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-[#E5DFD5] bg-white shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#1C2622] tracking-tight">
              Institutional Template & Placeholder Engine
            </h1>
            <p className="text-xs text-[#7A8A81]">
              Upload standard .docx or .pdf files, analyze variable blanks and placeholders, review layout bounding boxes, and publish verified schemas.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Template (PDF / DOCX)</span>
          </button>
        </div>

        {uploadSuccess && (
          <div className="p-3.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#059669] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* REVIEW AND MANUAL FIELD CORRECTION STUDIO (MODAL / OVERLAY) */}
        {reviewingTemplate && (
          <div className="rounded-lg border border-[#BCD8CB] bg-white shadow-lg p-5 space-y-5 ring-1 ring-[#1F6954]/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E5DFD5] pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#1C2622]">
                    Field Configuration Studio: {reviewingTemplate.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#E7F3ED] text-[#1F6954] border border-[#BCD8CB]">
                    {reviewingTemplate.format?.toUpperCase() || "DOCX"}
                  </span>
                  {isNewDraft ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                      Unpublished Draft
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#55645C]">
                      v{reviewingTemplate.version}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7A8A81] mt-0.5">
                  {isNewDraft
                    ? "Review candidate fields and configure placeholders. Document will ONLY be saved to library upon clicking Save & Publish Schema."
                    : "Review and correct candidate fields, adjust coordinates, and ensure zero hallucination before publishing."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isNewDraft ? (
                  <button
                    onClick={handleDiscardDraft}
                    disabled={discarding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#FECDD3] bg-white hover:bg-[#FEF2F2] text-[#E11D48] text-xs font-semibold transition-colors disabled:opacity-50"
                    title="Discard upload without saving"
                  >
                    {discarding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Discard Draft</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setTemplateToDelete(reviewingTemplate)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#FECDD3] bg-white hover:bg-[#FEF2F2] text-[#E11D48] text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Template</span>
                  </button>
                )}

                <button
                  onClick={handleSaveFieldConfiguration}
                  disabled={savingConfig}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {savingConfig ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Save & Publish Schema</span>
                </button>

                <button
                  onClick={() => {
                    if (isNewDraft) {
                      if (window.confirm("Closing without publishing will discard this upload. Are you sure?")) {
                        handleDiscardDraft();
                      }
                    } else {
                      setReviewingTemplate(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-md border border-[#E5DFD5] text-xs text-[#7A8A81] hover:bg-[#FAF8F4]"
                >
                  Close Studio
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#059669] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* Warnings or uncertain areas */}
            {reviewingTemplate.analysisWarnings && reviewingTemplate.analysisWarnings.length > 0 && (
              <div className="p-3.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4 text-[#D97706]" />
                  <span>Analysis Warnings & Uncertain Areas:</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                  {reviewingTemplate.analysisWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visual Assets & Logos Inventory */}
            {reviewingTemplate.detectedAssets && reviewingTemplate.detectedAssets.length > 0 && (
              <div className="p-3.5 rounded-md bg-[#FAF8F4] border border-[#E5DFD5] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1C2622]">
                  <ImageIcon className="h-4 w-4 text-[#1F6954]" />
                  <span>Preserved Document Assets & Logos ({reviewingTemplate.detectedAssets.length}):</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {reviewingTemplate.detectedAssets.map((asset, i) => (
                    <div
                      key={i}
                      className="p-2 rounded border border-[#E5DFD5] bg-white flex items-center gap-2 text-[11px] shadow-2xs"
                    >
                      {asset.dataUrl ? (
                        <img src={asset.dataUrl} alt={asset.name || "logo"} className="h-6 w-6 object-contain" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-[#94A3B8]" />
                      )}
                      <div>
                        <span className="font-semibold block text-[#1C2622]">{asset.name || `Asset #${i + 1}`}</span>
                        <span className="text-[10px] text-[#7A8A81]">{asset.type} • Preserved in original template</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Studio Split Layout: Left Preview, Right Fields Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Document Preview Canvas (5 Cols) */}
              <div className="lg:col-span-5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F4] p-4 flex flex-col h-[520px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#1C2622]">Original Document Layout</span>
                  <a
                    href={reviewingTemplate.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#1F6954] hover:underline flex items-center gap-1"
                  >
                    <span>Open Template File</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex-1 bg-white rounded border border-[#D8D2C7] p-3 overflow-auto relative">
                  {reviewingTemplate.format === "pdf" ? (
                    <div className="relative w-full h-full min-h-[440px]">
                      <iframe
                        src={`${reviewingTemplate.fileUrl}#toolbar=0&navpanes=0`}
                        title="PDF Template Preview"
                        className="w-full h-full rounded border-0"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 text-xs text-[#334155] font-sans">
                      <div className="p-2 rounded bg-[#E7F3ED] border border-[#BCD8CB] text-[11px] text-[#175342]">
                        DOCX Template with OpenXML formatting preserved. Variable tags highlighted below.
                      </div>
                      <div className="space-y-2 border-l-2 border-[#1F6954] pl-3">
                        {editableFields.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => setSelectedFieldId(f.id)}
                            className={`p-2 rounded cursor-pointer transition-colors text-xs ${
                              selectedFieldId === f.id
                                ? "bg-[#E7F3ED] border border-[#1F6954] font-semibold text-[#1E1B4B]"
                                : "hover:bg-[#F1F5F9] border border-transparent"
                            }`}
                          >
                            <span className="font-mono text-[#1F6954] mr-2">&#123;&#123;{f.name}&#125;&#125;</span>
                            <span className="text-[#7A8A81]">({f.label})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Fields Table & Property Editor (7 Cols) */}
              <div className="lg:col-span-7 rounded-lg border border-[#E5DFD5] bg-white overflow-hidden shadow-2xs">
                {/* Tabs Header */}
                <div className="px-4 py-2.5 bg-[#FAF8F4] border-b border-[#E5DFD5] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setStudioTab("fields")}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        studioTab === "fields"
                          ? "bg-white text-[#1F6954] shadow-2xs"
                          : "text-[#7A8A81] hover:text-[#1C2622]"
                      }`}
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Data Fields ({editableFields.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioTab("signatures")}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        studioTab === "signatures"
                          ? "bg-white text-[#1F6954] shadow-2xs"
                          : "text-[#7A8A81] hover:text-[#1C2622]"
                      }`}
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      <span>Signature Blocks ({editableSigFields.length})</span>
                    </button>
                  </div>

                  {studioTab === "fields" ? (
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#E7F3ED] text-[#1F6954] hover:bg-[#E0E7FF] text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Field</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={signingWorkflow}
                        onChange={(e) => setSigningWorkflow(e.target.value as any)}
                        className="px-2 py-1 text-xs rounded border border-[#D8D2C7] bg-white text-[#55645C] font-medium"
                        title="Workflow routing mode"
                      >
                        <option value="SEQUENTIAL">Sequential Order</option>
                        <option value="PARALLEL">Parallel Delivery</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddSigField}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#E7F3ED] text-[#1F6954] hover:bg-[#E0E7FF] text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Signature</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="max-h-[460px] overflow-y-auto divide-y divide-[#E5DFD5]">
                  {studioTab === "fields" ? (
                    editableFields.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#7A8A81]">
                        No fields configured yet. Click "Add Field" above to add required fields.
                      </div>
                    ) : (
                    editableFields.map((field) => {
                      const isSelected = selectedFieldId === field.id;
                      return (
                        <div
                          key={field.id}
                          className={`p-3.5 space-y-2.5 transition-colors ${
                            isSelected ? "bg-[#FAF8F4] border-l-4 border-l-[#1F6954]" : "hover:bg-[#FAFAFA]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-mono text-xs font-bold text-[#1F6954]">
                                {field.name}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  field.confidence >= 0.9
                                    ? "bg-[#ECFDF5] text-[#059669]"
                                    : "bg-[#FEF3C7] text-[#D97706]"
                                }`}
                              >
                                {Math.round(field.confidence * 100)}% Match
                              </span>
                              {field.isFixed && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#55645C]">
                                  Fixed Institutional
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleRemoveField(field.id)}
                              className="text-[#94A3B8] hover:text-[#E11D48] p-1"
                              title="Delete Field"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-semibold text-[#7A8A81] block mb-0.5">
                                User-Facing Field Label *
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#E5DFD5] text-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-[#7A8A81] block mb-0.5">
                                Stable Key *
                              </label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#E5DFD5] font-mono text-[11px]"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-[#7A8A81] block mb-0.5">
                                Data Type *
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FieldDataType })}
                                className="w-full p-1.5 rounded border border-[#E5DFD5] text-xs"
                              >
                                <option value="text">Text (Single Line)</option>
                                <option value="textarea">Text Area (Multi-line)</option>
                                <option value="date">Date (YYYY-MM-DD)</option>
                                <option value="time">Time</option>
                                <option value="number">Number (Integer)</option>
                                <option value="currency">Currency / Budget</option>
                                <option value="email">Email Address</option>
                                <option value="phone">Phone Number</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#1C2622] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                                  className="rounded text-[#1F6954] focus:ring-[#1F6954]"
                                />
                                <span>Required Field</span>
                              </label>

                              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[#1C2622] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.isFixed || false}
                                  onChange={(e) => handleUpdateField(field.id, { isFixed: e.target.checked })}
                                  className="rounded text-[#1F6954] focus:ring-[#1F6954]"
                                />
                                <span>Fixed Administrative Value</span>
                              </label>
                            </div>

                            {field.isFixed && (
                              <div className="flex items-center gap-1 flex-1 max-w-xs">
                                <span className="text-[10px] text-[#7A8A81]">Value:</span>
                                <input
                                  type="text"
                                  placeholder="Fixed value..."
                                  value={field.fixedValue || ""}
                                  onChange={(e) => handleUpdateField(field.id, { fixedValue: e.target.value })}
                                  className="w-full p-1 rounded border border-[#E5DFD5] text-xs"
                                />
                              </div>
                            )}

                            {reviewingTemplate.format === "pdf" && field.boundingBox && (
                              <div className="flex items-center gap-2 text-[10px] text-[#7A8A81]">
                                <span>Page {field.pageNumber || 1}:</span>
                                <span>X: {field.boundingBox.x}</span>
                                <span>Y: {field.boundingBox.y}</span>
                                <span>W: {field.boundingBox.width}</span>
                                <span>H: {field.boundingBox.height}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                    /* Signature Blocks Tab View */
                    editableSigFields.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#7A8A81] space-y-2">
                        <PenTool className="h-6 w-6 text-[#94A3B8] mx-auto opacity-50" />
                        <p className="font-semibold text-[#1C2622]">No Signature Blocks Configured</p>
                        <p>Click "Add Signature" above to place required authority sign-off areas.</p>
                      </div>
                    ) : (
                      editableSigFields.map((sig) => (
                        <div key={sig.id} className="p-3.5 space-y-3 hover:bg-[#FAFAFA] transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 rounded-full bg-[#E7F3ED] text-[#1F6954] font-bold text-[10px] flex items-center justify-center">
                                #{sig.signingOrder}
                              </span>
                              <span className="font-bold text-xs text-[#1C2622]">
                                {sig.designation}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#55645C] font-mono">
                                Page {sig.pageNumber}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveSigField(sig.id)}
                              className="text-[#7A8A81] hover:text-[#E11D48] p-1 rounded"
                              title="Delete signature block"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                            <div className="sm:col-span-5">
                              <label className="text-[10px] font-semibold text-[#7A8A81] block mb-0.5">
                                Designation / Role Title *
                              </label>
                              <input
                                type="text"
                                value={sig.designation}
                                onChange={(e) => handleUpdateSigField(sig.id, { designation: e.target.value })}
                                placeholder="e.g. Signature of Student Head"
                                className="w-full p-1.5 rounded border border-[#E5DFD5] text-xs"
                              />
                            </div>

                            <div className="sm:col-span-4">
                              <label className="text-[10px] font-semibold text-[#7A8A81] block mb-0.5">
                                Default Directory Authority
                              </label>
                              <select
                                value={sig.defaultAuthorityId || ""}
                                onChange={(e) => {
                                  const auth = authoritiesList.find((a) => a.id === e.target.value);
                                  handleUpdateSigField(sig.id, {
                                    defaultAuthorityId: e.target.value,
                                    assignedRole: auth?.role || sig.assignedRole,
                                    printedName: auth?.name || sig.printedName,
                                  });
                                }}
                                className="w-full p-1.5 rounded border border-[#E5DFD5] text-xs font-medium"
                              >
                                <option value="">-- Unassigned (Role-based) --</option>
                                {authoritiesList.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name} ({a.designation})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[10px] font-semibold text-[#7A8A81] block mb-0.5">
                                Action Type
                              </label>
                              <select
                                value={sig.actionType || "SIGNATURE_ONLY"}
                                onChange={(e) => handleUpdateSigField(sig.id, { actionType: e.target.value as any })}
                                className="w-full p-1.5 rounded border border-[#E5DFD5] text-xs"
                              >
                                <option value="SIGNATURE_ONLY">Signature Only</option>
                                <option value="APPROVAL_AND_SIGNATURE">Approval + Signature</option>
                              </select>
                            </div>
                          </div>

                          {/* Coordinates and Dimensions */}
                          <div className="flex flex-wrap items-center gap-3 p-2 bg-[#FAF8F4] rounded border border-[#E5DFD5] text-[11px] text-[#55645C]">
                            <span className="font-semibold text-[#1C2622]">PDF Coordinates:</span>
                            <div className="flex items-center gap-1">
                              <span>Page:</span>
                              <input
                                type="number"
                                min={1}
                                value={sig.pageNumber || 1}
                                onChange={(e) => handleUpdateSigField(sig.id, { pageNumber: parseInt(e.target.value) || 1 })}
                                className="w-12 p-0.5 text-center rounded border border-[#D8D2C7] bg-white text-xs font-bold"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span>X:</span>
                              <input
                                type="number"
                                value={sig.position?.x ?? 72}
                                onChange={(e) =>
                                  handleUpdateSigField(sig.id, {
                                    position: { ...sig.position, x: parseInt(e.target.value) || 0 },
                                  })
                                }
                                className="w-14 p-0.5 text-center rounded border border-[#D8D2C7] bg-white text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Y (Bottom-up):</span>
                              <input
                                type="number"
                                value={sig.position?.y ?? 120}
                                onChange={(e) =>
                                  handleUpdateSigField(sig.id, {
                                    position: { ...sig.position, y: parseInt(e.target.value) || 0 },
                                  })
                                }
                                className="w-14 p-0.5 text-center rounded border border-[#D8D2C7] bg-white text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Width:</span>
                              <input
                                type="number"
                                value={sig.position?.width ?? 140}
                                onChange={(e) =>
                                  handleUpdateSigField(sig.id, {
                                    position: { ...sig.position, width: parseInt(e.target.value) || 140 },
                                  })
                                }
                                className="w-14 p-0.5 text-center rounded border border-[#D8D2C7] bg-white text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span>Height:</span>
                              <input
                                type="number"
                                value={sig.position?.height ?? 45}
                                onChange={(e) =>
                                  handleUpdateSigField(sig.id, {
                                    position: { ...sig.position, height: parseInt(e.target.value) || 45 },
                                  })
                                }
                                className="w-14 p-0.5 text-center rounded border border-[#D8D2C7] bg-white text-xs"
                              />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sig.required}
                                  onChange={(e) => handleUpdateSigField(sig.id, { required: e.target.checked })}
                                  className="rounded text-[#1F6954]"
                                />
                                <span className="font-semibold text-[#1C2622]">Mandatory</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Grid Listing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full p-8 text-center text-xs text-[#7A8A81]">Loading templates...</div>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-lg border border-[#E5DFD5] bg-white shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#E7F3ED] text-[#1F6954] border border-[#BCD8CB]">
                        {tmpl.documentType.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FAF8F4] text-[#55645C] border border-[#E5DFD5]">
                        {tmpl.format?.toUpperCase() || "DOCX"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(tmpl)}
                        className="text-xs text-[#7A8A81] hover:text-[#1C2622] flex items-center gap-1"
                        title={tmpl.isActive ? "Deactivate" : "Activate"}
                      >
                        {tmpl.isActive ? (
                          <ToggleRight className="h-5 w-5 text-[#059669]" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-[#94A3B8]" />
                        )}
                      </button>

                      <button
                        onClick={() => setTemplateToDelete(tmpl)}
                        className="p-1 rounded text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-[#1C2622] mb-1">{tmpl.name}</h3>
                  <p className="text-xs text-[#7A8A81] leading-relaxed">{tmpl.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E5DFD5]">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-[#7A8A81] tracking-wider block mb-1">
                      Configured Fields ({tmpl.fields?.length || tmpl.placeholdersDetected?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(tmpl.fields || tmpl.placeholdersDetected || []).slice(0, 6).map((item: any, idx: number) => {
                        const name = typeof item === "string" ? item : item.name;
                        return (
                          <span
                            key={idx}
                            className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#FAF8F4] border border-[#E5DFD5] text-[#55645C]"
                          >
                            &#123;{name}&#125;
                          </span>
                        );
                      })}
                      {(tmpl.fields?.length || 0) > 6 && (
                        <span className="text-[9px] text-[#94A3B8] self-center">
                          +{(tmpl.fields?.length || 0) - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#7A8A81] pt-1">
                    <span>v{tmpl.version} {tmpl.isSystemDefault ? "• System Core" : "• Custom"}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openReviewStudio(tmpl)}
                        className="text-[#1F6954] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Edit3 className="h-3 w-3" />
                        <span>Review Fields</span>
                      </button>

                      {tmpl.fileUrl && (
                        <a
                          href={tmpl.fileUrl}
                          download
                          className="text-[#7A8A81] hover:text-[#1C2622] flex items-center gap-1"
                          title="Download original template file"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      )}

                      <button
                        onClick={() => setTemplateToDelete(tmpl)}
                        className="text-[#94A3B8] hover:text-[#EF4444] flex items-center gap-1 font-medium ml-1 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Template Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-[#E5DFD5] shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#1F6954]" />
                  <h3 className="font-bold text-sm text-[#1C2622]">Upload Document Template</h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-xs text-[#7A8A81] hover:text-[#1C2622]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-[#1C2622] block mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Dean Sanction Letterhead"
                    className="w-full p-2 rounded border border-[#E5DFD5]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1C2622] block mb-1">Document Category *</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    className="w-full p-2 rounded border border-[#E5DFD5]"
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
                  <label className="font-semibold text-[#1C2622] block mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Standard format for room requisitions"
                    className="w-full p-2 rounded border border-[#E5DFD5]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1C2622] block mb-1">
                    Template File (*.docx or *.pdf) *
                  </label>
                  <input
                    type="file"
                    accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full p-2 rounded border border-[#E5DFD5] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#E7F3ED] file:text-[#1F6954]"
                  />
                  <span className="text-[10px] text-[#7A8A81] mt-1 block">
                    Upload DOCX or PDF with placeholders, labeled blanks, form fields, or logos.
                  </span>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48]">
                    {uploadError}
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5DFD5] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3 py-1.5 rounded border border-[#E5DFD5] text-xs text-[#7A8A81]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#1F6954] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{uploading ? "Analyzing Structure & Uploading..." : "Upload & Analyze"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {templateToDelete && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg border border-[#E5DFD5] shadow-xl max-w-sm w-full p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-[#FEF2F2] text-[#EF4444] shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C2622]">Delete Template?</h3>
                  <p className="text-xs text-[#7A8A81] mt-1 leading-relaxed">
                    Are you sure you want to permanently delete <strong className="text-[#1C2622]">{templateToDelete.name}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setTemplateToDelete(null)}
                  className="px-3 py-1.5 rounded-md border border-[#E5DFD5] text-xs font-medium text-[#55645C] hover:bg-[#FAF8F4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteTemplate(templateToDelete.id)}
                  className="px-3.5 py-1.5 rounded-md bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Yes, Delete Template</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
