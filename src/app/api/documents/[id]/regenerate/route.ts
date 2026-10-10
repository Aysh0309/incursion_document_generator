import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { generateDocument } from "@/lib/document-engine/generator";
import { evaluateMissingFields } from "@/schemas/event.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = dbStore.getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        { success: false, error: { message: "Document not found" } },
        { status: 404 }
      );
    }

    const template = dbStore.getTemplateById(document.templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: { message: "Associated template not found" } },
        { status: 404 }
      );
    }

    const club = dbStore.getClub();
    const body = await req.json();
    const { updatedEventData, changeSummary } = body;

    // Merge updated event fields with existing snapshot
    const mergedData = {
      ...document.dataSnapshot,
      ...(updatedEventData || {}),
    };

    // Check required fields deterministically
    const { missingFields } = evaluateMissingFields(
      mergedData,
      [template.documentType],
      { [template.documentType]: template.requiredFields }
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: `Cannot regenerate document. Mandatory fields missing: ${missingFields.join(", ")}`,
            missingFields,
          },
        },
        { status: 422 }
      );
    }

    const nextVersion = document.currentVersion + 1;
    const docId = `${document.id}_v${nextVersion}`;

    const generationResult = await generateDocument({
      documentId: docId,
      templateFileUrl: template.fileUrl,
      documentType: template.documentType,
      eventData: mergedData,
      club,
    });

    // 1. Add new immutable version record to history
    dbStore.addVersion({
      id: "ver_" + Math.random().toString(36).substring(2, 10),
      documentId: document.id,
      versionNumber: nextVersion,
      dataSnapshot: mergedData,
      docxUrl: generationResult.docxUrl,
      pdfUrl: generationResult.pdfUrl,
      changeSummary: changeSummary || `Regenerated with updated fields (Version ${nextVersion})`,
      createdAt: new Date().toISOString(),
    });

    // 2. Update document record
    const updatedDoc = dbStore.updateDocument(document.id, {
      currentVersion: nextVersion,
      docxUrl: generationResult.docxUrl,
      pdfUrl: generationResult.pdfUrl,
      pdfEngineUsed: generationResult.pdfEngineUsed,
      dataSnapshot: mergedData,
      status: "DRAFT", // Reset to draft for review
    });

    return NextResponse.json({
      success: true,
      data: updatedDoc,
      versionNumber: nextVersion,
    });
  } catch (err: any) {
    console.error("Document regeneration error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to regenerate document." } },
      { status: 500 }
    );
  }
}
