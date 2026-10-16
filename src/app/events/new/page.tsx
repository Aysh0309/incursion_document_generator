"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  Sparkles,
  HelpCircle,
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Layers,
  FileText,
  Loader2,
  RefreshCw,
  Edit3,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  FileDown,
} from "lucide-react";
import { DocumentType, TemplateField, TemplateMetadata, ExtractionResult } from "@/types";

const SAMPLE_PROMPTS = [
  {
    label: "Comprehensive Workshop Details",
    text: "We are organizing a hands-on AI Workshop on November 14, 2026 at CS Lab 3 from 09:30 AM to 04:30 PM. Targeted for 2nd and 3rd year CSE students. Organized by GDSC. Faculty coordinator is Dr. Sunita Sharma. Department HOD is Dr. Arvind Verma. Student lead is Aarav Patel. Requested budget is INR 15,000 for student refreshment kits. Expected attendance: 85 participants.",
  },
  {
    label: "Partial Description (Triggers Missing Field Prompts)",
    text: "I want to organize a coding competition for the Computer Science department next month. Student lead is Aarav Patel. Requested budget is 5000 INR.",
  },
  {
    label: "Official Guest Speaker Keynote",
    text: "Inviting Dr. Rajesh Mehta from Microsoft Research to deliver a keynote on Quantum Computing on December 5, 2026 at Turing Auditorium from 10:00 AM to 1:00 PM. Coordinated by Dr. Sunita Sharma. Contact email: gdsc.leads@nit.ac.in.",
  },
];

function EventCreationStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("templateId");
  const eventIdParam = searchParams.get("eventId");

  // Workflow Steps:
  // 1 = Select Template
  // 2 = Complete Dynamic Questionnaire (AI Assisted or Direct Form)
  // 3 = Review & Generate Document
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Available templates & selected template
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Dynamic field values: keyed by field.name
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Natural Language AI Input
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [aiClarificationQuestions, setAiClarificationQuestions] = useState<any[]>([]);

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setTemplates(res.data);
          const initial = templateIdParam
            ? res.data.find((t: any) => t.id === templateIdParam)
            : res.data[0];
          if (initial) {
            handleSelectTemplate(initial);
          }
        }
      })
      .finally(() => setLoadingTemplates(false));
  }, [templateIdParam]);

  // When a template is selected, initialize form values
  const handleSelectTemplate = (template: TemplateMetadata) => {
    setSelectedTemplate(template);
    const initialValues: Record<string, any> = { ...formData };

    (template.fields || []).forEach((field) => {
      if (initialValues[field.name] === undefined) {
        if (field.isFixed && field.fixedValue) {
          initialValues[field.name] = field.fixedValue;
        } else if (field.name === "startDate" || field.name === "endDate") {
          initialValues[field.name] = "";
        } else if (field.type === "number" || field.type === "currency") {
          initialValues[field.name] = "";
        } else {
          initialValues[field.name] = "";
        }
      }
    });

    setFormData(initialValues);
  };

  // Field change handler
  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // AI Extraction for selected template
  const handleExtractFromDescription = async () => {
    if (!naturalLanguageInput.trim()) {
      setExtractError("Please describe your event in English before extracting.");
      return;
    }

    setExtracting(true);
    setExtractError(null);
    setGenerationError(null);

    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: naturalLanguageInput,
          templateId: selectedTemplate?.id,
          targetDocumentTypes: selectedTemplate ? [selectedTemplate.documentType] : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Extraction failed");
      }

      const result: ExtractionResult = data.data;
      const extracted = result.extractedData as any;

      // Map extracted values strictly to matching template fields
      const updatedValues = { ...formData };
      if (selectedTemplate?.fields) {
        for (const field of selectedTemplate.fields) {
          const extractedVal = extracted[field.name] ?? extracted[field.id];
          if (extractedVal !== null && extractedVal !== undefined && extractedVal !== "") {
            updatedValues[field.name] = extractedVal;
          }
        }
      }

      setFormData(updatedValues);
      setAiClarificationQuestions(result.missingFieldQuestions || []);
    } catch (err: any) {
      setExtractError(err.message || "Failed to extract parameters from text");
    } finally {
      setExtracting(false);
    }
  };

  // Calculate completion for required fields
  const fields = selectedTemplate?.fields || [];
  const requiredFields = fields.filter((f) => f.required && !f.isFixed && !f.isSystem);
  const completedRequiredCount = requiredFields.filter((f) => {
    const val = formData[f.name];
    return val !== undefined && val !== null && String(val).trim() !== "";
  }).length;
  const totalRequiredCount = requiredFields.length;
  const isFormComplete = totalRequiredCount === 0 || completedRequiredCount === totalRequiredCount;

  // Final generation submission
  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    if (!isFormComplete) {
      const missingList = requiredFields
        .filter((f) => {
          const val = formData[f.name];
          return val === undefined || val === null || String(val).trim() === "";
        })
        .map((f) => f.label || f.name);

      setGenerationError(
        `Cannot generate document. Please complete all mandatory fields: ${missingList.join(", ")}`
      );
      return;
    }

    setGenerating(true);
    setGenerationError(null);

    try {
      // 1. Create or update event record
      let eventId = activeEventId;
      const eventName = formData.eventName || formData.event_name || formData.title || "Official Event";

      const eventRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName,
          rawInputText: naturalLanguageInput || `Event: ${eventName}`,
          structuredData: formData,
        }),
      });

      const eventJson = await eventRes.json();
      if (!eventJson.success) {
        throw new Error(eventJson.error?.message || "Failed to persist event record");
      }
      eventId = eventJson.data.id;
      setActiveEventId(eventId);

      // 2. Generate Document from selected template
      const genRes = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          templateId: selectedTemplate.id,
          fieldValues: formData,
        }),
      });

      const genData = await genRes.json();
      if (!genRes.ok || !genData.success) {
        throw new Error(
          genData.error?.message || "Generation failed. Please verify required fields."
        );
      }

      // 3. Redirect immediately to the document review studio
      router.push(`/documents/${genData.data.id}`);
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Step Indicator Header */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#18181B] tracking-tight">
              Smart Document Generator
            </h1>
            <p className="text-xs text-[#64748B]">
              Select a verified template, complete all dynamic required fields, and generate from the original layout.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              onClick={() => setCurrentStep(1)}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                currentStep === 1
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#EEF2FF]"
              }`}
            >
              1. Select Template
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span
              onClick={() => {
                if (selectedTemplate) setCurrentStep(2);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                currentStep === 2
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#EEF2FF]"
              }`}
            >
              2. Complete Questionnaire & Generate
            </span>
          </div>
        </div>

        {/* STEP 1: TEMPLATE SELECTION */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Step 1: Choose Your Document Template
              </h2>
              <span className="text-[11px] text-[#64748B]">
                {templates.length} Active Templates Available
              </span>
            </div>

            {loadingTemplates ? (
              <div className="p-12 text-center text-xs text-[#64748B]">Loading template catalog...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  const reqCount = tmpl.fields?.filter((f) => f.required && !f.isFixed).length || tmpl.requiredFields?.length || 0;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-[#4F46E5] bg-[#EEF2FF]/40 shadow-xs ring-2 ring-[#4F46E5]"
                          : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                            {tmpl.documentType.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#4F46E5]">
                            {tmpl.format?.toUpperCase() || "DOCX"}
                          </span>
                        </div>

                        <h3 className="font-bold text-xs text-[#18181B] mb-1">{tmpl.name}</h3>
                        <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                        <span>{reqCount} Required Fields</span>
                        <span className={`font-semibold text-xs ${isSelected ? "text-[#4F46E5]" : "text-[#94A3B8]"}`}>
                          {isSelected ? "Selected ✓" : "Select"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (selectedTemplate) setCurrentStep(2);
                }}
                disabled={!selectedTemplate}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <span>Proceed to Questionnaire</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DYNAMIC QUESTIONNAIRE & ZERO-ASSUMPTION VALIDATION */}
        {currentStep === 2 && selectedTemplate && (
          <div className="space-y-6">
            {/* Template Banner with Live Progress Bar */}
            <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64748B]">Selected Template:</span>
                    <span className="font-bold text-sm text-[#18181B]">{selectedTemplate.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                      {selectedTemplate.format?.toUpperCase() || "DOCX"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{selectedTemplate.description}</p>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#4F46E5] hover:underline font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Template</span>
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="pt-2 border-t border-[#F1F5F9]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#18181B]">
                    Required fields completed: {completedRequiredCount} / {totalRequiredCount}
                  </span>
                  <span
                    className={`font-bold text-[11px] ${
                      isFormComplete ? "text-[#059669]" : "text-[#D97706]"
                    }`}
                  >
                    {isFormComplete ? "All Mandatory Fields Complete ✓" : "Action Required"}
                  </span>
                </div>

                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFormComplete ? "bg-[#059669]" : "bg-[#4F46E5]"
                    }`}
                    style={{
                      width: `${totalRequiredCount === 0 ? 100 : (completedRequiredCount / totalRequiredCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* AI Natural Language Assistance Box */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#FCFDFE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#4F46E5]" />
                  <h3 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                    AI Auto-Fill (Optional Natural Language Prompt)
                  </h3>
                </div>
                <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Zero Fabrication Policy</span>
                </span>
              </div>

              <div className="p-5 space-y-3.5">
                <textarea
                  rows={3}
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="Describe your event details in natural English (e.g., We are organizing a coding contest on Nov 20, 2026 at CS Lab 2...)"
                  className="w-full p-3 rounded-md border border-[#E2E8F0] text-xs font-sans text-[#18181B] focus:ring-1 focus:ring-[#4F46E5]"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((sample, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNaturalLanguageInput(sample.text)}
                        className="text-[10px] px-2 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EEF2FF] text-[#475569]"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExtractFromDescription}
                    disabled={extracting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {extracting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>{extracting ? "Extracting..." : "Auto-Fill Fields"}</span>
                  </button>
                </div>

                {extractError && (
                  <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48]">
                    {extractError}
                  </div>
                )}
              </div>
            </div>

            {/* Clarification Box for Ambiguous or Missing Fields */}
            {aiClarificationQuestions.length > 0 && (
              <div className="p-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] space-y-3">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#92400E] uppercase tracking-wider">
                      Targeted Clarifications Required
                    </h4>
                    <p className="text-[11px] text-[#B45309]">
                      The AI did not invent missing facts. Please verify and provide the following required details below.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {aiClarificationQuestions.map((q, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-white border border-[#FCD34D] text-xs space-y-1">
                      <span className="font-semibold text-[#18181B] block">{q.question}</span>
                      <input
                        type={q.suggestedInputType === "number" ? "number" : q.suggestedInputType === "date" ? "date" : "text"}
                        value={formData[q.fieldKey] || ""}
                        placeholder="Provide confirmed value..."
                        onChange={(e) => handleFieldChange(q.fieldKey, e.target.value)}
                        className="w-full p-1.5 rounded border border-[#E2E8F0] text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DYNAMIC FORM GENERATED FROM SELECTED TEMPLATE */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FCFDFE] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                    Dynamic Template Questionnaire ({fields.length} Fields)
                  </h3>
                  <p className="text-[10px] text-[#64748B]">
                    Strictly generated from the selected template's persisted schema.
                  </p>
                </div>

                <span className="text-[10px] text-[#64748B]">
                  * Denotes mandatory field
                </span>
              </div>

              <div className="p-6 space-y-5">
                {fields.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No fields configured for this template.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.map((field) => {
                      const isRequired = field.required && !field.isFixed;
                      const value = formData[field.name] ?? "";
                      const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
                      const isMissing = isRequired && !hasValue;

                      return (
                        <div
                          key={field.id}
                          className={`p-3 rounded-md border text-xs space-y-1.5 ${
                            isMissing
                              ? "border-[#FECDD3] bg-[#FEF2F2]/30"
                              : "border-[#E2E8F0] bg-white"
                          } ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-[#18181B] flex items-center gap-1">
                              <span>{field.label || field.name}</span>
                              {isRequired && <span className="text-[#E11D48]">*</span>}
                            </label>

                            <div className="flex items-center gap-1.5">
                              {field.isFixed && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                                  Fixed
                                </span>
                              )}
                              <span className="text-[9px] uppercase font-mono text-[#94A3B8]">
                                {field.type}
                              </span>
                            </div>
                          </div>

                          {/* Appropriate input control by data type */}
                          {field.isFixed ? (
                            <input
                              type="text"
                              disabled
                              value={field.fixedValue || ""}
                              className="w-full p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                            />
                          ) : field.type === "textarea" ? (
                            <textarea
                              rows={3}
                              value={value}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          ) : field.type === "date" ? (
                            <input
                              type="date"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          ) : field.type === "time" ? (
                            <input
                              type="text"
                              placeholder="e.g. 09:30 AM"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          ) : field.type === "number" || field.type === "currency" ? (
                            <input
                              type="number"
                              placeholder="0"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          ) : field.type === "email" ? (
                            <input
                              type="email"
                              placeholder="name@example.edu"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                            />
                          )}

                          {isMissing && (
                            <span className="text-[10px] text-[#E11D48] block">
                              Required for generation
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Validation and Generation Error Banner */}
                {generationError && (
                  <div className="p-3.5 rounded-md bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48] flex items-start gap-2 shadow-2xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}

                {/* Final Action Bar with Deterministic Block */}
                <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-[#64748B]">
                    {!isFormComplete ? (
                      <span className="text-[#D97706] font-semibold">
                        Generation blocked until all {totalRequiredCount} required fields are satisfied ({totalRequiredCount - completedRequiredCount} remaining).
                      </span>
                    ) : (
                      <span className="text-[#059669] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                        <span>All {totalRequiredCount} required fields validated and ready.</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!isFormComplete || generating}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold text-xs transition-all shadow-xs ${
                      isFormComplete && !generating
                        ? "bg-[#4F46E5] hover:bg-[#4338CA] text-white cursor-pointer"
                        : "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                    }`}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Fills Original Template...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="h-4 w-4" />
                        <span>Generate Branded Document</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function EventCreationStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#64748B]">Loading studio...</div>}>
      <EventCreationStudioContent />
    </Suspense>
  );
}
