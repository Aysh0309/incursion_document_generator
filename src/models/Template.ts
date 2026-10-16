import mongoose, { Schema, Document } from "mongoose";

export interface ITemplateDoc extends Document {
  name: string;
  documentType: string;
  format: "docx" | "pdf";
  description: string;
  fileUrl: string;
  fields: any[];
  requiredFields: string[];
  optionalFields: string[];
  placeholdersDetected: string[];
  pageCount?: number;
  pageDimensions?: Array<{ width: number; height: number }>;
  detectedAssets?: any[];
  analysisWarnings?: string[];
  status: "DRAFT" | "PUBLISHED";
  version: number;
  isActive: boolean;
  isSystemDefault: boolean;
  clubId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplateDoc>(
  {
    name: { type: String, required: true },
    documentType: { type: String, required: true },
    format: { type: String, enum: ["docx", "pdf"], default: "docx" },
    description: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    fields: [{ type: Schema.Types.Mixed }],
    requiredFields: [{ type: String }],
    optionalFields: [{ type: String }],
    placeholdersDetected: [{ type: String }],
    pageCount: { type: Number, default: 1 },
    pageDimensions: [{ type: Schema.Types.Mixed }],
    detectedAssets: [{ type: Schema.Types.Mixed }],
    analysisWarnings: [{ type: String }],
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "PUBLISHED" },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isSystemDefault: { type: Boolean, default: false },
    clubId: { type: String },
  },
  { timestamps: true }
);

export const TemplateModel =
  mongoose.models.Template || mongoose.model<ITemplateDoc>("Template", TemplateSchema);
