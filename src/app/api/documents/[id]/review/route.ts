import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { DocumentStatus } from "@/types";

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

    const body = await req.json();
    const { action, comments, reviewerName } = body;

    const allowedActions: DocumentStatus[] = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "CHANGES_REQUESTED",
      "REJECTED",
    ];

    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Invalid review action. Allowed values: ${allowedActions.join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    const club = dbStore.getClub();

    const updated = dbStore.updateDocument(id, {
      status: action,
      reviewComments: comments || undefined,
      approvedBy: action === "APPROVED" ? reviewerName || club.facultyCoordinator.name : undefined,
      approvedAt: action === "APPROVED" ? new Date().toISOString() : undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
