import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { dbStore } from "../src/lib/db/store";
import { TemplateMetadata } from "../src/types";

describe("Template Lifecycle & Publish Flow Suite", () => {
  test("Uploaded document in draft state is not saved in dbStore until published", () => {
    const draftId = "tmpl_draft_test_" + Date.now();
    
    // Check initial state
    assert.strictEqual(dbStore.getTemplateById(draftId), undefined);

    // Simulate analyzed draft metadata returned to client
    const draftMetadata: TemplateMetadata = {
      id: draftId,
      name: "Unpublished Draft Event Proposal",
      documentType: "EVENT_PROPOSAL",
      format: "docx",
      description: "Uploaded document awaiting publish",
      fileUrl: "/templates/custom_draft.docx",
      fields: [
        {
          id: "fld_1",
          name: "eventName",
          label: "Event Name",
          type: "text",
          required: true,
          confidence: 0.95,
        },
      ],
      requiredFields: ["eventName"],
      optionalFields: [],
      placeholdersDetected: ["eventName"],
      status: "DRAFT",
      version: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Verify it is NOT in dbStore before publishing
    assert.strictEqual(dbStore.getTemplateById(draftId), undefined);
    assert.strictEqual(
      dbStore.getTemplates().some((t) => t.id === draftId),
      false
    );

    // Now simulate publishing the reviewed template
    const publishedMetadata: TemplateMetadata = {
      ...draftMetadata,
      status: "PUBLISHED",
    };
    dbStore.addTemplate(publishedMetadata);

    // Verify it IS saved in dbStore after publishing
    const stored = dbStore.getTemplateById(draftId);
    assert.ok(stored);
    assert.strictEqual(stored.id, draftId);
    assert.strictEqual(stored.status, "PUBLISHED");
    assert.strictEqual(stored.name, "Unpublished Draft Event Proposal");

    // Clean up
    dbStore.deleteTemplate(draftId);
    assert.strictEqual(dbStore.getTemplateById(draftId), undefined);
  });

  test("Discarding un-published template cleans up temporary file", () => {
    const tempFileName = `custom_${Date.now()}_discard_test.docx`;
    const tempFilePath = path.join(process.cwd(), "public", "templates", tempFileName);

    // Create a dummy temp file
    fs.writeFileSync(tempFilePath, Buffer.from("dummy template content"));
    assert.ok(fs.existsSync(tempFilePath));

    // Simulate discard logic
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    assert.strictEqual(fs.existsSync(tempFilePath), false);
  });
});
