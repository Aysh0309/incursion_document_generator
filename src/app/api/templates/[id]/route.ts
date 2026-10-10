import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = dbStore.getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { success: false, error: { message: "Template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
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
    const existing = dbStore.getTemplateById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: "Template not found" } },
        { status: 404 }
      );
    }

    const updates = await req.json();
    const updated = dbStore.updateTemplate(id, updates);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
