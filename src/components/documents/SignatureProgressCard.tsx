"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  PenTool,
  FileCheck,
  Send,
  ExternalLink,
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

  // Offline signing modal state
  const [offlineReq, setOfflineReq] = useState<SignatureRequest | null>(null);
  const [offlineSigner, setOfflineSigner] = useState("");
  const [offlineNote, setOfflineNote] = useState("Physically signed on printed copy");
  const [recordingOffline, setRecordingOffline] = useState(false);

  const requests = document.signatureRequests || [];
  if (requests.length === 0) return null;

  const total = requests.length;
  const completed = requests.filter((r) => r.status === "SIGNED").length;
  const percentage = Math.round((completed / total) * 100);

  const handleOfflineSignSubmit = async () => {
    if (!offlineReq) return;
    setRecordingOffline(true);
    try {
      const res = await fetch("/api/signatures/offline-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          requestId: offlineReq.id,
          offlineSignerName: offlineSigner.trim() || offlineReq.authorityName,
          offlineNote: offlineNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOfflineReq(null);
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to record offline signature");
      }
    } catch (err: any) {
      alert(err.message || "Network error while recording offline signature");
    } finally {
      setRecordingOffline(false);
    }
  };

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
    <div className="rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden space-y-4 p-5">
      {/* Header and Progress Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#1F6954]" />
            <h3 className="text-xs font-bold text-[#1C2622] uppercase tracking-wider">
              Official Electronic Signature Workflow
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#1C2622]">
              {completed} of {total} Signatures Completed
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]">
              {percentage}%
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-[#EFECE6] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              completed === total ? "bg-[#1F6954]" : "bg-[#1F6954]"
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
                className={`p-3.5 rounded-xl border text-xs space-y-2 flex flex-col justify-between transition-all ${
                  isSigned
                    ? "bg-[#E7F3ED] border-[#BCD8CB]"
                    : isDeclined
                    ? "bg-[#FDF2F0] border-[#F7C8C4]"
                    : isSent
                    ? "bg-[#FEF3E6] border-[#FBD8B3]"
                    : "bg-[#FAF8F4] border-[#E5DFD5]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-[#E5DFD5] text-[#55645C]">
                      Step #{req.signingOrder}
                    </span>

                    {isSigned ? (
                      <span className="flex items-center gap-1 font-semibold text-[10px] text-[#1A5A48]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Signed ✓</span>
                      </span>
                    ) : isDeclined ? (
                      <span className="flex items-center gap-1 font-semibold text-[10px] text-[#C24138]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Declined</span>
                      </span>
                    ) : isSent ? (
                      <span className="flex items-center gap-1 font-semibold text-[10px] text-[#D9822B]">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        <span>Awaiting Signature</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#7A8A81]">Queued</span>
                    )}
                  </div>

                  <div className="mt-2 space-y-0.5">
                    <h4 className="font-bold text-[#1C2622]">{req.authorityName}</h4>
                    <p className="text-[11px] text-[#55645C] font-medium leading-tight">
                      {req.designation}
                    </p>
                    <p className="text-[10px] text-[#7A8A81] font-mono">{req.authorityEmail}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5DFD5]/70 flex items-center justify-between text-[10px]">
                  {isSigned ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[#1A5A48] font-medium flex items-center gap-1">
                        <FileCheck className="h-3 w-3 text-[#1F6954]" />
                        <span>
                          {req.signatureMethod === "OFFLINE" ? "Signed Offline (Physical)" : "Signed Online (e-Sign)"}:{" "}
                          {new Date(req.signedAt || "").toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-center gap-2 w-full justify-between">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(req)}
                          className="flex items-center gap-1 text-[#1F6954] hover:text-[#175342] font-semibold transition-colors"
                          title="Copy direct secure signing link"
                        >
                          {copiedId === req.id ? (
                            <>
                              <Check className="h-3 w-3 text-[#1F6954]" />
                              <span className="text-[#1F6954]">Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Link (Online)</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`/sign/${req.tokenHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#7A8A81] hover:text-[#1C2622] flex items-center gap-0.5 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOfflineReq(req);
                          setOfflineSigner(req.authorityName);
                          setOfflineNote("Physically signed on printed copy");
                        }}
                        className="w-full py-1 px-2 rounded-md bg-white border border-[#BCD8CB] hover:bg-[#E7F3ED] text-[#1F6954] font-medium text-[10px] flex items-center justify-center gap-1 transition-colors"
                      >
                        <PenTool className="h-2.5 w-2.5" />
                        <span>Record Offline Sign-off</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Offline Sign Confirmation Modal */}
      {offlineReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#E5DFD5]">
            <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-[#1F6954]" />
                <h4 className="font-bold text-sm text-[#1C2622]">Record Offline Signature</h4>
              </div>
              <button
                type="button"
                onClick={() => setOfflineReq(null)}
                className="text-xs text-[#7A8A81] hover:text-[#1C2622]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#55645C]">
              Confirm physical ink signature on paper copy for <strong>{offlineReq.authorityName}</strong> (
              {offlineReq.designation}). This will stamp an official offline verification badge onto the PDF artifact.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1C2622] block mb-1">Signer / Signatory Name</label>
                <input
                  type="text"
                  value={offlineSigner}
                  onChange={(e) => setOfflineSigner(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#E5DFD5] text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1C2622] block mb-1">Verification Note</label>
                <input
                  type="text"
                  value={offlineNote}
                  onChange={(e) => setOfflineNote(e.target.value)}
                  placeholder="e.g. Physically signed on hard copy document"
                  className="w-full p-2 rounded-lg border border-[#E5DFD5] text-xs focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E5DFD5]">
              <button
                type="button"
                onClick={handleOfflineSignSubmit}
                disabled={recordingOffline}
                className="flex-1 py-2 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {recordingOffline ? "Recording Verification..." : "Confirm & Stamp Offline Signature"}
              </button>
              <button
                type="button"
                onClick={() => setOfflineReq(null)}
                className="py-2 px-3 rounded-lg border border-[#E5DFD5] text-xs text-[#55645C] hover:bg-[#FAF8F4]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Audit Trail Toggle */}
      {document.workflowEvents && document.workflowEvents.length > 0 && (
        <div className="pt-2 border-t border-[#E5DFD5]">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs font-semibold text-[#66756D] hover:text-[#1C2622]"
          >
            <div className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-[#1F6954]" />
              <span>Workflow Audit Log ({document.workflowEvents.length} events)</span>
            </div>
            {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto p-2 bg-[#FAF8F4] rounded-lg border border-[#E5DFD5] text-xs">
              {document.workflowEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-[11px] py-1 border-b border-[#E5DFD5]/60 last:border-0">
                  <span className="text-[#8B9B92] font-mono shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div>
                    <span className="font-semibold text-[#1C2622]">{event.performedBy}: </span>
                    <span className="text-[#55645C]">{event.details || event.action}</span>
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
