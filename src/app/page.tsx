"use client";

import React from "react";
import Link from "next/link";
import { FileText, ArrowRight, LayoutDashboard, PlusCircle, Heart, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInModal";

export default function LandingPage() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-[#F8F6F0] text-[#1C2622] font-sans selection:bg-[#E7F3ED] selection:text-[#1F6954] overflow-x-hidden">
      {/* Top Glass Navigation */}
      <header className="sticky top-0 z-50 h-16 border-b border-[#E5DFD5] bg-[#FCFAF7]/90 backdrop-blur-md px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#1F6954] flex items-center justify-center text-white shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-[#1C2622]">
              Doc - Doctor
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-[#55645C] hover:text-[#1C2622] px-3 py-1.5 rounded-lg hover:bg-[#EFECE6] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/templates"
            className="hidden sm:inline-block text-xs font-medium text-[#55645C] hover:text-[#1C2622] px-3 py-1.5 rounded-lg hover:bg-[#EFECE6] transition-colors"
          >
            Templates
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span>Admin</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <span className="text-xs font-semibold text-[#1C2622]">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="p-1.5 text-[#7A8A81] hover:text-red-600 rounded-lg hover:bg-[#EFECE6] transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <GoogleSignInButton size="small" />
          )}

          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold transition-all shadow-xs hover:shadow-sm"
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
          className="absolute inset-0 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 p-4 sm:p-8 pointer-events-none select-none opacity-80 overflow-hidden"
          aria-hidden="true"
        >
          {/* Card 1: Project Proposal (Forest Green) */}
          <div className="aspect-[16/10] bg-[#1F6954] text-[#E7F3ED] rounded-xl p-3 sm:p-4 shadow-[0_12px_30px_rgba(31,105,84,0.18)] flex flex-col justify-between border border-[#175342]">
            <div className="flex justify-between items-center text-[7px] sm:text-[9px] uppercase tracking-widest text-[#BCD8CB] font-mono">
              <span>PROPOSAL SPEC</span>
              <span>2026/REV</span>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-none text-white">
                PROJECT
              </div>
              <div className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-none text-white">
                PROPOSAL
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-[#BCD8CB]/25 pt-1 text-[7px] sm:text-[8px] text-[#BCD8CB] font-mono">
              <span>WWW.DOC-DOCTOR.DEV</span>
              <span>PAGE 01</span>
            </div>
          </div>

          {/* Card 2: Contents (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight text-[#1C2622]">
              CONTENTS
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="space-y-1 text-[7px] sm:text-[9px] font-mono">
                <div className="flex justify-between border-b border-[#E5DFD5] pb-0.5">
                  <span>01 Overview</span>
                  <span className="text-[#1F6954] font-bold">03</span>
                </div>
                <div className="flex justify-between border-b border-[#E5DFD5] pb-0.5">
                  <span>02 Scope</span>
                  <span className="text-[#1F6954] font-bold">05</span>
                </div>
                <div className="flex justify-between border-b border-[#E5DFD5] pb-0.5">
                  <span>03 Timeline</span>
                  <span className="text-[#1F6954] font-bold">08</span>
                </div>
              </div>
              <div className="h-14 sm:h-16 bg-[#E7F3ED] border border-[#BCD8CB] rounded-md flex items-center justify-center text-[#1A5A48] text-[8px] font-mono font-bold">
                IMAGE
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">DOCUMENT INDEX</div>
          </div>

          {/* Card 3: About Us (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              ABOUT US
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="h-12 sm:h-14 bg-[#1F6954] rounded-md flex items-center justify-center text-[#E7F3ED] text-[7px] font-mono font-bold">
                PORTRAIT
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-[#1F6954]/80 rounded-full w-full" />
                <div className="h-1.5 bg-[#BCD8CB] rounded-full w-4/5" />
                <div className="h-1.5 bg-[#E5DFD5] rounded-full w-3/4" />
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">CAMPUS INITIATIVE</div>
          </div>

          {/* Card 4: Our Team (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              OUR TEAM
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-square bg-[#E7F3ED] border border-[#BCD8CB] rounded-md flex items-center justify-center text-[7px] text-[#1A5A48] font-mono font-bold">
                    M{i}
                  </div>
                  <div className="h-1 bg-[#1F6954]/60 rounded-full w-4/5" />
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">KEY CONTRIBUTORS</div>
          </div>

          {/* Card 5: About Project (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              ABOUT PROJECT
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <div className="text-sm sm:text-lg font-black leading-none text-[#1F6954]">13M+</div>
                <div className="text-[7px] font-mono text-[#7A8A81]">REQUESTS</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black leading-none text-[#1C2622]">1425+</div>
                <div className="text-[7px] font-mono text-[#7A8A81]">GENERATED</div>
              </div>
              <div className="h-12 bg-[#1F6954] rounded-md flex items-center justify-center text-white text-[7px] font-mono font-bold">
                DOC
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">SYSTEM METRICS</div>
          </div>

          {/* Card 6: Project Concept (Forest Green) */}
          <div className="aspect-[16/10] bg-[#1F6954] text-white rounded-xl p-3 sm:p-4 shadow-[0_12px_30px_rgba(31,105,84,0.18)] flex flex-col justify-between border border-[#175342]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT CONCEPT
            </div>
            <div className="grid grid-cols-2 gap-2 text-[7px] sm:text-[8px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-white/70 flex items-center justify-center text-[7px] font-bold">01</span>
                <span>Requirements</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-white/70 flex items-center justify-center text-[7px] font-bold">02</span>
                <span>Template Match</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-white/70 flex items-center justify-center text-[7px] font-bold">03</span>
                <span>Validation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-white/70 flex items-center justify-center text-[7px] font-bold">04</span>
                <span>Signed PDF</span>
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#BCD8CB]">CORE ARCHITECTURE</div>
          </div>

          {/* Card 7: Budget Breakdown (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              BUDGET BREAKDOWN
            </div>
            <div className="space-y-1 text-[7px] sm:text-[8px] font-mono">
              <div className="flex justify-between font-bold border-b border-[#E5DFD5] pb-0.5">
                <span>ITEM</span>
                <span>BUDGET</span>
                <span>STATUS</span>
              </div>
              <div className="flex justify-between border-b border-[#E5DFD5]/60 pb-0.5">
                <span>Venue & Audio</span>
                <span>$2,500</span>
                <span className="text-[#1F6954] font-bold">Approved</span>
              </div>
              <div className="flex justify-between border-b border-[#E5DFD5]/60 pb-0.5">
                <span>Honorarium</span>
                <span>$1,200</span>
                <span className="text-[#D9822B] font-bold">Pending</span>
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">FINANCIAL LEDGER</div>
          </div>

          {/* Card 8: Project Expertise (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT EXPERTISE
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <div className="text-sm sm:text-lg font-black leading-none text-[#1F6954]">70+</div>
                <div className="text-[7px] font-mono text-[#7A8A81]">TEMPLATES</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black leading-none text-[#1C2622]">$13K+</div>
                <div className="text-[7px] font-mono text-[#7A8A81]">SAVED</div>
              </div>
              <div className="h-12 bg-[#E7F3ED] border border-[#BCD8CB] rounded-md flex items-center justify-center text-[#1A5A48] text-[7px] font-mono font-bold">
                DOCX
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">DOCUMENT STANDARDS</div>
          </div>

          {/* Card 9: Project Timeline (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT TIMELINE
            </div>
            <div className="relative flex items-center justify-between px-2 py-3">
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#E5DFD5]" />
              {["Phase 01", "Phase 02", "Phase 03"].map((p, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#1F6954] border-2 border-white shadow-2xs" />
                  <span className="text-[7px] font-mono font-bold mt-1 text-[#55645C]">{p}</span>
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">SCHEDULE & MILESTONES</div>
          </div>

          {/* Card 10: Continue... (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              CONTINUE...
            </div>
            <div className="relative flex items-center justify-between px-2 py-3">
              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#E5DFD5]" />
              {["Phase 04", "Phase 05", "The End"].map((p, idx) => (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#1F6954] border-2 border-white shadow-2xs" />
                  <span className="text-[7px] font-mono font-bold mt-1 text-[#55645C]">{p}</span>
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">FINAL DELIVERABLES</div>
          </div>

          {/* Card 11: Project Stages (Forest Green) */}
          <div className="aspect-[16/10] bg-[#1F6954] text-white rounded-xl p-3 sm:p-4 shadow-[0_12px_30px_rgba(31,105,84,0.18)] flex flex-col justify-between border border-[#175342]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              PROJECT STAGES
            </div>
            <div className="flex items-center justify-center -space-x-2 py-2">
              {["01", "02", "03", "04"].map((step) => (
                <div
                  key={step}
                  className="w-8 sm:w-10 h-8 sm:h-10 rounded-full border border-white/60 bg-[#175342] flex items-center justify-center text-[8px] sm:text-[9px] font-mono font-bold text-white shadow-xs"
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#BCD8CB]">STAGE PROGRESSION</div>
          </div>

          {/* Card 12: Target Audience (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              TARGET AUDIENCE
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="space-y-1">
                <div className="h-1 bg-[#1F6954] rounded w-full" />
                <div className="h-1 bg-[#BCD8CB] rounded w-4/5" />
                <div className="h-1 bg-[#E5DFD5] rounded w-3/5" />
              </div>
              <div className="flex items-end gap-1 h-12 justify-center">
                <div className="w-2.5 h-6 bg-[#BCD8CB] rounded-xs" />
                <div className="w-2.5 h-9 bg-[#1F6954]/70 rounded-xs" />
                <div className="w-2.5 h-7 bg-[#BCD8CB] rounded-xs" />
                <div className="w-2.5 h-11 bg-[#1F6954] rounded-xs" />
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">DEMOGRAPHIC METRICS</div>
          </div>

          {/* Card 13: Case Study (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
            <div className="text-sm sm:text-base font-black uppercase tracking-tight">
              CASE STUDY
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-1.5 rounded-lg bg-[#E7F3ED] border border-[#BCD8CB]">
                <div className="text-sm sm:text-lg font-black leading-none text-[#1F6954]">98%</div>
                <div className="text-[7px] font-mono text-[#1A5A48] mt-0.5">APPROVAL</div>
              </div>
              <div className="p-1.5 rounded-lg bg-[#E7F3ED] border border-[#BCD8CB]">
                <div className="text-sm sm:text-lg font-black leading-none text-[#1F6954]">99%</div>
                <div className="text-[7px] font-mono text-[#1A5A48] mt-0.5">ACCURACY</div>
              </div>
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">EMPIRICAL RESULTS</div>
          </div>

          {/* Card 14: Pricing Plans (Off-white Cream) */}
          <div className="aspect-[16/10] bg-white text-[#1C2622] rounded-xl p-3 sm:p-4 shadow-[0_8px_24px_rgba(28,38,34,0.06)] flex flex-col justify-between border border-[#E5DFD5]">
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
                  className={`p-1 rounded-md border text-[7px] font-mono ${
                    tier.dark
                      ? "bg-[#1F6954] text-white border-[#175342]"
                      : "bg-[#E7F3ED] text-[#1A5A48] border-[#BCD8CB]"
                  }`}
                >
                  <div className="font-bold">{tier.price}</div>
                  <div className="h-0.5 bg-current/30 w-full mt-1" />
                </div>
              ))}
            </div>
            <div className="text-[7px] font-mono text-[#7A8A81]">TIER DISTRIBUTION</div>
          </div>
        </div>

        {/* Ambient Warm Off-white Overlay to ensure ultra-crisp contrast and focus */}
        <div
          className="absolute inset-0 bg-[#F8F6F0]/70 backdrop-blur-[2px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Floating Minimalist Hero Card */}
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="w-full max-w-xl mx-auto p-8 sm:p-12 rounded-3xl bg-[#FCFAF7]/95 backdrop-blur-2xl border border-[#E5DFD5] shadow-[0_25px_60px_-15px_rgba(28,38,34,0.12)] text-center text-[#1C2622]">
            {/* Clean Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1C2622] leading-tight">
              Doc - Doctor
            </h1>

            {/* Signed-in badge or Welcome info */}
            {user ? (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E7F3ED] border border-[#BCD8CB] text-xs text-[#1A5A48]">
                <span>Signed in as <strong>{user.name}</strong></span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  user.role === "CLUB_ADMIN"
                    ? "bg-purple-100 text-purple-700"
                    : user.role === "FACULTY_APPROVER"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {user.role === "CLUB_ADMIN" ? "Admin" : user.role === "FACULTY_APPROVER" ? "Faculty" : "Member"}
                </span>
              </div>
            ) : null}

            {/* Call to Actions */}
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              {!user ? (
                <GoogleSignInButton size="large" className="w-full sm:w-auto" />
              ) : null}

              <Link
                href="/events/new"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#1F6954] hover:bg-[#175342] text-white text-sm font-semibold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="h-4 w-4 text-white" />
                <span>Create Document</span>
              </Link>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#E7F3ED] hover:bg-[#DDF0E6] border border-[#BCD8CB] text-[#1A5A48] text-sm font-semibold transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
              >
                <LayoutDashboard className="h-4 w-4 text-[#1F6954]" />
                <span>Dashboard</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-sm font-semibold transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <span>Admin Portal</span>
                </Link>
              )}
            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="relative z-10 border-t border-[#E5DFD5] bg-[#FCFAF7]/90 backdrop-blur-md py-5 px-6 sm:px-12 text-xs text-[#66756D]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Left */}
            <span className="font-semibold tracking-wider uppercase text-[#1C2622]">
              DOC - DOCTOR
            </span>

            {/* Middle */}
            <div className="flex items-center gap-1.5 font-medium text-[#55645C]">
              <span>with love</span>
              <Heart className="h-3.5 w-3.5 text-[#1F6954] fill-[#1F6954] inline shrink-0" />
              <span>for ACM</span>
            </div>

            {/* Right */}
            <span className="font-semibold tracking-wider uppercase text-[#7A8A81]">
              by SMOOTH OPERATORS
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
