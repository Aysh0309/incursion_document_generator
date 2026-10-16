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
});
