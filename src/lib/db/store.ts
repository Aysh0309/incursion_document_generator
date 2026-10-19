import fs from "fs";
import path from "path";
import {
  AuthorityRecord,
  ClubBranding,
  DocumentRecord,
  DocumentType,
  DocumentVersionRecord,
  EventRecord,
  SignatureRequest,
  StructuredEventData,
  TemplateMetadata,
  TemplateSignatureField,
  UserAccount,
  UserRole,
  WorkflowEvent,
} from "@/types";
import { TEMPLATE_REQUIRED_FIELDS } from "@/schemas/event.schema";

const STORAGE_FILE = path.join(process.cwd(), "public", "storage", "db-state.json");

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: "usr_admin_aayush",
    name: "Aayush Awasthi",
    email: "aayushawashi311@gmail.com",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aayush",
    role: "CLUB_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_admin_01",
    name: "Club Administrator",
    email: "admin@campus.edu",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    role: "CLUB_ADMIN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_faculty_01",
    name: "Dr. Sunita Sharma",
    email: "faculty@campus.edu",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Faculty",
    role: "FACULTY_APPROVER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_member_01",
    name: "Student Member",
    email: "member@campus.edu",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Member",
    role: "MEMBER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface DatabaseState {
  club: ClubBranding;
  authorities: AuthorityRecord[];
  templates: TemplateMetadata[];
  events: EventRecord[];
  documents: DocumentRecord[];
  versions: DocumentVersionRecord[];
  users: UserAccount[];
}

export const DEFAULT_AUTHORITIES: AuthorityRecord[] = [];

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
    signatureFields: [
      {
        id: "sig_student_head",
        name: "studentHeadSignature",
        printedName: "",
        designation: "Signature of Student Head",
        assignedRole: "STUDENT_HEAD",
        defaultAuthorityId: "",
        pageNumber: 1,
        position: { x: 72, y: 120, width: 140, height: 45 },
        required: true,
        signingOrder: 1,
        actionType: "SIGNATURE_ONLY",
      },
      {
        id: "sig_faculty_chair",
        name: "facultyChairmanSignature",
        printedName: "",
        designation: "Signature of Faculty Chairman",
        assignedRole: "FACULTY_CHAIRMAN",
        defaultAuthorityId: "",
        pageNumber: 1,
        position: { x: 380, y: 120, width: 140, height: 45 },
        required: true,
        signingOrder: 2,
        actionType: "APPROVAL_AND_SIGNATURE",
      },
    ],
    signingWorkflow: "SEQUENTIAL",
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
    signatureFields: [
      {
        id: "sig_faculty_coord",
        name: "facultyCoordinatorSignature",
        printedName: "",
        designation: "Signature of Faculty Coordinator",
        assignedRole: "FACULTY_COORDINATOR",
        defaultAuthorityId: "",
        pageNumber: 1,
        position: { x: 72, y: 120, width: 140, height: 45 },
        required: true,
        signingOrder: 1,
        actionType: "APPROVAL_AND_SIGNATURE",
      },
      {
        id: "sig_hod",
        name: "hodSignature",
        printedName: "",
        designation: "Signature of Head of Department",
        assignedRole: "HOD",
        defaultAuthorityId: "",
        pageNumber: 1,
        position: { x: 380, y: 120, width: 140, height: 45 },
        required: true,
        signingOrder: 2,
        actionType: "APPROVAL_AND_SIGNATURE",
      },
    ],
    signingWorkflow: "SEQUENTIAL",
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
    signatureFields: [
      {
        id: "sig_faculty_coord_inv",
        name: "facultyCoordinatorSignature",
        printedName: "",
        designation: "Signature of Faculty Coordinator",
        assignedRole: "FACULTY_COORDINATOR",
        defaultAuthorityId: "",
        pageNumber: 1,
        position: { x: 380, y: 120, width: 140, height: 45 },
        required: true,
        signingOrder: 1,
        actionType: "SIGNATURE_ONLY",
      },
    ],
    signingWorkflow: "SEQUENTIAL",
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
    completenessStatus: "COMPLETED",
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
          const defaultTmpl = DEFAULT_TEMPLATES.find((dt) => dt.id === t.id);
          const fields = (t.fields && t.fields.length > 0)
            ? t.fields
            : buildDefaultFields(t.placeholdersDetected || [], t.requiredFields || []);
          return {
            ...t,
            format,
            status: t.status || "PUBLISHED",
            fields,
            signatureFields: t.signatureFields || defaultTmpl?.signatureFields || [],
            signingWorkflow: t.signingWorkflow || defaultTmpl?.signingWorkflow || "SEQUENTIAL",
          };
        });

        return {
          club: parsed.club || DEFAULT_CLUB,
          authorities: Array.isArray(parsed.authorities) ? parsed.authorities : [],
          templates: normalizedTemplates,
          events: parsed.events || SAMPLE_EVENTS,
          documents: parsed.documents || [],
          versions: parsed.versions || [],
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : DEFAULT_USERS,
        };
      }
    } catch (e) {
      console.warn("Failed to read disk state, resetting to defaults", e);
    }

    const initial: DatabaseState = {
      club: DEFAULT_CLUB,
      authorities: DEFAULT_AUTHORITIES,
      templates: DEFAULT_TEMPLATES,
      events: SAMPLE_EVENTS,
      documents: [],
      versions: [],
      users: DEFAULT_USERS,
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
    const existingIdx = this.state.templates.findIndex((t) => t.id === template.id);
    if (existingIdx !== -1) {
      this.state.templates[existingIdx] = template;
    } else {
      this.state.templates.push(template);
    }
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

  deleteEvent(id: string): boolean {
    const initialLen = this.state.events.length;
    this.state.events = this.state.events.filter((e) => e.id !== id);

    if (this.state.events.length !== initialLen) {
      // Also cascade delete all associated documents for this event
      const docsToDelete = this.state.documents.filter((d) => d.eventId === id);
      for (const doc of docsToDelete) {
        this.deleteDocument(doc.id);
      }
      this.saveState(this.state);
      return true;
    }
    return false;
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

  deleteDocument(id: string): boolean {
    const initialLen = this.state.documents.length;
    const doc = this.state.documents.find((d) => d.id === id);
    this.state.documents = this.state.documents.filter((d) => d.id !== id);
    this.state.versions = this.state.versions.filter((v) => v.documentId !== id);

    if (this.state.documents.length !== initialLen) {
      this.saveState(this.state);
      if (doc?.docxUrl) {
        try {
          const filePath = path.join(process.cwd(), "public", doc.docxUrl.replace(/^\//, ""));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Failed to clean up docx file on disk:", e);
        }
      }
      if (doc?.pdfUrl) {
        try {
          const filePath = path.join(process.cwd(), "public", doc.pdfUrl.replace(/^\//, ""));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Failed to clean up pdf file on disk:", e);
        }
      }
      return true;
    }
    return false;
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

  // --- Authority operations ---
  getAuthorities(): AuthorityRecord[] {
    return this.state.authorities || [];
  }

  getAuthorityById(id: string): AuthorityRecord | undefined {
    return (this.state.authorities || []).find((a) => a.id === id);
  }

  getAuthorityByRole(role: string): AuthorityRecord | undefined {
    return (this.state.authorities || []).find((a) => a.role === role && a.isActive);
  }

  createAuthority(auth: Omit<AuthorityRecord, "id" | "createdAt">): AuthorityRecord {
    const newAuth: AuthorityRecord = {
      ...auth,
      id: "auth_" + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    };
    if (!this.state.authorities) this.state.authorities = [];
    this.state.authorities.push(newAuth);
    this.saveState(this.state);
    return newAuth;
  }

  updateAuthority(id: string, updates: Partial<AuthorityRecord>): AuthorityRecord | undefined {
    if (!this.state.authorities) this.state.authorities = [];
    const idx = this.state.authorities.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.state.authorities[idx] = { ...this.state.authorities[idx], ...updates };
    this.saveState(this.state);
    return this.state.authorities[idx];
  }

  deleteAuthority(id: string): boolean {
    if (!this.state.authorities) return false;
    const initialLen = this.state.authorities.length;
    this.state.authorities = this.state.authorities.filter((a) => a.id !== id);
    if (this.state.authorities.length !== initialLen) {
      this.saveState(this.state);
      return true;
    }
    return false;
  }

  // --- Signature Request & Workflow Operations ---
  getSignatureRequestByTokenHash(tokenOrHash: string): { document: DocumentRecord; request: SignatureRequest } | undefined {
    const crypto = require("crypto");
    const computedHash = crypto.createHash("sha256").update(tokenOrHash).digest("hex");
    for (const doc of this.state.documents) {
      if (doc.signatureRequests) {
        const found = doc.signatureRequests.find(
          (r) => r.tokenHash === computedHash || r.tokenHash === tokenOrHash
        );
        if (found) {
          return { document: doc, request: found };
        }
      }
    }
    return undefined;
  }

  updateSignatureRequest(
    documentId: string,
    requestId: string,
    updates: Partial<SignatureRequest>
  ): { document: DocumentRecord; request: SignatureRequest } | undefined {
    const docIdx = this.state.documents.findIndex((d) => d.id === documentId);
    if (docIdx === -1) return undefined;
    const doc = this.state.documents[docIdx];
    if (!doc.signatureRequests) return undefined;
    const reqIdx = doc.signatureRequests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) return undefined;

    doc.signatureRequests[reqIdx] = { ...doc.signatureRequests[reqIdx], ...updates };
    doc.updatedAt = new Date().toISOString();
    this.saveState(this.state);
    return { document: doc, request: doc.signatureRequests[reqIdx] };
  }

  addWorkflowEvent(
    documentId: string,
    event: Omit<WorkflowEvent, "id" | "timestamp" | "documentId">
  ): WorkflowEvent | undefined {
    const docIdx = this.state.documents.findIndex((d) => d.id === documentId);
    if (docIdx === -1) return undefined;
    const doc = this.state.documents[docIdx];
    if (!doc.workflowEvents) doc.workflowEvents = [];

    const newEvent: WorkflowEvent = {
      ...event,
      id: "wf_" + Math.random().toString(36).substring(2, 10),
      documentId,
      timestamp: new Date().toISOString(),
    };
    doc.workflowEvents.unshift(newEvent);
    doc.updatedAt = new Date().toISOString();
    this.saveState(this.state);
    return newEvent;
  }

  // --- User & Role operations ---
  getUsers(): UserAccount[] {
    return this.state.users || [];
  }

  getUserById(id: string): UserAccount | undefined {
    return (this.state.users || []).find((u) => u.id === id);
  }

  getUserByEmail(email: string): UserAccount | undefined {
    const normalized = email.trim().toLowerCase();
    return (this.state.users || []).find((u) => u.email.trim().toLowerCase() === normalized);
  }

  upsertUser(payload: {
    email: string;
    name: string;
    image?: string;
    role?: UserRole;
    googleId?: string;
  }): UserAccount {
    if (!this.state.users) {
      this.state.users = [];
    }

    const existingIdx = this.state.users.findIndex(
      (u) => u.email.trim().toLowerCase() === payload.email.trim().toLowerCase()
    );

    const now = new Date().toISOString();

    const adminEmails = [
      "aayushawashi311@gmail.com",
      "aayushawasthi311@gmail.com",
      "admin@campus.edu",
    ];
    const isAdminEmail = adminEmails.includes(payload.email.trim().toLowerCase());

    if (existingIdx !== -1) {
      const existing = this.state.users[existingIdx];
      const updated: UserAccount = {
        ...existing,
        name: payload.name || existing.name,
        image: payload.image || existing.image,
        googleId: payload.googleId || existing.googleId,
        role: isAdminEmail ? "CLUB_ADMIN" : (payload.role || existing.role),
        lastLoginAt: now,
        updatedAt: now,
      };
      this.state.users[existingIdx] = updated;
      this.saveState(this.state);
      return updated;
    }

    // Assign default role: first user, admin email, or designated admin gets CLUB_ADMIN
    let role: UserRole = payload.role || "MEMBER";
    if (this.state.users.length === 0 || isAdminEmail || payload.email.toLowerCase().includes("admin")) {
      role = "CLUB_ADMIN";
    }

    const newUser: UserAccount = {
      id: "usr_" + Math.random().toString(36).substring(2, 10),
      name: payload.name,
      email: payload.email.trim().toLowerCase(),
      image: payload.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.name)}`,
      role,
      googleId: payload.googleId,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    this.state.users.push(newUser);
    this.saveState(this.state);
    return newUser;
  }

  updateUserRole(userId: string, role: UserRole): UserAccount | undefined {
    if (!this.state.users) return undefined;
    const idx = this.state.users.findIndex((u) => u.id === userId);
    if (idx === -1) return undefined;

    this.state.users[idx] = {
      ...this.state.users[idx],
      role,
      updatedAt: new Date().toISOString(),
    };
    this.saveState(this.state);
    return this.state.users[idx];
  }

  deleteUser(userId: string): boolean {
    if (!this.state.users) return false;
    const initialLen = this.state.users.length;
    this.state.users = this.state.users.filter((u) => u.id !== userId);
    if (this.state.users.length !== initialLen) {
      this.saveState(this.state);
      return true;
    }
    return false;
  }
}

// Global singleton for Next.js hot reload safety
declare global {
  // eslint-disable-next-line no-var
  var __memoryStore: MemoryStore | undefined;
}

if (!global.__memoryStore || typeof global.__memoryStore.getUsers !== "function") {
  global.__memoryStore = new MemoryStore();
}

export const dbStore = global.__memoryStore;
