import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { fillPdfTemplate, fillDocxTemplate } from "../src/lib/document-engine/generator";
import { TemplateMetadata } from "../src/types";

describe("Output & Original Template Formatting Preservation Test Suite", () => {
  test("PDF template filling directly overlays onto the original PDF", async () => {
    // Create a base PDF representing an uploaded template with vector graphics & header
    const basePdf = await PDFDocument.create();
    const page = basePdf.addPage([595, 842]);
    const { width, height } = page.getSize();

    // Draw static header banner representing original logo / layout
    page.drawRectangle({
      x: 50,
      y: height - 100,
      width: width - 100,
      height: 40,
    });

    const pdfBuffer = Buffer.from(await basePdf.save());
    const tempTemplatePath = path.join(process.cwd(), "public", "templates", "test_original.pdf");
    fs.writeFileSync(tempTemplatePath, pdfBuffer);

    const pdfTemplateMetadata: TemplateMetadata = {
      id: "tmpl_pdf_test",
      name: "Original PDF Template",
      documentType: "EVENT_PROPOSAL",
      format: "pdf",
      description: "PDF with preserved vector graphics",
      fileUrl: "/templates/test_original.pdf",
      version: 1,
      isActive: true,
      status: "PUBLISHED",
      placeholdersDetected: ["eventName", "venue"],
      requiredFields: ["eventName"],
      optionalFields: [],
      fields: [
        {
          id: "fld_1",
          name: "eventName",
          label: "Event Name",
          type: "text",
          required: true,
          pageNumber: 1,
          boundingBox: { x: 50, y: height - 150, width: 300, height: 18 },
          confidence: 1.0,
          adminConfirmed: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    // Fill the original PDF
    const outputBuffer = await fillPdfTemplate(
      "/templates/test_original.pdf",
      pdfTemplateMetadata,
      { eventName: "AI Innovation Summit 2026" }
    );

    assert.ok(outputBuffer.length > 0, "Output PDF buffer must not be empty");

    // Load filled PDF and verify page count and page dimensions are preserved
    const filledPdf = await PDFDocument.load(outputBuffer);
    assert.strictEqual(filledPdf.getPageCount(), 1, "Must preserve original page count");
    const filledPage = filledPdf.getPage(0);
    assert.strictEqual(filledPage.getWidth(), 595, "Must preserve original page width");
    assert.strictEqual(filledPage.getHeight(), 842, "Must preserve original page height");

    // Clean up test file
    if (fs.existsSync(tempTemplatePath)) fs.unlinkSync(tempTemplatePath);
  });

  test("DOCX template filling preserves original OpenXML structure and styles", async () => {
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

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>OFFICIAL PROPOSAL</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Event Title: {eventName}</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
    zip.file("word/document.xml", docXml);
    const docxBuffer = zip.generate({ type: "nodebuffer" });

    const tempDocxPath = path.join(process.cwd(), "public", "templates", "test_doc.docx");
    fs.writeFileSync(tempDocxPath, docxBuffer);

    const docxTemplateMetadata: TemplateMetadata = {
      id: "tmpl_docx_test",
      name: "Original DOCX Template",
      documentType: "EVENT_PROPOSAL",
      format: "docx",
      description: "DOCX with centered bold headings",
      fileUrl: "/templates/test_doc.docx",
      version: 1,
      isActive: true,
      status: "PUBLISHED",
      placeholdersDetected: ["eventName"],
      requiredFields: ["eventName"],
      optionalFields: [],
      fields: [
        {
          id: "fld_1",
          name: "eventName",
          label: "Event Name",
          type: "text",
          required: true,
          confidence: 1.0,
          adminConfirmed: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const filledDocx = await fillDocxTemplate(
      "/templates/test_doc.docx",
      docxTemplateMetadata,
      { eventName: "Cybersecurity Capture The Flag" }
    );

    // Verify filled DOCX can be opened and contains substituted text with styles intact
    const outputZip = new PizZip(filledDocx);
    const outputXml = outputZip.file("word/document.xml")?.asText() || "";

    assert.ok(
      outputXml.includes("Cybersecurity Capture The Flag"),
      "Must correctly substitute placeholder in DOCX"
    );
    assert.ok(
      outputXml.includes('w:val="center"'),
      "Must preserve center alignment paragraph property"
    );
    assert.ok(
      outputXml.includes("<w:b/>"),
      "Must preserve bold character property"
    );

    if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
  });
});
