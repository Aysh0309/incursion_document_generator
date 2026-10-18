import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { dbStore } from "@/lib/db/store";
import { DocumentType, TemplateMetadata, TemplateField } from "@/types";
import { analyzeUploadedTemplate } from "@/lib/document-engine/analyzer";
import { connectToDatabase } from "@/lib/db/mongoose";
import { TemplateModel } from "@/models/Template";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const activeOnly = searchParams.get("active") === "true";

    let templates = dbStore.getTemplates();
    if (status) {
      templates = templates.filter((t) => t.status === status);
    }
    if (activeOnly) {
      templates = templates.filter((t) => t.isActive);
    }
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
    const contentType = req.headers.get("content-type") || "";

    // 1. JSON Payload: Save & Publish an analyzed or new template
    if (contentType.includes("application/json")) {
      const body = await req.json();

      if (!body.name || !body.fileUrl) {
        return NextResponse.json(
          { success: false, error: { message: "Template name and fileUrl are required to publish." } },
          { status: 400 }
        );
      }

      const templateId = body.id || ("tmpl_" + Math.random().toString(36).substring(2, 10));
      const fields: TemplateField[] = Array.isArray(body.fields) ? body.fields : [];
      const requiredFields = fields.filter((f) => f.required && !f.isFixed).map((f) => f.name);
      const optionalFields = fields.filter((f) => !f.required && !f.isFixed).map((f) => f.name);
      const placeholdersDetected = fields.map((f) => f.name);

      const publishedTemplate: TemplateMetadata = {
        id: templateId,
        name: body.name,
        documentType: body.documentType || "EVENT_PROPOSAL",
        format: body.format || (body.fileUrl.endsWith(".pdf") ? "pdf" : "docx"),
        description: body.description || "",
        fileUrl: body.fileUrl,
        fields,
        requiredFields,
        optionalFields,
        placeholdersDetected,
        pageCount: body.pageCount || 1,
        pageDimensions: body.pageDimensions || [],
        detectedAssets: body.detectedAssets || [],
        analysisWarnings: body.analysisWarnings || [],
        status: "PUBLISHED",
        version: body.version || 1,
        isActive: body.isActive !== undefined ? body.isActive : true,
        isSystemDefault: false,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to memory store
      dbStore.addTemplate(publishedTemplate);

      // Save to MongoDB in background without blocking HTTP response
      connectToDatabase()
        .then((conn) => {
          if (conn) {
            TemplateModel.create({
              ...publishedTemplate,
              _id: undefined,
            }).catch(() => {});
          }
        })
        .catch(() => {});

      return NextResponse.json({
        success: true,
        data: publishedTemplate,
        message: "Template published and saved successfully.",
      });
    }

    // 2. FormData: Upload & Analyze document template
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const documentType = (formData.get("documentType") as DocumentType) || "EVENT_PROPOSAL";
    const description = (formData.get("description") as string) || "";
    const manualFieldsRaw = formData.get("fields") as string;
    const analyzeOnly =
      formData.get("analyzeOnly") === "true" ||
      new URL(req.url).searchParams.get("analyzeOnly") === "true";

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
      status: analyzeOnly ? "DRAFT" : "PUBLISHED",
      version: 1,
      isActive: true,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
    };

    // If analyzeOnly is true, do NOT save to dbStore or MongoDB!
    // Return the analyzed draft so user can review and configure fields.
    if (analyzeOnly) {
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
    }

    // Save to memory store
    dbStore.addTemplate(newTemplateData);

    // Save to MongoDB in background without blocking HTTP response
    connectToDatabase()
      .then((conn) => {
        if (conn) {
          TemplateModel.create({
            ...newTemplateData,
            _id: undefined,
          }).catch(() => {});
        }
      })
      .catch(() => {});

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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("fileUrl");
    if (fileUrl && fileUrl.startsWith("/templates/custom_")) {
      const filePath = path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return NextResponse.json({ success: true, message: "Unpublished template file discarded." });
    }
    return NextResponse.json(
      { success: false, error: { message: "Invalid or unauthorized fileUrl for discard." } },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

