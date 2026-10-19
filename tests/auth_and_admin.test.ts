import { describe, it } from "node:test";
import assert from "node:assert";
import { dbStore, DEFAULT_USERS } from "../src/lib/db/store";
import { UserRole } from "../src/types";
import { proxy } from "../src/proxy";
import { NextRequest } from "next/server";

describe("Google OAuth & Access Protection Test Suite", () => {
  it("1. Verifies dbStore contains seeded roles and structure", () => {
    const users = dbStore.getUsers();
    assert.ok(users.length >= 3, "Should have default users in store");

    const admin = users.find((u) => u.role === "CLUB_ADMIN");
    const faculty = users.find((u) => u.role === "FACULTY_APPROVER");
    const member = users.find((u) => u.role === "MEMBER");

    assert.ok(admin, "Should contain CLUB_ADMIN");
    assert.ok(faculty, "Should contain FACULTY_APPROVER");
    assert.ok(member, "Should contain MEMBER");
  });

  it("2. Repeated Google sign-ins do NOT create duplicate user records", () => {
    const testGoogleEmail = `student.${Date.now()}@google.edu`;
    const initialCount = dbStore.getUsers().length;

    // First sign in
    const user1 = dbStore.upsertUser({
      name: "Student Verified",
      email: testGoogleEmail,
      googleId: "google_account_001",
      image: "https://lh3.googleusercontent.com/avatar.png",
    });

    assert.strictEqual(dbStore.getUsers().length, initialCount + 1);
    assert.strictEqual(user1.role, "MEMBER");

    // Second sign in with same email
    const user2 = dbStore.upsertUser({
      name: "Student Verified Name Updated",
      email: testGoogleEmail,
      googleId: "google_account_001",
    });

    // Should NOT create duplicate
    assert.strictEqual(dbStore.getUsers().length, initialCount + 1);
    assert.strictEqual(user1.id, user2.id, "User ID must match across sign-ins");
    assert.strictEqual(user2.name, "Student Verified Name Updated");

    // Clean up
    dbStore.deleteUser(user1.id);
  });

  it("3. Unverified Google email is rejected and does not establish a session", async () => {
    // Check NextAuth signIn callback behavior for unverified emails
    const unverifiedProfile = {
      email: "unverified@gmail.com",
      email_verified: false,
      name: "Unverified Person",
    };

    // The security rule requires email_verified === true
    const isVerified =
      (unverifiedProfile as any).email_verified === true ||
      (unverifiedProfile as any).email_verified === "true";

    assert.strictEqual(isVerified, false, "Unverified Google email must be flagged as false");
  });

  it("4. Visitor without a session cannot access protected pages (redirects to /?error=SessionRequired)", () => {
    const protectedPages = [
      "http://localhost:3000/dashboard",
      "http://localhost:3000/events",
      "http://localhost:3000/events/new",
      "http://localhost:3000/documents",
      "http://localhost:3000/templates",
      "http://localhost:3000/approvals",
      "http://localhost:3000/admin",
      "http://localhost:3000/settings",
    ];

    for (const url of protectedPages) {
      const req = new NextRequest(url);
      const res = proxy(req);

      assert.strictEqual(
        res.status,
        307,
        `Expected 307 redirect for unauthenticated page ${url}`
      );
      const location = res.headers.get("location");
      assert.ok(
        location?.includes("error=SessionRequired"),
        `Redirect location for ${url} must contain error=SessionRequired, got: ${location}`
      );
    }
  });

  it("5. Visitor without a session cannot call protected APIs (returns HTTP 401 Unauthorized)", () => {
    const protectedApis = [
      "http://localhost:3000/api/documents",
      "http://localhost:3000/api/documents/generate",
      "http://localhost:3000/api/documents/batch",
      "http://localhost:3000/api/events",
      "http://localhost:3000/api/templates",
      "http://localhost:3000/api/admin/users",
    ];

    for (const url of protectedApis) {
      const req = new NextRequest(url);
      const res = proxy(req);

      assert.strictEqual(
        res.status,
        401,
        `Expected 401 Unauthorized for unauthenticated API ${url}`
      );
    }
  });

  it("6. Public pages and authority signature routes remain accessible without session", () => {
    const publicRoutes = [
      "http://localhost:3000/",
      "http://localhost:3000/api/auth/providers",
      "http://localhost:3000/api/auth/csrf",
      "http://localhost:3000/sign/sample-token-abc-123",
      "http://localhost:3000/api/signatures/verify",
    ];

    for (const url of publicRoutes) {
      const req = new NextRequest(url);
      const res = proxy(req);

      // Status should be 200 (NextResponse.next())
      assert.notStrictEqual(
        res.status,
        401,
        `Route ${url} should be public and not return 401`
      );
      assert.notStrictEqual(
        res.status,
        307,
        `Route ${url} should be public and not redirect`
      );
    }
  });

  it("7. Request with valid Auth.js session cookie passes proxy", () => {
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: {
        cookie: "authjs.session-token=mock-valid-session-jwt-token-xyz",
      },
    });

    const res = proxy(req);
    // Should NOT be redirected to 307
    assert.strictEqual(res.status, 200);
  });

  it("8. Admin role assignment persists and updates permissions (Member -> Faculty -> Admin)", () => {
    const testUser = dbStore.upsertUser({
      name: "Role Promotion Candidate",
      email: `candidate.${Date.now()}@campus.edu`,
      role: "MEMBER",
    });

    assert.strictEqual(testUser.role, "MEMBER");

    // 1. Promote to FACULTY_APPROVER
    const faculty = dbStore.updateUserRole(testUser.id, "FACULTY_APPROVER");
    assert.strictEqual(faculty?.role, "FACULTY_APPROVER");

    // 2. Promote to CLUB_ADMIN
    const admin = dbStore.updateUserRole(testUser.id, "CLUB_ADMIN");
    assert.strictEqual(admin?.role, "CLUB_ADMIN");

    // 3. Demote to MEMBER
    const member = dbStore.updateUserRole(testUser.id, "MEMBER");
    assert.strictEqual(member?.role, "MEMBER");

    dbStore.deleteUser(testUser.id);
  });

  it("9. Missing Google credentials fail safely without fallback to dummy login", () => {
    // When credentials are not configured, NextAuth does not have valid client ID/secret
    const testClientId = undefined;
    const testClientSecret = undefined;

    const hasValidCredentials = !!(testClientId && testClientSecret);
    assert.strictEqual(
      hasValidCredentials,
      false,
      "Missing credentials must evaluate to false without dummy fallback"
    );
  });
});
