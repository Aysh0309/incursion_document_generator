import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { generateDocument, validateTemplateSubmission } from "@/lib/document-engine/generator";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DocumentModel, DocumentVersionModel } from "@/models/Document";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, templateId, fieldValues } = body;

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

    // Merge event structuredData with any custom fieldValues provided
    const sd = (event.structuredData || {}) as Record<string, any>;
    const mergedData: Record<string, any> = {
      ...sd,
      ...(fieldValues || {}),
      clubName: sd.clubName || club.name,
      universityName: club.universityName,
      department: sd.department || club.department,
    };

    // Central Server-Side Validation: Blocks generation if any mandatory field is missing
    const validation = validateTemplateSubmission(template, mergedData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: `Cannot generate ${template.name}. The following required fields are unresolved: ${validation.errors.map((e) => e.label).join(", ")}`,
            validationErrors: validation.errors,
          },
        },
        { status: 422 }
      );
    }

    // Keep event structuredData updated with user-confirmed fields
    dbStore.updateEvent(event.id, {
      structuredData: mergedData as any,
    });

    const docId = "doc_" + Math.random().toString(36).substring(2, 10);

    const generationResult = await generateDocument({
      documentId: docId,
      template,
      fieldValues: mergedData,
      club,
    });

    const newDoc = dbStore.createDocument({
      title: `${template.name} - ${mergedData.eventName || event.eventName}`,
      eventId: event.id,
      templateId: template.id,
      documentType: template.documentType,
      clubId: club.id,
      status: "DRAFT",
      currentVersion: 1,
      docxUrl: generationResult.docxUrl,
      pdfUrl: generationResult.pdfUrl,
      pdfEngineUsed: generationResult.pdfEngineUsed,
      dataSnapshot: { ...mergedData },
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
            changeSummary: "Initial document generation",
          }).catch(() => {});
        }
      })
      .catch(() => {});

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
