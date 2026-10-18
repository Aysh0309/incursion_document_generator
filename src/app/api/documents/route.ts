import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;
    const statusParam = searchParams.get("status") || undefined;
    let documents = dbStore.getDocuments(eventId);
    if (statusParam) {
      const allowed = statusParam.split(",").map((s) => s.trim());
      documents = documents.filter((d) => allowed.includes(d.status));
    }
    return NextResponse.json({ success: true, data: documents });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
