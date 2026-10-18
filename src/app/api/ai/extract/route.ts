import { NextRequest, NextResponse } from "next/server";
import { extractEventInformation } from "@/lib/ai/extractor";
import { DocumentType } from "@/types";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, targetDocumentTypes, templateId, templateName, templateFields: clientFields } = body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_INPUT",
            message: "Please provide a natural language description of your event.",
          },
        },
        { status: 400 }
      );
    }

    let templateFields = clientFields;
    let resolvedTemplateName = templateName;

    if (templateId) {
      const template = dbStore.getTemplateById(templateId);
      if (template) {
        if (!templateFields || templateFields.length === 0) {
          templateFields = template.fields;
        }
        if (!resolvedTemplateName) {
          resolvedTemplateName = template.name;
        }
      }
    }

    const result = await extractEventInformation(
      rawText,
      targetDocumentTypes as DocumentType[] | undefined,
      templateFields,
      resolvedTemplateName
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("AI extraction endpoint error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EXTRACTION_FAILED",
          message: err.message || "Failed to extract information from event description.",
        },
      },
      { status: 500 }
    );
  }
}
