import { describe, it } from "node:test";
import assert from "node:assert";
import { dbStore, DEFAULT_USERS } from "../src/lib/db/store";
import { UserRole } from "../src/types";

describe("Google Sign-In & Admin Role Management Test Suite", () => {
  it("dbStore initializes with default users including Admin, Faculty, and Member", () => {
    const users = dbStore.getUsers();
    assert.ok(users.length >= 3, "Should have seeded default users");

    const admin = users.find((u) => u.role === "CLUB_ADMIN");
    const faculty = users.find((u) => u.role === "FACULTY_APPROVER");
    const member = users.find((u) => u.role === "MEMBER");

    assert.ok(admin, "Should contain a CLUB_ADMIN");
    assert.ok(faculty, "Should contain a FACULTY_APPROVER");
    assert.ok(member, "Should contain a MEMBER");
  });

  it("Google Sign-In upserts new user and preserves or assigns appropriate role", () => {
    const googleEmail = `test.google.${Date.now()}@gmail.com`;
    const user = dbStore.upsertUser({
      name: "Google Student User",
      email: googleEmail,
      googleId: "google_sub_12345",
      image: "https://lh3.googleusercontent.com/photo.jpg",
    });

    assert.ok(user.id, "User should have an ID");
    assert.strictEqual(user.email, googleEmail);
    assert.strictEqual(user.name, "Google Student User");
    assert.strictEqual(user.role, "MEMBER", "Default new user should have role MEMBER");

    // Signing in again with the same email updates lastLoginAt without wiping role
    const reLogin = dbStore.upsertUser({
      name: "Google Student User Updated",
      email: googleEmail,
      googleId: "google_sub_12345",
    });

    assert.strictEqual(reLogin.id, user.id, "Re-login should return the same user ID");
    assert.strictEqual(reLogin.name, "Google Student User Updated");
    assert.strictEqual(reLogin.role, "MEMBER");
  });

  it("Admin can assign role to Member -> Faculty Approver -> Club Admin", () => {
    const testUser = dbStore.upsertUser({
      name: "Role Change Test Candidate",
      email: `candidate.${Date.now()}@campus.edu`,
      role: "MEMBER",
    });

    assert.strictEqual(testUser.role, "MEMBER");

    // 1. Promote to FACULTY_APPROVER
    const promotedFaculty = dbStore.updateUserRole(testUser.id, "FACULTY_APPROVER");
    assert.ok(promotedFaculty);
    assert.strictEqual(promotedFaculty.role, "FACULTY_APPROVER");

    // Check store reflects change
    const fetchedFaculty = dbStore.getUserById(testUser.id);
    assert.strictEqual(fetchedFaculty?.role, "FACULTY_APPROVER");

    // 2. Promote to CLUB_ADMIN
    const promotedAdmin = dbStore.updateUserRole(testUser.id, "CLUB_ADMIN");
    assert.ok(promotedAdmin);
    assert.strictEqual(promotedAdmin.role, "CLUB_ADMIN");

    // Check store reflects change
    const fetchedAdmin = dbStore.getUserById(testUser.id);
    assert.strictEqual(fetchedAdmin?.role, "CLUB_ADMIN");

    // 3. Demote back to MEMBER
    const demotedMember = dbStore.updateUserRole(testUser.id, "MEMBER");
    assert.ok(demotedMember);
    assert.strictEqual(demotedMember.role, "MEMBER");

    // Clean up
    dbStore.deleteUser(testUser.id);
    assert.strictEqual(dbStore.getUserById(testUser.id), undefined);
  });
});
