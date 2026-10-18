import mongoose, { Schema, Document } from "mongoose";

export interface IDocRecordDoc extends Document {
  title: string;
  eventId: string;
  templateId: string;
  documentType: string;
  clubId: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "PENDING_SIGNATURE" | "APPROVED" | "COMPLETED" | "CHANGES_REQUESTED" | "REJECTED";
  currentVersion: number;
  docxUrl: string;
  pdfUrl: string;
  unsignedPdfUrl?: string;
  pdfEngineUsed: string;
  dataSnapshot: Record<string, any>;
  signingWorkflow?: string;
  signatureRequests?: any[];
  workflowEvents?: any[];
  requesterEmail?: string;
  requesterName?: string;
  reviewComments?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecordSchema = new Schema<IDocRecordDoc>(
  {
    title: { type: String, required: true },
    eventId: { type: String, required: true },
    templateId: { type: String, required: true },
    documentType: { type: String, required: true },
    clubId: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING_SIGNATURE", "APPROVED", "COMPLETED", "CHANGES_REQUESTED", "REJECTED"],
      default: "DRAFT",
    },
    currentVersion: { type: Number, default: 1 },
    docxUrl: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    unsignedPdfUrl: { type: String },
    pdfEngineUsed: { type: String, default: "institutional_pdfkit" },
    dataSnapshot: { type: Schema.Types.Mixed, required: true },
    signingWorkflow: { type: String, default: "SEQUENTIAL" },
    signatureRequests: { type: Schema.Types.Mixed, default: [] },
    workflowEvents: { type: Schema.Types.Mixed, default: [] },
    requesterEmail: { type: String },
    requesterName: { type: String },
    reviewComments: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export const DocumentModel =
  mongoose.models.DocumentRecord ||
  mongoose.model<IDocRecordDoc>("DocumentRecord", DocumentRecordSchema);

export interface IDocVersionDoc extends Document {
  documentId: string;
  versionNumber: number;
  dataSnapshot: Record<string, any>;
  docxUrl: string;
  pdfUrl: string;
  changeSummary: string;
  createdAt: Date;
}

const DocumentVersionSchema = new Schema<IDocVersionDoc>(
  {
    documentId: { type: String, required: true },
    versionNumber: { type: Number, required: true },
    dataSnapshot: { type: Schema.Types.Mixed, required: true },
    docxUrl: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    changeSummary: { type: String, default: "Document regenerated" },
  },
  { timestamps: true }
);

export const DocumentVersionModel =
  mongoose.models.DocumentVersion ||
  mongoose.model<IDocVersionDoc>("DocumentVersion", DocumentVersionSchema);
