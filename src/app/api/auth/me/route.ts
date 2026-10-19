import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbStore } from "@/lib/db/store";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Lookup user by verified session identity
    const user = session.user.id
      ? dbStore.getUserById(session.user.id) || dbStore.getUserByEmail(session.user.email)
      : dbStore.getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
