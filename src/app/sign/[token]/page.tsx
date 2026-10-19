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
        throw new Error(json.error?.message || "Failed to affix signature.");
      }

      setSignSuccess(json.data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSigning(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!declineReason.trim()) {
      alert("Please specify a reason for declining.");
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
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-[#1F6954] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#7A8A81]">Verifying secure electronic signature authorization...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5DFD5] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#FDF2F0] text-[#C24138] flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-[#1C2622]">Authorization Notice</h1>
          <p className="text-xs text-[#7A8A81] leading-relaxed">{errorMsg}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-[#EFECE6] hover:bg-[#E5DFD5] text-[#1C2622] transition-colors"
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
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5DFD5] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-[#1F6954]" />
          </div>
          <h1 className="text-base font-bold text-[#1C2622]">Already Signed</h1>
          <p className="text-xs text-[#7A8A81] leading-relaxed">
            You have already officially signed <strong>{data?.document?.title}</strong> in your capacity as{" "}
            <strong>{data?.request?.designation}</strong>.
          </p>
          {data?.document?.pdfUrl && (
            <div className="pt-2">
              <a
                href={data.document.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white shadow-xs transition-colors"
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
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5DFD5] p-8 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3] flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-[#1C2622]">Request Declined</h1>
          <p className="text-xs text-[#7A8A81] leading-relaxed">
            Your remarks have been recorded in the workflow audit trail. The requester has been notified to modify the document parameters accordingly.
          </p>
        </div>
      </div>
    );
  }

  if (signSuccess) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#BCD8CB] p-8 text-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-[#E7F3ED] text-[#1F6954] border border-[#BCD8CB] flex items-center justify-center mx-auto ring-8 ring-[#E7F3ED]/60">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-[#1A5A48]">Signature Successfully Affixed!</h1>
            <p className="text-xs text-[#7A8A81] leading-relaxed">
              Your electronic signature has been embedded directly below your printed name into the official PDF artifact.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E5DFD5] text-xs text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-[#7A8A81]">Document:</span>
              <span className="font-semibold text-[#1C2622]">{data?.document?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A8A81]">Signed As:</span>
              <span className="font-semibold text-[#1C2622]">{data?.request?.authorityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A8A81]">Designation:</span>
              <span className="font-semibold text-[#1C2622]">{data?.request?.designation}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <a
              href={signSuccess.signedPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white font-semibold text-xs shadow-xs transition-colors"
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
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col">
      {/* Top Banner Ribbon */}
      <header className="bg-white border-b border-[#E5DFD5] px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#E7F3ED] text-[#1F6954] border border-[#BCD8CB] flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold text-[#1C2622] tracking-tight sm:text-sm">
                  {doc.title}
                </h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]">
                  Awaiting Your Signature
                </span>
              </div>
              <p className="text-[11px] text-[#7A8A81]">
                {club?.name} • Ref: {doc.id}
              </p>
            </div>
          </div>

          {/* Authority identity chip */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F4] text-xs">
            <UserCheck className="h-4 w-4 text-[#1F6954]" />
            <div className="text-left">
              <span className="font-semibold text-[#1C2622] block leading-tight">
                {request.authorityName}
              </span>
              <span className="text-[10px] text-[#7A8A81] block leading-tight">
                {request.designation}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split Interface */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: PDF Document Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E5DFD5] shadow-2xs overflow-hidden flex flex-col h-[760px]">
          <div className="px-4 py-2.5 border-b border-[#E5DFD5] bg-[#FAF8F4] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1C2622]">
              <FileText className="h-4 w-4 text-[#1F6954]" />
              <span>Official Document Preview (PDF)</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={doc.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-[#1F6954] hover:text-[#175342] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Open in New Tab</span>
              </a>
            </div>
          </div>

          <div className="flex-1 bg-[#EFECE6] overflow-hidden relative">
            <iframe
              src={`${doc.pdfUrl}#toolbar=0&navpanes=0`}
              title="Official Document PDF"
              className="w-full h-full border-none"
            />
          </div>

          <div className="px-4 py-2 bg-[#FAF8F4] border-t border-[#E5DFD5] text-[11px] text-[#7A8A81] flex items-center justify-between">
            <span>Target Signature Page: Page {request.pageNumber}</span>
            <span>Your signature will be embedded below your printed name</span>
          </div>
        </div>

        {/* Right Column: Signature Studio & Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Identity & Designation Card */}
          <div className="bg-white rounded-xl border border-[#E5DFD5] p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#E5DFD5] pb-3">
              <span className="text-[10px] font-bold text-[#1F6954] uppercase tracking-wider block mb-0.5">
                Official Authorization
              </span>
              <h2 className="text-sm font-bold text-[#1C2622]">
                Review & Apply Electronic Signature
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E5DFD5]/60">
                <span className="text-[#7A8A81]">Signer Name:</span>
                <span className="font-semibold text-[#1C2622]">{request.authorityName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5DFD5]/60">
                <span className="text-[#7A8A81]">Official Role:</span>
                <span className="font-semibold text-[#1C2622]">{request.designation}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5DFD5]/60">
                <span className="text-[#7A8A81]">Signing Order:</span>
                <span className="font-semibold text-[#1C2622]">Step #{request.signingOrder}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E5DFD5]/60">
                <span className="text-[#7A8A81]">Today's Date:</span>
                <span className="font-semibold text-[#1C2622]">
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
              <label className="text-xs font-bold text-[#1C2622] block mb-2">
                Draw or Type Your Signature:
              </label>
              <SignatureCanvas
                onSignatureChange={(sig) => setSignatureDataUrl(sig)}
                signerName={request.authorityName}
              />
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#2D3934] select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#E5DFD5] accent-[#1F6954]"
                />
                <span className="leading-snug">
                  I confirm that I have reviewed this document and agree to affix my official electronic signature in accordance with institutional guidelines.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#E5DFD5] space-y-2.5">
              <button
                type="button"
                onClick={handleSignSubmit}
                disabled={signing || !signatureDataUrl || !consent}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full py-2 text-xs font-semibold text-[#7A8A81] hover:text-[#C24138] transition-colors"
              >
                Decline Request or Request Changes
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DFD5] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-3">
              <h3 className="text-sm font-bold text-[#1C2622]">Decline Signature Request</h3>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="text-[#7A8A81] hover:text-[#1C2622]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#7A8A81]">
              Please specify your reasons or required amendments. The requester will be notified to revise the document.
            </p>

            <div>
              <textarea
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Budget item #3 requires clarification before sign-off..."
                className="w-full p-2.5 text-xs rounded-lg border border-[#E5DFD5] bg-[#FAF8F4] focus:bg-white focus:ring-1 focus:ring-[#1F6954] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[#E5DFD5] text-[#66756D] hover:bg-[#FAF8F4]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineSubmit}
                disabled={declining || !declineReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#C24138] hover:bg-[#A8322A] text-white disabled:opacity-50"
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
