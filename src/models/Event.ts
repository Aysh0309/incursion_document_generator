import mongoose, { Schema, Document } from "mongoose";

export interface IEventDoc extends Document {
  clubId: string;
  eventName: string;
  rawInputText?: string;
  structuredData: Record<string, any>;
  completenessStatus: "INCOMPLETE" | "VALIDATED" | "COMPLETED";
  missingFields: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEventDoc>(
  {
    clubId: { type: String, required: true },
    eventName: { type: String, required: true },
    rawInputText: { type: String },
    structuredData: { type: Schema.Types.Mixed, default: {} },
    completenessStatus: {
      type: String,
      enum: ["INCOMPLETE", "VALIDATED", "COMPLETED"],
      default: "INCOMPLETE",
    },
    missingFields: [{ type: String }],
  },
  { timestamps: true }
);

export const EventModel =
  mongoose.models.Event || mongoose.model<IEventDoc>("Event", EventSchema);
