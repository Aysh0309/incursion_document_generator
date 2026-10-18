import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { dbStore } from "@/lib/db/store";
import { embedSignatureInPdf } from "@/lib/document-engine/signature-embedder";
import { sendSignatureRequestEmail, sendWorkflowCompletionEmail } from "@/lib/email/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, signatureDataUrl, consent, signDate } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: "Signing token is required" } },
        { status: 400 }
      );
    }

    if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: { message: "A valid drawn signature image is required" } },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { success: false, error: { message: "You must check the consent checkbox to affix your signature" } },
        { status: 400 }
      );
    }

    const found = dbStore.getSignatureRequestByTokenHash(token);

    if (!found) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid or expired signing link" } },
        { status: 404 }
      );
    }

    const { document, request } = found;

    if (new Date() > new Date(request.tokenExpiresAt)) {
      return NextResponse.json(
        { success: false, error: { message: "This signing link has expired" } },
        { status: 410 }
      );
    }

    if (request.status === "SIGNED") {
      return NextResponse.json(
        { success: false, error: { message: "This document has already been signed by you" } },
        { status: 409 }
      );
    }

    // 1. Read the current PDF artifact from disk
    const currentPdfRelative = document.pdfUrl || document.unsignedPdfUrl;
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

    // 2. Embed the drawn signature image into the actual PDF
    let updatedPdfBytes: Buffer;
    try {
      updatedPdfBytes = await embedSignatureInPdf({
        existingPdfBytes,
        signatureImageBase64: signatureDataUrl,
        pageNumber: request.pageNumber,
        position: request.position,
        signerName: request.authorityName,
        signerDesignation: request.designation,
        signDate: signDate || undefined,
        isTopOrigin: false,
      });
    } catch (pdfErr: any) {
      console.error("PDF Signature embedding error:", pdfErr);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Failed to embed signature into PDF artifact: ${pdfErr.message}`,
          },
        },
        { status: 500 }
      );
    }

    // 3. Save updated PDF artifact to disk
    const signedPdfFilename = `${document.id}_signed.pdf`;
    const fullSignedPath = path.join(process.cwd(), "public", "generated", signedPdfFilename);
    const genDir = path.dirname(fullSignedPath);
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(fullSignedPath, updatedPdfBytes);

    const signedPdfUrl = `/generated/${signedPdfFilename}`;

    // 4. Save signature image PNG for audit trail
    const sigDir = path.join(process.cwd(), "public", "signatures");
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
    const rawImageBase64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const sigImagePath = path.join(sigDir, `sig_${request.id}.png`);
    fs.writeFileSync(sigImagePath, Buffer.from(rawImageBase64, "base64"));
    const signatureImageUrl = `/signatures/sig_${request.id}.png`;

    const signedTimestamp = new Date().toISOString();

    // 5. Update this specific signature request
    dbStore.updateSignatureRequest(document.id, request.id, {
      status: "SIGNED",
      signedAt: signedTimestamp,
      signatureImageUrl,
    });

    // 6. Record workflow audit event
    dbStore.addWorkflowEvent(document.id, {
      action: "DOCUMENT_SIGNED",
      performedBy: request.authorityName,
      authorityDesignation: request.designation,
      details: `Official electronic signature affixed by ${request.authorityName} (${request.designation}) below printed name.`,
    });

    // 7. Check if all required signatures are now completed
    const refreshedDoc = dbStore.getDocumentById(document.id)!;
    const allRequests = refreshedDoc.signatureRequests || [];
    const pendingRequests = allRequests.filter((r) => r.status !== "SIGNED");

    if (pendingRequests.length === 0) {
      // All authorities have signed! Mark document APPROVED / COMPLETED
      dbStore.updateDocument(document.id, {
        status: "APPROVED",
        pdfUrl: signedPdfUrl,
        approvedBy: request.authorityName,
        approvedAt: signedTimestamp,
      });

      dbStore.addWorkflowEvent(document.id, {
        action: "WORKFLOW_COMPLETED",
        performedBy: "System Workflow Engine",
        details: `All ${allRequests.length} designated authority signature(s) successfully completed and embedded in final PDF.`,
      });

      // Send completion email to requester
      if (refreshedDoc.requesterEmail) {
        await sendWorkflowCompletionEmail({
          requesterEmail: refreshedDoc.requesterEmail,
          requesterName: refreshedDoc.requesterName || "Club Lead Organizer",
          documentTitle: refreshedDoc.title,
          documentId: refreshedDoc.id,
          signedPdfUrl,
        }).catch((e) => console.warn("Failed to dispatch completion email:", e));
      }
    } else {
      // Partial completion: update current PDF and check if sequential next authority needs notification
      dbStore.updateDocument(document.id, {
        pdfUrl: signedPdfUrl,
        status: "PENDING_SIGNATURE",
      });

      if (refreshedDoc.signingWorkflow === "SEQUENTIAL") {
        // Find the next lowest signingOrder among pending requests
        const nextOrder = Math.min(...pendingRequests.map((r) => r.signingOrder));
        const nextInLine = pendingRequests.filter((r) => r.signingOrder === nextOrder && r.status !== "SENT");

        for (const nextReq of nextInLine) {
          const rawToken = crypto.randomBytes(32).toString("hex");
          const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

          // Send notification email with raw unguessable token
          const emailRes = await sendSignatureRequestEmail({
            authorityEmail: nextReq.authorityEmail,
            authorityName: nextReq.authorityName,
            authorityDesignation: nextReq.designation,
            documentTitle: refreshedDoc.title,
            documentId: refreshedDoc.id,
            requesterName: refreshedDoc.requesterName || "Club Lead Organizer",
            signingToken: rawToken,
            expiresAt: nextReq.tokenExpiresAt,
          }).catch((e) => ({ success: false, error: e.message }));

          dbStore.updateSignatureRequest(document.id, nextReq.id, {
            status: "SENT",
            tokenHash,
            sentAt: new Date().toISOString(),
          });

          dbStore.addWorkflowEvent(document.id, {
            action: "NEXT_AUTHORITY_NOTIFIED",
            performedBy: "System Workflow Engine",
            authorityDesignation: nextReq.designation,
            details: `Sequential workflow advanced. Signature request sent to ${nextReq.authorityName} (${nextReq.designation}).`,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Signature successfully applied to document.",
      data: {
        documentId: document.id,
        signedPdfUrl,
        isCompleted: pendingRequests.length === 0,
      },
    });
  } catch (err: any) {
    console.error("Sign endpoint exception:", err);
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to sign document" } },
      { status: 500 }
    );
  }
}
