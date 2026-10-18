import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    let authorities = dbStore.getAuthorities();
    if (role) {
      authorities = authorities.filter((a) => a.role === role);
    }

    return NextResponse.json({ success: true, data: authorities });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to fetch authorities" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, designation, role, department } = body;

    if (!name || !email || !designation || !role) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Name, email, designation, and role are required." },
        },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: { message: "Please provide a valid email address." } },
        { status: 400 }
      );
    }

    const created = dbStore.createAuthority({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      designation: designation.trim(),
      role: role.trim(),
      department: department?.trim(),
      isActive: true,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to create authority" } },
      { status: 500 }
    );
  }
}
