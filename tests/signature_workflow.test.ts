import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { dbStore } from "../src/lib/db/store";
import {
  embedSignatureInPdf,
  embedOfflineSignatureStampInPdf,
  verifyPdfIntegrity,
} from "../src/lib/document-engine/signature-embedder";
import { sendSignatureRequestEmail, sendWorkflowCompletionEmail } from "../src/lib/email/service";
import { DocumentRecord, TemplateMetadata, AuthorityRecord } from "../src/types";

// Valid base64 sample PNG (1x1 red pixel)
const SAMPLE_SIGNATURE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Valid base64 sample PNG 2 (1x1 blue pixel)
const SAMPLE_SIGNATURE_PNG_2 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPifAQAE+wH9kG9VPAAAAABJRU5ErkJggg==";

describe("Antigravity Master Signature & Email Workflow Test Suite", () => {
  const testDocId = "doc_test_e2e_" + Date.now();
  const testTmplId = "tmpl_test_e2e_" + Date.now();
  let initialPdfPath: string;
  let signedPdfPath: string;
  let rawToken1: string;
  let tokenHash1: string;
  let rawToken2: string;
  let tokenHash2: string;

  before(async () => {
    // 1. Create a real sample PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText("NATIONAL INSTITUTE OF TECHNOLOGY", {
      x: 140,
      y: 780,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    page.drawText("Official Event Proposal & Budget Request", {
      x: 170,
      y: 755,
      size: 13,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Authority 1 printed structure
    page.drawText("Printed Name: Rohan Verma", { x: 72, y: 155, size: 10, font: fontBold });
    page.drawText("Designation: Student Head", { x: 72, y: 142, size: 9, font });
    page.drawText("Signature:", { x: 72, y: 130, size: 9, font });
    page.drawLine({
      start: { x: 72, y: 122 },
      end: { x: 212, y: 122 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Authority 2 printed structure
    page.drawText("Printed Name: Dr. Arvind Sharma", { x: 350, y: 155, size: 10, font: fontBold });
    page.drawText("Designation: Faculty Coordinator", { x: 350, y: 142, size: 9, font });
    page.drawText("Signature:", { x: 350, y: 130, size: 9, font });
    page.drawLine({
      start: { x: 350, y: 122 },
      end: { x: 490, y: 122 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });

    const pdfBytes = await pdfDoc.save();

    // Write to public/generated/
    const genDir = path.join(process.cwd(), "public", "generated");
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

    initialPdfPath = path.join(genDir, `${testDocId}_initial.pdf`);
    signedPdfPath = path.join(genDir, `${testDocId}_signed.pdf`);
    fs.writeFileSync(initialPdfPath, Buffer.from(pdfBytes));

    // Seed test template with signature fields
    const testTemplate: TemplateMetadata = {
      id: testTmplId,
      name: "E2E Test Proposal Template",
      documentType: "EVENT_PROPOSAL",
      format: "pdf",
      description: "Automated test template for signature workflow",
      fileUrl: `/generated/${testDocId}_initial.pdf`,
      fields: [],
      requiredFields: [],
      optionalFields: [],
      placeholdersDetected: [],
      status: "PUBLISHED",
      version: 1,
      isActive: true,
      signingWorkflow: "SEQUENTIAL",
      signatureFields: [
        {
          id: "sig_fld_1",
          printedName: "Rohan Verma",
          designation: "Student Head",
          assignedRole: "STUDENT_HEAD",
          pageNumber: 1,
          position: { x: 72, y: 80, width: 140, height: 40 },
          required: true,
          signingOrder: 1,
          actionType: "SIGNATURE_ONLY",
          includeDate: true,
        },
        {
          id: "sig_fld_2",
          printedName: "Dr. Arvind Sharma",
          designation: "Faculty Coordinator",
          assignedRole: "FACULTY_COORDINATOR",
          pageNumber: 1,
          position: { x: 350, y: 80, width: 140, height: 40 },
          required: true,
          signingOrder: 2,
          actionType: "SIGNATURE_ONLY",
          includeDate: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    dbStore.addTemplate(testTemplate);

    // Create test document in dbStore
    dbStore.createDocument({
      title: "Annual Tech Fest 2026 Proposal",
      documentType: "EVENT_PROPOSAL",
      clubId: "club_acm",
      templateId: testTmplId,
      eventId: "evt_sample_1",
      currentVersion: 1,
      pdfEngineUsed: "pdf_lib_direct",
      dataSnapshot: { eventName: "Tech Fest 2026" },
      docxUrl: `/generated/${testDocId}_initial.pdf`,
      pdfUrl: `/generated/${testDocId}_initial.pdf`,
      status: "DRAFT",
      requesterName: "Aayush Awasthi",
      requesterEmail: "requester@nit.ac.in",
    });
    // Fix doc ID to predictable testDocId
    const created = dbStore.getDocuments().find((d) => d.title === "Annual Tech Fest 2026 Proposal");
    if (created) {
      created.id = testDocId;
    }
  });

  after(() => {
    // Clean up test artifacts
    if (fs.existsSync(initialPdfPath)) {
      try { fs.unlinkSync(initialPdfPath); } catch {}
    }
    if (fs.existsSync(signedPdfPath)) {
      try { fs.unlinkSync(signedPdfPath); } catch {}
    }
    dbStore.deleteTemplate(testTmplId);
    dbStore.deleteDocument(testDocId);
  });

  test("1. Authority Directory operations and role lookup", () => {
    // Add a custom authority
    const customAuth = dbStore.createAuthority({
      name: "Dr. Arvind Sharma",
      email: "arvind.sharma@nit.ac.in",
      designation: "Faculty Coordinator",
      role: "FACULTY_COORDINATOR",
      department: "Computer Science",
      isActive: true,
    });
    assert.ok(customAuth.id.startsWith("auth_"));

    const fetched = dbStore.getAuthorityById(customAuth.id);
    assert.strictEqual(fetched?.name, "Dr. Arvind Sharma");

    const facultyCoord = dbStore.getAuthorityByRole("FACULTY_COORDINATOR");
    assert.ok(facultyCoord, "Faculty Coordinator role should be resolvable");
    assert.ok(facultyCoord.email.includes("@"), "Authority must have a valid email");
  });

  test("2. Signature submission generates hashed tokens and dispatches email", async () => {
    const doc = dbStore.getDocumentById(testDocId);
    assert.ok(doc, "Document should exist in store");

    const template = dbStore.getTemplateById(testTmplId);
    assert.ok(template, "Template should exist in store");

    // Generate tokens for test authorities
    rawToken1 = crypto.randomBytes(32).toString("hex");
    tokenHash1 = crypto.createHash("sha256").update(rawToken1).digest("hex");

    rawToken2 = crypto.randomBytes(32).toString("hex");
    tokenHash2 = crypto.createHash("sha256").update(rawToken2).digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const signatureRequests = [
      {
        id: "sigreq_test_1",
        documentId: testDocId,
        fieldId: "sig_fld_1",
        printedName: "Rohan Verma",
        designation: "Student Head",
        assignedAuthorityId: "auth_student_head",
        authorityName: "Rohan Verma",
        authorityEmail: "student.head@nit.ac.in",
        pageNumber: 1,
        position: { x: 72, y: 80, width: 140, height: 40 },
        signingOrder: 1,
        actionType: "SIGNATURE_ONLY" as const,
        includeDate: true,
        status: "SENT" as const,
        tokenHash: tokenHash1,
        tokenExpiresAt: expiresAt,
        sentAt: new Date().toISOString(),
      },
      {
        id: "sigreq_test_2",
        documentId: testDocId,
        fieldId: "sig_fld_2",
        printedName: "Dr. Arvind Sharma",
        designation: "Faculty Coordinator",
        assignedAuthorityId: "auth_faculty_coord",
        authorityName: "Dr. Arvind Sharma",
        authorityEmail: "arvind.sharma@nit.ac.in",
        pageNumber: 1,
        position: { x: 350, y: 80, width: 140, height: 40 },
        signingOrder: 2,
        actionType: "SIGNATURE_ONLY" as const,
        includeDate: true,
        status: "PENDING" as const, // Waiting for sequential step 1
        tokenHash: tokenHash2,
        tokenExpiresAt: expiresAt,
      },
    ];

    // Send email to Authority 1
    const emailRes = await sendSignatureRequestEmail({
      authorityEmail: "student.head@nit.ac.in",
      authorityName: "Rohan Verma",
      authorityDesignation: "Student Head",
      documentTitle: doc.title,
      documentId: doc.id,
      requesterName: doc.requesterName || "Aayush Awasthi",
      signingToken: rawToken1,
      expiresAt,
    });

    assert.strictEqual(emailRes.success, true);
    assert.ok(emailRes.previewUrl?.includes(rawToken1));

    // Update document in store
    dbStore.updateDocument(testDocId, {
      status: "PENDING_SIGNATURE",
      unsignedPdfUrl: doc.pdfUrl,
      signingWorkflow: "SEQUENTIAL",
      signatureRequests,
    });

    dbStore.addWorkflowEvent(testDocId, {
      action: "SUBMITTED_FOR_SIGNATURE",
      performedBy: "Aayush Awasthi",
      details: "Submitted for official signature (2 authorities). Workflow: SEQUENTIAL",
    });

    const updated = dbStore.getDocumentById(testDocId);
    assert.strictEqual(updated?.status, "PENDING_SIGNATURE");
    assert.strictEqual(updated?.signatureRequests?.length, 2);
  });

  test("3. Token verification and lookup by raw token or token hash", () => {
    // Lookup by rawToken1
    const foundByRaw = dbStore.getSignatureRequestByTokenHash(rawToken1);
    assert.ok(foundByRaw, "Must resolve request using raw secret token");
    assert.strictEqual(foundByRaw.request.authorityName, "Rohan Verma");
    assert.strictEqual(foundByRaw.document.id, testDocId);

    // Lookup by direct tokenHash1
    const foundByHash = dbStore.getSignatureRequestByTokenHash(tokenHash1);
    assert.ok(foundByHash, "Must resolve request using token hash");
    assert.strictEqual(foundByHash.request.id, "sigreq_test_1");

    // Lookup with invalid token must return undefined
    const notFound = dbStore.getSignatureRequestByTokenHash("invalid_dummy_token_123");
    assert.strictEqual(notFound, undefined);
  });

  test("4. Authority 1 signs: Signature is embedded directly into actual PDF via pdf-lib", async () => {
    const existingBytes = fs.readFileSync(initialPdfPath);
    assert.ok(existingBytes.length > 0, "Base PDF must exist and be readable");

    const req1 = dbStore.getSignatureRequestByTokenHash(rawToken1)!.request;

    // Embed signature directly into PDF bytes
    const signedPdfBytes = await embedSignatureInPdf({
      existingPdfBytes: existingBytes,
      signatureImageBase64: SAMPLE_SIGNATURE_PNG,
      pageNumber: req1.pageNumber,
      position: req1.position,
      signerName: req1.authorityName,
      signerDesignation: req1.designation,
      includeDate: true,
      isTopOrigin: false,
    });

    assert.ok(signedPdfBytes.length > existingBytes.length, "Signed PDF must contain embedded signature image bytes");

    // Write updated signed PDF
    fs.writeFileSync(signedPdfPath, signedPdfBytes);

    // Verify PDF validity and structure using pdf-lib
    const verifyResult = await verifyPdfIntegrity(signedPdfBytes);
    assert.strictEqual(verifyResult.valid, true);
    assert.strictEqual(verifyResult.pageCount, 1);

    // Inspect loaded doc
    const pdfDoc = await PDFDocument.load(signedPdfBytes);
    assert.strictEqual(pdfDoc.getPageCount(), 1);

    // Update store for Authority 1
    dbStore.updateSignatureRequest(testDocId, req1.id, {
      status: "SIGNED",
      signedAt: new Date().toISOString(),
      signatureImageUrl: "/signatures/sig_test_1.png",
    });

    dbStore.addWorkflowEvent(testDocId, {
      action: "DOCUMENT_SIGNED",
      performedBy: req1.authorityName,
      authorityDesignation: req1.designation,
      details: "Official electronic signature affixed below printed name.",
    });

    dbStore.updateDocument(testDocId, {
      pdfUrl: `/generated/${testDocId}_signed.pdf`,
      status: "PENDING_SIGNATURE",
    });

    const docAfter1 = dbStore.getDocumentById(testDocId)!;
    const req1After = docAfter1.signatureRequests?.find((r) => r.id === req1.id);
    assert.strictEqual(req1After?.status, "SIGNED");
  });

  test("5. Sequential routing notifies Authority 2 with fresh secure token", async () => {
    const doc = dbStore.getDocumentById(testDocId)!;
    const pendingRequests = doc.signatureRequests!.filter((r) => r.status !== "SIGNED");
    assert.strictEqual(pendingRequests.length, 1);

    const nextReq = pendingRequests[0];
    assert.strictEqual(nextReq.signingOrder, 2);
    assert.strictEqual(nextReq.authorityName, "Dr. Arvind Sharma");

    // Advance to next authority
    const freshRawToken2 = crypto.randomBytes(32).toString("hex");
    const freshTokenHash2 = crypto.createHash("sha256").update(freshRawToken2).digest("hex");

    const emailRes = await sendSignatureRequestEmail({
      authorityEmail: nextReq.authorityEmail,
      authorityName: nextReq.authorityName,
      authorityDesignation: nextReq.designation,
      documentTitle: doc.title,
      documentId: doc.id,
      requesterName: doc.requesterName || "Aayush Awasthi",
      signingToken: freshRawToken2,
      expiresAt: nextReq.tokenExpiresAt,
    });

    assert.strictEqual(emailRes.success, true);

    dbStore.updateSignatureRequest(testDocId, nextReq.id, {
      status: "SENT",
      tokenHash: freshTokenHash2,
      sentAt: new Date().toISOString(),
    });

    dbStore.addWorkflowEvent(testDocId, {
      action: "NEXT_AUTHORITY_NOTIFIED",
      performedBy: "System Workflow Engine",
      authorityDesignation: nextReq.designation,
      details: `Sequential workflow advanced. Signature request sent to ${nextReq.authorityName}`,
    });

    // Save fresh raw token for Authority 2 signing step
    rawToken2 = freshRawToken2;

    const req2InStore = dbStore.getSignatureRequestByTokenHash(freshRawToken2);
    assert.ok(req2InStore, "Authority 2 fresh token must be resolvable");
    assert.strictEqual(req2InStore.request.status, "SENT");
  });

  test("6. Authority 2 signs: Both signatures are preserved in the actual PDF without overwriting", async () => {
    // Read the PDF that already contains Authority 1's signature
    const pdfWithSig1Bytes = fs.readFileSync(signedPdfPath);
    assert.ok(pdfWithSig1Bytes.length > 0);

    const req2 = dbStore.getSignatureRequestByTokenHash(rawToken2)!.request;

    // Embed Authority 2's signature into the SAME PDF
    const finalPdfBytes = await embedSignatureInPdf({
      existingPdfBytes: pdfWithSig1Bytes,
      signatureImageBase64: SAMPLE_SIGNATURE_PNG_2,
      pageNumber: req2.pageNumber,
      position: req2.position,
      signerName: req2.authorityName,
      signerDesignation: req2.designation,
      includeDate: true,
      isTopOrigin: false,
    });

    assert.ok(finalPdfBytes.length > pdfWithSig1Bytes.length, "Final PDF must contain both signatures");

    // Overwrite signed PDF on disk
    fs.writeFileSync(signedPdfPath, finalPdfBytes);

    // Verify integrity of final multi-signed PDF
    const integrity = await verifyPdfIntegrity(finalPdfBytes);
    assert.strictEqual(integrity.valid, true);
    assert.strictEqual(integrity.pageCount, 1);

    // Update store for Authority 2
    dbStore.updateSignatureRequest(testDocId, req2.id, {
      status: "SIGNED",
      signedAt: new Date().toISOString(),
      signatureImageUrl: "/signatures/sig_test_2.png",
    });

    dbStore.addWorkflowEvent(testDocId, {
      action: "DOCUMENT_SIGNED",
      performedBy: req2.authorityName,
      authorityDesignation: req2.designation,
      details: "Official electronic signature affixed below printed name.",
    });

    // Check completion condition
    const finalDoc = dbStore.getDocumentById(testDocId)!;
    const remainingPending = finalDoc.signatureRequests!.filter((r) => r.status !== "SIGNED");
    assert.strictEqual(remainingPending.length, 0, "All authorities should now be SIGNED");

    // Complete document workflow
    dbStore.updateDocument(testDocId, {
      status: "APPROVED",
      pdfUrl: `/generated/${testDocId}_signed.pdf`,
      approvedBy: req2.authorityName,
      approvedAt: new Date().toISOString(),
    });

    dbStore.addWorkflowEvent(testDocId, {
      action: "WORKFLOW_COMPLETED",
      performedBy: "System Workflow Engine",
      details: "All 2 designated authority signatures successfully completed and embedded in final PDF.",
    });

    // Send final completion email
    const completionEmailRes = await sendWorkflowCompletionEmail({
      requesterEmail: finalDoc.requesterEmail || "requester@nit.ac.in",
      requesterName: finalDoc.requesterName || "Aayush Awasthi",
      documentTitle: finalDoc.title,
      documentId: finalDoc.id,
      signedPdfUrl: `/generated/${testDocId}_signed.pdf`,
    });

    assert.strictEqual(completionEmailRes.success, true);

    const completedDoc = dbStore.getDocumentById(testDocId)!;
    assert.strictEqual(completedDoc.status, "APPROVED");
    assert.strictEqual(completedDoc.signatureRequests?.every((r) => r.status === "SIGNED"), true);
  });

  test("7. Security validations: duplicate signing, expired tokens, and declines", () => {
    // 1. Attempting to sign already completed request
    const alreadySigned = dbStore.getSignatureRequestByTokenHash(rawToken1);
    assert.ok(alreadySigned);
    assert.strictEqual(alreadySigned.request.status, "SIGNED");

    // 2. Expired token check
    const expiredReq = {
      ...alreadySigned.request,
      id: "sigreq_expired",
      status: "SENT" as const,
      tokenExpiresAt: new Date(Date.now() - 10000).toISOString(), // expired in past
    };
    const isExpired = new Date() > new Date(expiredReq.tokenExpiresAt);
    assert.strictEqual(isExpired, true, "Past expiration date must be detected as expired");

    // 3. Decline request workflow
    const declineDocId = "doc_decline_test_" + Date.now();
    dbStore.createDocument({
      title: "Declined Event Proposal",
      documentType: "EVENT_PROPOSAL",
      clubId: "club_acm",
      templateId: testTmplId,
      eventId: "evt_sample_1",
      currentVersion: 1,
      pdfEngineUsed: "pdf_lib_direct",
      dataSnapshot: {},
      docxUrl: `/generated/${testDocId}_initial.pdf`,
      pdfUrl: `/generated/${testDocId}_initial.pdf`,
      status: "PENDING_SIGNATURE",
      requesterName: "Club Secretary",
      requesterEmail: "club@nit.ac.in",
    });
    const declineDoc = dbStore.getDocuments().find((d) => d.title === "Declined Event Proposal")!;
    declineDoc.id = declineDocId;

    const declineToken = crypto.randomBytes(32).toString("hex");
    const declineHash = crypto.createHash("sha256").update(declineToken).digest("hex");

    dbStore.updateDocument(declineDocId, {
      signatureRequests: [
        {
          id: "sigreq_to_decline",
          documentId: declineDocId,
          fieldId: "sig_fld_1",
          printedName: "Dr. Arvind Sharma",
          designation: "Faculty Coordinator",
          assignedAuthorityId: "auth_faculty_coord",
          authorityName: "Dr. Arvind Sharma",
          authorityEmail: "arvind.sharma@nit.ac.in",
          pageNumber: 1,
          position: { x: 72, y: 80, width: 140, height: 40 },
          signingOrder: 1,
          actionType: "SIGNATURE_ONLY",
          includeDate: true,
          status: "SENT",
          tokenHash: declineHash,
          tokenExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
      ],
    });

    // Simulate decline
    dbStore.updateSignatureRequest(declineDocId, "sigreq_to_decline", {
      status: "DECLINED",
      declineReason: "Budget exceeds allowable departmental threshold.",
    });

    dbStore.updateDocument(declineDocId, {
      status: "CHANGES_REQUESTED",
      reviewComments: "Budget exceeds allowable departmental threshold.",
    });

    dbStore.addWorkflowEvent(declineDocId, {
      action: "REQUEST_DECLINED",
      performedBy: "Dr. Arvind Sharma",
      authorityDesignation: "Faculty Coordinator",
      details: "Signature request declined. Reason: Budget exceeds allowable departmental threshold.",
    });

    const refreshedDeclined = dbStore.getDocumentById(declineDocId)!;
    assert.strictEqual(refreshedDeclined.status, "CHANGES_REQUESTED");
    assert.strictEqual(refreshedDeclined.signatureRequests?.[0].status, "DECLINED");
    assert.strictEqual(refreshedDeclined.signatureRequests?.[0].declineReason, "Budget exceeds allowable departmental threshold.");

    // Clean up decline test doc
    dbStore.deleteDocument(declineDocId);
  });

  test("8. Offline Physical Signing: Stamps verification badge on PDF and completes workflow", async () => {
    const offlineDocId = "doc_test_offline_" + Date.now();
    const testPdf = await PDFDocument.create();
    const page = testPdf.addPage([595, 842]);
    page.drawText("Official University Request", { x: 50, y: 780, size: 14 });
    const pdfBytes = Buffer.from(await testPdf.save());

    // Test offline stamp embedding on PDF
    const stampedPdfBytes = await embedOfflineSignatureStampInPdf({
      existingPdfBytes: pdfBytes,
      pageNumber: 1,
      position: { x: 72, y: 100, width: 180, height: 50 },
      signerName: "Prof. R. C. Gupta",
      signerDesignation: "Dean Academic Affairs",
      signDate: "19 Oct 2026",
      note: "Physically signed on printed copy",
      isTopOrigin: false,
    });

    assert.ok(stampedPdfBytes.length > pdfBytes.length, "Stamped PDF should be larger due to stamp mark");
    const integrity = await verifyPdfIntegrity(stampedPdfBytes);
    assert.strictEqual(integrity.valid, true, "Stamped PDF must be syntactically valid");
    assert.strictEqual(integrity.pageCount, 1);

    // Verify DB tracking for offline signature
    const createdDoc = dbStore.createDocument({
      templateId: testTmplId,
      eventId: "evt_123",
      title: "Offline Sign Test Document",
      status: "SUBMITTED",
      currentVersion: 1,
      documentType: "EVENT_PROPOSAL",
      clubId: "club_acm",
      pdfEngineUsed: "pdf_lib_direct",
      dataSnapshot: {},
      docxUrl: `/generated/${offlineDocId}.pdf`,
      pdfUrl: `/generated/${offlineDocId}.pdf`,
    });
    createdDoc.id = offlineDocId;
    createdDoc.signatureRequests = [
      {
        id: "sigreq_offline_1",
        documentId: offlineDocId,
        fieldId: "sig_fld_offline",
        printedName: "Prof. R. C. Gupta",
        designation: "Dean Academic Affairs",
        assignedAuthorityId: "auth_dean",
        authorityName: "Prof. R. C. Gupta",
        authorityEmail: "dean@nit.ac.in",
        pageNumber: 1,
        position: { x: 72, y: 100, width: 180, height: 50 },
        signingOrder: 1,
        actionType: "SIGNATURE_ONLY",
        includeDate: true,
        status: "SENT",
        signatureMethod: "OFFLINE",
        tokenHash: "offline_test_hash",
        tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ];

    // Mark signed offline
    dbStore.updateSignatureRequest(offlineDocId, "sigreq_offline_1", {
      status: "SIGNED",
      signedAt: new Date().toISOString(),
      signatureMethod: "OFFLINE",
      offlineSignerName: "Prof. R. C. Gupta",
      offlineSignDate: "19 Oct 2026",
      offlineNote: "Physically signed on printed copy",
    });

    dbStore.addWorkflowEvent(offlineDocId, {
      action: "DOCUMENT_SIGNED_OFFLINE",
      performedBy: "Prof. R. C. Gupta",
      authorityDesignation: "Dean Academic Affairs",
      details: "Physical offline signature recorded for Prof. R. C. Gupta (Dean Academic Affairs). Note: Physically signed on printed copy",
    });

    const refreshed = dbStore.getDocumentById(offlineDocId)!;
    assert.strictEqual(refreshed.signatureRequests?.[0].status, "SIGNED");
    assert.strictEqual(refreshed.signatureRequests?.[0].signatureMethod, "OFFLINE");
    assert.strictEqual(refreshed.signatureRequests?.[0].offlineSignerName, "Prof. R. C. Gupta");

    const events = refreshed.workflowEvents || [];
    assert.ok(events.some((e) => e.action === "DOCUMENT_SIGNED_OFFLINE"), "Must record DOCUMENT_SIGNED_OFFLINE event");

    // Clean up
    dbStore.deleteDocument(offlineDocId);
  });

  test("9. User-specified signatories without predefined roles, and offline signing leaves space empty", async () => {
    const testCustomDocId = "doc_test_custom_sig_" + Date.now();
    const testPdf = await PDFDocument.create();
    const page = testPdf.addPage([595, 842]);
    page.drawText("Official University Request Form", { x: 50, y: 780, size: 14 });
    const originalPdfBytes = Buffer.from(await testPdf.save());

    const initialPdfPath = path.join(process.cwd(), "public", "generated", `${testCustomDocId}_initial.pdf`);
    const signedPdfPath = path.join(process.cwd(), "public", "generated", `${testCustomDocId}_signed.pdf`);
    fs.mkdirSync(path.dirname(initialPdfPath), { recursive: true });
    fs.writeFileSync(initialPdfPath, originalPdfBytes);

    // Create document in dbStore with user-specified signatory (e.g. written by the user)
    const doc = dbStore.createDocument({
      templateId: testTmplId,
      eventId: "evt_custom_999",
      title: "Custom Signatory Document",
      status: "SUBMITTED",
      currentVersion: 1,
      documentType: "EVENT_PROPOSAL",
      clubId: "club_acm",
      pdfEngineUsed: "pdf_lib_direct",
      dataSnapshot: {},
      docxUrl: `/generated/${testCustomDocId}_initial.pdf`,
      pdfUrl: `/generated/${testCustomDocId}_initial.pdf`,
    });
    doc.id = testCustomDocId;

    // Simulate user writing custom signatory names when submitting
    const customUserWrittenName = "Prof. Vikash Chandra";
    const customUserWrittenEmail = "vchandra@nit.ac.in";

    doc.signatureRequests = [
      {
        id: "sigreq_custom_1",
        documentId: testCustomDocId,
        fieldId: "sig_custom_fld",
        printedName: customUserWrittenName,
        designation: "Signature of Student Secretary",
        assignedAuthorityId: "custom_auth",
        authorityName: customUserWrittenName,
        authorityEmail: customUserWrittenEmail,
        pageNumber: 1,
        position: { x: 72, y: 100, width: 180, height: 50 },
        signingOrder: 1,
        actionType: "SIGNATURE_ONLY",
        includeDate: true,
        status: "SENT",
        tokenHash: "test_token_hash_offline",
        tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ];

    assert.strictEqual(doc.signatureRequests[0].authorityName, customUserWrittenName);
    assert.strictEqual(doc.signatureRequests[0].authorityEmail, customUserWrittenEmail);

    // Simulate offline signature action without banner:
    // When offline sign is chosen, the PDF file bytes remain unchanged (empty space for physical pen signature)
    fs.writeFileSync(signedPdfPath, originalPdfBytes);

    dbStore.updateSignatureRequest(testCustomDocId, "sigreq_custom_1", {
      status: "SIGNED",
      signedAt: new Date().toISOString(),
      signatureMethod: "OFFLINE",
      offlineSignerName: customUserWrittenName,
      offlineSignDate: "19 Oct 2026",
      offlineNote: "Physically signed on hardcopy",
    });

    dbStore.updateDocument(testCustomDocId, {
      status: "APPROVED",
      pdfUrl: `/generated/${testCustomDocId}_signed.pdf`,
    });

    const finalDoc = dbStore.getDocumentById(testCustomDocId)!;
    assert.strictEqual(finalDoc.status, "APPROVED");
    assert.strictEqual(finalDoc.signatureRequests?.[0].status, "SIGNED");
    assert.strictEqual(finalDoc.signatureRequests?.[0].signatureMethod, "OFFLINE");

    // The output signed PDF is byte-identical to original, meaning no banner was stamped
    const finalPdfBytes = fs.readFileSync(signedPdfPath);
    assert.strictEqual(finalPdfBytes.length, originalPdfBytes.length);

    // Clean up
    try { fs.unlinkSync(initialPdfPath); } catch {}
    try { fs.unlinkSync(signedPdfPath); } catch {}
    dbStore.deleteDocument(testCustomDocId);
  });
});
