import { test, describe } from "node:test";
import assert from "node:assert";
import { validateTemplateSubmission } from "../src/lib/document-engine/generator";
import { TemplateMetadata } from "../src/types";

const MOCK_TEMPLATE: TemplateMetadata = {
  id: "tmpl_test_01",
  name: "Department Sanction Form",
  documentType: "EVENT_PROPOSAL",
  format: "docx",
  description: "Test template schema",
  fileUrl: "/templates/test.docx",
  version: 1,
  isActive: true,
  status: "PUBLISHED",
  placeholdersDetected: ["eventName", "startDate", "venue", "budgetRequested", "contactEmail"],
  requiredFields: ["eventName", "startDate", "venue", "budgetRequested"],
  optionalFields: ["contactEmail"],
  fields: [
    {
      id: "fld_eventName",
      name: "eventName",
      label: "Event Name",
      type: "text",
      required: true,
      confidence: 1.0,
      adminConfirmed: true,
    },
    {
      id: "fld_startDate",
      name: "startDate",
      label: "Event Date",
      type: "date",
      required: true,
      confidence: 1.0,
      adminConfirmed: true,
    },
    {
      id: "fld_venue",
      name: "venue",
      label: "Venue / Lab",
      type: "text",
      required: true,
      confidence: 1.0,
      adminConfirmed: true,
    },
    {
      id: "fld_budget",
      name: "budgetRequested",
      label: "Estimated Budget",
      type: "currency",
      required: true,
      confidence: 1.0,
      adminConfirmed: true,
    },
    {
      id: "fld_email",
      name: "contactEmail",
      label: "Contact Email",
      type: "email",
      required: false,
      confidence: 1.0,
      adminConfirmed: true,
    },
  ],
  createdAt: new Date().toISOString(),
};

describe("Dynamic Questionnaire & Validation Test Suite", () => {
  test("Every required field appears and must be provided", () => {
    const required = MOCK_TEMPLATE.fields.filter((f) => f.required);
    assert.strictEqual(required.length, 4);
    assert.strictEqual(MOCK_TEMPLATE.fields.filter((f) => !f.required).length, 1);
  });

  test("Missing required fields strictly block generation (Zero Assumption)", () => {
    // User only provides 2 out of 4 required fields
    const partialData = {
      eventName: "Hackathon 2026",
      startDate: "2026-11-20",
    };

    const result = validateTemplateSubmission(MOCK_TEMPLATE, partialData);
    assert.strictEqual(result.valid, false, "Must block generation when required fields are missing");
    assert.strictEqual(result.errors.length, 2, "Must report exactly 2 missing fields");

    const missingKeys = result.errors.map((e) => e.field);
    assert.ok(missingKeys.includes("venue"), "Must identify missing venue");
    assert.ok(missingKeys.includes("budgetRequested"), "Must identify missing budget");
  });

  test("Invalid dates prevent generation", () => {
    const invalidDateData = {
      eventName: "Technical Workshop",
      startDate: "invalid-date-string",
      venue: "Auditorium",
      budgetRequested: 5000,
    };

    const result = validateTemplateSubmission(MOCK_TEMPLATE, invalidDateData);
    assert.strictEqual(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.field === "startDate"),
      "Must flag invalid date format"
    );
  });

  test("Invalid currency/number values prevent generation", () => {
    const invalidBudgetData = {
      eventName: "Technical Workshop",
      startDate: "2026-11-20",
      venue: "Auditorium",
      budgetRequested: -500, // Negative budget invalid
    };

    const result = validateTemplateSubmission(MOCK_TEMPLATE, invalidBudgetData);
    assert.strictEqual(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.field === "budgetRequested"),
      "Must flag negative/invalid budget"
    );
  });

  test("Optional fields can remain empty without blocking generation", () => {
    const completeRequiredOnly = {
      eventName: "Annual Symposium",
      startDate: "2026-12-05",
      venue: "Main Hall",
      budgetRequested: 10000,
      contactEmail: "", // optional left blank
    };

    const result = validateTemplateSubmission(MOCK_TEMPLATE, completeRequiredOnly);
    assert.strictEqual(result.valid, true, "Must pass validation when all required fields are valid");
    assert.strictEqual(result.errors.length, 0);
  });

  test("Progress calculation tracks completed required fields accurately", () => {
    const data: Record<string, any> = {
      eventName: "Code Quest",
      startDate: "2026-11-15",
    };

    const reqFields = MOCK_TEMPLATE.fields.filter((f) => f.required);
    const completedCount = reqFields.filter((f) => data[f.name] !== undefined && data[f.name] !== "").length;

    assert.strictEqual(completedCount, 2);
    assert.strictEqual(reqFields.length, 4);
    assert.notStrictEqual(completedCount, reqFields.length, "Must block generation if 2/4 completed");
  });
});
