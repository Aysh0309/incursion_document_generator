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
  ShieldCheck,
  Menu,
  X,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { UserRole } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInModal";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentRole: UserRole = user?.role || "MEMBER";

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Events", href: "/events", icon: CalendarDays },
    { label: "Documents", href: "/documents", icon: FileText },
    { label: "Templates", href: "/templates", icon: FileStack, adminOnly: true },
    { label: "Approvals", href: "/approvals", icon: CheckSquare, approverOnly: true },
    { label: "Role Management", href: "/admin", icon: ShieldCheck, adminOnly: true },
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
            <div className="flex items-center text-xs text-[#7A8A81]">
              <span className="font-semibold text-[#1C2622] capitalize">
                {pathname === "/" ? "Home" : pathname.replace(/^\//, "").split("/")[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 pl-2">
                <div className="text-left">
                  <div className="text-xs font-semibold text-[#1C2622] leading-none">
                    {user.name}
                  </div>
                  <span
                    className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                      user.role === "CLUB_ADMIN"
                        ? "bg-purple-100 text-purple-700"
                        : user.role === "FACULTY_APPROVER"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {user.role === "CLUB_ADMIN" ? "Admin" : user.role === "FACULTY_APPROVER" ? "Faculty" : "Member"}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-[#7A8A81] hover:text-red-600 rounded-lg hover:bg-[#EFECE6] transition-colors ml-1"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <GoogleSignInButton size="small" />
            )}

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
