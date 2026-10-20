"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { UserAccount, UserRole, DocumentRecord, EventRecord } from "@/types";
import {
  ShieldCheck,
  GraduationCap,
  UserCheck,
  Search,
  UserPlus,
  RefreshCw,
  Check,
  AlertCircle,
  Trash2,
  Filter,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  FileText,
  CalendarDays,
  ExternalLink,
} from "lucide-react";

export default function AdminPage() {
  const { user, isAdmin, refreshUser: refreshAuthUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "documents" | "events">("users");

  // Users State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Documents State
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Events State
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [deletingEvtId, setDeletingEvtId] = useState<string | null>(null);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("MEMBER");
  const [addLoading, setAddLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users", err);
      setNotification({ type: "error", text: "Failed to load user list" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setDocsLoading(false);
    }
  };

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDocuments();
    fetchEvents();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    setNotification(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update role");
      }

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole, updatedAt: new Date().toISOString() } : u))
      );

      // If updating current logged in user, refresh context
      if (user && user.id === userId) {
        await refreshAuthUser();
      }

      setNotification({
        type: "success",
        text: `Role successfully updated to ${
          newRole === "CLUB_ADMIN" ? "Admin" : newRole === "FACULTY_APPROVER" ? "Faculty" : "Member"
        }`,
      });
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to update role" });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setNotification({ type: "success", text: `User ${name} removed` });
      }
    } catch (e) {
      setNotification({ type: "error", text: "Failed to remove user" });
    }
  };

  const handleDeleteDocument = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete document "${title}"?`)) {
      return;
    }
    setDeletingDocId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setNotification({ type: "success", text: `Document "${title}" deleted permanently.` });
      } else {
        setNotification({ type: "error", text: data.error?.message || "Failed to delete document." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Error deleting document: " + err.message });
    } finally {
      setDeletingDocId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete event "${name}" and all its documents?`)) {
      return;
    }
    setDeletingEvtId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setDocuments((prev) => prev.filter((d) => d.eventId !== id));
        setNotification({ type: "success", text: `Event "${name}" and its documents deleted permanently.` });
      } else {
        setNotification({ type: "error", text: data.error?.message || "Failed to delete event." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: "Error deleting event: " + err.message });
    } finally {
      setDeletingEvtId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add user");
      }

      const data = await res.json();
      setIsAddModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewRole("MEMBER");
      setNotification({ type: "success", text: `User ${data.user.name} added successfully with role ${data.user.role}` });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || "Error adding user");
    } finally {
      setAddLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const counts = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "CLUB_ADMIN").length,
      faculty: users.filter((u) => u.role === "FACULTY_APPROVER").length,
      members: users.filter((u) => u.role === "MEMBER").length,
    };
  }, [users]);

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#1C2622]">Admin Access Restricted</h2>
          <p className="text-xs text-[#55645C] leading-relaxed">
            You must be signed in with an authorized Club Administrator account to view and manage institutional roles.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-sm transition-all shadow-xs ${
              notification.type === "success"
                ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-[#1F6954] shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-semibold underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DFD5] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#1F6954] text-white">
                Admin Portal
              </span>
              <span className="text-xs text-[#7A8A81]">Institutional Control Center</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1C2622]">
              Admin Management
            </h1>
            <p className="text-xs text-[#55645C] mt-1">
              Manage user roles, inspect records, and permanently delete documents and campus events.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "users" && (
              <>
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-[#E5DFD5] bg-[#FCFAF7] hover:bg-[#EFECE6] text-[#55645C] hover:text-[#1C2622] transition-colors"
                  title="Refresh users"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs hover:shadow transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Person</span>
                </button>
              </>
            )}

            {activeTab === "documents" && (
              <>
                <button
                  onClick={fetchDocuments}
                  disabled={docsLoading}
                  className="p-2.5 rounded-xl border border-[#E5DFD5] bg-[#FCFAF7] hover:bg-[#EFECE6] text-[#55645C] hover:text-[#1C2622] transition-colors"
                  title="Refresh documents"
                >
                  <RefreshCw className={`h-4 w-4 ${docsLoading ? "animate-spin" : ""}`} />
                </button>
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5DFD5] bg-[#FCFAF7] hover:bg-[#EFECE6] text-[#1C2622] text-xs font-semibold transition-all"
                >
                  <span>Open Documents Hub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </>
            )}

            {activeTab === "events" && (
              <>
                <button
                  onClick={fetchEvents}
                  disabled={eventsLoading}
                  className="p-2.5 rounded-xl border border-[#E5DFD5] bg-[#FCFAF7] hover:bg-[#EFECE6] text-[#55645C] hover:text-[#1C2622] transition-colors"
                  title="Refresh events"
                >
                  <RefreshCw className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`} />
                </button>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5DFD5] bg-[#FCFAF7] hover:bg-[#EFECE6] text-[#1C2622] text-xs font-semibold transition-all"
                >
                  <span>Open Events Calendar</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E5DFD5] pb-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-[#1F6954] text-white shadow-2xs"
                : "bg-white text-[#55645C] border border-[#E5DFD5] hover:bg-[#EFECE6]"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users & Roles ({counts.total})</span>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "documents"
                ? "bg-[#1F6954] text-white shadow-2xs"
                : "bg-white text-[#55645C] border border-[#E5DFD5] hover:bg-[#EFECE6]"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Documents ({documents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "events"
                ? "bg-[#1F6954] text-white shadow-2xs"
                : "bg-white text-[#55645C] border border-[#E5DFD5] hover:bg-[#EFECE6]"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Events ({events.length})</span>
          </button>
        </div>

        {/* TAB 1: USERS & ROLES */}
        {activeTab === "users" && (
          <div className="space-y-6">

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-2xs">
            <div className="flex items-center justify-between text-[#7A8A81] mb-2">
              <span className="text-xs font-medium">Total Registered</span>
              <Users className="h-4 w-4 text-[#1F6954]" />
            </div>
            <div className="text-2xl font-black text-[#1C2622]">{counts.total}</div>
            <div className="text-[10px] text-[#7A8A81] mt-0.5">Platform users</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-2xs">
            <div className="flex items-center justify-between text-purple-600 mb-2">
              <span className="text-xs font-medium">Club Admins</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">{counts.admins}</div>
            <div className="text-[10px] text-purple-600/80 mt-0.5">Full access & settings</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-medium">Faculty Approvers</span>
              <GraduationCap className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-900">{counts.faculty}</div>
            <div className="text-[10px] text-amber-600/80 mt-0.5">Can sign & approve</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5DFD5] shadow-2xs">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-medium">Club Members</span>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-900">{counts.members}</div>
            <div className="text-[10px] text-blue-600/80 mt-0.5">Event doc creators</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#FCFAF7] border border-[#E5DFD5]">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A8A81]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#E5DFD5] focus:outline-none focus:ring-2 focus:ring-[#1F6954] text-[#1C2622]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-[#7A8A81] mr-1 hidden sm:inline" />
            {[
              { id: "ALL", label: "All Roles" },
              { id: "CLUB_ADMIN", label: "Admins" },
              { id: "FACULTY_APPROVER", label: "Faculty" },
              { id: "MEMBER", label: "Members" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setRoleFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  roleFilter === btn.id
                    ? "bg-[#1F6954] text-white shadow-2xs"
                    : "bg-white text-[#55645C] border border-[#E5DFD5] hover:bg-[#EFECE6]"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table / List */}
        <div className="bg-white rounded-2xl border border-[#E5DFD5] shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#7A8A81] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-[#1F6954]" />
              <span>Loading users and permission levels...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7A8A81]">
              No users found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-[#E5DFD5]">
              {filteredUsers.map((item) => {
                const isCurrentlyUpdating = updatingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors"
                  >
                    {/* User Identity Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full border border-[#E5DFD5] bg-[#E7F3ED] text-[#1F6954] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {item.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#1C2622]">{item.name}</span>
                          {item.googleId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                              Google
                            </span>
                          )}
                          {user?.id === item.id && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#E7F3ED] text-[#1F6954] border border-[#BCD8CB] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#7A8A81] flex items-center gap-2 mt-0.5">
                          <span>{item.email}</span>
                          <span>•</span>
                          <span className="text-[10px]">
                            Joined {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role Selection Segment */}
                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F8F6F0] border border-[#E5DFD5]">
                        {/* Member Option */}
                        <button
                          type="button"
                          disabled={isCurrentlyUpdating}
                          onClick={() => handleRoleChange(item.id, "MEMBER")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            item.role === "MEMBER"
                              ? "bg-blue-600 text-white shadow-2xs font-semibold"
                              : "text-[#55645C] hover:bg-white hover:text-[#1C2622]"
                          }`}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Member</span>
                        </button>

                        {/* Faculty Option */}
                        <button
                          type="button"
                          disabled={isCurrentlyUpdating}
                          onClick={() => handleRoleChange(item.id, "FACULTY_APPROVER")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            item.role === "FACULTY_APPROVER"
                              ? "bg-amber-600 text-white shadow-2xs font-semibold"
                              : "text-[#55645C] hover:bg-white hover:text-[#1C2622]"
                          }`}
                        >
                          <GraduationCap className="h-3.5 w-3.5" />
                          <span>Faculty</span>
                        </button>

                        {/* Admin Option */}
                        <button
                          type="button"
                          disabled={isCurrentlyUpdating}
                          onClick={() => handleRoleChange(item.id, "CLUB_ADMIN")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            item.role === "CLUB_ADMIN"
                              ? "bg-purple-600 text-white shadow-2xs font-semibold"
                              : "text-[#55645C] hover:bg-white hover:text-[#1C2622]"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Admin</span>
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleDeleteUser(item.id, item.name)}
                        className="p-2 text-[#7A8A81] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}

    {/* TAB 2: DOCUMENTS */}
    {activeTab === "documents" && (
      <div className="bg-white rounded-2xl border border-[#E5DFD5] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5DFD5] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1C2622]">All Institutional Documents</h3>
            <p className="text-xs text-[#7A8A81] mt-0.5">
              Admins can review, inspect, and permanently delete any document in the system.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#1F6954] bg-[#E7F3ED] px-2.5 py-1 rounded-full border border-[#BCD8CB]">
            {documents.length} Total
          </span>
        </div>

        {docsLoading ? (
          <div className="p-12 text-center text-xs text-[#7A8A81] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-[#1F6954]" />
            <span>Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7A8A81]">
            No documents found in the database.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DFD5]">
            {documents.map((doc) => {
              const isDeleting = deletingDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FCFAF7] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E7F3ED] text-[#1F6954] flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#1C2622]">{doc.title}</div>
                      <div className="flex items-center gap-2 text-xs text-[#7A8A81] mt-0.5 flex-wrap">
                        <span className="font-mono text-[11px]">{doc.id}</span>
                        <span>•</span>
                        <span className="capitalize">{(doc.documentType || "DOCUMENT").toLowerCase().replace(/_/g, " ")}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === "APPROVED" || doc.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : doc.status === "SUBMITTED" || doc.status === "UNDER_REVIEW" || doc.status === "PENDING_SIGNATURE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : doc.status === "REJECTED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="px-3 py-1.5 rounded-xl border border-[#E5DFD5] text-xs font-medium text-[#55645C] hover:text-[#1C2622] hover:bg-white transition-colors"
                    >
                      View
                    </Link>
                    <button
                      disabled={isDeleting}
                      onClick={() => handleDeleteDocument(doc.id, doc.title)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
                      title="Delete document permanently"
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${isDeleting ? "animate-spin" : ""}`} />
                      <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

    {/* TAB 3: EVENTS */}
    {activeTab === "events" && (
      <div className="bg-white rounded-2xl border border-[#E5DFD5] shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5DFD5] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#1C2622]">All Campus Events</h3>
            <p className="text-xs text-[#7A8A81] mt-0.5">
              Admins can view and permanently delete any event along with its associated records.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#1F6954] bg-[#E7F3ED] px-2.5 py-1 rounded-full border border-[#BCD8CB]">
            {events.length} Total
          </span>
        </div>

        {eventsLoading ? (
          <div className="p-12 text-center text-xs text-[#7A8A81] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-[#1F6954]" />
            <span>Loading events...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#7A8A81]">
            No events found in the database.
          </div>
        ) : (
          <div className="divide-y divide-[#E5DFD5]">
            {events.map((evt) => {
              const isDeleting = deletingEvtId === evt.id;
              return (
                <div
                  key={evt.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FCFAF7] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-[#1C2622]">{evt.eventName}</div>
                      <div className="flex items-center gap-2 text-xs text-[#7A8A81] mt-0.5 flex-wrap">
                        <span className="font-medium text-[#1C2622]">{evt.structuredData?.clubName || evt.clubId}</span>
                        <span>•</span>
                        <span>{evt.structuredData?.venue || "Campus Venue"}</span>
                        <span>•</span>
                        <span>
                          {evt.structuredData?.startDate
                            ? new Date(evt.structuredData.startDate).toLocaleDateString()
                            : new Date(evt.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-700">
                          ₹{(evt.structuredData?.budgetRequested || 0).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            evt.completenessStatus === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : evt.completenessStatus === "VALIDATED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {evt.completenessStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link
                      href={`/events/${evt.id}`}
                      className="px-3 py-1.5 rounded-xl border border-[#E5DFD5] text-xs font-medium text-[#55645C] hover:text-[#1C2622] hover:bg-white transition-colors"
                    >
                      View
                    </Link>
                    <button
                      disabled={isDeleting}
                      onClick={() => handleDeleteEvent(evt.id, evt.eventName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
                      title="Delete event permanently"
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${isDeleting ? "animate-spin" : ""}`} />
                      <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

        {/* Add User Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E5DFD5] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD5]">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#1F6954]" />
                  <h3 className="text-base font-bold text-[#1C2622]">Add New Person</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs text-[#7A8A81] hover:text-[#1C2622]"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1C2622] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Gupta or John Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E5DFD5] focus:outline-none focus:ring-2 focus:ring-[#1F6954] text-[#1C2622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C2622] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. user@campus.edu or google email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-[#E5DFD5] focus:outline-none focus:ring-2 focus:ring-[#1F6954] text-[#1C2622]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C2622] mb-1">
                    Initial System Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: "MEMBER", label: "Member", desc: "Creator" },
                      { role: "FACULTY_APPROVER", label: "Faculty", desc: "Signer" },
                      { role: "CLUB_ADMIN", label: "Admin", desc: "Manager" },
                    ].map((opt) => (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => setNewRole(opt.role as UserRole)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          newRole === opt.role
                            ? "bg-[#E7F3ED] border-[#1F6954] text-[#1A5A48] font-semibold"
                            : "bg-[#FCFAF7] border-[#E5DFD5] text-[#55645C] hover:bg-[#EFECE6]"
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-[#7A8A81]">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#55645C] hover:bg-[#EFECE6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2 rounded-xl bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    {addLoading ? "Adding..." : "Add Person"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
