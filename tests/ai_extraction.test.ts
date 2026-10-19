import { describe, it } from "node:test";
import assert from "node:assert";
import { extractEventInformation } from "../src/lib/ai/extractor";
import { TemplateField } from "../src/types";

describe("AI Event Data Extraction & Zero-Guessing Test Suite", () => {
  const sampleTemplateFields: TemplateField[] = [
    {
      id: "fld_eventName",
      name: "eventName",
      label: "Title of the Event",
      type: "text",
      required: true,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_startDate",
      name: "startDate",
      label: "Event Date",
      type: "date",
      required: true,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_startTime",
      name: "startTime",
      label: "Start Time",
      type: "time",
      required: false,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_endTime",
      name: "endTime",
      label: "End Time",
      type: "time",
      required: false,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_venue",
      name: "venue",
      label: "Event Venue",
      type: "text",
      required: true,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_facultyCoordinator",
      name: "facultyCoordinator",
      label: "Faculty Coordinator",
      type: "text",
      required: true,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_clubName",
      name: "clubName",
      label: "Organizing Club / Society",
      type: "text",
      required: false,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_budgetRequested",
      name: "budgetRequested",
      label: "Budget Requested",
      type: "number",
      required: false,
      confidence: 1,
      adminConfirmed: true,
    },
    {
      id: "fld_expectedParticipants",
      name: "expectedParticipants",
      label: "Expected Participants",
      type: "number",
      required: false,
      confidence: 1,
      adminConfirmed: true,
    },
  ];

  it("1. Correctly extracts explicitly mentioned fields from user paragraph", async () => {
    const paragraph =
      "ACM is organizing a workshop titled NextJS Masterclass on 2026-11-20 from 10:00 AM to 04:00 PM at Seminar Hall 2. Coordinated by Rajesh Sharma. Budget requested is 15000 and 150 participants are expected.";

    const result = await extractEventInformation(
      paragraph,
      ["PERMISSION_LETTER"],
      sampleTemplateFields,
      "Permission Document"
    );

    const data = result.extractedData as any;
    assert.strictEqual(data.eventName, "NextJS Masterclass");
    assert.strictEqual(data.startDate, "2026-11-20");
    assert.strictEqual(data.startTime, "10:00 AM");
    assert.strictEqual(data.endTime, "04:00 PM");
    assert.strictEqual(data.venue, "Seminar Hall 2");
    assert.strictEqual(data.facultyCoordinator, "Rajesh Sharma");
    assert.strictEqual(data.clubName, "ACM");
    assert.strictEqual(data.budgetRequested, 15000);
    assert.strictEqual(data.expectedParticipants, 150);

    // All required fields were provided, so no missingFieldQuestions
    assert.strictEqual(result.missingFieldQuestions.length, 0);
  });

  it("2. Missing fields are strictly null and NOT guessed/hallucinated", async () => {
    // Missing: facultyCoordinator, venue, budget, participants
    const partialParagraph =
      "We are hosting an event titled Cloud Computing Camp on 2026-12-05 from 02:00 PM to 05:00 PM by club IEEE.";

    const result = await extractEventInformation(
      partialParagraph,
      ["PERMISSION_LETTER"],
      sampleTemplateFields,
      "Permission Document"
    );

    const data = result.extractedData as any;
    assert.strictEqual(data.eventName, "Cloud Computing Camp");
    assert.strictEqual(data.startDate, "2026-12-05");
    assert.strictEqual(data.clubName, "IEEE");

    // Strictly null for unmentioned fields — no guessing!
    assert.strictEqual(data.venue, null, "Venue must not be guessed");
    assert.strictEqual(data.facultyCoordinator, null, "Faculty coordinator must not be guessed");
    assert.strictEqual(data.budgetRequested, null, "Budget must not be guessed");
    assert.strictEqual(data.expectedParticipants, null, "Participants count must not be guessed");

    // Generates clarification questions for missing REQUIRED fields (venue and facultyCoordinator)
    const missingKeys = result.missingFieldQuestions.map((q) => q.fieldKey);
    assert.ok(missingKeys.includes("venue"), "Must ask for missing venue");
    assert.ok(missingKeys.includes("facultyCoordinator"), "Must ask for missing faculty coordinator");

    // Does NOT generate questions for missing OPTIONAL fields (budgetRequested, expectedParticipants)
    assert.ok(!missingKeys.includes("budgetRequested"), "Must not ask for optional budgetRequested");
    assert.ok(!missingKeys.includes("expectedParticipants"), "Must not ask for optional expectedParticipants");
  });

  it("3. Does not fabricate prefixes (e.g. Dr., Prof.) when extracting names", async () => {
    const paragraph =
      "Workshop titled Cyber Security Basics on 2026-10-30 at Room 101 coordinated by Anita Desai.";

    const result = await extractEventInformation(
      paragraph,
      ["PERMISSION_LETTER"],
      sampleTemplateFields,
      "Permission Document"
    );

    const data = result.extractedData as any;
    assert.strictEqual(data.facultyCoordinator, "Anita Desai", "Should not inject 'Prof.' prefix");
  });

  it("4. Form state merge preserves existing values and does not overwrite with null", () => {
    // Simulating frontend merge logic: "which fields are missing do not guess them leave them as it is"
    const existingFormData: Record<string, any> = {
      eventName: "Pre-existing Title",
      facultyCoordinator: "Prof. Pre-filled",
      venue: "",
    };

    const extractedFromAI: Record<string, any> = {
      eventName: null, // missing from prompt
      venue: "Main Auditorium", // newly found
      facultyCoordinator: null, // missing from prompt
    };

    const merged = { ...existingFormData };
    for (const [key, val] of Object.entries(extractedFromAI)) {
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        merged[key] = val;
      }
    }

    assert.strictEqual(merged.eventName, "Pre-existing Title", "Existing title should be preserved as it is");
    assert.strictEqual(merged.facultyCoordinator, "Prof. Pre-filled", "Existing coordinator should be preserved as it is");
    assert.strictEqual(merged.venue, "Main Auditorium", "Found venue should be updated");
  });
});
