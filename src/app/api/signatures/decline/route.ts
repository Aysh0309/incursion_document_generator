import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, reason } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: "Signing token is required" } },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: { message: "A reason for declining must be provided" } },
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

    if (request.status === "SIGNED") {
      return NextResponse.json(
        { success: false, error: { message: "This document has already been signed" } },
        { status: 409 }
      );
    }

    // Update request
    dbStore.updateSignatureRequest(document.id, request.id, {
      status: "DECLINED",
      declineReason: reason.trim(),
    });

    // Update document status
    dbStore.updateDocument(document.id, {
      status: "CHANGES_REQUESTED",
      reviewComments: `Declined by ${request.authorityName} (${request.designation}): ${reason.trim()}`,
    });

    // Log event
    dbStore.addWorkflowEvent(document.id, {
      action: "REQUEST_DECLINED",
      performedBy: request.authorityName,
      authorityDesignation: request.designation,
      details: `Signature request declined. Remarks: "${reason.trim()}"`,
    });

    return NextResponse.json({
      success: true,
      message: "Signature request declined and comments recorded.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to decline signature request" } },
      { status: 500 }
    );
  }
}
