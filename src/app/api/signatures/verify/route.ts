import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: "Signing token is required" } },
        { status: 400 }
      );
    }

    const found = dbStore.getSignatureRequestByTokenHash(token);

    if (!found) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "This signature link is invalid, expired, or has already been used.",
          },
        },
        { status: 404 }
      );
    }

    const { document, request } = found;

    // Check expiration
    if (new Date() > new Date(request.tokenExpiresAt)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "This signing link has expired. Please contact the requester to re-issue a signature request.",
          },
        },
        { status: 410 }
      );
    }

    // Check if already signed
    if (request.status === "SIGNED") {
      return NextResponse.json({
        success: true,
        alreadySigned: true,
        data: {
          request: {
            id: request.id,
            authorityName: request.authorityName,
            designation: request.designation,
            signedAt: request.signedAt,
            status: request.status,
          },
          document: {
            id: document.id,
            title: document.title,
            pdfUrl: document.pdfUrl,
            status: document.status,
          },
        },
      });
    }

    // Mark as VIEWED if previously SENT
    if (request.status === "SENT" || request.status === "PENDING") {
      dbStore.updateSignatureRequest(document.id, request.id, {
        status: "VIEWED",
      });
      dbStore.addWorkflowEvent(document.id, {
        action: "DOCUMENT_VIEWED",
        performedBy: request.authorityName,
        authorityDesignation: request.designation,
        details: `Document opened and viewed in secure signature portal by ${request.authorityName}`,
      });
    }

    const club = dbStore.getClub();

    return NextResponse.json({
      success: true,
      alreadySigned: false,
      data: {
        request: {
          id: request.id,
          fieldId: request.fieldId,
          printedName: request.printedName,
          designation: request.designation,
          authorityName: request.authorityName,
          authorityEmail: request.authorityEmail,
          pageNumber: request.pageNumber,
          position: request.position,
          signingOrder: request.signingOrder,
          actionType: request.actionType,
          status: request.status,
          tokenExpiresAt: request.tokenExpiresAt,
        },
        document: {
          id: document.id,
          title: document.title,
          documentType: document.documentType,
          pdfUrl: document.pdfUrl,
          currentVersion: document.currentVersion,
          status: document.status,
          requesterName: document.requesterName,
        },
        club: {
          name: club.name,
          universityName: club.universityName,
          logoUrl: club.logoUrl,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to verify signing token" } },
      { status: 500 }
    );
  }
}
