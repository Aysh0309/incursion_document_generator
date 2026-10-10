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
} from "lucide-react";
import { DocumentType, ExtractionResult, StructuredEventData, TemplateMetadata } from "@/types";

const SAMPLE_PROMPTS = [
  {
    label: "Google Cloud AI Workshop",
    text: "We are organizing an AI workshop on November 14, 2026 at CS Lab 3 from 9:30 AM to 4:30 PM. Organized by GDSC. Faculty coordinator is Prof. Sharma. Requested budget is INR 15,000. Speaker is Dev Sharma from Google. Expected attendees: 85 students.",
  },
  {
    label: "Incomplete Brainstorm (Triggers Clarification)",
    text: "Planning a hands-on cybersecurity capture the flag competition next month for 2nd and 3rd year CSE students. Lead is Aarav Patel. Need permission from HOD Dr. Verma. Budget is 5000 INR.",
  },
  {
    label: "Industry Guest Keynote",
    text: "Inviting Dr. Rajesh Mehta from Microsoft Research to deliver a distinguished keynote on Quantum Computing on December 5, 2026 at Turing Auditorium from 10:00 AM to 1:00 PM. Coordinated by Dr. Sunita Sharma.",
  },
];

function EventCreationStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");

  // Workflow Step: 1 = Input, 2 = Clarify & Review, 3 = Select Templates & Generate
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Input Mode: Plain English vs Structured Form
  const [inputMode, setInputMode] = useState<"plain" | "form">("plain");
  const [rawText, setRawText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Structured State
  const [structuredData, setStructuredData] = useState<StructuredEventData>({
    eventName: "",
    eventType: "WORKSHOP",
    eventDescription: "",
    targetAudience: "CSE Students",
    expectedParticipants: 50,
    startDate: "2026-11-14",
    endDate: "2026-11-14",
    startTime: "09:30 AM",
    endTime: "04:30 PM",
    venue: "",
    isOnline: false,
    meetingLink: null,
    organizerName: "Student Representative",
    clubName: "Google Developer Student Club (GDSC)",
    facultyCoordinator: "",
    departmentHOD: "",
    budgetRequested: 10000,
    speaker: {
      name: "",
      designation: "",
      organization: "",
      email: "",
      topic: "",
    },
    registrationDeadline: null,
    contactEmail: "gdsc.leads@nit.ac.in",
    contactPhone: "+91 98765 43210",
    requiresLabComputers: true,
  });

  // Clarification questions detected by the deterministic gate
  const [missingQuestions, setMissingQuestions] = useState<any[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, any>>({});

  // Available templates and user selection
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Load existing event or templates
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setTemplates(res.data);
          // By default pre-select top 2 templates for convenience
          setSelectedTemplateIds(res.data.slice(0, 2).map((t: any) => t.id));
        }
      });

    if (eventIdParam) {
      fetch(`/api/events/${eventIdParam}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setActiveEventId(res.data.id);
            setStructuredData(res.data.structuredData);
            if (res.data.rawInputText) setRawText(res.data.rawInputText);
            setCurrentStep(2);
          }
        });
    }
  }, [eventIdParam]);

  // Handler: Run deterministic AI Extraction
  const handleExtract = async () => {
    if (!rawText.trim()) {
      setExtractError("Please provide an event description before extracting.");
      return;
    }

    setExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Extraction failed");
      }

      const result: ExtractionResult = data.data;

      // Merge extracted fields into structured state
      setStructuredData((prev) => ({
        ...prev,
        ...result.extractedData,
        speaker: result.extractedData.speaker || prev.speaker,
      }));

      setMissingQuestions(result.missingFieldQuestions || []);

      // Save as event in backend
      const saveRes = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: result.extractedData.eventName || "New Event",
          rawInputText: rawText,
          structuredData: result.extractedData,
          targetDocumentTypes: result.detectedDocumentTypes,
        }),
      });
      const saved = await saveRes.json();
      if (saved.success) {
        setActiveEventId(saved.data.id);
      }

      // Move to Clarify & Review step
      setCurrentStep(2);
    } catch (err: any) {
      setExtractError(err.message || "Failed to extract information");
    } finally {
      setExtracting(false);
    }
  };

  // Handler: Save Clarification Answers
  const handleSaveClarifications = async () => {
    const updated = { ...structuredData, ...clarificationAnswers };

    // Update state
    setStructuredData(updated);

    if (activeEventId) {
      await fetch(`/api/events/${activeEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: clarificationAnswers }),
      });
    }

    // Clear resolved questions and advance to Template Selection
    setMissingQuestions([]);
    setCurrentStep(3);
  };

  // Handler: Batch Document Generation
  const handleGenerateDocuments = async () => {
    if (selectedTemplateIds.length === 0) {
      alert("Please select at least one document template.");
      return;
    }

    setGenerating(true);

    try {
      // Ensure event is saved first
      let eventId = activeEventId;
      if (!eventId) {
        const createRes = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: structuredData.eventName || "New Event",
            rawInputText: rawText,
            structuredData,
          }),
        });
        const created = await createRes.json();
        eventId = created.data.id;
        setActiveEventId(eventId);
      }

      // Trigger Batch Generation
      const genRes = await fetch("/api/documents/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          templateIds: selectedTemplateIds,
        }),
      });

      const genData = await genRes.json();

      if (!genData.success) {
        throw new Error(genData.error?.message || "Generation failed");
      }

      const docs = genData.data.generatedDocuments || [];
      if (docs.length > 0) {
        // Redirect to the first generated document's review page
        router.push(`/documents/${docs[0].id}`);
      } else {
        router.push("/documents");
      }
    } catch (err: any) {
      alert(err.message || "Document generation encountered an error");
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
              Event Document Creation Studio
            </h1>
            <p className="text-xs text-[#64748B]">
              Provide event requirements once; generate compliant institutional letters and proposals.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-md font-semibold ${
                currentStep === 1
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              1. Input
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span
              className={`px-2.5 py-1 rounded-md font-semibold ${
                currentStep === 2
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              2. Clarify & Review
            </span>
            <span className="text-[#CBD5E1]">→</span>
            <span
              className={`px-2.5 py-1 rounded-md font-semibold ${
                currentStep === 3
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              3. Generate
            </span>
          </div>
        </div>

        {/* STEP 1: DUAL INPUT INTERFACE */}
        {currentStep === 1 && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
            <div className="border-b border-[#E2E8F0] px-5 py-3 flex items-center justify-between bg-[#FCFDFE]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInputMode("plain")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                    inputMode === "plain"
                      ? "bg-[#4F46E5] text-white"
                      : "text-[#64748B] hover:text-[#18181B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  Plain English Brainstorm
                </button>
                <button
                  onClick={() => setInputMode("form")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                    inputMode === "form"
                      ? "bg-[#4F46E5] text-white"
                      : "text-[#64748B] hover:text-[#18181B] hover:bg-[#F1F5F9]"
                  }`}
                >
                  Structured Form Entry
                </button>
              </div>

              <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Zero Hallucination Guaranteed</span>
              </span>
            </div>

            {inputMode === "plain" ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                    Describe your upcoming event in natural language:
                  </label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="e.g. We are organizing an AI workshop on November 14, 2026 at CS Lab 3 from 9 AM to 5 PM. Organized by GDG Club. Faculty coordinator is Prof. Sharma. Requested budget is INR 15,000..."
                    className="w-full p-3.5 rounded-md border border-[#E2E8F0] text-xs font-sans text-[#18181B] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] placeholder-[#94A3B8]"
                  />
                </div>

                {/* Example prompt chips */}
                <div>
                  <span className="text-[11px] font-semibold text-[#64748B] block mb-2">
                    Or click a sample scenario to test immediately:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_PROMPTS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRawText(p.text)}
                        className="text-[11px] px-2.5 py-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EEF2FF] hover:border-[#C7D2FE] text-[#475569] text-left transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {extractError && (
                  <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{extractError}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[11px] text-[#64748B]">
                    Parameters extracted deterministically via OpenAI Structured Outputs.
                  </span>

                  <button
                    onClick={handleExtract}
                    disabled={extracting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {extracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Extracting & Validating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Extract Event Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Structured Direct Form */
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-medium text-[#475569] block mb-1">Event Title *</label>
                    <input
                      type="text"
                      value={structuredData.eventName || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, eventName: e.target.value })}
                      className="w-full p-2 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#475569] block mb-1">Event Category</label>
                    <input
                      type="text"
                      value={structuredData.eventType || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, eventType: e.target.value })}
                      className="w-full p-2 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#475569] block mb-1">Start Date (YYYY-MM-DD) *</label>
                    <input
                      type="date"
                      value={structuredData.startDate || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, startDate: e.target.value })}
                      className="w-full p-2 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#475569] block mb-1">Venue / Lab *</label>
                    <input
                      type="text"
                      value={structuredData.venue || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, venue: e.target.value })}
                      placeholder="e.g. CS Lab 3"
                      className="w-full p-2 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#475569] block mb-1">Faculty Coordinator *</label>
                    <input
                      type="text"
                      value={structuredData.facultyCoordinator || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, facultyCoordinator: e.target.value })}
                      placeholder="e.g. Dr. Sunita Sharma"
                      className="w-full p-2 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-[#475569] block mb-1">Head of Department (HOD) *</label>
                    <input
                      type="text"
                      value={structuredData.departmentHOD || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, departmentHOD: e.target.value })}
                      placeholder="e.g. Dr. Arvind Verma"
                      className="w-full p-2 rounded border border-[#E2E8F0]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-2 rounded bg-[#4F46E5] text-white text-xs font-semibold"
                  >
                    Proceed to Review →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CLARIFICATION & VERIFICATION (ASK, DON'T INVENT) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Missing Information Clarification Box (If any fields were omitted) */}
            {missingQuestions.length > 0 && (
              <div className="p-5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] shadow-2xs space-y-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-[#92400E] uppercase tracking-wider">
                      Missing Information Identified (Ask, Don't Invent)
                    </h3>
                    <p className="text-xs text-[#B45309] mt-0.5">
                      The AI identified the following missing details required for official document templates. We never fabricate institutional information.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {missingQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-md border border-[#FCD34D] bg-white space-y-1.5 shadow-2xs"
                    >
                      <label className="text-xs font-semibold text-[#18181B] block">
                        {q.question}
                      </label>
                      <span className="text-[10px] text-[#64748B] block italic">
                        Why needed: {q.reason}
                      </span>
                      <input
                        type={q.suggestedInputType === "number" ? "number" : q.suggestedInputType === "date" ? "date" : "text"}
                        placeholder="Enter verified value..."
                        value={clarificationAnswers[q.fieldKey] || ""}
                        onChange={(e) =>
                          setClarificationAnswers({
                            ...clarificationAnswers,
                            [q.fieldKey]:
                              q.suggestedInputType === "number" ? Number(e.target.value) : e.target.value,
                          })
                        }
                        className="w-full p-2 rounded border border-[#E2E8F0] text-xs focus:ring-1 focus:ring-[#4F46E5]"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveClarifications}
                    className="px-4 py-2 rounded-md bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    Confirm & Merge Answers
                  </button>
                </div>
              </div>
            )}

            {/* Extracted Structured Parameters Card */}
            <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between bg-[#FCFDFE]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                  <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                    Verified Event Profile Parameters
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1 font-medium"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Re-edit text</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] text-[#64748B] block uppercase tracking-wider font-semibold">
                      Event Title
                    </span>
                    <input
                      type="text"
                      value={structuredData.eventName || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, eventName: e.target.value })}
                      className="mt-1 w-full font-semibold text-xs text-[#18181B] bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] text-[#64748B] block uppercase tracking-wider font-semibold">
                      Date & Timings
                    </span>
                    <div className="mt-1 flex gap-1">
                      <input
                        type="date"
                        value={structuredData.startDate || ""}
                        onChange={(e) => setStructuredData({ ...structuredData, startDate: e.target.value })}
                        className="w-1/2 text-xs bg-white p-1 rounded border border-[#E2E8F0]"
                      />
                      <input
                        type="text"
                        value={structuredData.startTime || ""}
                        onChange={(e) => setStructuredData({ ...structuredData, startTime: e.target.value })}
                        placeholder="Time"
                        className="w-1/2 text-xs bg-white p-1 rounded border border-[#E2E8F0]"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] text-[#64748B] block uppercase tracking-wider font-semibold">
                      Venue
                    </span>
                    <input
                      type="text"
                      value={structuredData.venue || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, venue: e.target.value })}
                      placeholder="e.g. CS Lab 3"
                      className="mt-1 w-full text-xs text-[#18181B] bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] text-[#64748B] block uppercase tracking-wider font-semibold">
                      Faculty Coordinator
                    </span>
                    <input
                      type="text"
                      value={structuredData.facultyCoordinator || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, facultyCoordinator: e.target.value })}
                      className="mt-1 w-full text-xs text-[#18181B] bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] text-[#64748B] block uppercase tracking-wider font-semibold">
                      Department HOD (Addressee)
                    </span>
                    <input
                      type="text"
                      value={structuredData.departmentHOD || ""}
                      onChange={(e) => setStructuredData({ ...structuredData, departmentHOD: e.target.value })}
                      className="mt-1 w-full text-xs text-[#18181B] bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>

                  <div className="p-3 rounded border border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] text-[#64748B] block uppercase tracking-wider font-semibold">
                      Budget Requested
                    </span>
                    <input
                      type="number"
                      value={structuredData.budgetRequested || 0}
                      onChange={(e) => setStructuredData({ ...structuredData, budgetRequested: Number(e.target.value) })}
                      className="mt-1 w-full text-xs text-[#18181B] bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-[#F1F5F9]"
                  >
                    ← Back to Input
                  </button>

                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs"
                  >
                    <span>Select Templates & Generate Documents</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TEMPLATE SELECTION & BATCH GENERATION */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between bg-[#FCFDFE]">
                <div>
                  <h2 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">
                    Select Document Templates
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Reuse your verified event parameters across multiple documents simultaneously.
                  </p>
                </div>

                <span className="text-xs font-semibold text-[#4F46E5]">
                  {selectedTemplateIds.length} Selected
                </span>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplateIds.includes(tmpl.id);
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTemplateIds(selectedTemplateIds.filter((id) => id !== tmpl.id));
                        } else {
                          setSelectedTemplateIds([...selectedTemplateIds, tmpl.id]);
                        }
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-[#4F46E5] bg-[#EEF2FF]/40 shadow-xs ring-1 ring-[#4F46E5]"
                          : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                            {tmpl.documentType.replace(/_/g, " ")}
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                          />
                        </div>

                        <h3 className="font-semibold text-xs text-[#18181B] mb-1">
                          {tmpl.name}
                        </h3>
                        <p className="text-[11px] text-[#64748B] leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B]">
                        <span>Docx + Vector PDF</span>
                        <span className="text-[#059669] font-medium">Ready</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:bg-white"
                >
                  ← Back to Review
                </button>

                <button
                  onClick={handleGenerateDocuments}
                  disabled={generating || selectedTemplateIds.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Compiling DOCX & Vectorized PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="h-4 w-4" />
                      <span>
                        Generate {selectedTemplateIds.length} Document
                        {selectedTemplateIds.length > 1 ? "s" : ""} Now
                      </span>
                    </>
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

export default function EventCreationStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#64748B]">Loading studio...</div>}>
      <EventCreationStudioContent />
    </Suspense>
  );
}
