"use client";

import React, { useState, useEffect } from "react";
import { X, Send, ShieldCheck, Users, AlertCircle, ArrowDown } from "lucide-react";
import { AuthorityRecord, DocumentRecord, TemplateMetadata } from "@/types";

interface SignatureSubmissionModalProps {
  document: DocumentRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedDoc: DocumentRecord) => void;
}

export function SignatureSubmissionModal({
  document,
  isOpen,
  onClose,
  onSuccess,
}: SignatureSubmissionModalProps) {
  const [authorities, setAuthorities] = useState<AuthorityRecord[]>([]);
  const [template, setTemplate] = useState<TemplateMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Workflow options
  const [signingWorkflow, setSigningWorkflow] = useState<"SEQUENTIAL" | "PARALLEL">("SEQUENTIAL");
  const [requesterName, setRequesterName] = useState(document.requesterName || "Club Lead Organizer");
  const [requesterEmail, setRequesterEmail] = useState(document.requesterEmail || "gdsc.leads@nit.ac.in");

  // Field assignments: map from fieldId -> { authorityId, authorityName, authorityEmail, signingOrder }
  const [assignments, setAssignments] = useState<
    Record<
      string,
      {
        authorityId: string;
        authorityName: string;
        authorityEmail: string;
        signingOrder: number;
      }
    >
  >({});

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, document.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [authRes, tmplRes] = await Promise.all([
        fetch("/api/authorities").then((r) => r.json()),
        fetch(`/api/templates`).then((r) => r.json()),
      ]);

      const authList: AuthorityRecord[] = authRes.data || [];
      setAuthorities(authList);

      const tmplList: TemplateMetadata[] = tmplRes.data || [];
      const currentTmpl = tmplList.find((t) => t.id === document.templateId);
      setTemplate(currentTmpl || null);

      if (currentTmpl?.signingWorkflow) {
        setSigningWorkflow(currentTmpl.signingWorkflow);
      }

      // Initial assignments: let user write names freely with no predefined people
      const initialMap: Record<string, any> = {};
      const fields = currentTmpl?.signatureFields || [];

      fields.forEach((f, idx) => {
        initialMap[f.id] = {
          authorityId: "",
          authorityName: "",
          authorityEmail: "",
          signingOrder: f.signingOrder || idx + 1,
        };
      });

      setAssignments(initialMap);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load signature fields.");
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (fieldId: string, name: string) => {
    setAssignments((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        authorityName: name,
      },
    }));
  };

  const handleEmailChange = (fieldId: string, email: string) => {
    setAssignments((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        authorityEmail: email,
      },
    }));
  };

  const handleOrderChange = (fieldId: string, order: number) => {
    setAssignments((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        signingOrder: order,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Validate that signatory names and emails are provided for all fields
      const payloadAssignments = Object.entries(assignments).map(([fieldId, data]) => ({
        fieldId,
        authorityId: data.authorityId || "custom_auth",
        authorityName: (data.authorityName || "").trim(),
        authorityEmail: (data.authorityEmail || "").trim(),
        signingOrder: data.signingOrder,
      }));

      for (const item of payloadAssignments) {
        if (!item.authorityName) {
          throw new Error("Please write the signatory's full name for each signature role.");
        }
        if (!item.authorityEmail || !item.authorityEmail.includes("@")) {
          throw new Error(`Please provide a valid delivery email for "${item.authorityName}".`);
        }
      }

      const res = await fetch(`/api/documents/${document.id}/submit-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signingWorkflow,
          requesterName,
          requesterEmail,
          assignments: payloadAssignments,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to dispatch signature workflow.");
      }

      onSuccess(data.data);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const signatureFields = template?.signatureFields || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl border border-[#E5DFD5] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header (Pinned) */}
        <div className="flex items-start justify-between border-b border-[#E5DFD5] px-6 py-4 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#E7F3ED] text-[#1F6954] flex items-center justify-center border border-[#BCD8CB] shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1C2622]">
                Submit Document for Official Signatures
              </h3>
              <p className="text-[11px] text-[#7A8A81]">
                Configure recipient authorities and dispatch electronic signature requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#7A8A81] hover:text-[#1C2622] rounded-lg hover:bg-[#FAF8F4] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FDF2F0] border border-[#F7C8C4] text-xs text-[#C24138] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-[#7A8A81] space-y-2">
              <div className="h-6 w-6 border-2 border-[#1F6954] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading authority directory & signature fields...</p>
            </div>
          ) : signatureFields.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#7A8A81] space-y-3">
              <AlertCircle className="h-8 w-8 text-[#D97706] mx-auto" />
              <p className="font-semibold text-[#1C2622]">No Signature Fields Configured</p>
              <p className="max-w-md mx-auto text-[#7A8A81]">
                This template does not currently have signature fields configured. You can configure signature sections in the Template Studio.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workflow Mode Selector */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5DFD5] bg-white text-xs">
                <div>
                  <span className="font-semibold text-[#1C2622] block">Signing Workflow Mode:</span>
                  <span className="text-[11px] text-[#7A8A81]">
                    {signingWorkflow === "SEQUENTIAL"
                      ? "Step-by-step: Authority #1 signs, then email is dispatched to Authority #2."
                      : "Parallel: All authorities receive signing requests simultaneously."}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-[#EFECE6] p-0.5 rounded-lg shrink-0">
                  <button
                    type="button"
                    onClick={() => setSigningWorkflow("SEQUENTIAL")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      signingWorkflow === "SEQUENTIAL"
                        ? "bg-white text-[#1F6954] shadow-2xs"
                        : "text-[#66756D] hover:text-[#1C2622]"
                    }`}
                  >
                    Sequential
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigningWorkflow("PARALLEL")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      signingWorkflow === "PARALLEL"
                        ? "bg-white text-[#1F6954] shadow-2xs"
                        : "text-[#66756D] hover:text-[#1C2622]"
                    }`}
                  >
                    Parallel
                  </button>
                </div>
              </div>

              {/* List of Required Signature Fields */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1C2622] block">
                  Assign Authorities to Required Signature Sections ({signatureFields.length}):
                </label>

                {signatureFields.map((field, idx) => {
                  const currentAssign = assignments[field.id] || {
                    authorityId: "",
                    authorityName: "",
                    authorityEmail: "",
                    signingOrder: idx + 1,
                  };

                  return (
                    <div
                      key={field.id}
                      className="p-3.5 rounded-xl border border-[#E5DFD5] bg-[#FAF8F4] text-xs space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB] font-bold text-[10px] flex items-center justify-center">
                            {currentAssign.signingOrder}
                          </span>
                          <span className="font-bold text-[#1C2622]">{field.designation}</span>
                          {field.required && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#FDF2F0] text-[#C24138] border border-[#F7C8C4]">
                              Required
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#7A8A81]">Page {field.pageNumber}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        {/* Signatory Full Name */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-medium text-[#66756D] block mb-0.5">
                            Signatory Full Name *
                          </label>
                          <input
                            type="text"
                            value={currentAssign.authorityName}
                            onChange={(e) => handleNameChange(field.id, e.target.value)}
                            placeholder="Enter person's name for this role"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                          />
                        </div>

                        {/* Recipient Email */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-medium text-[#66756D] block mb-0.5">
                            Delivery Email *
                          </label>
                          <input
                            type="email"
                            value={currentAssign.authorityEmail}
                            onChange={(e) => handleEmailChange(field.id, e.target.value)}
                            placeholder="authority@nit.ac.in"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD5] bg-white text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                          />
                        </div>

                        {/* Signing Order */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-medium text-[#66756D] block mb-0.5">
                            Order #
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={currentAssign.signingOrder}
                            onChange={(e) => handleOrderChange(field.id, parseInt(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD5] bg-white text-xs text-center font-bold focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions (Pinned Footer) */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-[#E5DFD5] bg-[#FAF8F4] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E5DFD5] text-[#66756D] hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || signatureFields.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white shadow-xs transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Dispatching Requests...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Confirm & Send to Authorities</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
