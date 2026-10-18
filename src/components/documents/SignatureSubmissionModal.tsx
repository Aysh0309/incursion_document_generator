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

      // Initial assignments based on template's signatureFields
      const initialMap: Record<string, any> = {};
      const fields = currentTmpl?.signatureFields || [];

      fields.forEach((f, idx) => {
        // Find best matching authority from directory
        let matched = authList.find((a) => a.id === f.defaultAuthorityId);
        if (!matched && f.assignedRole) {
          matched = authList.find((a) => a.role === f.assignedRole);
        }
        if (!matched && authList.length > 0) {
          matched = authList[idx % authList.length];
        }

        initialMap[f.id] = {
          authorityId: matched?.id || "",
          authorityName: matched?.name || f.printedName || "",
          authorityEmail: matched?.email || "",
          signingOrder: f.signingOrder || idx + 1,
        };
      });

      setAssignments(initialMap);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load authority directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorityChange = (fieldId: string, authorityId: string) => {
    const selected = authorities.find((a) => a.id === authorityId);
    if (!selected) return;

    setAssignments((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        authorityId: selected.id,
        authorityName: selected.name,
        authorityEmail: selected.email,
      },
    }));
  };

  const handleOrderChange = (fieldId: string, newOrder: number) => {
    setAssignments((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        signingOrder: Number(newOrder) || 1,
      },
    }));
  };

  const handleSubmit = async () => {
    // Validate assignments
    const fields = template?.signatureFields || [];
    for (const f of fields) {
      const assign = assignments[f.id];
      if (f.required && (!assign?.authorityEmail || !assign?.authorityEmail.includes("@"))) {
        setErrorMsg(`Please specify a valid email address for "${f.designation}".`);
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payloadAssignments = Object.entries(assignments).map(([fieldId, data]) => ({
        fieldId,
        ...data,
      }));

      const res = await fetch(`/api/documents/${document.id}/submit-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: payloadAssignments,
          signingWorkflow,
          requesterName,
          requesterEmail,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to initiate signature workflow.");
      }

      onSuccess(json.data);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const signatureFields = template?.signatureFields || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full p-6 space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                Submit Document for Official Signatures
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Configure recipient authorities and dispatch electronic signature requests
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-[#0F172A] rounded hover:bg-[#F1F5F9]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E11D48] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-[#64748B] space-y-2">
            <div className="h-6 w-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading authority directory & signature fields...</p>
          </div>
        ) : signatureFields.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#64748B] space-y-3">
            <AlertCircle className="h-8 w-8 text-[#D97706] mx-auto" />
            <p className="font-semibold text-[#0F172A]">No Signature Fields Configured</p>
            <p className="max-w-md mx-auto text-[#64748B]">
              This template does not currently have signature fields configured. You can configure signature sections in the Template Studio.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Requester Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">
                  Requester Full Name
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">
                  Requester Email (For Completion Notice)
                </label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs"
                />
              </div>
            </div>

            {/* Workflow Mode Selector */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] bg-white text-xs">
              <div>
                <span className="font-semibold text-[#0F172A] block">Signing Workflow Mode:</span>
                <span className="text-[11px] text-[#64748B]">
                  {signingWorkflow === "SEQUENTIAL"
                    ? "Step-by-step: Authority #1 signs, then email is dispatched to Authority #2."
                    : "Parallel: All authorities receive signing requests simultaneously."}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-md shrink-0">
                <button
                  type="button"
                  onClick={() => setSigningWorkflow("SEQUENTIAL")}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    signingWorkflow === "SEQUENTIAL"
                      ? "bg-white text-[#4F46E5] shadow-2xs"
                      : "text-[#64748B]"
                  }`}
                >
                  Sequential
                </button>
                <button
                  type="button"
                  onClick={() => setSigningWorkflow("PARALLEL")}
                  className={`px-3 py-1 text-xs font-semibold rounded ${
                    signingWorkflow === "PARALLEL"
                      ? "bg-white text-[#4F46E5] shadow-2xs"
                      : "text-[#64748B]"
                  }`}
                >
                  Parallel
                </button>
              </div>
            </div>

            {/* List of Required Signature Fields */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#0F172A] block">
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
                    className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FCFDFE] text-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] font-bold text-[10px] flex items-center justify-center">
                          {currentAssign.signingOrder}
                        </span>
                        <span className="font-bold text-[#0F172A]">{field.designation}</span>
                        {field.required && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#FEF2F2] text-[#E11D48] border border-[#FECDD3]">
                            Required
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748B]">Page {field.pageNumber}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Authority Directory Select */}
                      <div className="sm:col-span-6">
                        <label className="text-[10px] font-medium text-[#64748B] block mb-0.5">
                          Assigned Authority
                        </label>
                        <select
                          value={currentAssign.authorityId}
                          onChange={(e) => handleAuthorityChange(field.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs font-medium"
                        >
                          <option value="">-- Choose from Directory --</option>
                          {authorities.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.designation})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Recipient Email */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] font-medium text-[#64748B] block mb-0.5">
                          Delivery Email *
                        </label>
                        <input
                          type="email"
                          value={currentAssign.authorityEmail}
                          onChange={(e) =>
                            setAssignments((prev) => ({
                              ...prev,
                              [field.id]: {
                                ...prev[field.id],
                                authorityEmail: e.target.value,
                              },
                            }))
                          }
                          placeholder="authority@nit.ac.in"
                          className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs"
                        />
                      </div>

                      {/* Signing Order */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-medium text-[#64748B] block mb-0.5">
                          Order #
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={currentAssign.signingOrder}
                          onChange={(e) => handleOrderChange(field.id, parseInt(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || signatureFields.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs transition-colors disabled:opacity-50"
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
