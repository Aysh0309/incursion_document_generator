"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
} from "lucide-react";
import { DocumentRecord, SignatureRequest } from "@/types";

interface SignatureProgressCardProps {
  document: DocumentRecord;
  onRefresh: () => void;
}

export function SignatureProgressCard({ document, onRefresh }: SignatureProgressCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const requests = document.signatureRequests || [];
  if (requests.length === 0) return null;

  const total = requests.length;
  const completed = requests.filter((r) => r.status === "SIGNED").length;
  const percentage = Math.round((completed / total) * 100);

  const handleCopyLink = (req: SignatureRequest) => {
    // req.tokenHash is used as valid token identifier for direct access
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const link = `${origin}/sign/${req.tokenHash}`;
    navigator.clipboard.writeText(link);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResendEmail = async (req: SignatureRequest) => {
    setResendingId(req.id);
    try {
      const res = await fetch(`/api/documents/${document.id}/submit-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: [
            {
              fieldId: req.fieldId,
              authorityId: req.assignedAuthorityId,
              authorityName: req.authorityName,
              authorityEmail: req.authorityEmail,
              signingOrder: req.signingOrder,
            },
          ],
        }),
      });
      if (res.ok) {
        alert(`Signature notification re-sent to ${req.authorityEmail}`);
        onRefresh();
      }
    } catch {
      alert("Failed to resend notification.");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden space-y-4 p-5">
      {/* Header and Progress Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#4F46E5]" />
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Official Electronic Signature Workflow
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#0F172A]">
              {completed} of {total} Signatures Completed
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
              {percentage}%
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              completed === total ? "bg-[#059669]" : "bg-[#4F46E5]"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Authorities Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {requests
          .sort((a, b) => a.signingOrder - b.signingOrder)
          .map((req) => {
            const isSigned = req.status === "SIGNED";
            const isSent = req.status === "SENT" || req.status === "VIEWED";
            const isDeclined = req.status === "DECLINED";

            return (
              <div
                key={req.id}
                className={`p-3.5 rounded-lg border text-xs space-y-2 flex flex-col justify-between ${
                  isSigned
                    ? "bg-[#F0FDF4] border-[#BBF7D0]"
                    : isDeclined
                    ? "bg-[#FEF2F2] border-[#FECDD3]"
                    : isSent
                    ? "bg-[#FFFBEB] border-[#FDE68A]"
                    : "bg-[#F8FAFC] border-[#E2E8F0]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-[#CBD5E1] text-[#475569]">
                      Step #{req.signingOrder}
                    </span>

                    {isSigned ? (
                      <span className="flex items-center gap-1 font-semibold text-[10px] text-[#059669]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Signed ✓</span>
                      </span>
                    ) : isDeclined ? (
                      <span className="flex items-center gap-1 font-semibold text-[10px] text-[#E11D48]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Declined</span>
                      </span>
                    ) : isSent ? (
                      <span className="flex items-center gap-1 font-semibold text-[10px] text-[#D97706]">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        <span>Awaiting Signature</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#64748B]">Queued</span>
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <h4 className="font-bold text-[#0F172A]">{req.authorityName}</h4>
                    <p className="text-[11px] text-[#475569] font-medium leading-tight">
                      {req.designation}
                    </p>
                    <p className="text-[10px] text-[#64748B] font-mono">{req.authorityEmail}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[10px]">
                  {isSigned ? (
                    <span className="text-[#059669] font-medium">
                      Signed: {new Date(req.signedAt || "").toLocaleDateString()}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(req)}
                        className="flex items-center gap-1 text-[#4F46E5] hover:underline font-semibold"
                        title="Copy direct secure signing link"
                      >
                        {copiedId === req.id ? (
                          <>
                            <Check className="h-3 w-3 text-[#059669]" />
                            <span className="text-[#059669]">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Signing Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`/sign/${req.tokenHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#64748B] hover:text-[#0F172A] flex items-center gap-0.5"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Workflow Audit Trail Toggle */}
      {document.workflowEvents && document.workflowEvents.length > 0 && (
        <div className="pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
          >
            <div className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span>Workflow Audit Log ({document.workflowEvents.length} events)</span>
            </div>
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
              {document.workflowEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-[11px] py-1 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-[#94A3B8] font-mono shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div>
                    <span className="font-semibold text-[#0F172A]">{event.performedBy}: </span>
                    <span className="text-[#475569]">{event.details || event.action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
