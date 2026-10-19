import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbStore } from "@/lib/db/store";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, image, googleId } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const userName = (name && typeof name === "string" && name.trim()) 
      ? name.trim() 
      : email.split("@")[0].replace(/[._]/g, " ");

    const user = dbStore.upsertUser({
      email: email.trim().toLowerCase(),
      name: userName,
      image: image || undefined,
      googleId: googleId || "google_" + Math.random().toString(36).substring(2, 10),
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, user.id, {
      path: "/",
      httpOnly: false, // Accessible to client context if needed
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({
      success: true,
      message: "Successfully signed in with Google",
      user,
    });
  } catch (error) {
    console.error("Error in Google Sign-In:", error);
    return NextResponse.json({ error: "Failed to authenticate with Google" }, { status: 500 });
  }
}
