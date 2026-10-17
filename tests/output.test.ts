import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { fillPdfTemplate, fillDocxTemplate, generateDocument } from "../src/lib/document-engine/generator";
import { TemplateMetadata, ClubBranding } from "../src/types";

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

  test("Normal DOCX with NO placeholders or tags has table cells replaced in-place", async () => {
    // Normal institutional template without any curly braces
    const normalDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Title of the Event</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Old Sample Event Title</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Event Venue</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Old Lab 1</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Total amount Sanctioned</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Date: _________________</w:t></w:r></w:p>
  </w:body>
</w:document>`;

    const normalZip = new PizZip();
    normalZip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    normalZip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
    normalZip.file("word/document.xml", normalDocXml);

    const normalDocxBuf = normalZip.generate({ type: "nodebuffer" });
    const tempNormalPath = path.join(process.cwd(), "public", "templates", "test_normal.docx");
    fs.writeFileSync(tempNormalPath, normalDocxBuf);

    const normalMetadata: TemplateMetadata = {
      id: "tmpl_normal_test",
      name: "Normal Document Template",
      documentType: "EVENT_PROPOSAL",
      format: "docx",
      description: "Normal DOCX with tables and blanks but NO curly braces",
      fileUrl: "/templates/test_normal.docx",
      version: 1,
      isActive: true,
      status: "PUBLISHED",
      placeholdersDetected: ["eventName", "venue", "startDate"],
      requiredFields: ["eventName"],
      optionalFields: [],
      fields: [
        {
          id: "fld_1",
          name: "eventName",
          label: "Title of the Event",
          type: "text",
          required: true,
          confidence: 0.95,
          adminConfirmed: true,
        },
        {
          id: "fld_2",
          name: "venue",
          label: "Event Venue",
          type: "text",
          required: true,
          confidence: 0.95,
          adminConfirmed: true,
        },
        {
          id: "fld_3",
          name: "totalAmountSanctioned",
          label: "Total amount Sanctioned",
          type: "currency",
          required: false,
          confidence: 0.95,
          adminConfirmed: true,
        },
        {
          id: "fld_4",
          name: "startDate",
          label: "Date",
          type: "date",
          required: true,
          confidence: 0.9,
          adminConfirmed: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const filled = await fillDocxTemplate(
      "/templates/test_normal.docx",
      normalMetadata,
      {
        eventName: "Autonomous Drone Summit 2026",
        venue: "Main Auditorium Hall A",
        totalAmountSanctioned: "75,000",
        startDate: "2026-11-20",
      }
    );

    const resZip = new PizZip(filled);
    const resXml = resZip.file("word/document.xml")?.asText() || "";

    assert.ok(
      resXml.includes("Autonomous Drone Summit 2026"),
      "Must replace 'Title of the Event' value cell in normal DOCX table"
    );
    assert.ok(
      resXml.includes("Main Auditorium Hall A"),
      "Must replace 'Event Venue' value cell in normal DOCX table"
    );
    assert.ok(
      resXml.includes("75,000"),
      "Must populate previously empty 'Total amount Sanctioned' cell"
    );
    assert.ok(
      !resXml.includes("Old Sample Event Title"),
      "Must NOT retain old sample value in replaced cell"
    );
    assert.ok(
      resXml.includes("Date: 2026-11-20"),
      "Must replace paragraph labeled underline 'Date: ______'"
    );

    if (fs.existsSync(tempNormalPath)) fs.unlinkSync(tempNormalPath);
  });

  test("generateDocument pipeline creates high-fidelity PDF and DOCX preserving layout", async () => {
    const club: ClubBranding = {
      id: "club_acm",
      name: "ACM Student Chapter",
      slug: "acm-student-chapter",
      universityName: "SVNIT",
      department: "Computer Science",
      contactEmail: "acm@svnit.ac.in",
      contactPhone: "+91 9876543210",
      facultyCoordinator: {
        name: "Dr. Faculty Coordinator",
        designation: "Associate Professor",
        department: "Computer Science",
      },
      primaryColor: "#4F46E5",
      secondaryColor: "#818CF8",
    };

    // Create a mini DOCX template
    const zip = new PizZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
    );
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Submitted to Dean (Students Welfare)</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Subject</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>:</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`
    );

    const docxBuf = zip.generate({ type: "nodebuffer" });
    const tempTmplPath = path.join(process.cwd(), "public", "templates", "test_high_fidelity.docx");
    fs.writeFileSync(tempTmplPath, docxBuf);

    const metadata: TemplateMetadata = {
      id: "tmpl_hf_test",
      name: "High Fidelity Test Template",
      documentType: "EVENT_PROPOSAL",
      format: "docx",
      description: "Test template for high-fidelity PDF pipeline",
      fileUrl: "/templates/test_high_fidelity.docx",
      version: 1,
      isActive: true,
      status: "PUBLISHED",
      placeholdersDetected: ["subject"],
      requiredFields: ["subject"],
      optionalFields: [],
      fields: [
        {
          id: "fld_subject",
          name: "subject",
          label: "Subject",
          type: "text",
          required: true,
          confidence: 1.0,
          adminConfirmed: true,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const result = await generateDocument({
      documentId: "test_doc_hf",
      template: metadata,
      fieldValues: { subject: "Autonomous AI Summit" },
      club,
    });

    assert.ok(fs.existsSync(result.docxPath), "DOCX file must exist on disk");
    assert.ok(fs.existsSync(result.pdfPath), "PDF file must exist on disk");
    assert.ok(fs.statSync(result.pdfPath).size > 1000, "PDF must not be an empty or corrupted stub");
    assert.ok(
      result.pdfEngineUsed === "headless_browser" ||
        result.pdfEngineUsed === "libreoffice" ||
        result.pdfEngineUsed === "institutional_pdfkit",
      "Valid PDF engine must be used"
    );

    // Clean up
    if (fs.existsSync(tempTmplPath)) fs.unlinkSync(tempTmplPath);
    if (fs.existsSync(result.docxPath)) fs.unlinkSync(result.docxPath);
    if (fs.existsSync(result.pdfPath)) fs.unlinkSync(result.pdfPath);
  });
});
