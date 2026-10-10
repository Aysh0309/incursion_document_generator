import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { evaluateMissingFields } from "@/schemas/event.schema";
import { DocumentType } from "@/types";

export async function GET() {
  try {
    const events = dbStore.getEvents();
    return NextResponse.json({ success: true, data: events });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, structuredData, rawInputText, targetDocumentTypes } = body;

    const club = dbStore.getClub();
    const docTypes: DocumentType[] = targetDocumentTypes || ["EVENT_PROPOSAL", "PERMISSION_LETTER"];

    const { missingFields } = evaluateMissingFields(structuredData || {}, docTypes);

    const event = dbStore.createEvent({
      clubId: club.id,
      eventName: eventName || structuredData?.eventName || "Untitled Event",
      rawInputText: rawInputText || "",
      structuredData: structuredData || {},
      completenessStatus: missingFields.length === 0 ? "VALIDATED" : "INCOMPLETE",
      missingFields,
    });

    return NextResponse.json({ success: true, data: event });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
