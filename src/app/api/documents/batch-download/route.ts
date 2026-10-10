import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentIdsParam = searchParams.get("documentIds");

    if (!documentIdsParam) {
      return NextResponse.json(
        { success: false, error: { message: "documentIds parameter is required" } },
        { status: 400 }
      );
    }

    const docIds = documentIdsParam.split(",").map((s) => s.trim());
    const documents = docIds
      .map((id) => dbStore.getDocumentById(id))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "No valid documents found for the provided IDs" } },
        { status: 404 }
      );
    }

    const zip = new PizZip();
    const publicDir = path.join(process.cwd(), "public");

    for (const doc of documents) {
      const safeTitle = doc.title.replace(/[^a-zA-Z0-9_\-\s]/g, "_");

      // 1. Add DOCX
      if (doc.docxUrl) {
        const docxDiskPath = path.join(publicDir, doc.docxUrl.replace(/^\//, ""));
        if (fs.existsSync(docxDiskPath)) {
          const content = fs.readFileSync(docxDiskPath);
          zip.file(`DOCX/${safeTitle}.docx`, content);
        }
      }

      // 2. Add PDF
      if (doc.pdfUrl) {
        const pdfDiskPath = path.join(publicDir, doc.pdfUrl.replace(/^\//, ""));
        if (fs.existsSync(pdfDiskPath)) {
          const content = fs.readFileSync(pdfDiskPath);
          zip.file(`PDF/${safeTitle}.pdf`, content);
        }
      }
    }

    const zipBuffer = zip.generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="smart_documents_bundle.zip"',
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err: any) {
    console.error("Batch zip download error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to generate ZIP archive." } },
      { status: 500 }
    );
  }
}
