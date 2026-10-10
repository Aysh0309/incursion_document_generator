"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarDays, Plus, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { EventRecord } from "@/types";

export default function EventsListingPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setEvents(data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#18181B] tracking-tight">Event Profiles</h1>
            <p className="text-xs text-[#64748B]">
              Manage single-entry event records and generate matching administrative documents.
            </p>
          </div>

          <Link
            href="/events/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Event</span>
          </Link>
        </div>

        <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#64748B]">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CalendarDays className="h-8 w-8 text-[#94A3B8] mx-auto" />
              <p className="text-xs font-medium text-[#18181B]">No events created yet</p>
              <p className="text-[11px] text-[#64748B]">
                Start by describing an upcoming club workshop, hackathon, or meeting.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#4F46E5] text-white text-xs font-medium mt-2"
              >
                <span>Add Event Now</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Event Title</th>
                  <th className="py-2.5 px-3 font-medium">Date & Schedule</th>
                  <th className="py-2.5 px-3 font-medium">Venue</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#18181B] block">{evt.eventName}</span>
                      <span className="text-[10px] text-[#64748B] block">
                        Category: {evt.structuredData.eventType || "Workshop"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span>{evt.structuredData.startDate || "Date TBD"}</span>
                      <span className="text-[10px] text-[#64748B] block">
                        {evt.structuredData.startTime || "Time TBD"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span>{evt.structuredData.venue || "Venue Pending"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          evt.completenessStatus === "VALIDATED"
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                            : "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                        }`}
                      >
                        {evt.completenessStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/events/new?eventId=${evt.id}`}
                        className="text-[#4F46E5] hover:text-[#4338CA] font-medium text-xs inline-flex items-center gap-1"
                      >
                        <span>Open Studio</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
