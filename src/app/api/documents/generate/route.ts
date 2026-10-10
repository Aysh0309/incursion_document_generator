import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { generateDocument } from "@/lib/document-engine/generator";
import { evaluateMissingFields } from "@/schemas/event.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, templateId } = body;

    if (!eventId || !templateId) {
      return NextResponse.json(
        { success: false, error: { message: "Both eventId and templateId are required." } },
        { status: 400 }
      );
    }

    const event = dbStore.getEventById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: { message: "Event not found." } },
        { status: 404 }
      );
    }

    const template = dbStore.getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: { message: "Template not found." } },
        { status: 404 }
      );
    }

    const club = dbStore.getClub();

    // Deterministic check for required fields of this specific template
    const { missingFields } = evaluateMissingFields(
      event.structuredData,
      [template.documentType],
      { [template.documentType]: template.requiredFields }
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: `Cannot generate ${template.name}. The following mandatory fields are missing: ${missingFields.join(", ")}`,
            missingFields,
          },
        },
        { status: 422 }
      );
    }

    const docId = "doc_" + Math.random().toString(36).substring(2, 10);

    const generationResult = await generateDocument({
      documentId: docId,
      templateFileUrl: template.fileUrl,
      documentType: template.documentType,
      eventData: event.structuredData,
      club,
    });

    const newDoc = dbStore.createDocument({
      title: `${template.name} - ${event.eventName}`,
      eventId: event.id,
      templateId: template.id,
      documentType: template.documentType,
      clubId: club.id,
      status: "DRAFT",
      currentVersion: 1,
      docxUrl: generationResult.docxUrl,
      pdfUrl: generationResult.pdfUrl,
      pdfEngineUsed: generationResult.pdfEngineUsed,
      dataSnapshot: { ...event.structuredData },
    });

    return NextResponse.json({
      success: true,
      data: newDoc,
    });
  } catch (err: any) {
    console.error("Single document generation error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to generate document." } },
      { status: 500 }
    );
  }
}
