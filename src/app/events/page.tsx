"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { EventRecord, UserRole } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function EventsListingPage() {
  const { user, isAdmin: authIsAdmin } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole>("CLUB_ADMIN");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [eventDocsMap, setEventDocsMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const savedRole = localStorage.getItem("incursion_user_role") as UserRole;
    if (savedRole) setCurrentRole(savedRole);

    const onRoleChange = (e: any) => {
      if (e.detail) setCurrentRole(e.detail);
    };
    window.addEventListener("roleChange", onRoleChange);

    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/documents").then((r) => r.json()),
    ])
      .then(([eventsData, docsData]) => {
        if (eventsData.success) setEvents(eventsData.data || []);
        if (docsData.success && docsData.data) {
          const map: Record<string, any[]> = {};
          docsData.data.forEach((d: any) => {
            if (!map[d.eventId]) map[d.eventId] = [];
            map[d.eventId].push(d);
          });
          setEventDocsMap(map);
        }
      })
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("roleChange", onRoleChange);
    };
  }, []);

  const isAdmin = authIsAdmin || currentRole === "CLUB_ADMIN" || user?.role === "CLUB_ADMIN";

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete event "${name}" and all associated documents?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setSelectedEventIds((prev) => prev.filter((eId) => eId !== id));
      } else {
        alert(data.error?.message || "Failed to delete event.");
      }
    } catch (err: any) {
      alert("Error deleting event: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedEventIds.includes(id)) {
      setSelectedEventIds(selectedEventIds.filter((eId) => eId !== id));
    } else {
      setSelectedEventIds([...selectedEventIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedEventIds.length === events.length) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(events.map((e) => e.id));
    }
  };

  const handleBatchDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedEventIds.length} selected event(s) and their generated documents?`
      )
    ) {
      return;
    }

    setDeleting(true);
    for (const id of selectedEventIds) {
      try {
        await fetch(`/api/events/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Error deleting event:", err);
      }
    }

    setEvents((prev) => prev.filter((e) => !selectedEventIds.includes(e.id)));
    setSelectedEventIds([]);
    setDeleting(false);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#E5DFD5] bg-white shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-[#1C2622] tracking-tight">Event Profiles</h1>
            <p className="text-xs text-[#7A8A81] mt-0.5">
              Manage club events and generate matching administrative documents.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && selectedEventIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#F7C8C4] bg-[#FDF2F0] hover:bg-[#FCE8E6] text-xs font-semibold text-[#C24138] shadow-2xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedEventIds.length})</span>
              </button>
            )}

            <Link
              href="/events/new"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Event</span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[#E5DFD5] bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#7A8A81]">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CalendarDays className="h-8 w-8 text-[#A3B0A8] mx-auto" />
              <p className="text-xs font-medium text-[#1C2622]">No events created yet</p>
              <p className="text-[11px] text-[#7A8A81]">
                Start by describing an upcoming club workshop, hackathon, or meeting.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#1F6954] hover:bg-[#175342] text-white text-xs font-medium mt-2 shadow-2xs"
              >
                <span>Add Event Now</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F2EC] text-[#66756D] border-b border-[#E5DFD5]">
                  <tr>
                    {isAdmin && (
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            selectedEventIds.length === events.length && events.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded accent-[#1F6954]"
                        />
                      </th>
                    )}
                    <th className="py-2.5 px-4 font-medium">Event Title</th>
                    <th className="py-2.5 px-3 font-medium">Date & Schedule</th>
                    <th className="py-2.5 px-3 font-medium">Venue</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DFD5]">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[#FAF8F4] transition-colors">
                      {isAdmin && (
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedEventIds.includes(evt.id)}
                            onChange={() => toggleSelect(evt.id)}
                            className="rounded accent-[#1F6954]"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <Link
                          href={`/events/new?eventId=${evt.id}`}
                          className="font-semibold text-[#1C2622] hover:text-[#1F6954] transition-colors block"
                        >
                          {evt.eventName}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#7A8A81]">
                            Category: {evt.structuredData.eventType || "Workshop"}
                          </span>
                          <span className="text-[#D8D2C7]">•</span>
                          <span className="text-[10px] font-medium text-[#1F6954]">
                            {eventDocsMap[evt.id]?.length || 0} document(s)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[#1C2622]">{evt.structuredData.startDate || "Date TBD"}</span>
                        <span className="text-[10px] text-[#7A8A81] block">
                          {evt.structuredData.startTime || "Time TBD"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[#55645C]">{evt.structuredData.venue || "Venue Pending"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            evt.completenessStatus === "COMPLETED" || evt.completenessStatus === "VALIDATED"
                              ? "bg-[#E7F3ED] text-[#1A5A48] border border-[#BCD8CB]"
                              : "bg-[#FEF3E6] text-[#D9822B] border border-[#FBD8B3]"
                          }`}
                        >
                          {evt.completenessStatus === "INCOMPLETE" ? "INCOMPLETE" : "COMPLETED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/events/new?eventId=${evt.id}`}
                            className="px-2 py-1 rounded-md border border-[#E5DFD5] hover:bg-[#EFECE6] text-[#55645C] text-[10px] font-medium transition-colors"
                          >
                            Edit
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteEvent(evt.id, evt.eventName)}
                              disabled={deletingId === evt.id}
                              className="p-1 rounded text-[#A3B0A8] hover:text-[#C24138] hover:bg-[#FDF2F0] transition-colors ml-1 disabled:opacity-50"
                              title="Delete Event (Admin)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
