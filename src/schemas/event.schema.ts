import { z } from "zod";
import { DocumentType } from "@/types";

export const SpeakerSchema = z.object({
  name: z.string().nullable().default(null),
  designation: z.string().nullable().default(null),
  organization: z.string().nullable().default(null),
  email: z.string().email().nullable().optional().default(null),
  topic: z.string().nullable().optional().default(null),
});

export const BudgetBreakdownItemSchema = z.object({
  item: z.string(),
  amount: z.number().nonnegative(),
});

export const StructuredEventDataSchema = z.object({
  eventName: z.string().nullable().default(null),
  eventType: z.string().nullable().default(null),
  eventDescription: z.string().nullable().default(null),
  targetAudience: z.string().nullable().default(null),
  expectedParticipants: z.number().int().positive().nullable().default(null),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().default(null),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().default(null),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
  venue: z.string().nullable().default(null),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().nullable().optional().default(null),
  organizerName: z.string().nullable().default(null),
  clubName: z.string().nullable().default(null),
  facultyCoordinator: z.string().nullable().default(null),
  departmentHOD: z.string().nullable().default(null),
  budgetRequested: z.number().nonnegative().nullable().default(null),
  budgetBreakdown: z.array(BudgetBreakdownItemSchema).optional().default([]),
  speaker: SpeakerSchema.nullable().optional().default(null),
  registrationDeadline: z.string().nullable().default(null),
  contactEmail: z.string().email().nullable().optional().default(null),
  contactPhone: z.string().nullable().default(null),
  objectives: z.string().nullable().optional().default(null),
  requiresLabComputers: z.boolean().optional().default(false),
});

export const MissingFieldQuestionSchema = z.object({
  fieldKey: z.string(),
  question: z.string(),
  reason: z.string(),
  suggestedInputType: z.enum(["text", "date", "time", "number", "select", "textarea"]),
  options: z.array(z.string()).optional(),
});

export const ExtractionResponseSchema = z.object({
  extractedData: StructuredEventDataSchema,
  detectedDocumentTypes: z.array(
    z.enum([
      "EVENT_PROPOSAL",
      "PERMISSION_LETTER",
      "INVITATION_LETTER",
      "SPONSORSHIP_LETTER",
      "VOLUNTEER_NOTICE",
      "POST_EVENT_REPORT",
      "CERTIFICATE",
      "MEETING_MINUTES",
    ])
  ),
  missingFieldQuestions: z.array(MissingFieldQuestionSchema),
});

/**
 * Standard required fields definition per document type.
 * Ensures the backend deterministically blocks generation if mandatory fields are missing.
 */
export const TEMPLATE_REQUIRED_FIELDS: Record<DocumentType, string[]> = {
  EVENT_PROPOSAL: [
    "eventName",
    "startDate",
    "venue",
    "facultyCoordinator",
    "clubName",
    "expectedParticipants",
    "budgetRequested",
  ],
  PERMISSION_LETTER: [
    "eventName",
    "startDate",
    "startTime",
    "venue",
    "departmentHOD",
    "facultyCoordinator",
    "organizerName",
    "clubName",
  ],
  INVITATION_LETTER: [
    "eventName",
    "startDate",
    "venue",
    "facultyCoordinator",
    "clubName",
    "contactEmail",
    "speaker.name",
  ],
  SPONSORSHIP_LETTER: [
    "eventName",
    "startDate",
    "venue",
    "clubName",
    "expectedParticipants",
    "budgetRequested",
    "contactEmail",
  ],
  VOLUNTEER_NOTICE: [
    "eventName",
    "startDate",
    "clubName",
    "registrationDeadline",
    "contactEmail",
  ],
  POST_EVENT_REPORT: [
    "eventName",
    "startDate",
    "venue",
    "facultyCoordinator",
    "clubName",
    "expectedParticipants",
  ],
  CERTIFICATE: [
    "eventName",
    "startDate",
    "clubName",
    "facultyCoordinator",
  ],
  MEETING_MINUTES: [
    "eventName",
    "startDate",
    "clubName",
    "organizerName",
  ],
};

/**
 * Deterministic helper to evaluate missing required fields for a list of document types
 */
export function evaluateMissingFields(
  data: Record<string, any>,
  documentTypes: DocumentType[],
  customTemplateRequirements?: Record<string, string[]>
): { missingFields: string[]; questions: z.infer<typeof MissingFieldQuestionSchema>[] } {
  const missingSet = new Set<string>();
  const questions: z.infer<typeof MissingFieldQuestionSchema>[] = [];

  for (const docType of documentTypes) {
    const required = customTemplateRequirements?.[docType] || TEMPLATE_REQUIRED_FIELDS[docType] || [];
    for (const field of required) {
      if (field === "speaker.name") {
        if (!data.speaker || !data.speaker.name || data.speaker.name.trim() === "") {
          missingSet.add("speaker.name");
        }
      } else {
        const val = data[field];
        if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
          missingSet.add(field);
        }
      }
    }
  }

  const missingFields = Array.from(missingSet);

  const QUESTION_BANK: Record<string, { q: string; r: string; type: any }> = {
    venue: {
      q: "Which specific laboratory, seminar hall, or auditorium will host the event?",
      r: "Required for institutional venue booking and department permission letters.",
      type: "text",
    },
    startDate: {
      q: "What is the confirmed date of the event?",
      r: "Mandatory for calendar scheduling, venue reservation, and invitations.",
      type: "date",
    },
    startTime: {
      q: "What is the start time of the session (e.g., 09:30 AM)?",
      r: "Required for reserving facility time slots and attendee schedule.",
      type: "time",
    },
    endTime: {
      q: "What is the planned concluding time of the event?",
      r: "Needed to release facility booking.",
      type: "time",
    },
    departmentHOD: {
      q: "Who is the Head of Department (HOD) receiving this permission letter?",
      r: "Required as the official formal addressee on academic permission letters.",
      type: "text",
    },
    facultyCoordinator: {
      q: "Who is the club's faculty coordinator or faculty advisor?",
      r: "Required institutional signatory for all club proposals and permissions.",
      type: "text",
    },
    organizerName: {
      q: "Who is the student lead or primary event organizer submitting this request?",
      r: "Student signatory responsible for organizing logistics.",
      type: "text",
    },
    clubName: {
      q: "Which student organization or club is hosting this event?",
      r: "Required for official letterhead and document branding.",
      type: "text",
    },
    budgetRequested: {
      q: "What is the total estimated budget (in INR) requested for this event?",
      r: "Required for financial sanction and Dean approval.",
      type: "number",
    },
    expectedParticipants: {
      q: "Approximately how many students or participants are expected?",
      r: "Required for seating capacity planning and refreshments.",
      type: "number",
    },
    "speaker.name": {
      q: "Who is the guest speaker or resource person?",
      r: "Required to personalize the official invitation letter.",
      type: "text",
    },
    contactEmail: {
      q: "What is the official contact email address for queries?",
      r: "Listed for correspondence on letters and notices.",
      type: "text",
    },
  };

  for (const field of missingFields) {
    const info = QUESTION_BANK[field] || {
      q: `Please provide the ${field.replace(/([A-Z])/g, " $1").toLowerCase()} for this document.`,
      r: "Required for document completion.",
      type: "text",
    };
    questions.push({
      fieldKey: field,
      question: info.q,
      reason: info.r,
      suggestedInputType: info.type,
    });
  }

  return { missingFields, questions };
}

/**
 * Evaluates whether an event record has all necessary core information.
 * An event is complete when its title, confirmed date, and venue are provided.
 */
export function isEventComplete(data: Record<string, any>): boolean {
  if (!data) return false;
  const hasName = Boolean(
    (data.eventName || data.event_name || data.title) &&
      String(data.eventName || data.event_name || data.title).trim().length > 0
  );
  const hasDate = Boolean(data.startDate && String(data.startDate).trim().length > 0);
  const hasVenue = Boolean(data.venue && String(data.venue).trim().length > 0);
  return hasName && hasDate && hasVenue;
}
