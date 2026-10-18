"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileDown,
  RotateCcw,
  Send,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { SignatureCanvas } from "@/components/signatures/SignatureCanvas";

interface SigningPageProps {
  params: Promise<{ token: string }>;
}

export default function AuthoritySigningPage({ params }: SigningPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);

  // Signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState<any | null>(null);

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineSuccess, setDeclineSuccess] = useState(false);

  // PDF Viewer state
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    fetchTokenData();
  }, [token]);

  const fetchTokenData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/signatures/verify?token=${encodeURIComponent(token)}`);
      const json = await res.json();

      if (!json.success) {
        setErrorMsg(json.error?.message || "Invalid or expired signing link.");
        return;
      }

      if (json.alreadySigned) {
        setAlreadySigned(true);
        setData(json.data);
        return;
      }

      setData(json.data);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to connect to verification server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignSubmit = async () => {
    if (!signatureDataUrl) {
      alert("Please draw or type your electronic signature before submitting.");
      return;
    }
    if (!consent) {
      alert("Please acknowledge the consent checkbox to affix your official signature.");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch("/api/signatures/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          signatureDataUrl,
          consent: true,
          signDate: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to embed signature into PDF.");
      }

      setSignSuccess(json.data);
    } catch (e: any) {
      alert(e.message || "Failed to complete signature.");
    } finally {
      setSigning(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!declineReason.trim()) {
      alert("Please provide remarks explaining why the request is declined.");
      return;
    }

    setDeclining(true);
    try {
      const res = await fetch("/api/signatures/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: declineReason.trim(),
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to record decline decision.");
      }

      setShowDeclineModal(false);
      setDeclineSuccess(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B]">Verifying secure electronic signature authorization...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#E2E8F0] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#FEF2F2] text-[#E11D48] flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-[#0F172A]">Authorization Notice</h1>
          <p className="text-xs text-[#64748B] leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-4 py-2 text-xs font-semibold rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] transition-colors"
            >
              Return to Institutional Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#E2E8F0] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-[#0F172A]">Already Signed</h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            You have already officially signed <strong>{data?.document?.title}</strong> in your capacity as{" "}
            <strong>{data?.request?.designation}</strong>.
          </p>
          {data?.document?.pdfUrl && (
            <div className="pt-2">
              <a
                href={data.document.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs transition-colors"
              >
                <FileDown className="h-4 w-4" />
                <span>View Latest Signed Document</span>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (declineSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#E2E8F0] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-[#0F172A]">Request Declined</h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Your remarks have been recorded in the workflow audit trail. The requester has been notified to modify the document parameters accordingly.
          </p>
        </div>
      </div>
    );
  }

  if (signSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#A7F3D0] p-8 text-center space-y-4 shadow-sm bg-white">
          <div className="h-14 w-14 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center mx-auto ring-8 ring-[#ECFDF5]/60">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-[#065F46]">Signature Successfully Affixed!</h1>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Your electronic signature has been embedded directly below your printed name into the official PDF artifact.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Document:</span>
              <span className="font-semibold text-[#0F172A]">{data?.document?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Signed As:</span>
              <span className="font-semibold text-[#0F172A]">{data?.request?.authorityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Designation:</span>
              <span className="font-semibold text-[#0F172A]">{data?.request?.designation}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <a
              href={signSuccess.signedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <FileDown className="h-4 w-4" />
              <span>Download Signed PDF Document</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { request, document: doc, club } = data;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Banner Ribbon */}
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-[#0F172A] tracking-tight sm:text-sm">
                  {doc.title}
                </h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  Awaiting Your Signature
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                {club?.name} • Ref: {doc.id}
              </p>
            </div>
          </div>

          {/* Authority identity chip */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#FCFDFE] text-xs">
            <UserCheck className="h-4 w-4 text-[#4F46E5]" />
            <div className="text-left">
              <span className="font-semibold text-[#0F172A] block leading-tight">
                {request.authorityName}
              </span>
              <span className="text-[10px] text-[#64748B] block leading-tight">
                {request.designation}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Interface */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: PDF Document Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden flex flex-col h-[760px]">
          <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#FCFDFE] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
              <FileText className="h-4 w-4 text-[#64748B]" />
              <span>Official Document Preview (PDF)</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={doc.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-[#4F46E5] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Open in New Tab</span>
              </a>
            </div>
          </div>

          <div className="flex-1 bg-[#475569] overflow-hidden relative">
            <iframe
              src={`${doc.pdfUrl}#toolbar=0&navpanes=0`}
              title="Official Document PDF"
              className="w-full h-full border-none"
            />
          </div>

          <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Target Signature Page: Page {request.pageNumber}</span>
            <span>Your signature will be embedded below your printed name</span>
          </div>
        </div>

        {/* Right Column: Signature Studio & Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Identity & Designation Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#E2E8F0] pb-3">
              <span className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider block mb-0.5">
                Official Authorization
              </span>
              <h2 className="text-sm font-bold text-[#0F172A]">
                Review & Apply Electronic Signature
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Signer Name:</span>
                <span className="font-semibold text-[#0F172A]">{request.authorityName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Official Role:</span>
                <span className="font-semibold text-[#0F172A]">{request.designation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Signing Order:</span>
                <span className="font-semibold text-[#0F172A]">Step #{request.signingOrder}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Today's Date:</span>
                <span className="font-semibold text-[#0F172A]">
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Signature Drawing Canvas */}
            <div className="pt-2">
              <label className="text-xs font-bold text-[#0F172A] block mb-2">
                Draw or Type Your Signature:
              </label>
              <SignatureCanvas
                onSignatureChange={(sig) => setSignatureDataUrl(sig)}
                signerName={request.authorityName}
              />
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#334155] select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                <span className="leading-snug">
                  I confirm that I have reviewed this document and agree to affix my official electronic signature in accordance with institutional guidelines.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <button
                type="button"
                onClick={handleSignSubmit}
                disabled={signing || !signatureDataUrl || !consent}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Embedding Signature into PDF...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Sign Document</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDeclineModal(true)}
                disabled={signing}
                className="w-full py-2 text-xs font-semibold text-[#64748B] hover:text-[#E11D48] transition-colors"
              >
                Decline Request or Request Changes
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Decline Signature Request</h3>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Please specify your reasons or required amendments. The requester will be notified to revise the document.
            </p>

            <div>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Budget item #3 requires clarification before sign-off..."
                className="w-full p-2.5 text-xs rounded-lg border border-[#CBD5E1] focus:ring-1 focus:ring-[#4F46E5] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineSubmit}
                disabled={declining || !declineReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#E11D48] hover:bg-[#BE123C] text-white disabled:opacity-50"
              >
                {declining ? "Submitting..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
