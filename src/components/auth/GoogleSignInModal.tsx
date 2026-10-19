"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { X, AlertCircle, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

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

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  AccessDenied: {
    title: "Access Denied: Unverified Email",
    message:
      "Your Google account email has not been verified by Google or lacks necessary institutional permissions. For security, only verified Google accounts can access this platform.",
  },
  Configuration: {
    title: "Google OAuth Configuration Error",
    message:
      "There is a problem with the server's Google OAuth credentials (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET). Please check your environment configuration.",
  },
  OAuthCallbackError: {
    title: "Google Authentication Interrupted",
    message:
      "The Google sign-in was cancelled or encountered a callback validation error. Please try again.",
  },
  OAuthSignin: {
    title: "Google Sign-In Failed",
    message: "Unable to initiate authorization redirect with Google. Please check your network and try again.",
  },
  SessionRequired: {
    title: "Authentication Required",
    message: "Please sign in with your verified Google account to access this page.",
  },
};

/**
 * Modal to display genuine Google OAuth error and status states.
 */
export function GoogleSignInModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorParam = searchParams.get("error");
  const [isOpen, setIsOpen] = useState(false);
  const [activeError, setActiveError] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setActiveError(ERROR_MESSAGES[errorParam]);
      setIsOpen(true);
    } else if (errorParam) {
      setActiveError({
        title: "Authentication Error",
        message: `An error occurred during Google authentication (${errorParam}).`,
      });
      setIsOpen(true);
    }
  }, [errorParam]);

  const handleClose = () => {
    setIsOpen(false);
    // Remove error from URL without refreshing
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("callbackUrl");
    router.replace(url.pathname, { scroll: false });
  };

  const handleRetry = async () => {
    setIsOpen(false);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  if (!isOpen || !activeError) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex items-center justify-center shadow-xs text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {activeError.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google Authentication Status
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeError.message}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Dismiss
            </button>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs"
            >
              <GoogleLogo className="w-3.5 h-3.5 bg-white rounded-full p-0.5" />
              <span>Try Again</span>
            </button>
          </div>
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
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSignIn = async () => {
    setIsConnecting(true);
    try {
      // Redirect to Google's real OAuth authorization screen
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      console.error("Failed to start Google sign-in:", err);
      setIsConnecting(false);
    }
  };

  const baseStyles =
    "inline-flex items-center justify-center font-medium transition duration-200 cursor-pointer shadow-sm active:scale-[0.99] select-none disabled:opacity-60";

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
      disabled={isConnecting}
      onClick={handleSignIn}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {isConnecting ? (
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
      ) : (
        <GoogleLogo className={size === "small" ? "w-4 h-4" : size === "large" ? "w-5 h-5" : "w-4 h-4"} />
      )}
      <span className="font-semibold tracking-tight">
        {isConnecting ? "Connecting to Google..." : "Continue with Google"}
      </span>
    </button>
  );
}
