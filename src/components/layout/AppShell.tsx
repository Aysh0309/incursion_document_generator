"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  FileStack,
  CheckSquare,
  Building2,
  Plus,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { UserRole } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("MEMBER");
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch(() => null);
  }, []);

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: CalendarDays },
    { label: "Documents", href: "/documents", icon: FileText },
    { label: "Templates", href: "/templates", icon: FileStack, adminOnly: true },
    { label: "Approvals", href: "/approvals", icon: CheckSquare, approverOnly: true },
    { label: "Club Settings", href: "/settings", icon: Building2 },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#18181B] overflow-hidden">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-[#E2E8F0] bg-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-0 max-lg:-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-[#E2E8F0] flex items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md bg-[#4F46E5] flex items-center justify-center text-white shadow-xs">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-[#18181B] block">
                Smart Document
              </span>
              <span className="text-[10px] font-medium text-[#64748B] block tracking-normal">
                Incursion Track 01 • Campus
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-[#64748B] hover:text-[#18181B]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Action */}
        <div className="p-4">
          <Link
            href="/events/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event Documents</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#EEF2FF] text-[#4F46E5] font-semibold"
                    : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#18181B]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#4F46E5]" : "text-[#64748B]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.adminOnly && (
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                    Admin
                  </span>
                )}
                {item.approverOnly && (
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#D97706]">
                    Faculty
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System & Role Switcher for Hackathon Judges */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Demo Role Simulator</span>
            <ShieldCheck className="h-3 w-3 text-[#059669]" />
          </div>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {(["MEMBER", "CLUB_ADMIN", "FACULTY_APPROVER"] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                className={`text-[10px] py-1 px-1 text-center rounded border transition-colors ${
                  currentRole === role
                    ? "bg-[#4F46E5] text-white border-[#4F46E5] font-semibold"
                    : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                }`}
              >
                {role === "MEMBER" ? "Member" : role === "CLUB_ADMIN" ? "Admin" : "Faculty"}
              </button>
            ))}
          </div>

          {/* Engine Status pill */}
          <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#059669] inline-block animate-pulse" />
              <span>Doc Engine Ready</span>
            </span>
            <Link
              href="/api/health"
              target="_blank"
              className="text-[#4F46E5] hover:underline flex items-center gap-0.5 text-[10px]"
            >
              <span>API</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[#64748B] hover:text-[#18181B] hover:bg-[#F1F5F9]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Link href="/dashboard" className="hover:text-[#18181B]">
                Campus Hub
              </Link>
              <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
              <span className="font-semibold text-[#18181B] capitalize">
                {pathname === "/" ? "Home" : pathname.replace(/^\//, "").split("/")[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Engine Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]">
              <Cpu className="h-3.5 w-3.5 text-[#4F46E5]" />
              <span>
                {healthStatus?.environment?.ai?.mode || "AI Extractor: Active"}
              </span>
            </div>

            <Link
              href="/events/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Event</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
