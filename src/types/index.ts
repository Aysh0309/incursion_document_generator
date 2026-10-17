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

export type FieldDataType =
  | "text"
  | "date"
  | "time"
  | "number"
  | "currency"
  | "email"
  | "phone"
  | "textarea"
  | "select";

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  description?: string;
  type: FieldDataType;
  required: boolean;
  isFixed?: boolean;
  fixedValue?: string;
  isSystem?: boolean;
  pageNumber?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  formFieldName?: string;
  sourceEvidence?: string;
  confidence: number;
  adminConfirmed: boolean;
  options?: string[];
  repeatedFieldKeys?: string[];
}

export interface DetectedAsset {
  id: string;
  type: "logo" | "image" | "graphic";
  name?: string;
  pageNumber?: number;
  width?: number;
  height?: number;
  dataUrl?: string;
  description?: string;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  documentType: DocumentType;
  format: "docx" | "pdf";
  description: string;
  fileUrl: string;
  fields: TemplateField[];
  requiredFields: string[];
  optionalFields: string[];
  placeholdersDetected: string[];
  pageCount?: number;
  pageDimensions?: Array<{ width: number; height: number }>;
  detectedAssets?: DetectedAsset[];
  analysisWarnings?: string[];
  status: "DRAFT" | "PUBLISHED";
  version: number;
  isActive: boolean;
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  pdfEngineUsed: "pdf_lib_direct" | "libreoffice" | "headless_browser" | "institutional_pdfkit";
  dataSnapshot: Record<string, any>;
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
  dataSnapshot: Record<string, any>;
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
