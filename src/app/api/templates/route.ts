import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { dbStore } from "@/lib/db/store";
import { DocumentType } from "@/types";

export async function GET() {
  try {
    const templates = dbStore.getTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const documentType = (formData.get("documentType") as DocumentType) || "EVENT_PROPOSAL";
    const description = (formData.get("description") as string) || "";
    const requiredFieldsRaw = formData.get("requiredFields") as string;

    if (!file || !name) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Both template name and a valid .docx file are required." },
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate Docx format and extract placeholders
    let placeholdersDetected: string[] = [];
    try {
      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      const text = doc.getFullText();
      const tagRegex = /\{([a-zA-Z0-9_\.]+)\}/g;
      let match;
      const tags = new Set<string>();
      while ((match = tagRegex.exec(text)) !== null) {
        tags.add(match[1]);
      }
      placeholdersDetected = Array.from(tags);
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Invalid DOCX template. XML parsing failed: ${parseErr.message}`,
          },
        },
        { status: 400 }
      );
    }

    // Save template file to public/templates/
    const templatesDir = path.join(process.cwd(), "public", "templates");
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const safeFileName = `custom_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_\.-]/g, "_")}`;
    const destinationPath = path.join(templatesDir, safeFileName);
    fs.writeFileSync(destinationPath, buffer);

    let requiredFields: string[] = [];
    if (requiredFieldsRaw) {
      try {
        requiredFields = JSON.parse(requiredFieldsRaw);
      } catch {
        requiredFields = requiredFieldsRaw.split(",").map((s) => s.trim());
      }
    } else {
      // Default required fields: take top placeholders that match standard fields
      requiredFields = placeholdersDetected.filter((p) =>
        ["eventName", "startDate", "venue", "facultyCoordinator"].includes(p)
      );
    }

    const newTemplate = dbStore.addTemplate({
      id: "tmpl_" + Math.random().toString(36).substring(2, 10),
      name,
      documentType,
      description,
      fileUrl: `/templates/${safeFileName}`,
      requiredFields,
      optionalFields: placeholdersDetected.filter((p) => !requiredFields.includes(p)),
      placeholdersDetected,
      version: 1,
      isActive: true,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: newTemplate });
  } catch (err: any) {
    console.error("Template upload error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
