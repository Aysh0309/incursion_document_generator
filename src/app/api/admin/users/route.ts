import { NextResponse } from "next/server";
import { dbStore } from "@/lib/db/store";
import { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["MEMBER", "FACULTY_APPROVER", "CLUB_ADMIN"];

export async function GET() {
  try {
    const users = dbStore.getUsers();
    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed values: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const updatedUser = dbStore.updateUserRole(userId, role);
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `User role successfully updated to ${role}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, role } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed values: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const userName = name?.trim() || email.split("@")[0].replace(/[._]/g, " ");

    const user = dbStore.upsertUser({
      name: userName,
      email: email.trim().toLowerCase(),
      role: role || "MEMBER",
    });

    return NextResponse.json({
      success: true,
      message: "User added/updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const deleted = dbStore.deleteUser(userId);
    if (!deleted) {
      return NextResponse.json({ error: "User not found or cannot be removed" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User removed successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
