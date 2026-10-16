import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { dbStore } from "@/lib/db/store";
import { DocumentType, TemplateMetadata, TemplateField } from "@/types";
import { analyzeUploadedTemplate } from "@/lib/document-engine/analyzer";
import { connectToDatabase } from "@/lib/db/mongoose";
import { TemplateModel } from "@/models/Template";

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
    const manualFieldsRaw = formData.get("fields") as string;

    if (!file || !name) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Both template name and a valid document file (.docx or .pdf) are required." },
        },
        { status: 400 }
      );
    }

    const fileNameLower = file.name.toLowerCase();
    const isDocx = fileNameLower.endsWith(".docx");
    const isPdf = fileNameLower.endsWith(".pdf");

    if (!isDocx && !isPdf) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Unsupported file format. Please upload an official DOCX or PDF template file." },
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save template file to public/templates/
    const templatesDir = path.join(process.cwd(), "public", "templates");
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    const safeFileName = `custom_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_\.-]/g, "_")}`;
    const destinationPath = path.join(templatesDir, safeFileName);
    fs.writeFileSync(destinationPath, buffer);

    // Run unified structural analysis
    const analysis = await analyzeUploadedTemplate(buffer, file.name);

    let fields: TemplateField[] = analysis.fields;
    if (manualFieldsRaw) {
      try {
        const parsed = JSON.parse(manualFieldsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fields = parsed;
        }
      } catch {
        // use detected fields
      }
    }

    const requiredFields = fields.filter((f) => f.required).map((f) => f.name);
    const optionalFields = fields.filter((f) => !f.required).map((f) => f.name);
    const placeholdersDetected = fields.map((f) => f.name);

    const templateId = "tmpl_" + Math.random().toString(36).substring(2, 10);

    const newTemplateData: TemplateMetadata = {
      id: templateId,
      name,
      documentType,
      format: analysis.format,
      description,
      fileUrl: `/templates/${safeFileName}`,
      fields,
      requiredFields,
      optionalFields,
      placeholdersDetected,
      pageCount: analysis.pageCount,
      pageDimensions: analysis.pageDimensions,
      detectedAssets: analysis.detectedAssets,
      analysisWarnings: analysis.warnings,
      status: "PUBLISHED",
      version: 1,
      isActive: true,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
    };

    // Save to memory store
    dbStore.addTemplate(newTemplateData);

    // Save to MongoDB if connected
    try {
      const conn = await connectToDatabase();
      if (conn) {
        await TemplateModel.create({
          ...newTemplateData,
          _id: undefined,
        });
      }
    } catch (dbErr) {
      console.warn("MongoDB template sync note (persisted locally):", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: newTemplateData,
      analysisSummary: {
        format: analysis.format,
        fieldsDetectedCount: fields.length,
        assetsDetectedCount: analysis.detectedAssets.length,
        warnings: analysis.warnings,
      },
    });
  } catch (err: any) {
    console.error("Template upload and analysis error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to analyze and save template." } },
      { status: 500 }
    );
  }
}
