import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET() {
  try {
    const club = dbStore.getClub();
    return NextResponse.json({ success: true, data: club });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const updates = await req.json();
    const updated = dbStore.updateClub(updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
