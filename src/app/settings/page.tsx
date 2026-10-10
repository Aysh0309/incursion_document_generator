"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Building2, Save, CheckCircle2, Shield, Palette, Mail, Phone } from "lucide-react";
import { ClubBranding } from "@/types";

export default function ClubSettingsPage() {
  const [club, setClub] = useState<ClubBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/club")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setClub(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club) return;

    setSaving(true);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/club", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(club),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Club institutional branding & signatories successfully updated!");
      }
    } catch (err: any) {
      alert("Failed to update club settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !club) {
    return (
      <AppShell>
        <div className="p-8 text-center text-xs text-[#64748B]">Loading club settings...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="p-4 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          <h1 className="text-base font-bold text-[#18181B] tracking-tight">
            Club Branding & Signatory Settings
          </h1>
          <p className="text-xs text-[#64748B]">
            Configure official university letterhead information, brand color tokens, and faculty advisor credentials.
          </p>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#059669] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Institutional Information */}
          <div className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Building2 className="h-4 w-4 text-[#4F46E5]" />
              <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Institutional Letterhead Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="font-semibold text-[#18181B] block mb-1">Organization / Club Name *</label>
                <input
                  type="text"
                  required
                  value={club.name}
                  onChange={(e) => setClub({ ...club, name: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">University Name *</label>
                <input
                  type="text"
                  required
                  value={club.universityName}
                  onChange={(e) => setClub({ ...club, universityName: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Department *</label>
                <input
                  type="text"
                  required
                  value={club.department}
                  onChange={(e) => setClub({ ...club, department: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Official Contact Email *</label>
                <input
                  type="email"
                  required
                  value={club.contactEmail}
                  onChange={(e) => setClub({ ...club, contactEmail: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={club.contactPhone}
                  onChange={(e) => setClub({ ...club, contactPhone: e.target.value })}
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>
            </div>
          </div>

          {/* Faculty Signatory Credentials */}
          <div className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Shield className="h-4 w-4 text-[#059669]" />
              <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Faculty Signatory Credentials
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Faculty Coordinator Name *</label>
                <input
                  type="text"
                  required
                  value={club.facultyCoordinator?.name || ""}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      facultyCoordinator: {
                        ...club.facultyCoordinator,
                        name: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Designation</label>
                <input
                  type="text"
                  value={club.facultyCoordinator?.designation || ""}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      facultyCoordinator: {
                        ...club.facultyCoordinator,
                        designation: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Department</label>
                <input
                  type="text"
                  value={club.facultyCoordinator?.department || ""}
                  onChange={(e) =>
                    setClub({
                      ...club,
                      facultyCoordinator: {
                        ...club.facultyCoordinator,
                        department: e.target.value,
                      },
                    })
                  }
                  className="w-full p-2 rounded border border-[#E2E8F0]"
                />
              </div>
            </div>
          </div>

          {/* Brand Visual Tokens */}
          <div className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Palette className="h-4 w-4 text-[#D97706]" />
              <h2 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Brand Colors
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Primary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={club.primaryColor}
                    onChange={(e) => setClub({ ...club, primaryColor: e.target.value })}
                    className="h-9 w-9 rounded border border-[#E2E8F0] p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={club.primaryColor}
                    onChange={(e) => setClub({ ...club, primaryColor: e.target.value })}
                    className="flex-1 p-2 rounded border border-[#E2E8F0] font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#18181B] block mb-1">Secondary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={club.secondaryColor}
                    onChange={(e) => setClub({ ...club, secondaryColor: e.target.value })}
                    className="h-9 w-9 rounded border border-[#E2E8F0] p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={club.secondaryColor}
                    onChange={(e) => setClub({ ...club, secondaryColor: e.target.value })}
                    className="flex-1 p-2 rounded border border-[#E2E8F0] font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving Changes..." : "Save Club Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
