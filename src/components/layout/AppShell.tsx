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
  Menu,
  X,
} from "lucide-react";
import { UserRole } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("CLUB_ADMIN");

  useEffect(() => {
    const saved = localStorage.getItem("incursion_user_role") as UserRole;
    if (saved) {
      setCurrentRole(saved);
    } else {
      localStorage.setItem("incursion_user_role", "CLUB_ADMIN");
    }
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem("incursion_user_role", role);
    window.dispatchEvent(new CustomEvent("roleChange", { detail: role }));
  };

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: CalendarDays },
    { label: "Documents", href: "/documents", icon: FileText },
    { label: "Templates", href: "/templates", icon: FileStack, adminOnly: true },
    { label: "Approvals", href: "/approvals", icon: CheckSquare, approverOnly: true },
    { label: "Club Settings", href: "/settings", icon: Building2 },
  ];

  return (
    <div className="flex h-screen bg-[#F8F6F0] text-[#1C2622] overflow-hidden">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-[#E5DFD5] bg-[#FCFAF7] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-0 max-lg:-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-[#E5DFD5] flex items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#1F6954] flex items-center justify-center text-white shadow-xs">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-[#1C2622] block">
                Doc - Doctor
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-[#66756D] hover:text-[#1C2622]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="text-[10px] font-semibold text-[#829288] uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            if (item.adminOnly && currentRole === "MEMBER") return null;
            if (item.approverOnly && currentRole !== "FACULTY_APPROVER") return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#E7F3ED] text-[#1A5A48] font-semibold shadow-2xs border border-[#BCD8CB]/60"
                    : "text-[#55645C] hover:bg-[#F2EFE9] hover:text-[#1C2622]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#1F6954]" : "text-[#7A8A81]"}`} />
                <span>{item.label}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#66756D] font-mono border border-[#E5DFD5]">
                    Admin
                  </span>
                )}
                {item.approverOnly && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[#E7F3ED] text-[#1F6954] font-mono border border-[#BCD8CB]">
                    Review
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Role Simulator */}
        <div className="p-3 border-t border-[#E5DFD5] bg-[#F5F2EC]">
          <div className="text-[10px] font-semibold text-[#66756D] uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Demo Role Simulator</span>
            <ShieldCheck className="h-3 w-3 text-[#1F6954]" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(["MEMBER", "CLUB_ADMIN", "FACULTY_APPROVER"] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`text-[10px] py-1 px-1 text-center rounded-md border transition-all ${
                  currentRole === role
                    ? "bg-[#1F6954] text-white border-[#1F6954] font-semibold shadow-2xs"
                    : "bg-[#FCFAF7] text-[#55645C] border-[#E5DFD5] hover:bg-[#EFECE6]"
                }`}
              >
                {role === "MEMBER" ? "Member" : role === "CLUB_ADMIN" ? "Admin" : "Faculty"}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#E5DFD5] bg-[#FCFAF7] flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-[#66756D] hover:text-[#1C2622] hover:bg-[#F2EFE9]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#7A8A81]">
              <Link href="/dashboard" className="hover:text-[#1C2622]">
                Campus Hub
              </Link>
              <ChevronRight className="h-3 w-3 text-[#A3B0A8]" />
              <span className="font-semibold text-[#1C2622] capitalize">
                {pathname === "/" ? "Home" : pathname.replace(/^\//, "").split("/")[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/events/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-medium transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Event</span>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8F6F0]">{children}</main>
      </div>
    </div>
  );
}
