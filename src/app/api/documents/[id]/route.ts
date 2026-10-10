import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(
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

    return NextResponse.json({ success: true, data: document });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
