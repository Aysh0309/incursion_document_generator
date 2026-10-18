import React from "react";
import Link from "next/link";
import { FileText, ArrowRight, LayoutDashboard, PlusCircle, Heart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#656860] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Top Glass Navigation */}
      <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[#54574f]/75 backdrop-blur-md px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">
              Doc - Doctor
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/templates"
            className="hidden sm:inline-block text-xs font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 text-[#18181B] text-xs font-semibold transition-all shadow-sm"
          >
            <span>Create</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      {/* Main Container with Background Document Grid & Floating Clean Minimal Hero */}
      <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between">
        {/* Background Document Cards Grid */}
        <div
          className="absolute inset-0 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 p-4 sm:p-8 pointer-events-none select-none opacity-85 overflow-hidden"
          aria-hidden="true"
        >
          {/* Card 1: Project Proposal (Dark) */}
          <div className="aspect-[16/10] bg-[#1c1c1c] text-[#ded6c9] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)] flex flex-col justify-between border border-white/5">
            <div className="flex justify-between items-center text-[7px] sm:text-[9px] uppercase tracking-widest text-[#ded6c9]/60 font-mono">
              <span>PROPOSAL SPEC</span>
              <span>2026/REV</span>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-none text-[#ded6c9]">
                PROJECT
              </div>
              <div className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-none text-[#ded6c9]">
                PROPOSAL
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-[#ded6c9]/20 pt-1 text-[7px] sm:text-[8px] text-[#ded6c9]/60 font-mono">
              <span>WWW.DOC-DOCTOR.DEV</span>
              <span>PAGE 01</span>
            </div>
          </div>

          {/* Card 2: Contents (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              CONTENTS
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="space-y-1 text-[7px] sm:text-[9px] font-mono">
                <div className="flex justify-between border-b border-[#1c1c1c]/15 pb-0.5">
                  <span>01 Overview</span>
                  <span>03</span>
                </div>
                <div className="flex justify-between border-b border-[#1c1c1c]/15 pb-0.5">
                  <span>02 Scope</span>
                  <span>05</span>
                </div>
                <div className="flex justify-between border-b border-[#1c1c1c]/15 pb-0.5">
                  <span>03 Timeline</span>
                  <span>08</span>
                </div>
              </div>
              <div className="h-14 sm:h-16 bg-[#1c1c1c] rounded-xs flex items-center justify-center text-[#ded6c9] text-[8px] font-mono">
                IMAGE
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">DOCUMENT INDEX</div>
          </div>

          {/* Card 3: About Us (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              ABOUT US
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="h-12 sm:h-14 bg-[#1c1c1c] rounded-xs flex items-center justify-center text-[#ded6c9] text-[7px] font-mono">
                PORTRAIT
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-[#1c1c1c]/70 rounded-full w-full" />
                <div className="h-1.5 bg-[#1c1c1c]/50 rounded-full w-4/5" />
                <div className="h-1.5 bg-[#1c1c1c]/30 rounded-full w-3/4" />
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">CAMPUS INITIATIVE</div>
          </div>

          {/* Card 4: Our Team (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              OUR TEAM
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-square bg-[#1c1c1c] rounded-xs flex items-center justify-center text-[7px] text-[#ded6c9] font-mono">
                    M{i}
                  </div>
                  <div className="h-1 bg-[#1c1c1c]/60 rounded-full w-4/5" />
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">KEY CONTRIBUTORS</div>
          </div>

          {/* Card 5: About Project (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              ABOUT PROJECT
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <div className="text-sm sm:text-lg font-black leading-none">13M+</div>
                <div className="text-[7px] font-mono text-[#1c1c1c]/60">REQUESTS</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black leading-none">1425+</div>
                <div className="text-[7px] font-mono text-[#1c1c1c]/60">GENERATED</div>
              </div>
              <div className="h-12 bg-[#1c1c1c] rounded-xs flex items-center justify-center text-[#ded6c9] text-[7px] font-mono">
                DOC
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">SYSTEM METRICS</div>
          </div>

          {/* Card 6: Project Concept (Dark) */}
          <div className="aspect-[16/10] bg-[#1c1c1c] text-[#ded6c9] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)] flex flex-col justify-between border border-white/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT CONCEPT
            </div>
            <div className="grid grid-cols-2 gap-2 text-[7px] sm:text-[8px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-[#ded6c9] flex items-center justify-center text-[7px]">01</span>
                <span>Requirements</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-[#ded6c9] flex items-center justify-center text-[7px]">02</span>
                <span>Template Match</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-[#ded6c9] flex items-center justify-center text-[7px]">03</span>
                <span>Validation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-[#ded6c9] flex items-center justify-center text-[7px]">04</span>
                <span>Signed PDF</span>
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#ded6c9]/40">CORE ARCHITECTURE</div>
          </div>

          {/* Card 7: Budget Breakdown (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              BUDGET BREAKDOWN
            </div>
            <div className="space-y-1 text-[7px] sm:text-[8px] font-mono">
              <div className="flex justify-between font-bold border-b border-[#1c1c1c]/20 pb-0.5">
                <span>ITEM</span>
                <span>BUDGET</span>
                <span>STATUS</span>
              </div>
              <div className="flex justify-between border-b border-[#1c1c1c]/10 pb-0.5">
                <span>Venue & Audio</span>
                <span>$2,500</span>
                <span>Approved</span>
              </div>
              <div className="flex justify-between border-b border-[#1c1c1c]/10 pb-0.5">
                <span>Honorarium</span>
                <span>$1,200</span>
                <span>Pending</span>
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">FINANCIAL LEDGER</div>
          </div>

          {/* Card 8: Project Expertise (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT EXPERTISE
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <div className="text-sm sm:text-lg font-black leading-none">70+</div>
                <div className="text-[7px] font-mono text-[#1c1c1c]/60">TEMPLATES</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black leading-none">$13K+</div>
                <div className="text-[7px] font-mono text-[#1c1c1c]/60">SAVED</div>
              </div>
              <div className="h-12 bg-[#1c1c1c] rounded-xs flex items-center justify-center text-[#ded6c9] text-[7px] font-mono">
                DOCX
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">DOCUMENT STANDARDS</div>
          </div>

          {/* Card 9: Project Timeline (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT TIMELINE
            </div>
            <div className="relative flex items-center justify-between px-2 py-3">
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#1c1c1c]/30" />
              {["Phase 01", "Phase 02", "Phase 03"].map((p, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#1c1c1c] border-2 border-[#ded6c9]" />
                  <span className="text-[7px] font-mono font-bold mt-1">{p}</span>
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">SCHEDULE & MILESTONES</div>
          </div>

          {/* Card 10: Continue... (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              CONTINUE...
            </div>
            <div className="relative flex items-center justify-between px-2 py-3">
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#1c1c1c]/30" />
              {["Phase 04", "Phase 05", "The End"].map((p, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#1c1c1c] border-2 border-[#ded6c9]" />
                  <span className="text-[7px] font-mono font-bold mt-1">{p}</span>
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">FINAL DELIVERABLES</div>
          </div>

          {/* Card 11: Project Stages (Dark) */}
          <div className="aspect-[16/10] bg-[#1c1c1c] text-[#ded6c9] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)] flex flex-col justify-between border border-white/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT STAGES
            </div>
            <div className="flex items-center justify-center -space-x-2 py-2">
              {["01", "02", "03", "04"].map((step) => (
                <div
                  key={step}
                  className="w-8 sm:w-10 h-8 sm:h-10 rounded-full border border-[#ded6c9]/70 bg-[#1c1c1c]/90 flex items-center justify-center text-[8px] sm:text-[9px] font-mono font-bold text-[#ded6c9]"
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#ded6c9]/40">STAGE PROGRESSION</div>
          </div>

          {/* Card 12: Target Audience (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              TARGET AUDIENCE
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="space-y-1">
                <div className="h-1 bg-[#1c1c1c]/70 rounded w-full" />
                <div className="h-1 bg-[#1c1c1c]/50 rounded w-4/5" />
                <div className="h-1 bg-[#1c1c1c]/30 rounded w-3/5" />
              </div>
              <div className="flex items-end gap-1 h-12 justify-center">
                <div className="w-2.5 h-6 bg-[#1c1c1c]/60 rounded-xs" />
                <div className="w-2.5 h-9 bg-[#1c1c1c]/80 rounded-xs" />
                <div className="w-2.5 h-7 bg-[#1c1c1c]/60 rounded-xs" />
                <div className="w-2.5 h-11 bg-[#1c1c1c] rounded-xs" />
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">DEMOGRAPHIC METRICS</div>
          </div>

          {/* Card 13: Case Study (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              CASE STUDY
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-1.5 rounded bg-[#1c1c1c]/5 border border-[#1c1c1c]/10">
                <div className="text-sm sm:text-lg font-black leading-none">98%</div>
                <div className="text-[7px] font-mono text-[#1c1c1c]/60">APPROVAL</div>
              </div>
              <div className="p-1.5 rounded bg-[#1c1c1c]/5 border border-[#1c1c1c]/10">
                <div className="text-sm sm:text-lg font-black leading-none">99%</div>
                <div className="text-[7px] font-mono text-[#1c1c1c]/60">ACCURACY</div>
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">EMPIRICAL RESULTS</div>
          </div>

          {/* Card 14: Pricing Plans (Cream) */}
          <div className="aspect-[16/10] bg-[#ded6c9] text-[#1c1c1c] rounded-md p-3 sm:p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between border border-black/5">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PRICING PLANS
            </div>
            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                { price: "$15", dark: false },
                { price: "$25", dark: true },
                { price: "$35", dark: false },
                { price: "$45", dark: false },
              ].map((tier, idx) => (
                <div
                  key={idx}
                  className={`p-1 rounded-xs border text-[7px] font-mono ${
                    tier.dark
                      ? "bg-[#1c1c1c] text-[#ded6c9] border-[#1c1c1c]"
                      : "bg-white/40 text-[#1c1c1c] border-[#1c1c1c]/20"
                  }`}
                >
                  <div className="font-bold">{tier.price}</div>
                  <div className="h-0.5 bg-current/40 w-full mt-1" />
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#1c1c1c]/50">TIER DISTRIBUTION</div>
          </div>
        </div>

        {/* Ambient Dark Overlay to ensure ultra-crisp contrast and focus */}
        <div
          className="absolute inset-0 bg-[#54574f]/60 backdrop-blur-[2px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Floating Minimalist Hero Card */}
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="w-full max-w-xl mx-auto p-8 sm:p-12 rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center text-white">
            {/* Clean Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Doc - Doctor
            </h1>

            {/* Call to Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/events/new"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] text-sm font-semibold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="h-4 w-4 text-indigo-600" />
                <span>Create Document</span>
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <LayoutDashboard className="h-4 w-4 text-slate-300" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="relative z-10 border-t border-white/10 bg-[#54574f]/80 backdrop-blur-md py-5 px-6 sm:px-12 text-xs text-white/80">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Left */}
            <span className="font-semibold tracking-wider uppercase text-white/90">
              DOC - DOCTOR
            </span>

            {/* Middle */}
            <div className="flex items-center gap-1.5 font-medium text-white/85">
              <span>with love</span>
              <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400 inline shrink-0" />
              <span>for ACM</span>
            </div>

            {/* Right */}
            <span className="font-semibold tracking-wider uppercase text-white/70">
              by SMOOTH OPERATORS
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
