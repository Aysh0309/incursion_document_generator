import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { evaluateMissingFields, isEventComplete } from "@/schemas/event.schema";
import { DocumentType } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = dbStore.getEventById(id);

    if (!event) {
      return NextResponse.json(
        { success: false, error: { message: "Event not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: event });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = dbStore.getEventById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: "Event not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { updates, targetDocumentTypes } = body;

    // Deep merge updates into structuredData without wiping out unrelated fields
    const mergedData = {
      ...existing.structuredData,
      ...(updates || {}),
    };

    // If speaker updates are provided as top-level speaker keys or nested
    if (updates?.speaker) {
      mergedData.speaker = {
        ...(existing.structuredData.speaker || {}),
        ...updates.speaker,
      };
    }

    const docTypes: DocumentType[] = targetDocumentTypes || ["EVENT_PROPOSAL", "PERMISSION_LETTER"];
    const { missingFields } = evaluateMissingFields(mergedData, docTypes);
    const complete = isEventComplete(mergedData);

    const updated = dbStore.updateEvent(id, {
      eventName: updates?.eventName || existing.eventName,
      structuredData: mergedData,
      completenessStatus: complete ? "COMPLETED" : "INCOMPLETE",
      missingFields: complete ? [] : missingFields,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = dbStore.deleteEvent(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { message: "Event not found or already deleted" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event and associated documents deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
