import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = dbStore.getVersions(id);
    return NextResponse.json({ success: true, data: versions });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
