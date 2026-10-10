export type DocumentType =
  | "EVENT_PROPOSAL"
  | "PERMISSION_LETTER"
  | "INVITATION_LETTER"
  | "SPONSORSHIP_LETTER"
  | "VOLUNTEER_NOTICE"
  | "POST_EVENT_REPORT"
  | "CERTIFICATE"
  | "MEETING_MINUTES";

export type DocumentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export type UserRole = "MEMBER" | "CLUB_ADMIN" | "FACULTY_APPROVER";

export interface ClubBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  department: string;
  universityName: string;
  contactEmail: string;
  contactPhone: string;
  facultyCoordinator: {
    name: string;
    designation: string;
    department: string;
    signatureUrl?: string;
  };
}

export interface StructuredEventData {
  eventName: string | null;
  eventType: string | null;
  eventDescription: string | null;
  targetAudience: string | null;
  expectedParticipants: number | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  venue: string | null;
  isOnline: boolean;
  meetingLink?: string | null;
  organizerName: string | null;
  clubName: string | null;
  facultyCoordinator: string | null;
  departmentHOD: string | null;
  budgetRequested: number | null;
  budgetBreakdown?: Array<{ item: string; amount: number }>;
  speaker?: {
    name: string | null;
    designation: string | null;
    organization: string | null;
    email?: string | null;
    topic?: string | null;
  } | null;
  registrationDeadline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  objectives?: string | null;
  requiresLabComputers?: boolean;
}

export interface MissingFieldQuestion {
  fieldKey: keyof StructuredEventData | string;
  question: string;
  reason: string;
  suggestedInputType: "text" | "date" | "time" | "number" | "select" | "textarea";
  options?: string[];
}

export interface ExtractionResult {
  extractedData: StructuredEventData;
  detectedDocumentTypes: DocumentType[];
  missingFieldQuestions: MissingFieldQuestion[];
  rawText?: string;
  isComplete: boolean;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  documentType: DocumentType;
  description: string;
  fileUrl: string;
  requiredFields: string[];
  optionalFields: string[];
  placeholdersDetected: string[];
  version: number;
  isActive: boolean;
  isSystemDefault?: boolean;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  eventId: string;
  templateId: string;
  documentType: DocumentType;
  clubId: string;
  status: DocumentStatus;
  currentVersion: number;
  docxUrl: string;
  pdfUrl: string;
  pdfEngineUsed: "libreoffice" | "institutional_pdfkit";
  dataSnapshot: StructuredEventData;
  reviewComments?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  versionNumber: number;
  dataSnapshot: StructuredEventData;
  docxUrl: string;
  pdfUrl: string;
  changeSummary: string;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  clubId: string;
  eventName: string;
  rawInputText?: string;
  structuredData: StructuredEventData;
  completenessStatus: "INCOMPLETE" | "VALIDATED";
  missingFields: string[];
  createdAt: string;
  updatedAt: string;
}
