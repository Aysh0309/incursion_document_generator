import React from "react";
import Link from "next/link";
import {
  FileCheck,
  ArrowRight,
  ShieldAlert,
  FileCode2,
  FileDown,
  Layers,
  CheckCircle2,
  Calendar,
  Sparkles,
  School,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#18181B] flex flex-col font-sans">
      {/* Product Top Navigation */}
      <header className="h-16 border-b border-[#E2E8F0] bg-white sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-[#4F46E5] flex items-center justify-center text-white shadow-xs">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-[#18181B] block">
              Smart Document Generator
            </span>
            <span className="text-[10px] font-medium text-[#64748B] block">
              Incursion Hackathon • Track 01
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-[#475569] hover:text-[#18181B] px-3 py-1.5 rounded-md hover:bg-[#F1F5F9] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/events/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium transition-colors shadow-xs"
          >
            <span>Create Documents</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] mb-6 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-[#4F46E5]" />
            <span>Track 01: Requirements In, Branded Club Documents Out</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#18181B] max-w-3xl mx-auto leading-tight sm:leading-tight">
            Turn Event Ideas into Official Club Documents.
          </h1>

          <p className="mt-5 text-sm sm:text-base text-[#64748B] max-w-2xl mx-auto leading-relaxed">
            Create branded event proposals, permission letters, and invitations from one verified event profile.
            No repetitive formatting. No invented official details.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/events/new"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium transition-colors shadow-xs"
            >
              <span>Create Documents</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#18181B] text-sm font-medium transition-colors shadow-2xs"
            >
              <span>Explore Dashboard</span>
            </Link>
          </div>
        </section>

        {/* Realistic Document Generation Preview */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
            <div className="h-10 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
                <span className="text-[11px] font-medium text-[#64748B] ml-2">
                  Studio Preview • Input to Vectorized DOCX & PDF
                </span>
              </div>
              <span className="text-[10px] uppercase font-semibold text-[#059669] px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0]">
                Verified Factual Integrity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
              {/* Left: Input Text and Extracted Entities */}
              <div className="p-6 bg-[#FCFDFE]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    1. Plain English Input
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">Single Entry</span>
                </div>

                <div className="p-3.5 rounded-md border border-[#E2E8F0] bg-white text-xs text-[#334155] font-mono leading-relaxed mb-4">
                  "Organizing an AI & ML Workshop on Nov 14, 2026 at CS Lab 3 from 9:30 AM to 4:30 PM. Speaker is Dev Sharma from Google. Expected students: 85. Budget is INR 15,000. Need lab permission from HOD Dr. Verma. Coordinated by Prof. Sharma."
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] block">
                    Extracted & Verified Parameters:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded border border-[#E2E8F0] bg-white">
                      <span className="text-[10px] text-[#64748B] block">Event Title</span>
                      <span className="font-medium text-[#18181B] truncate block">AI & ML Workshop</span>
                    </div>
                    <div className="p-2 rounded border border-[#E2E8F0] bg-white">
                      <span className="text-[10px] text-[#64748B] block">Venue</span>
                      <span className="font-medium text-[#18181B] truncate block">CS Lab 3</span>
                    </div>
                    <div className="p-2 rounded border border-[#E2E8F0] bg-white">
                      <span className="text-[10px] text-[#64748B] block">Date & Timing</span>
                      <span className="font-medium text-[#18181B] truncate block">Nov 14 • 9:30 AM</span>
                    </div>
                    <div className="p-2 rounded border border-[#E2E8F0] bg-white">
                      <span className="text-[10px] text-[#64748B] block">Resource Person</span>
                      <span className="font-medium text-[#18181B] truncate block">Dev Sharma (Google)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Compiled Document Card */}
              <div className="p-6 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      2. Compiled Branded Documents
                    </span>
                    <span className="text-[10px] text-[#4F46E5] font-semibold">1 Profile = 3 Files</span>
                  </div>

                  {/* Preview Paper Simulation */}
                  <div className="p-4 rounded-md border border-[#E2E8F0] bg-[#FAFAFA] text-left shadow-2xs space-y-2.5">
                    <div className="border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-[#4F46E5] uppercase block">
                          DEPARTMENT OF COMPUTER SCIENCE
                        </span>
                        <span className="text-[9px] text-[#64748B]">National Institute of Technology</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#64748B]">Ref: PERM/2026/04</span>
                    </div>

                    <div className="text-[11px] font-semibold text-[#18181B]">
                      Subject: Requisition for room and lab allocation for "AI & ML Workshop"
                    </div>

                    <p className="text-[10px] text-[#475569] leading-relaxed line-clamp-3">
                      We, the student coordinators of GDSC, request your kind permission to conduct a technical workshop for 85 students on November 14, 2026 at CS Lab 3...
                    </p>

                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[9px] text-[#64748B]">
                      <span>Student Lead: Aarav Patel</span>
                      <span>Faculty Advisor: Prof. Sunita Sharma</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#059669] font-medium text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Real .docx & .pdf Ready</span>
                  </div>
                  <Link
                    href="/events/new"
                    className="text-[#4F46E5] hover:text-[#4338CA] font-medium text-xs flex items-center gap-1"
                  >
                    <span>Generate Now</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Core Architectural Pillars */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
              Engineered for Institutional Integrity
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">
              Why university leadership trusts this workflow over consumer chat tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
              <div className="h-8 w-8 rounded-md bg-[#FEF2F2] text-[#E11D48] flex items-center justify-center mb-3.5">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Ask, Don't Invent</h3>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                The AI never fabricates dates, venues, faculty names, or signatures. Missing information triggers deterministic clarification questions.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
              <div className="h-8 w-8 rounded-md bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mb-3.5">
                <FileDown className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Native DOCX & PDF Output</h3>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                Generates genuine OpenXML `.docx` files and vectorized `.pdf` preserving headers, footers, typography, and margins ready for formal print.
              </p>
            </div>

            <div className="p-5 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
              <div className="h-8 w-8 rounded-md bg-[#ECFDF5] text-[#059669] flex items-center justify-center mb-3.5">
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-[#18181B]">Batch Reusability</h3>
              <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                Describe the event once. Generate Event Proposals, Lab Permission Letters, and Speaker Invitations simultaneously and download as a ZIP.
              </p>
            </div>
          </div>
        </section>

        {/* 4-Step Workflow Walkthrough */}
        <section className="border-t border-[#E2E8F0] bg-white py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4F46E5]">
                How It Works
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B] mt-1">
                From Rough Idea to Final Signed Document
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#475569] font-bold text-xs flex items-center justify-center mb-3">
                  1
                </span>
                <h4 className="font-semibold text-xs text-[#18181B]">Describe Event</h4>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Provide notes in plain English or fill out structured fields.
                </p>
              </div>

              <div className="p-4 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#475569] font-bold text-xs flex items-center justify-center mb-3">
                  2
                </span>
                <h4 className="font-semibold text-xs text-[#18181B]">Validate & Clarify</h4>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Answer targeted questions for missing facts without hallucination.
                </p>
              </div>

              <div className="p-4 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#475569] font-bold text-xs flex items-center justify-center mb-3">
                  3
                </span>
                <h4 className="font-semibold text-xs text-[#18181B]">Batch Generate</h4>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Select templates; compile native DOCX and PDF files instantly.
                </p>
              </div>

              <div className="p-4 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="h-6 w-6 rounded-full bg-[#E2E8F0] text-[#475569] font-bold text-xs flex items-center justify-center mb-3">
                  4
                </span>
                <h4 className="font-semibold text-xs text-[#18181B]">Review & Export</h4>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                  Tweak fields, regenerate new versions, and export files or ZIP bundle.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Restrained Institutional Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 px-6 text-center text-xs text-[#64748B]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <School className="h-4 w-4 text-[#4F46E5]" />
            <span className="font-medium text-[#18181B]">
              Smart Document Generator
            </span>
            <span>— University Workflow Automation</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/dashboard" className="hover:text-[#18181B]">
              Dashboard
            </Link>
            <Link href="/events/new" className="hover:text-[#18181B]">
              Create Event
            </Link>
            <Link href="/templates" className="hover:text-[#18181B]">
              Templates
            </Link>
            <Link href="/api/health" className="hover:text-[#18181B]">
              System Health
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
