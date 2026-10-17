import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { connectToDatabase } from "@/lib/db/mongoose";
import { TemplateModel } from "@/models/Template";

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

    // If fields were updated, synchronize requiredFields, optionalFields, placeholdersDetected
    if (updates.fields && Array.isArray(updates.fields)) {
      updates.requiredFields = updates.fields
        .filter((f: any) => f.required && !f.isFixed)
        .map((f: any) => f.name);
      updates.optionalFields = updates.fields
        .filter((f: any) => !f.required && !f.isFixed)
        .map((f: any) => f.name);
      updates.placeholdersDetected = updates.fields.map((f: any) => f.name);
    }

    updates.updatedAt = new Date().toISOString();

    const updated = dbStore.updateTemplate(id, updates);

    // Sync to MongoDB in background without blocking HTTP response
    connectToDatabase()
      .then((conn) => {
        if (conn) {
          TemplateModel.updateOne({ id }, { $set: updates }).catch(() => {});
        }
      })
      .catch(() => {});

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
    const existing = dbStore.getTemplateById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: "Template not found" } },
        { status: 404 }
      );
    }

    const deleted = dbStore.deleteTemplate(id);

    // Sync to MongoDB in background without blocking HTTP response
    connectToDatabase()
      .then((conn) => {
        if (conn) {
          TemplateModel.deleteOne({ id }).catch(() => {});
        }
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Template '${existing.name}' deleted successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
