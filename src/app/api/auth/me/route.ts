import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbStore } from "@/lib/db/store";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUid = searchParams.get("userId");
    const queryEmail = searchParams.get("email");

    const cookieStore = await cookies();
    const cookieUid = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    const targetUid = queryUid || cookieUid;

    let user = null;
    if (targetUid) {
      user = dbStore.getUserById(targetUid);
    } else if (queryEmail) {
      user = dbStore.getUserByEmail(queryEmail);
    }

    return NextResponse.json({
      authenticated: !!user,
      user: user || null,
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
