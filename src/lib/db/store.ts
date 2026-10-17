import fs from "fs";
import path from "path";
import {
  ClubBranding,
  DocumentRecord,
  DocumentType,
  DocumentVersionRecord,
  EventRecord,
  StructuredEventData,
  TemplateMetadata,
} from "@/types";
import { TEMPLATE_REQUIRED_FIELDS } from "@/schemas/event.schema";

const STORAGE_FILE = path.join(process.cwd(), "public", "storage", "db-state.json");

interface DatabaseState {
  club: ClubBranding;
  templates: TemplateMetadata[];
  events: EventRecord[];
  documents: DocumentRecord[];
  versions: DocumentVersionRecord[];
}

const DEFAULT_CLUB: ClubBranding = {
  id: "club_gdg_main",
  name: "Google Developer Student Club (GDSC)",
  slug: "gdsc-campus",
  logoUrl: "/images/gdsc-logo.png",
  primaryColor: "#4F46E5",
  secondaryColor: "#3B82F6",
  department: "Department of Computer Science & Engineering",
  universityName: "National Institute of Technology & Advanced Science",
  contactEmail: "gdsc.leads@nit.ac.in",
  contactPhone: "+91 98765 43210",
  facultyCoordinator: {
    name: "Dr. Sunita Sharma",
    designation: "Associate Professor & Head of CS Labs",
    department: "Computer Science & Engineering",
  },
};

function buildDefaultFields(
  keys: string[],
  requiredKeys: string[]
): import("@/types").TemplateField[] {
  return keys.map((key) => {
    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_\.]/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

    const isReq = requiredKeys.includes(key);
    let type: import("@/types").FieldDataType = "text";
    if (key.toLowerCase().includes("date")) type = "date";
    else if (key.toLowerCase().includes("time")) type = "time";
    else if (key.toLowerCase().includes("budget") || key.toLowerCase().includes("amount")) type = "currency";
    else if (key.toLowerCase().includes("participant")) type = "number";
    else if (key.toLowerCase().includes("email")) type = "email";
    else if (key.toLowerCase().includes("phone")) type = "phone";
    else if (key.toLowerCase().includes("description")) type = "textarea";

    return {
      id: `fld_${key}`,
      name: key,
      label,
      type,
      required: isReq,
      confidence: 1.0,
      adminConfirmed: true,
      repeatedFieldKeys: [key],
    };
  });
}

const PROPOSAL_PLACEHOLDERS = [
  "eventName",
  "eventType",
  "targetAudience",
  "startDate",
  "endDate",
  "startTime",
  "endTime",
  "venue",
  "eventDescription",
  "expectedParticipants",
  "budgetRequested",
  "organizerName",
  "facultyCoordinator",
  "clubName",
];

const PERMISSION_PLACEHOLDERS = [
  "eventName",
  "startDate",
  "startTime",
  "endTime",
  "venue",
  "departmentHOD",
  "facultyCoordinator",
  "organizerName",
  "clubName",
  "eventDescription",
  "expectedParticipants",
  "targetAudience",
];

const INVITATION_PLACEHOLDERS = [
  "eventName",
  "startDate",
  "startTime",
  "endTime",
  "venue",
  "speakerName",
  "speakerDesignation",
  "speakerOrganization",
  "speakerTopic",
  "facultyCoordinator",
  "organizerName",
  "clubName",
  "contactEmail",
  "contactPhone",
  "eventDescription",
];

const DEFAULT_TEMPLATES: TemplateMetadata[] = [
  {
    id: "tmpl_proposal_01",
    name: "Official Event Proposal",
    documentType: "EVENT_PROPOSAL",
    format: "docx",
    description: "Standard institutional proposal format for Dean/Student Affairs sanction and budget clearance.",
    fileUrl: "/templates/event_proposal_template.docx",
    fields: buildDefaultFields(PROPOSAL_PLACEHOLDERS, TEMPLATE_REQUIRED_FIELDS.EVENT_PROPOSAL),
    requiredFields: TEMPLATE_REQUIRED_FIELDS.EVENT_PROPOSAL,
    optionalFields: PROPOSAL_PLACEHOLDERS.filter((p) => !TEMPLATE_REQUIRED_FIELDS.EVENT_PROPOSAL.includes(p)),
    placeholdersDetected: PROPOSAL_PLACEHOLDERS,
    status: "PUBLISHED",
    version: 1,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "tmpl_permission_01",
    name: "HOD Lab / Venue Permission Letter",
    documentType: "PERMISSION_LETTER",
    format: "docx",
    description: "Formal academic request letter to HOD or Lab In-Charge for booking facilities and hardware.",
    fileUrl: "/templates/permission_letter_template.docx",
    fields: buildDefaultFields(PERMISSION_PLACEHOLDERS, TEMPLATE_REQUIRED_FIELDS.PERMISSION_LETTER),
    requiredFields: TEMPLATE_REQUIRED_FIELDS.PERMISSION_LETTER,
    optionalFields: PERMISSION_PLACEHOLDERS.filter((p) => !TEMPLATE_REQUIRED_FIELDS.PERMISSION_LETTER.includes(p)),
    placeholdersDetected: PERMISSION_PLACEHOLDERS,
    status: "PUBLISHED",
    version: 1,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "tmpl_invitation_01",
    name: "Guest Speaker / Dignitary Invitation",
    documentType: "INVITATION_LETTER",
    format: "docx",
    description: "Formal letterhead invitation addressed to external industry resource persons and keynote speakers.",
    fileUrl: "/templates/invitation_letter_template.docx",
    fields: buildDefaultFields(INVITATION_PLACEHOLDERS, ["eventName", "startDate", "venue", "facultyCoordinator", "clubName", "contactEmail", "speakerName"]),
    requiredFields: ["eventName", "startDate", "venue", "facultyCoordinator", "clubName", "contactEmail", "speakerName"],
    optionalFields: INVITATION_PLACEHOLDERS.filter((p) => !["eventName", "startDate", "venue", "facultyCoordinator", "clubName", "contactEmail", "speakerName"].includes(p)),
    placeholdersDetected: INVITATION_PLACEHOLDERS,
    status: "PUBLISHED",
    version: 1,
    isActive: true,
    isSystemDefault: true,
    createdAt: new Date().toISOString(),
  },
];

// Pre-seeded sample events for immediate demo
const SAMPLE_EVENTS: EventRecord[] = [
  {
    id: "evt_ai_workshop_demo",
    clubId: "club_gdg_main",
    eventName: "Hands-on Generative AI & LLMs Workshop",
    rawInputText:
      "We are organizing a Hands-on Generative AI & LLMs Workshop on November 14, 2026 at CS Lab 3 from 09:30 AM to 04:30 PM. Targeted for 2nd and 3rd year CSE students. Speaker is Dev Sharma, Senior AI Engineer at Google. Expected students: 85. Budget requested is INR 15,000 for refreshments and kits. Addressed to HOD Dr. Arvind Verma, coordinated by Prof. Sunita Sharma. Student lead is Aarav Patel.",
    completenessStatus: "VALIDATED",
    missingFields: [],
    structuredData: {
      eventName: "Hands-on Generative AI & LLMs Workshop",
      eventType: "WORKSHOP",
      eventDescription: "Comprehensive hands-on technical workshop covering modern LLM agent orchestration, prompt engineering, and deployment of local AI models.",
      targetAudience: "2nd and 3rd year CSE students",
      expectedParticipants: 85,
      startDate: "2026-11-14",
      endDate: "2026-11-14",
      startTime: "09:30 AM",
      endTime: "04:30 PM",
      venue: "CS Seminar & Computing Lab 3",
      isOnline: false,
      meetingLink: null,
      organizerName: "Aarav Patel",
      clubName: "Google Developer Student Club (GDSC)",
      facultyCoordinator: "Dr. Sunita Sharma",
      departmentHOD: "Dr. Arvind Verma",
      budgetRequested: 15000,
      speaker: {
        name: "Dev Sharma",
        designation: "Staff AI Engineer",
        organization: "Google Cloud AI",
        email: "dev.sharma@example.com",
        topic: "Production LLM Architectures",
      },
      registrationDeadline: "2026-11-10",
      contactEmail: "gdsc.leads@nit.ac.in",
      contactPhone: "+91 98765 43210",
      requiresLabComputers: true,
    },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

class MemoryStore {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private ensureDir() {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadState(): DatabaseState {
    try {
      this.ensureDir();
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const rawTemplates: TemplateMetadata[] = parsed.templates || DEFAULT_TEMPLATES;
          const normalizedTemplates = rawTemplates.map((t) => {
            const format = t.format || (t.fileUrl?.endsWith(".pdf") ? "pdf" : "docx");
            const fields = (t.fields && t.fields.length > 0)
              ? t.fields
              : buildDefaultFields(t.placeholdersDetected || [], t.requiredFields || []);
            return {
              ...t,
              format,
              status: t.status || "PUBLISHED",
              fields,
            };
          });

          return {
            club: parsed.club || DEFAULT_CLUB,
            templates: normalizedTemplates,
            events: parsed.events || SAMPLE_EVENTS,
            documents: parsed.documents || [],
            versions: parsed.versions || [],
          };
        }
      } catch (e) {
        console.warn("Failed to read disk state, resetting to defaults", e);
      }

    const initial: DatabaseState = {
      club: DEFAULT_CLUB,
      templates: DEFAULT_TEMPLATES,
      events: SAMPLE_EVENTS,
      documents: [],
      versions: [],
    };
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DatabaseState) {
    try {
      this.ensureDir();
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write database state to disk", e);
    }
  }

  // --- Club operations ---
  getClub(): ClubBranding {
    return this.state.club;
  }

  updateClub(updates: Partial<ClubBranding>): ClubBranding {
    this.state.club = { ...this.state.club, ...updates };
    this.saveState(this.state);
    return this.state.club;
  }

  // --- Template operations ---
  getTemplates(): TemplateMetadata[] {
    return this.state.templates;
  }

  getTemplateById(id: string): TemplateMetadata | undefined {
    return this.state.templates.find((t) => t.id === id);
  }

  addTemplate(template: TemplateMetadata): TemplateMetadata {
    this.state.templates.push(template);
    this.saveState(this.state);
    return template;
  }

  updateTemplate(id: string, updates: Partial<TemplateMetadata>): TemplateMetadata | undefined {
    const idx = this.state.templates.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    this.state.templates[idx] = { ...this.state.templates[idx], ...updates };
    this.saveState(this.state);
    return this.state.templates[idx];
  }

  deleteTemplate(id: string): boolean {
    const initialLen = this.state.templates.length;
    const template = this.state.templates.find((t) => t.id === id);
    this.state.templates = this.state.templates.filter((t) => t.id !== id);

    if (this.state.templates.length !== initialLen) {
      this.saveState(this.state);
      // Clean up physical file if it was a custom uploaded template
      if (template?.fileUrl && template.fileUrl.startsWith("/templates/custom_")) {
        try {
          const filePath = path.join(process.cwd(), "public", template.fileUrl.replace(/^\//, ""));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.warn("Failed to clean up template file on disk:", e);
        }
      }
      return true;
    }
    return false;
  }

  // --- Event operations ---
  getEvents(): EventRecord[] {
    return this.state.events;
  }

  getEventById(id: string): EventRecord | undefined {
    return this.state.events.find((e) => e.id === id);
  }

  createEvent(event: Omit<EventRecord, "id" | "createdAt" | "updatedAt">): EventRecord {
    const newEvent: EventRecord = {
      ...event,
      id: "evt_" + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.events.unshift(newEvent);
    this.saveState(this.state);
    return newEvent;
  }

  updateEvent(id: string, updates: Partial<EventRecord>): EventRecord | undefined {
    const idx = this.state.events.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.state.events[idx] = {
      ...this.state.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState(this.state);
    return this.state.events[idx];
  }

  // --- Document operations ---
  getDocuments(eventId?: string): DocumentRecord[] {
    if (eventId) {
      return this.state.documents.filter((d) => d.eventId === eventId);
    }
    return this.state.documents;
  }

  getDocumentById(id: string): DocumentRecord | undefined {
    return this.state.documents.find((d) => d.id === id);
  }

  createDocument(doc: Omit<DocumentRecord, "id" | "createdAt" | "updatedAt">): DocumentRecord {
    const newDoc: DocumentRecord = {
      ...doc,
      id: "doc_" + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.documents.unshift(newDoc);

    // Also create initial version snapshot v1
    this.addVersion({
      id: "ver_" + Math.random().toString(36).substring(2, 10),
      documentId: newDoc.id,
      versionNumber: 1,
      dataSnapshot: newDoc.dataSnapshot,
      docxUrl: newDoc.docxUrl,
      pdfUrl: newDoc.pdfUrl,
      changeSummary: "Initial document generation",
      createdAt: new Date().toISOString(),
    });

    this.saveState(this.state);
    return newDoc;
  }

  updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | undefined {
    const idx = this.state.documents.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    this.state.documents[idx] = {
      ...this.state.documents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState(this.state);
    return this.state.documents[idx];
  }

  // --- Version operations ---
  getVersions(documentId: string): DocumentVersionRecord[] {
    return this.state.versions
      .filter((v) => v.documentId === documentId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  addVersion(version: DocumentVersionRecord) {
    this.state.versions.unshift(version);
    this.saveState(this.state);
  }
}

// Global singleton for Next.js hot reload safety
declare global {
  // eslint-disable-next-line no-var
  var __memoryStore: MemoryStore | undefined;
}

if (!global.__memoryStore) {
  global.__memoryStore = new MemoryStore();
}

export const dbStore = global.__memoryStore;
