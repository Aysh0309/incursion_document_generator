import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { generateDocument } from "@/lib/document-engine/generator";
import { evaluateMissingFields } from "@/schemas/event.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, templateIds } = body;

    if (!eventId || !templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Both eventId and templateIds array are required." } },
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

    const club = dbStore.getClub();
    const generatedDocuments = [];
    const errors = [];

    for (const templateId of templateIds) {
      const template = dbStore.getTemplateById(templateId);
      if (!template) {
        errors.push({ templateId, error: "Template not found" });
        continue;
      }

      // Check required fields
      const { missingFields } = evaluateMissingFields(
        event.structuredData,
        [template.documentType],
        { [template.documentType]: template.requiredFields }
      );

      if (missingFields.length > 0) {
        errors.push({
          templateId,
          templateName: template.name,
          error: `Missing mandatory fields: ${missingFields.join(", ")}`,
        });
        continue;
      }

      const docId = "doc_" + Math.random().toString(36).substring(2, 10);

      try {
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

        generatedDocuments.push(newDoc);
      } catch (genErr: any) {
        errors.push({
          templateId,
          templateName: template.name,
          error: genErr.message,
        });
      }
    }

    const docIds = generatedDocuments.map((d) => d.id).join(",");
    const zipDownloadUrl = generatedDocuments.length > 0
      ? `/api/documents/batch-download?documentIds=${docIds}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        generatedDocuments,
        errors,
        zipDownloadUrl,
      },
    });
  } catch (err: any) {
    console.error("Batch document generation error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to batch generate documents." } },
      { status: 500 }
    );
  }
}
