import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbStore } from "@/lib/db/store";
import { sendSignatureRequestEmail } from "@/lib/email/service";
import { SignatureRequest } from "@/types";

export async function POST(
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

    const template = dbStore.getTemplateById(document.templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: { message: "Associated template not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      assignments, // Array of { fieldId, authorityId, authorityName, authorityEmail, signingOrder }
      signingWorkflow = template.signingWorkflow || "SEQUENTIAL",
      requesterName = document.requesterName || "Club Lead Organizer",
      requesterEmail = document.requesterEmail || "gdsc.leads@nit.ac.in",
    } = body;

    const signatureFields = template.signatureFields || [];

    if (signatureFields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              "This template has no configured signature fields. Please configure signature fields in the Template Studio first.",
          },
        },
        { status: 400 }
      );
    }

    // Verify each required signature field has a valid authority assigned
    const requestsToCreate: Array<{
      req: SignatureRequest;
      rawToken: string;
    }> = [];

    // 7-day expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const field of signatureFields) {
      const assigned = assignments?.find((a: any) => a.fieldId === field.id);
      const authorityName = (assigned?.authorityName || "").trim();
      const authorityEmail = (assigned?.authorityEmail || "").trim().toLowerCase();
      const authorityId = assigned?.authorityId || "custom_auth";

      if (field.required && (!authorityName || !authorityEmail)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: `Cannot submit document: Required signature field "${field.designation}" requires both a signatory name and delivery email.`,
            },
          },
          { status: 422 }
        );
      }

      // Generate cryptographically secure token and SHA-256 hash
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const sigReq: SignatureRequest = {
        id: "sigreq_" + Math.random().toString(36).substring(2, 10),
        documentId: document.id,
        fieldId: field.id,
        printedName: authorityName || field.printedName || field.designation,
        designation: field.designation,
        assignedAuthorityId: authorityId,
        authorityName,
        authorityEmail,
        pageNumber: field.pageNumber || 1,
        position: field.position || { x: 72, y: 120, width: 140, height: 45 },
        signingOrder: assigned?.signingOrder ?? field.signingOrder ?? 1,
        actionType: field.actionType || "SIGNATURE_ONLY",
        includeDate: field.includeDate ?? true,
        status: "PENDING",
        tokenHash,
        tokenExpiresAt: expiresAt,
      };

      requestsToCreate.push({ req: sigReq, rawToken });
    }

    // Preserve unsigned PDF if not already preserved
    const unsignedPdf = document.unsignedPdfUrl || document.pdfUrl;

    const signatureRequests = requestsToCreate.map((item) => item.req);

    // Determine initial requests to send:
    // If sequential: items with lowest signingOrder (typically order 1)
    // If parallel: all items
    const minOrder = Math.min(...signatureRequests.map((r) => r.signingOrder));
    const initialSendList = signingWorkflow === "PARALLEL"
      ? requestsToCreate
      : requestsToCreate.filter((item) => item.req.signingOrder === minOrder);

    // Send emails
    for (const item of initialSendList) {
      try {
        const emailRes = await sendSignatureRequestEmail({
          authorityEmail: item.req.authorityEmail,
          authorityName: item.req.authorityName,
          authorityDesignation: item.req.designation,
          documentTitle: document.title,
          documentId: document.id,
          requesterName,
          signingToken: item.rawToken,
          expiresAt,
        });

        item.req.status = "SENT";
        item.req.sentAt = new Date().toISOString();
        item.req.emailDeliveryStatus = emailRes.success ? "DELIVERED" : "FAILED";
        item.req.emailDeliveryError = emailRes.error;
      } catch (e: any) {
        item.req.status = "PENDING";
        item.req.emailDeliveryStatus = "FAILED";
        item.req.emailDeliveryError = e.message;
      }
    }

    // Update document in store
    const updatedDoc = dbStore.updateDocument(document.id, {
      status: "PENDING_SIGNATURE",
      unsignedPdfUrl: unsignedPdf,
      signingWorkflow,
      requesterName,
      requesterEmail,
      signatureRequests,
    });

    // Record workflow audit log
    dbStore.addWorkflowEvent(document.id, {
      action: "SUBMITTED_FOR_SIGNATURE",
      performedBy: requesterName,
      details: `Submitted for official signature (${signatureRequests.length} authorities assigned). Workflow: ${signingWorkflow}`,
    });

    for (const sent of initialSendList) {
      if (sent.req.status === "SENT") {
        dbStore.addWorkflowEvent(document.id, {
          action: "EMAIL_SENT",
          performedBy: "Automated Mailer",
          authorityDesignation: sent.req.designation,
          details: `Signature request email dispatched to ${sent.req.authorityName} <${sent.req.authorityEmail}>`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedDoc,
      message: `Signature requests successfully initiated for ${initialSendList.length} authority(ies).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to submit document for signature" } },
      { status: 500 }
    );
  }
}
