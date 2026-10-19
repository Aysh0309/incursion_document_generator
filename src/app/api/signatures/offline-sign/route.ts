import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, documentId, requestId, offlineSignerName, offlineSignDate, offlineNote } = body;

    let targetDoc: any = null;
    let targetReq: any = null;

    if (token) {
      const found = dbStore.getSignatureRequestByTokenHash(token);
      if (!found) {
        return NextResponse.json(
          { success: false, error: { message: "Invalid or expired signing token" } },
          { status: 404 }
        );
      }
      targetDoc = found.document;
      targetReq = found.request;
    } else if (documentId && requestId) {
      targetDoc = dbStore.getDocumentById(documentId);
      if (!targetDoc) {
        return NextResponse.json(
          { success: false, error: { message: "Document not found" } },
          { status: 404 }
        );
      }
      targetReq = (targetDoc.signatureRequests || []).find((r: any) => r.id === requestId);
      if (!targetReq) {
        return NextResponse.json(
          { success: false, error: { message: "Signature request not found" } },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: { message: "Either token or (documentId, requestId) must be provided" } },
        { status: 400 }
      );
    }

    if (targetReq.status === "SIGNED") {
      return NextResponse.json(
        { success: false, error: { message: "This signature has already been recorded" } },
        { status: 409 }
      );
    }

    // 1. Read existing PDF
    const currentPdfRelative = targetDoc.pdfUrl || targetDoc.unsignedPdfUrl;
    if (!currentPdfRelative) {
      return NextResponse.json(
        { success: false, error: { message: "No PDF file associated with this document" } },
        { status: 400 }
      );
    }

    const fullPdfPath = path.join(
      process.cwd(),
      "public",
      currentPdfRelative.replace(/^\//, "")
    );

    if (!fs.existsSync(fullPdfPath)) {
      return NextResponse.json(
        { success: false, error: { message: "Target PDF file not found on disk" } },
        { status: 500 }
      );
    }

    const existingPdfBytes = fs.readFileSync(fullPdfPath);

    const signerName = offlineSignerName || targetReq.authorityName || "Designated Signer";
    const signDate =
      offlineSignDate ||
      new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    const note = offlineNote || "Physically signed on printed copy (Offline sign-off)";

    // 2. Offline physical sign-off: leave the signature space empty on the PDF for physical ink signing (no banner)
    const signedPdfFilename = `${targetDoc.id}_signed.pdf`;
    const fullSignedPath = path.join(process.cwd(), "public", "generated", signedPdfFilename);
    const genDir = path.dirname(fullSignedPath);
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(fullSignedPath, existingPdfBytes);

    const signedPdfUrl = `/generated/${signedPdfFilename}`;
    const signedTimestamp = new Date().toISOString();

    // 4. Update signature request
    dbStore.updateSignatureRequest(targetDoc.id, targetReq.id, {
      status: "SIGNED",
      signedAt: signedTimestamp,
      signatureMethod: "OFFLINE",
      offlineSignerName: signerName,
      offlineSignDate: signDate,
      offlineNote: note,
    });

    // 5. Add workflow event
    dbStore.addWorkflowEvent(targetDoc.id, {
      action: "DOCUMENT_SIGNED_OFFLINE",
      performedBy: signerName,
      authorityDesignation: targetReq.designation,
      details: `Physical offline signature recorded for ${signerName} (${targetReq.designation}). Note: ${note}`,
    });

    // 6. Check if all signatures are complete
    const refreshedDoc = dbStore.getDocumentById(targetDoc.id)!;
    const allRequests = refreshedDoc.signatureRequests || [];
    const pendingRequests = allRequests.filter((r) => r.status !== "SIGNED");

    if (pendingRequests.length === 0) {
      dbStore.updateDocument(targetDoc.id, {
        status: "APPROVED",
        pdfUrl: signedPdfUrl,
        approvedBy: signerName,
        approvedAt: signedTimestamp,
      });

      dbStore.addWorkflowEvent(targetDoc.id, {
        action: "WORKFLOW_COMPLETED",
        performedBy: "System Workflow Engine",
        details: `All ${allRequests.length} authority signature(s) completed (including offline sign-offs) and verified on final PDF.`,
      });
    } else {
      // Still pending other signers, update intermediate PDF URL
      dbStore.updateDocument(targetDoc.id, {
        pdfUrl: signedPdfUrl,
      });
    }

    const finalDoc = dbStore.getDocumentById(targetDoc.id);

    return NextResponse.json({
      success: true,
      data: {
        document: finalDoc,
        requestId: targetReq.id,
      },
    });
  } catch (err: any) {
    console.error("Offline sign error:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to record offline signature." } },
      { status: 500 }
    );
  }
}
