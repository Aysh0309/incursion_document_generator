import mongoose, { Schema, Document } from "mongoose";

export interface ITemplateDoc extends Document {
  name: string;
  documentType: string;
  description: string;
  fileUrl: string;
  requiredFields: string[];
  optionalFields: string[];
  placeholdersDetected: string[];
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
    description: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    requiredFields: [{ type: String }],
    optionalFields: [{ type: String }],
    placeholdersDetected: [{ type: String }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    isSystemDefault: { type: Boolean, default: false },
    clubId: { type: String },
  },
  { timestamps: true }
);

export const TemplateModel =
  mongoose.models.Template || mongoose.model<ITemplateDoc>("Template", TemplateSchema);
