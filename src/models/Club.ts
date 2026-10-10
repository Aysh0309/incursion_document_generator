import mongoose, { Schema, Document } from "mongoose";

export interface IClubDoc extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const ClubSchema = new Schema<IClubDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logoUrl: { type: String },
    primaryColor: { type: String, default: "#4F46E5" },
    secondaryColor: { type: String, default: "#3B82F6" },
    department: { type: String, default: "Computer Science & Engineering" },
    universityName: { type: String, default: "Institute of Technology & Science" },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    facultyCoordinator: {
      name: { type: String, required: true },
      designation: { type: String, default: "Associate Professor" },
      department: { type: String, default: "Computer Science & Engineering" },
      signatureUrl: { type: String },
    },
  },
  { timestamps: true }
);

export const ClubModel = mongoose.models.Club || mongoose.model<IClubDoc>("Club", ClubSchema);
