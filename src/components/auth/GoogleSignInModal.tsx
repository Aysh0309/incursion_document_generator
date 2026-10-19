"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Check, ArrowRight, ShieldCheck, UserCheck, GraduationCap, Sparkles } from "lucide-react";

export function GoogleLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInModal() {
  const { isGoogleModalOpen, closeGoogleModal, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isGoogleModalOpen) return null;

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please provide a valid Google email address");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle({
        email: email.trim(),
        name: name.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = async (account: { name: string; email: string; roleDesc: string; icon: any }) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle({
        name: account.name,
        email: account.email,
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(account.name)}`,
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const QUICK_ACCOUNTS = [
    {
      name: "Club Administrator",
      email: "admin@campus.edu",
      roleDesc: "Full administrative access & role management",
      icon: ShieldCheck,
      badge: "Admin",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    },
    {
      name: "Dr. Sunita Sharma",
      email: "faculty@campus.edu",
      roleDesc: "Faculty approver & document signer",
      icon: GraduationCap,
      badge: "Faculty",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    {
      name: "Student Member",
      email: "member@campus.edu",
      roleDesc: "Event organizer & document generator",
      icon: UserCheck,
      badge: "Member",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
              <GoogleLogo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Continue with Google
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in or sign up to your account
              </p>
            </div>
          </div>
          <button
            onClick={closeGoogleModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg">
              {error}
            </div>
          )}

          {/* Quick 1-click accounts */}
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Choose an account
            </span>
            <div className="space-y-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    disabled={loading}
                    onClick={() => handleQuickSelect(acc)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition group flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-105 transition">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {acc.name}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${acc.badgeColor}`}>
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {acc.email}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
              Or use another Google account
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          {/* Custom form */}
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Google Email
              </label>
              <input
                type="email"
                placeholder="you@gmail.com or campus email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full mt-2 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              <GoogleLogo className="w-4 h-4 bg-white rounded-full p-0.5" />
              <span>{loading ? "Signing in..." : "Continue with Google"}</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          Secure authentication for student clubs and faculty coordinators.
        </div>
      </div>
    </div>
  );
}

export function GoogleSignInButton({
  className = "",
  size = "default",
  variant = "white",
}: {
  className?: string;
  size?: "default" | "large" | "small";
  variant?: "white" | "dark" | "outline";
}) {
  const { openGoogleModal, user } = useAuth();

  if (user) {
    return null;
  }

  const baseStyles =
    "inline-flex items-center justify-center font-medium transition duration-200 cursor-pointer shadow-sm active:scale-[0.99] select-none";

  const sizeStyles = {
    small: "px-3 py-1.5 text-xs rounded-md space-x-2",
    default: "px-4 py-2.5 text-sm rounded-lg space-x-2.5",
    large: "px-6 py-3.5 text-base rounded-xl space-x-3 shadow-md",
  }[size];

  const variantStyles = {
    white:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100 dark:border-slate-700 hover:shadow",
    dark: "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 shadow-slate-900/10",
    outline:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700",
  }[variant];

  return (
    <button
      type="button"
      onClick={openGoogleModal}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      <GoogleLogo className={size === "small" ? "w-4 h-4" : size === "large" ? "w-5 h-5" : "w-4 h-4"} />
      <span className="font-semibold tracking-tight">Continue with Google</span>
    </button>
  );
}
