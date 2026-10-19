import { test, describe } from "node:test";
import assert from "node:assert";
import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import {
  analyzeDocxTemplate,
  analyzePdfTemplate,
  normalizeFieldKey,
  inferFieldType,
} from "../src/lib/document-engine/analyzer";

function createDocxWithXml(documentXml: string, headerXml?: string): Buffer {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/document.xml", documentXml);
  if (headerXml) {
    zip.file("word/header1.xml", headerXml);
  }
  return zip.generate({ type: "nodebuffer" });
}

describe("Placeholder Detection Test Suite", () => {
  test("DOCX containing explicit {{field_name}} and {field_name} placeholders", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Event Title: {{eventName}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Scheduled on: {startDate}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Venue: {{venue}}</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const buffer = createDocxWithXml(xml);
    const result = await analyzeDocxTemplate(buffer);

    assert.strictEqual(result.format, "docx");
    const fieldNames = result.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("eventName"), "Must detect {{eventName}}");
    assert.ok(fieldNames.includes("startDate"), "Must detect {startDate}");
    assert.ok(fieldNames.includes("venue"), "Must detect {{venue}}");
  });

  test("DOCX with placeholders split across multiple Word runs (<w:t> tags)", async () => {
    // Word often splits "{eventName}" into <w:t>{</w:t>, <w:t>event</w:t>, <w:t>Name}</w:t>
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>{</w:t></w:r>
      <w:r><w:t>{</w:t></w:r>
      <w:r><w:t>faculty</w:t></w:r>
      <w:r><w:t>Coordinator</w:t></w:r>
      <w:r><w:t>}</w:t></w:r>
      <w:r><w:t>}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

    const buffer = createDocxWithXml(xml);
    const result = await analyzeDocxTemplate(buffer);

    const fieldNames = result.fields.map((f) => f.name);
    assert.ok(
      fieldNames.includes("facultyCoordinator"),
      "Must correctly detect placeholders split across Word runs"
    );
  });

  test("DOCX with placeholders inside tables and labeled blanks", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Budget Requested:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>{{budgetRequested}}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Department HOD:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>______________________</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;

    const buffer = createDocxWithXml(xml);
    const result = await analyzeDocxTemplate(buffer);

    const fieldNames = result.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("budgetRequested"), "Must detect placeholder in table cell");
    assert.ok(fieldNames.includes("departmentHOD"), "Must detect labeled blank table cell");
  });

  test("Normal DOCX with NO placeholders detects all key-value table rows and blanks", async () => {
    const normalXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Title of the Event</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Internal Hackathon of SIH</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Schedule of Event (Date, Day)</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>September 12th 2026</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Event Venue</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>CSE Department</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>ExpectedNumberof Participants</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>1000+</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Total amount Sanctioned in Current Academic Year</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Date: _________________</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const buffer = createDocxWithXml(normalXml);
    const result = await analyzeDocxTemplate(buffer);

    const fieldLabels = result.fields.map((f) => f.label);
    assert.ok(fieldLabels.includes("Title of the Event"), "Must detect Title of the Event table row");
    assert.ok(fieldLabels.includes("Schedule of Event (Date, Day)"), "Must detect Schedule of Event table row");
    assert.ok(fieldLabels.includes("Event Venue"), "Must detect Event Venue table row");
    assert.ok(fieldLabels.includes("ExpectedNumberof Participants"), "Must detect ExpectedNumberof Participants table row");
    assert.ok(fieldLabels.includes("Total amount Sanctioned in Current Academic Year"), "Must detect empty cell table row");
  });

  test("DOCX with fields in headers and footers", async () => {
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Body Text</w:t></w:r></w:p></w:body>
</w:document>`;
    const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:t>Header Date: {{headerDate}}</w:t></w:r></w:p>
</w:hdr>`;

    const buffer = createDocxWithXml(docXml, headerXml);
    const result = await analyzeDocxTemplate(buffer);

    const fieldNames = result.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("headerDate"), "Must detect placeholders in headers");
  });

  test("PDF containing fillable AcroForm fields", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const form = pdfDoc.getForm();

    const textField = form.createTextField("eventName");
    textField.addToPage(page, { x: 50, y: 700, width: 200, height: 20 });

    const pdfBytes = await pdfDoc.save();
    const result = await analyzePdfTemplate(Buffer.from(pdfBytes));

    assert.strictEqual(result.format, "pdf");
    const fieldNames = result.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("eventName"), "Must detect AcroForm field in PDF");
    assert.strictEqual(result.fields[0].confidence, 0.99);
  });

  test("PDF with labeled blanks and multiple pages", async () => {
    const pdfDoc = await PDFDocument.create();
    const page1 = pdfDoc.addPage([595, 842]);
    const page2 = pdfDoc.addPage([595, 842]);

    assert.strictEqual(pdfDoc.getPageCount(), 2);
    const pdfBytes = await pdfDoc.save();
    const result = await analyzePdfTemplate(Buffer.from(pdfBytes));

    assert.strictEqual(result.pageCount, 2);
    assert.strictEqual(result.pageDimensions.length, 2);
  });

  test("Repeated field values are grouped and mapped consistently", () => {
    const key1 = normalizeFieldKey("Event Date");
    const key2 = normalizeFieldKey("eventDate");
    const key3 = normalizeFieldKey("Date of Event:");

    assert.strictEqual(key1, "startDate");
    assert.strictEqual(key2, "startDate");
    assert.strictEqual(key3, "startDate");
  });

  test("Normal text document without blanks or curly braces parses all fields completely", async () => {
    // A completely normal DOCX document without {{tags}} and without _____ underscores
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Proposal for Student Workshop</w:t></w:r></w:p>
    <w:p><w:r><w:t>Event Name: Web3 & AI Hackathon</w:t></w:r></w:p>
    <w:p><w:r><w:t>Venue: Main Seminar Hall B</w:t></w:r></w:p>
    <w:p><w:r><w:t>Target Audience: Computer Science Undergraduate Students</w:t></w:r></w:p>
    <w:p><w:r><w:t>Expected Number of Participants: 150</w:t></w:r></w:p>
    <w:p><w:r><w:t>Mode of Event: Offline / In-Person</w:t></w:r></w:p>
    <w:p><w:r><w:t>Registration Fee: Free of Charge</w:t></w:r></w:p>
    <w:p><w:r><w:t>Duration: 3 Days</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>1.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Event Coordinator</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Alex Morgan</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>2.</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Proposed Budget</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>INR 45,000</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Signature of Faculty Coordinator: Dr. S. Rao</w:t></w:r></w:p>
    <w:p><w:r><w:t>Signature of Dean Student Welfare: Prof. K. Sharma</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const buffer = createDocxWithXml(xml);
    const result = await analyzeDocxTemplate(buffer);

    const names = result.fields.map((f) => f.name);
    // Verify ALL normal text fields were captured without leaving any field behind
    assert.ok(names.includes("eventName"), "Must parse normal text Event Name");
    assert.ok(names.includes("venue"), "Must parse normal text Venue");
    assert.ok(names.includes("targetAudience"), "Must parse normal text Target Audience");
    assert.ok(names.includes("eventMode") || names.includes("modeOfEvent"), "Must parse normal text Mode of Event");
    assert.ok(names.includes("registrationFee"), "Must parse normal text Registration Fee");
    assert.ok(names.includes("duration"), "Must parse normal text Duration");
    assert.ok(names.includes("eventCoordinator") || names.includes("coordinatorName") || names.includes("organizerName"), "Must parse table row Event Coordinator");
    assert.ok(names.includes("proposedBudget") || names.includes("totalBudget") || names.includes("budgetRequested"), "Must parse table row Proposed Budget");

    // Verify signatures are identified as signature placeholders
    const sigFields = result.signatureFields || [];
    assert.ok(sigFields.length >= 2, "Must identify signature sections");
    const designations = sigFields.map((s) => s.designation.toLowerCase());
    assert.ok(designations.some((d) => d.includes("faculty coordinator")), "Must detect faculty coordinator signature");
    assert.ok(designations.some((d) => d.includes("dean")), "Must detect dean signature");
  });

  test("Document with static college name, branch, and institutional letterhead does not add them as extra fields", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>NATIONAL INSTITUTE OF TECHNOLOGY</w:t></w:r></w:p>
    <w:p><w:r><w:t>Name of the College: National Institute of Technology</w:t></w:r></w:p>
    <w:p><w:r><w:t>College Name: NIT Campus</w:t></w:r></w:p>
    <w:p><w:r><w:t>Branch: Computer Science &amp; Engineering</w:t></w:r></w:p>
    <w:p><w:r><w:t>Name of the Branch: Information Technology</w:t></w:r></w:p>
    <w:p><w:r><w:t>Department: Computer Science</w:t></w:r></w:p>
    <w:p><w:r><w:t>Affiliated to: State Technological University</w:t></w:r></w:p>
    <w:p><w:r><w:t>Pin Code: 800005</w:t></w:r></w:p>
    <w:p><w:r><w:t>Event Name: Annual Hackathon 2026</w:t></w:r></w:p>
    <w:p><w:r><w:t>Venue: Main Auditorium</w:t></w:r></w:p>
    <w:p><w:r><w:t>Signature of Faculty Coordinator: Dr. Arvind</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const buffer = createDocxWithXml(xml);
    const result = await analyzeDocxTemplate(buffer);

    const names = result.fields.map((f) => f.name.toLowerCase());
    const labels = result.fields.map((f) => f.label.toLowerCase());

    // Must NOT contain college or branch as extra fields
    assert.strictEqual(names.includes("collegename"), false, "Must NOT add collegeName");
    assert.strictEqual(names.includes("nameofthecollege"), false, "Must NOT add nameOfTheCollege");
    assert.strictEqual(names.includes("branch"), false, "Must NOT add branch");
    assert.strictEqual(names.includes("nameofthebranch"), false, "Must NOT add nameOfTheBranch");
    assert.strictEqual(names.includes("department"), false, "Must NOT add department as extra field");
    assert.strictEqual(labels.some((l) => l.includes("college")), false, "No label should contain college");
    assert.strictEqual(labels.some((l) => l.includes("branch")), false, "No label should contain branch");

    // But valid event fields must still be present
    assert.ok(names.includes("eventname"), "Must retain eventName");
    assert.ok(names.includes("venue"), "Must retain venue");
  });
});
