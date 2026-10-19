"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserAccount, UserRole } from "@/types";

interface AuthContextType {
  user: UserAccount | null;
  isLoading: boolean;
  isAdmin: boolean;
  isFaculty: boolean;
  isMember: boolean;
  isGoogleModalOpen: boolean;
  openGoogleModal: () => void;
  closeGoogleModal: () => void;
  loginWithGoogle: (details?: { name?: string; email?: string; image?: string; googleId?: string }) => Promise<UserAccount>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchUserSimulated: (user: UserAccount) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "clubhub_cached_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const openGoogleModal = useCallback(() => setIsGoogleModalOpen(true), []);
  const closeGoogleModal = useCallback(() => setIsGoogleModalOpen(false), []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
          return;
        }
      }
      // If server has no user, check local storage cached user or leave null
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Verify with server using cached id
          const verifyRes = await fetch(`/api/auth/me?userId=${parsed.id}`);
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            if (verifyData.user) {
              setUser(verifyData.user);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(verifyData.user));
              return;
            }
          }
        } catch (_) {}
      }
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to check auth state", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Attempt rapid initial state from local storage before remote call
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch (_) {}

    refreshUser();
  }, [refreshUser]);

  const loginWithGoogle = async (details?: {
    name?: string;
    email?: string;
    image?: string;
    googleId?: string;
  }): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const payload = {
        name: details?.name || "Google User",
        email: details?.email || "user@gmail.com",
        image: details?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(details?.name || "GoogleUser")}`,
        googleId: details?.googleId || "g_" + Math.random().toString(36).substring(2, 10),
      };

      const res = await fetch("/api/auth/google/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to sign in with Google");
      }

      const data = await res.json();
      setUser(data.user);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
      closeGoogleModal();
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUserSimulated = (newUser: UserAccount) => {
    setUser(newUser);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newUser));
  };

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
        isGoogleModalOpen,
        openGoogleModal,
        closeGoogleModal,
        loginWithGoogle,
        logout,
        refreshUser,
        switchUserSimulated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
