"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserAccount } from "@/types";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession, SessionProvider } from "next-auth/react";

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  isMember: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthStateInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch (e) {
      console.warn("Failed to retrieve current verified user:", e);
      setUser(null);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchCurrentUser();
    } else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [status, session, fetchCurrentUser]);

  const loginWithGoogle = async () => {
    // Redirects directly to Google's genuine OAuth consent page
    await nextAuthSignIn("google", { callbackUrl: "/dashboard" });
  };

  const logout = async () => {
    // Genuine sign out through NextAuth
    await nextAuthSignOut({ callbackUrl: "/" });
    setUser(null);
  };

  const isLoading = status === "loading" || isVerifying;
  const isAdmin = user?.role === "CLUB_ADMIN";
  const isFaculty = user?.role === "FACULTY_APPROVER";
  const isMember = user?.role === "MEMBER";

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isFaculty,
        isMember,
        loginWithGoogle,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthStateInner>{children}</AuthStateInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
