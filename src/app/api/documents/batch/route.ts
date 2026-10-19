import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { generateDocument, validateTemplateSubmission } from "@/lib/document-engine/generator";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DocumentModel, DocumentVersionModel } from "@/models/Document";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized: Active authenticated session required." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { eventId, templateIds, fieldValues } = body;

    if (!eventId || !templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "Both eventId and a non-empty templateIds array are required." } },
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

    const sd = (event.structuredData || {}) as Record<string, any>;
    const combinedData: Record<string, any> = {
      ...sd,
      ...(fieldValues || {}),
      clubName: sd.clubName || club.name,
      universityName: club.universityName,
      department: sd.department || club.department,
    };

    // Keep event structuredData updated
    dbStore.updateEvent(event.id, {
      structuredData: combinedData as any,
    });

    for (const templateId of templateIds) {
      const template = dbStore.getTemplateById(templateId);
      if (!template) {
        errors.push({ templateId, templateName: "Unknown", error: "Template not found" });
        continue;
      }

      // Check required fields using central validation
      const validation = validateTemplateSubmission(template, combinedData);

      if (!validation.valid) {
        const missing = validation.errors.map((e) => e.label).join(", ");
        errors.push({
          templateId,
          templateName: template.name,
          error: `Missing or invalid required fields: ${missing}`,
        });
        continue;
      }

      const docId = "doc_" + Math.random().toString(36).substring(2, 10);

      try {
        const generationResult = await generateDocument({
          documentId: docId,
          template,
          fieldValues: combinedData,
          club,
        });

        const newDoc = dbStore.createDocument({
          title: `${template.name} - ${combinedData.eventName || event.eventName}`,
          eventId: event.id,
          templateId: template.id,
          documentType: template.documentType,
          clubId: club.id,
          status: "DRAFT",
          currentVersion: 1,
          docxUrl: generationResult.docxUrl,
          pdfUrl: generationResult.pdfUrl,
          pdfEngineUsed: generationResult.pdfEngineUsed,
          dataSnapshot: { ...combinedData },
        });

        // Sync to MongoDB in background without blocking HTTP response
        connectToDatabase()
          .then(async (conn) => {
            if (conn) {
              await DocumentModel.create({
                id: newDoc.id,
                title: newDoc.title,
                eventId: newDoc.eventId,
                templateId: newDoc.templateId,
                documentType: newDoc.documentType,
                clubId: newDoc.clubId,
                status: newDoc.status,
                currentVersion: 1,
                docxUrl: newDoc.docxUrl,
                pdfUrl: newDoc.pdfUrl,
                pdfEngineUsed: newDoc.pdfEngineUsed,
                dataSnapshot: newDoc.dataSnapshot,
              }).catch(() => {});

              await DocumentVersionModel.create({
                documentId: newDoc.id,
                versionNumber: 1,
                dataSnapshot: newDoc.dataSnapshot,
                docxUrl: newDoc.docxUrl,
                pdfUrl: newDoc.pdfUrl,
                changeSummary: "Batch document generation",
              }).catch(() => {});
            }
          })
          .catch(() => {});

        generatedDocuments.push(newDoc);
      } catch (genErr: any) {
        errors.push({
          templateId,
          templateName: template.name,
          error: genErr.message,
        });
      }
    }

    if (generatedDocuments.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: errors.map((e) => `${e.templateName}: ${e.error}`).join("; "),
            errors,
          },
        },
        { status: 422 }
      );
    }

    const docIds = generatedDocuments.map((d) => d.id).join(",");
    const zipDownloadUrl =
      generatedDocuments.length > 0
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
