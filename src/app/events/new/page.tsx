"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  Loader2,
  Info,
} from "lucide-react";
import {
  TemplateMetadata,
  StructuredEventData,
} from "@/types";

const SAMPLE_PROMPTS = [
  {
    label: "Technical Workshop",
    text: "ACM is hosting an AI Agents Workshop on Nov 14, 2026 at CS Lab 3 from 10:00 AM to 01:00 PM for 120 students. Speaker is Dev Sharma from Google. Budget: $1,200 for catering and honorarium.",
  },
  {
    label: "Annual Hackathon",
    text: "HackNIT 2026 24-hour campus hackathon on Oct 25-26, 2026 in Main Auditorium. 300 participants expected, faculty coordinator Dr. Sharma, prize pool and meals budget $4,500.",
  },
  {
    label: "Guest Lecture",
    text: "Distinguished seminar on Quantum Computing by Prof. S. Sen on Dec 02, 2026 at Mini Audi 2, 03:00 PM - 05:00 PM, 80 students, refreshments budget $300.",
  },
];

function EventCreationStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeEventId = searchParams.get("eventId");
  const preselectedTemplateId = searchParams.get("templateId");

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null);

  // Natural Language input & Extraction state
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [aiClarificationQuestions, setAiClarificationQuestions] = useState<
    Array<{ fieldKey: string; question: string; suggestedInputType?: string }>
  >([]);

  // Dynamic Questionnaire Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // If editing an existing event
  const [existingEventName, setExistingEventName] = useState("");
  const [eventDocuments, setEventDocuments] = useState<any[]>([]);

  // 1. Fetch available templates
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setTemplates(res.data);
          if (preselectedTemplateId) {
            const found = res.data.find((t: TemplateMetadata) => t.id === preselectedTemplateId);
            if (found) {
              handleSelectTemplate(found);
            }
          }
        }
      })
      .finally(() => setLoadingTemplates(false));
  }, [preselectedTemplateId]);

  // 2. If eventId is provided, pre-populate event data
  useEffect(() => {
    if (!activeEventId) return;

    fetch("/api/events")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const match = res.data.find((e: any) => e.id === activeEventId);
          if (match) {
            setExistingEventName(match.eventName);
            if (match.rawDescription) setNaturalLanguageInput(match.rawDescription);
            if (match.structuredData) {
              setFormData((prev) => ({ ...prev, ...match.structuredData, eventName: match.eventName }));
            }
          }
        }
      });

    // Also fetch any existing documents generated for this event
    fetch("/api/documents")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const docsForEvent = res.data.filter((d: any) => d.eventId === activeEventId);
          setEventDocuments(docsForEvent);
        }
      });
  }, [activeEventId]);

  // Handle template selection
  const handleSelectTemplate = (template: TemplateMetadata) => {
    setSelectedTemplate(template);

    // Seed default fixed values from the template definition
    const seeded: Record<string, any> = { ...formData };
    template.fields?.forEach((f) => {
      if (f.isFixed && f.fixedValue !== undefined) {
        seeded[f.name] = f.fixedValue;
      }
    });

    setFormData(seeded);
    setCurrentStep(2);
  };

  // Handle individual dynamic field updates
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // AI Extraction with Zero-Hallucination requirement
  const handleExtractFromDescription = async () => {
    if (!naturalLanguageInput.trim() || !selectedTemplate) return;

    setExtracting(true);
    setExtractError(null);
    setAiClarificationQuestions([]);

    try {
      const templateFields = selectedTemplate.fields || [];
      const res = await fetch("/api/ai/extract-event-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: naturalLanguageInput,
          templateId: selectedTemplate.id,
          expectedFields: templateFields,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Extraction failed");
      }

      // Merge extracted fields into current form state
      setFormData((prev) => ({
        ...prev,
        ...data.data.extracted,
      }));

      // Store explicit clarification questions for any missing fields
      if (data.data.clarifications && data.data.clarifications.length > 0) {
        setAiClarificationQuestions(data.data.clarifications);
      }
    } catch (err: any) {
      setExtractError(err.message || "Failed to parse natural language event description.");
    } finally {
      setExtracting(false);
    }
  };

  // Calculate questionnaire completion
  const fields = selectedTemplate?.fields || [];
  const requiredFields = fields.filter((f) => f.required && !f.isFixed);
  const totalRequiredCount = requiredFields.length;

  const completedRequiredCount = requiredFields.filter((f) => {
    const val = formData[f.name];
    return val !== undefined && val !== null && String(val).trim() !== "";
  }).length;

  const isFormComplete = totalRequiredCount === 0 || completedRequiredCount === totalRequiredCount;

  // Handle final document generation
  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    setGenerationError(null);

    try {
      // 1. Create or update event record
      let eventIdToUse = activeEventId;

      if (!eventIdToUse) {
        const createEvtRes = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: formData.eventName || "Untitled Event",
            rawDescription: naturalLanguageInput || `Event generated from template ${selectedTemplate.name}`,
            structuredData: formData,
            templateId: selectedTemplate.id,
          }),
        });

        const evtData = await createEvtRes.json();
        if (!evtData.success) {
          throw new Error(evtData.error?.message || "Failed to persist event record.");
        }
        eventIdToUse = evtData.data.id;
      }

      // 2. Generate Document from template
      const genRes = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventIdToUse,
          templateId: selectedTemplate.id,
          customData: formData,
        }),
      });

      const genData = await genRes.json();
      if (!genData.success) {
        throw new Error(genData.error?.message || "Document generation failed.");
      }

      // 3. Navigate directly to Document Review Studio
      router.push(`/documents/${genData.data.id}`);
    } catch (err: any) {
      setGenerationError(err.message || "An unexpected error occurred during generation.");
      setGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Step Indicator Header */}
        <div className="p-5 rounded-xl border border-[#E5DFD5] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#1C2622] tracking-tight">
              Doc - Doctor Studio
            </h1>
            <p className="text-xs text-[#7A8A81] mt-0.5">
              Select a verified template, complete all dynamic required fields, and generate from the original layout.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              onClick={() => setCurrentStep(1)}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                currentStep === 1
                  ? "bg-[#1F6954] text-white shadow-2xs"
                  : "bg-[#EFECE6] text-[#66756D] hover:bg-[#E7F3ED] hover:text-[#1F6954]"
              }`}
            >
              1. Select Template
            </span>
            <span className="text-[#D8D2C7]">→</span>
            <span
              onClick={() => {
                if (selectedTemplate) setCurrentStep(2);
              }}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                currentStep === 2
                  ? "bg-[#1F6954] text-white shadow-2xs"
                  : "bg-[#EFECE6] text-[#66756D] hover:bg-[#E7F3ED] hover:text-[#1F6954]"
              }`}
            >
              2. Complete Questionnaire & Generate
            </span>
          </div>
        </div>

        {/* Active Event Context & Generated Documents Banner */}
        {activeEventId && (
          <div className="p-5 rounded-xl border border-[#E5DFD5] bg-[#FAF8F4] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DFD5] pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F6954]">
                  Active Event Profile
                </span>
                <h2 className="text-sm font-bold text-[#1C2622]">
                  {existingEventName || formData.eventName || "Event Details"}
                </h2>
              </div>
              <span className="text-xs text-[#7A8A81]">
                ID: <span className="font-mono text-[11px]">{activeEventId}</span>
              </span>
            </div>

            {eventDocuments.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#1C2622] block">
                  Generated Documents for this Event ({eventDocuments.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eventDocuments.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-lg border border-[#E5DFD5] bg-white flex items-center justify-between gap-2 text-xs shadow-2xs"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/documents/${d.id}`}
                          className="font-semibold text-[#1C2622] hover:text-[#1F6954] truncate block transition-colors"
                        >
                          {d.title}
                        </Link>
                        <span className="text-[10px] text-[#7A8A81]">
                          v{d.currentVersion} • {d.documentType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                          d.status === "APPROVED"
                            ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                            : d.status === "SUBMITTED"
                            ? "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                            : d.status === "CHANGES_REQUESTED"
                            ? "bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]"
                            : "bg-[#EFECE6] text-[#55645C]"
                        }`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#7A8A81]">
                No documents generated yet for this event. Select a template below to create one.
              </p>
            )}
          </div>
        )}

        {/* STEP 1: TEMPLATE SELECTION */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#1C2622] uppercase tracking-wider">
                Step 1: Choose Your Document Template
              </h2>
              <span className="text-[11px] text-[#7A8A81]">
                {templates.length} Active Templates Available
              </span>
            </div>

            {loadingTemplates ? (
              <div className="p-12 text-center text-xs text-[#7A8A81]">Loading template catalog...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  const reqCount = tmpl.fields?.filter((f) => f.required && !f.isFixed).length || tmpl.requiredFields?.length || 0;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-[#1F6954] bg-[#E7F3ED]/40 shadow-xs ring-2 ring-[#1F6954]"
                          : "border-[#E5DFD5] bg-white hover:border-[#BCD8CB] shadow-2xs"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#EFECE6] text-[#55645C]">
                            {tmpl.documentType.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-white border border-[#BCD8CB] text-[#1F6954]">
                            {tmpl.format?.toUpperCase() || "DOCX"}
                          </span>
                        </div>

                        <h3 className="font-bold text-xs text-[#1C2622] mb-1">{tmpl.name}</h3>
                        <p className="text-[11px] text-[#7A8A81] leading-relaxed mb-3">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#E5DFD5] flex items-center justify-between text-[11px] text-[#7A8A81]">
                        <span>{reqCount} Required Fields</span>
                        <span className={`font-semibold text-xs ${isSelected ? "text-[#1F6954]" : "text-[#A3B0A8]"}`}>
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
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
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
            <div className="p-5 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7A8A81]">Selected Template:</span>
                    <span className="font-bold text-sm text-[#1C2622]">{selectedTemplate.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]">
                      {selectedTemplate.format?.toUpperCase() || "DOCX"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A8A81] mt-0.5">{selectedTemplate.description}</p>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#1F6954] hover:text-[#175342] font-semibold flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Template</span>
                </button>
              </div>

              {/* Progress Indicator */}
              <div className="pt-2 border-t border-[#E5DFD5]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#1C2622]">
                    Required fields completed: {completedRequiredCount} / {totalRequiredCount}
                  </span>
                  <span
                    className={`font-bold text-[11px] ${
                      isFormComplete ? "text-[#1F6954]" : "text-[#D9822B]"
                    }`}
                  >
                    {isFormComplete ? "All Mandatory Fields Complete ✓" : "Action Required"}
                  </span>
                </div>

                <div className="w-full bg-[#EFECE6] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 bg-[#1F6954]"
                    style={{
                      width: `${totalRequiredCount === 0 ? 100 : (completedRequiredCount / totalRequiredCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* AI Natural Language Assistance Box */}
            <div className="rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E5DFD5] bg-[#FAF8F4] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#1F6954]" />
                  <h3 className="text-xs font-semibold text-[#1C2622] uppercase tracking-wider">
                    AI Auto-Fill for &ldquo;{selectedTemplate.name}&rdquo;
                  </h3>
                </div>
                <span className="text-[11px] text-[#1F6954] font-medium flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Zero Fabrication Policy</span>
                </span>
              </div>

              <div className="p-5 space-y-3.5">
                <p className="text-[11px] text-[#7A8A81]">
                  Describe your event details in natural English. The AI will extract facts matching the <strong>{fields.length} fields</strong> of this document and will ask for all missing required data without guessing.
                </p>
                <textarea
                  rows={3}
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder={`Describe your event details in natural English for ${selectedTemplate.name} (e.g., We are organizing a workshop on Nov 14, 2026 at CS Lab 3 with speaker Dev Sharma from Google...)`}
                  className="w-full p-3 rounded-lg border border-[#E5DFD5] bg-[#FAF8F4] text-xs font-sans text-[#1C2622] focus:bg-white focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden transition-all"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((sample, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setNaturalLanguageInput(sample.text)}
                        className="text-[10px] px-2.5 py-1 rounded-md border border-[#E5DFD5] bg-white hover:bg-[#E7F3ED] text-[#55645C] hover:text-[#1A5A48] transition-colors"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExtractFromDescription}
                    disabled={extracting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
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
                  <div className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#F7C8C4] text-xs text-[#C24138]">
                    {extractError}
                  </div>
                )}
              </div>
            </div>

            {/* Clarification Box for Missing Fields */}
            {aiClarificationQuestions.length > 0 && (
              <div className="p-4 rounded-xl border border-[#FBD8B3] bg-[#FEF3E6] space-y-3">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#92400E] uppercase tracking-wider flex items-center gap-2">
                      <span>Missing Information Requested by AI</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                        {aiClarificationQuestions.filter((q) => !formData[q.fieldKey] || String(formData[q.fieldKey]).trim() === "").length} Missing
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#B45309]">
                      The AI extracted available facts and identified that the following required fields were not mentioned. Please provide them below:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {aiClarificationQuestions.map((q, idx) => {
                    const isAnswered = Boolean(formData[q.fieldKey] && String(formData[q.fieldKey]).trim() !== "");
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${
                          isAnswered
                            ? "bg-[#E7F3ED] border-[#BCD8CB]"
                            : "bg-white border-[#FBD8B3]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#1C2622] block">{q.question}</span>
                          {isAnswered && (
                            <span className="text-[10px] font-semibold text-[#1A5A48] flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3 text-[#1F6954]" />
                              <span>Provided</span>
                            </span>
                          )}
                        </div>
                        <input
                          type={
                            q.suggestedInputType === "number"
                              ? "number"
                              : q.suggestedInputType === "date"
                              ? "date"
                              : "text"
                          }
                          value={formData[q.fieldKey] || ""}
                          placeholder={`Enter ${q.fieldKey}...`}
                          onChange={(e) => handleFieldChange(q.fieldKey, e.target.value)}
                          className="w-full p-2 rounded-md border border-[#E5DFD5] text-xs bg-white focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DYNAMIC FORM GENERATED FROM SELECTED TEMPLATE */}
            <div className="rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E5DFD5] bg-[#FAF8F4] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#1C2622] uppercase tracking-wider">
                    Dynamic Template Questionnaire ({fields.length} Fields)
                  </h3>
                  <p className="text-[10px] text-[#7A8A81]">
                    Strictly generated from the selected template's persisted schema.
                  </p>
                </div>

                <span className="text-[10px] text-[#7A8A81]">
                  * Denotes mandatory field
                </span>
              </div>

              <div className="p-6 space-y-5">
                {fields.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#7A8A81]">
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
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                            isMissing
                              ? "border-[#F7C8C4] bg-[#FDF2F0]/40"
                              : "border-[#E5DFD5] bg-[#FAF8F4]"
                          } ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-[#1C2622] flex items-center gap-1">
                              <span>{field.label || field.name}</span>
                              {isRequired && <span className="text-[#C24138]">*</span>}
                            </label>

                            <div className="flex items-center gap-1.5">
                              {field.isFixed && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#55645C] border border-[#E5DFD5]">
                                  Fixed
                                </span>
                              )}
                              <span className="text-[9px] uppercase font-mono text-[#8B9B92]">
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
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-[#EFECE6] text-[#7A8A81]"
                            />
                          ) : field.type === "textarea" ? (
                            <textarea
                              rows={3}
                              value={value}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                            />
                          ) : field.type === "date" ? (
                            <input
                              type="date"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                            />
                          ) : field.type === "time" ? (
                            <input
                              type="text"
                              placeholder="e.g. 09:30 AM"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                            />
                          ) : field.type === "number" || field.type === "currency" ? (
                            <input
                              type="number"
                              placeholder="0"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                            />
                          ) : field.type === "email" ? (
                            <input
                              type="email"
                              placeholder="name@example.edu"
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              value={value}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full p-2 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                            />
                          )}

                          {isMissing && (
                            <span className="text-[10px] text-[#C24138] block font-medium">
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
                  <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F7C8C4] text-xs text-[#C24138] flex items-start gap-2 shadow-2xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}

                {/* Final Action Bar with Deterministic Block */}
                <div className="pt-4 border-t border-[#E5DFD5] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-[#66756D]">
                    {!isFormComplete ? (
                      <span className="text-[#D9822B] font-semibold">
                        Generation blocked until all {totalRequiredCount} required fields are satisfied ({totalRequiredCount - completedRequiredCount} remaining).
                      </span>
                    ) : (
                      <span className="text-[#1A5A48] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-[#1F6954]" />
                        <span>All {totalRequiredCount} required fields validated and ready.</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!isFormComplete || generating}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-xs transition-all shadow-xs ${
                      isFormComplete && !generating
                        ? "bg-[#1F6954] hover:bg-[#175342] text-white cursor-pointer hover:shadow-sm"
                        : "bg-[#EFECE6] text-[#A3B0A8] cursor-not-allowed border border-[#E5DFD5]"
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#7A8A81]">Loading studio...</div>}>
      <EventCreationStudioContent />
    </Suspense>
  );
}
