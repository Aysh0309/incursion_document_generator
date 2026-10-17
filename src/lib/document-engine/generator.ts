import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import PDFKitDocument from "pdfkit";
import { ClubBranding, DocumentType, TemplateField, TemplateMetadata } from "@/types";
import { ensureDefaultTemplatesExist } from "./templates";
import { normalizeFieldKey } from "./analyzer";

const execAsync = promisify(exec);

export interface ValidationIssue {
  field: string;
  label: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

/**
 * Central server-side validation function.
 * Strictly verifies all required fields without silent defaults.
 */
export function validateTemplateSubmission(
  template: TemplateMetadata,
  data: Record<string, any>
): ValidationResult {
  const errors: ValidationIssue[] = [];

  const fieldsToCheck = template.fields && template.fields.length > 0
    ? template.fields
    : (template.requiredFields || []).map((name) => ({
        id: name,
        name,
        label: name.replace(/([A-Z])/g, " $1"),
        type: "text" as const,
        required: true,
        isFixed: false,
        isSystem: false,
        confidence: 1.0,
        adminConfirmed: true,
      }));

  for (const field of fieldsToCheck) {
    if (!field.required || field.isFixed || field.isSystem) {
      continue;
    }

    const val = data[field.name] ?? data[field.id];

    // Check presence
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      errors.push({
        field: field.name,
        label: field.label || field.name,
        message: `${field.label || field.name} is a required field.`,
      });
      continue;
    }

    // Type-specific validations
    if (field.type === "date") {
      const dateStr = String(val).trim();
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !isNaN(Date.parse(dateStr));
      if (!isValidDate) {
        errors.push({
          field: field.name,
          label: field.label,
          message: `${field.label} must be a valid date (YYYY-MM-DD).`,
        });
      }
    } else if (field.type === "email") {
      const emailStr = String(val).trim();
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
      if (!isValidEmail) {
        errors.push({
          field: field.name,
          label: field.label,
          message: `${field.label} must be a valid email address.`,
        });
      }
    } else if (field.type === "number" || field.type === "currency") {
      const numVal = Number(val);
      if (isNaN(numVal) || numVal < 0) {
        errors.push({
          field: field.name,
          label: field.label,
          message: `${field.label} must be a positive number.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Fills an original PDF template using pdf-lib:
 * - If fillable AcroForm, populates form fields
 * - If static / ordinary PDF, overlays text at configured coordinates
 * - 100% preserves original vectors, logos, stamps, layouts, and page sizes
 */
export async function fillPdfTemplate(
  templateRelativePath: string,
  template: TemplateMetadata,
  fieldValues: Record<string, any>
): Promise<Buffer> {
  const fullTemplatePath = path.join(
    process.cwd(),
    "public",
    templateRelativePath.replace(/^\//, "")
  );

  if (!fs.existsSync(fullTemplatePath)) {
    throw new Error(`PDF Template file not found on disk at: ${fullTemplatePath}`);
  }

  const templateBytes = fs.readFileSync(fullTemplatePath);
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Fill AcroForm interactive fields if present
  try {
    const form = pdfDoc.getForm();
    if (form) {
      for (const field of template.fields || []) {
        const val = field.isFixed
          ? (field.fixedValue || "")
          : (fieldValues[field.name] ?? fieldValues[field.id]);

        if (val === undefined || val === null || val === "") continue;

        const candidateNames = [
          field.formFieldName,
          field.name,
          field.id,
          field.label,
          `{{${field.name}}}`,
        ].filter(Boolean) as string[];

        for (const name of candidateNames) {
          try {
            const textField = form.getTextField(name);
            if (textField) {
              textField.setText(String(val));
              break;
            }
          } catch {
            // Field name does not match an interactive text field, continue
          }
        }
      }
    }
  } catch {
    // PDF has no interactive form
  }

  // 2. Overlay coordinate-based fields on pages
  const pageCount = pdfDoc.getPageCount();
  for (const field of template.fields || []) {
    const rawVal = field.isFixed
      ? (field.fixedValue || "")
      : (fieldValues[field.name] ?? fieldValues[field.id]);

    if (rawVal === undefined || rawVal === null || rawVal === "") continue;

    const valStr = String(rawVal);
    const pageNum = Math.max(1, field.pageNumber || 1);
    const pageIdx = pageNum - 1;

    if (pageIdx < pageCount && field.boundingBox) {
      const page = pdfDoc.getPage(pageIdx);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const bb = field.boundingBox;

      // Font size tailored to box height with safety bounds
      const fontSize = Math.max(8, Math.min(11, bb.height ? bb.height * 0.8 : 10));

      // Overflow and wrapping calculation
      const maxWidth = bb.width > 20 ? bb.width : Math.max(120, pageWidth - bb.x - 40);

      // Simple word wrapping
      const words = valStr.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (const w of words) {
        const testLine = currentLine ? `${currentLine} ${w}` : w;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Determine PDF coordinate system
      // pdf-lib origin is bottom-left. If bb.y is provided from pdfjs-dist, it is relative to bottom.
      const startX = Math.max(20, Math.min(pageWidth - 40, bb.x));
      let startY = bb.y;
      if (startY > pageHeight) startY = pageHeight - 50;

      // Draw each wrapped line
      for (let i = 0; i < lines.length; i++) {
        const lineY = startY - i * (fontSize + 3);
        if (lineY < 20) break; // prevent drawing off-page
        page.drawText(lines[i], {
          x: startX,
          y: lineY,
          size: fontSize,
          font,
          color: rgb(0.09, 0.09, 0.11),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
/**
 * Fills an original DOCX template:
 * - Directly updates table cells and labeled blanks in-place via OpenXML manipulation
 * - Preserves exact formatting, fonts, sizes, table borders, images, and logos
 * - Runs docxtemplater for any explicit {tag} / {{tag}} placeholders
 */
export async function fillDocxTemplate(
  templateRelativePath: string,
  template: TemplateMetadata,
  fieldValues: Record<string, any>
): Promise<Buffer> {
  ensureDefaultTemplatesExist();

  const fullTemplatePath = path.join(
    process.cwd(),
    "public",
    templateRelativePath.replace(/^\//, "")
  );

  if (!fs.existsSync(fullTemplatePath)) {
    throw new Error(`DOCX Template file not found on disk at: ${fullTemplatePath}`);
  }

  const templateContent = fs.readFileSync(fullTemplatePath);
  const zip = new PizZip(templateContent);

  // Prepare full interpolation dictionary
  const context: Record<string, any> = { ...fieldValues };

  // Map each configured field
  if (template.fields) {
    for (const f of template.fields) {
      const val = f.isFixed ? f.fixedValue : (fieldValues[f.name] ?? fieldValues[f.id]);
      if (val !== undefined && val !== null) {
        context[f.name] = val;
        context[f.id] = val;
        if (f.repeatedFieldKeys) {
          for (const repKey of f.repeatedFieldKeys) {
            context[repKey] = val;
          }
        }
      }
    }
  }

  // Handle formatters
  if (context.budgetRequested && typeof context.budgetRequested === "number") {
    context.formattedBudget = `INR ${context.budgetRequested.toLocaleString("en-IN")}/-`;
  }
  if (context.startDate && !context.formattedDateRange) {
    context.formattedDateRange = context.endDate && context.endDate !== context.startDate
      ? `${context.startDate} to ${context.endDate}`
      : context.startDate;
  }
  context.currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 1. IN-PLACE XML REPLACEMENT FOR NORMAL DOCUMENTS (No Tags/Placeholders)
  // Replaces table cells and labeled blanks while preserving 100% of OpenXML styles and fonts
  const DOMParser = require("@xmldom/xmldom").DOMParser;
  const XMLSerializer = require("@xmldom/xmldom").XMLSerializer;

  const xmlParts = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(name)
  );

  for (const partName of xmlParts) {
    const xmlContent = zip.file(partName)?.asText();
    if (!xmlContent) continue;

    let doc: any;
    try {
      doc = new DOMParser().parseFromString(xmlContent, "application/xml");
    } catch {
      continue;
    }

    let modified = false;

    // A. Replace table cells in key-value rows
    const trs = doc.getElementsByTagName("w:tr");
    for (let i = 0; i < trs.length; i++) {
      const tr = trs[i];
      const tcs = tr.getElementsByTagName("w:tc");
      if (tcs.length < 2) continue;

      const cellTexts: string[] = [];
      for (let c = 0; c < tcs.length; c++) {
        const ts = tcs[c].getElementsByTagName("w:t");
        let txt = "";
        for (let k = 0; k < ts.length; k++) {
          txt += ts[k].textContent || "";
        }
        cellTexts.push(txt.trim());
      }

      const rawLabel = cellTexts[0];
      if (!rawLabel || rawLabel.length < 2) continue;

      let valIdx = -1;
      if (cellTexts.length >= 3 && (cellTexts[1] === ":" || cellTexts[1] === "" || cellTexts[1] === "-")) {
        valIdx = 2;
      } else if (cellTexts.length >= 2) {
        valIdx = 1;
      }

      if (valIdx === -1) continue;

      const cleanLabelStr = rawLabel.replace(/:$/, "").trim();
      const normalizedKey = normalizeFieldKey(cleanLabelStr);

      // Find matching user-provided value from fieldValues or context
      let replacementVal =
        context[normalizedKey] ??
        context[cleanLabelStr] ??
        fieldValues[normalizedKey] ??
        fieldValues[cleanLabelStr];

      // Also check against template fields mapping
      if (replacementVal === undefined && template.fields) {
        for (const f of template.fields) {
          if (
            f.name === normalizedKey ||
            f.label.toLowerCase() === cleanLabelStr.toLowerCase() ||
            f.repeatedFieldKeys?.some(
              (rk: string) => rk.toLowerCase() === cleanLabelStr.toLowerCase()
            )
          ) {
            replacementVal = f.isFixed
              ? f.fixedValue
              : (fieldValues[f.name] ?? fieldValues[f.id] ?? context[f.name]);
            if (replacementVal !== undefined) break;
          }
        }
      }

      if (replacementVal !== undefined && replacementVal !== null) {
        const newValStr = String(replacementVal);
        const valTc = tcs[valIdx];
        const ts = valTc.getElementsByTagName("w:t");

        if (ts.length > 0) {
          ts[0].textContent = newValStr;
          for (let k = 1; k < ts.length; k++) {
            ts[k].textContent = "";
          }
        } else {
          const p = doc.createElement("w:p");
          const r = doc.createElement("w:r");
          const t = doc.createElement("w:t");
          t.textContent = newValStr;
          r.appendChild(t);
          p.appendChild(r);
          valTc.appendChild(p);
        }
        modified = true;
      }
    }

    // B. Replace labeled blanks / lines in paragraphs
    const ps = doc.getElementsByTagName("w:p");
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const ts = p.getElementsByTagName("w:t");
      let pText = "";
      for (let k = 0; k < ts.length; k++) {
        pText += ts[k].textContent || "";
      }

      if (!pText) continue;

      if (template.fields) {
        for (const f of template.fields) {
          const val = f.isFixed ? f.fixedValue : (fieldValues[f.name] ?? context[f.name]);
          if (val === undefined || val === null) continue;

          // Replace pattern like "Label: _____" or "Label: [   ]" or "Label: previousValue"
          const escapedLabel = f.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const labelPattern = new RegExp(
            `(${escapedLabel}):\\s*(_{2,}|\\.{3,}|—+|–+|\\[\\s*\\]|\\s*$)`,
            "i"
          );
          if (labelPattern.test(pText)) {
            const replaced = pText.replace(labelPattern, `$1: ${String(val)}`);
            if (ts.length > 0) {
              ts[0].textContent = replaced;
              for (let k = 1; k < ts.length; k++) ts[k].textContent = "";
              modified = true;
            }
          }
        }
      }
    }

    if (modified) {
      const serialized = new XMLSerializer().serializeToString(doc);
      zip.file(partName, serialized);
    }
  }

  // 2. ALSO RUN DOCXTEMPLATER IF TEMPLATE HAS EXPLICIT TAGS
  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
      nullGetter: () => "",
    });
    doc.render(context);
    return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  } catch {
    // If single curly fails, try double curly
    try {
      const doc2 = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
        nullGetter: () => "",
      });
      doc2.render(context);
      return doc2.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
    } catch {
      // Return the in-place XML modified zip
      return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    }
  }
}

/**
 * Attempts LibreOffice conversion if installed.
 */
async function tryLibreOfficeConversion(docxPath: string, outputDir: string): Promise<string | null> {
  try {
    const customPath = process.env.LIBREOFFICE_PATH || "soffice";
    const cmd = `${customPath} --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;
    await execAsync(cmd, { timeout: 6000 });

    const baseName = path.basename(docxPath, path.extname(docxPath));
    const generatedPdfPath = path.join(outputDir, `${baseName}.pdf`);

    if (fs.existsSync(generatedPdfPath)) {
      return generatedPdfPath;
    }
  } catch {
    // LibreOffice not available
  }
  return null;
}

/**
 * High-fidelity Vectorized PDF Generator for DOCX templates when LibreOffice is not installed.
 * Reads the actual filled DOCX text and paragraphs to accurately generate a matching PDF.
 */
async function generatePdfFromFilledDocx(
  docxBuffer: Buffer,
  outputPath: string,
  docTitle: string,
  club: ClubBranding
): Promise<void> {
  return new Promise((resolve, reject) => {
    const zip = new PizZip(docxBuffer);
    const docXml = zip.file("word/document.xml")?.asText() || "";

    // Extract paragraphs in order
    const pRegex = /<w:p(?:[\s>][\s\S]*?<\/w:p>|<\/>)/g;
    const paragraphs: string[] = [];
    let pMatch;

    while ((pMatch = pRegex.exec(docXml)) !== null) {
      const tRegex = /<w:t(?:[\s>][\s\S]*?>([\s\S]*?)<\/w:t>|\/>)/g;
      let pText = "";
      let tMatch;
      while ((tMatch = tRegex.exec(pMatch[0])) !== null) {
        if (tMatch[1]) pText += tMatch[1];
      }
      paragraphs.push(pText.trim());
    }

    const doc = new PDFKitDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: 54, right: 54 },
      info: {
        Title: docTitle,
        Author: club.name,
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const primaryColor = club.primaryColor || "#4F46E5";
    const darkText = "#18181B";
    const mutedText = "#475569";

    // Header bar
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .text(club.universityName.toUpperCase(), { align: "center" });

    doc
      .fontSize(9)
      .fillColor(mutedText)
      .font("Helvetica")
      .text(`${club.department} | ${club.name}`, { align: "center" })
      .moveDown(0.2);

    const currentY = doc.y;
    doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(54, currentY).lineTo(541, currentY).stroke();
    doc.y = currentY + 14;

    // Render paragraphs from the original DOCX
    for (const para of paragraphs) {
      if (!para) {
        doc.moveDown(0.4);
        continue;
      }

      // Check if heading or section
      if (/^[0-9]+\.\s+[A-Z\s&]+$/.test(para) || /^[A-Z\s]{4,}$/.test(para)) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(primaryColor)
          .text(para)
          .moveDown(0.3);
      } else if (para.startsWith("To,") || para.startsWith("Subject:")) {
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(darkText)
          .text(para)
          .moveDown(0.3);
      } else if (para.includes("-------")) {
        const y = doc.y;
        doc.strokeColor("#E2E8F0").lineWidth(0.5).moveTo(54, y).lineTo(541, y).stroke();
        doc.y = y + 8;
      } else {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(darkText)
          .text(para, { align: "justify", lineGap: 2.5 })
          .moveDown(0.4);
      }

      // Handle page overflow safely
      if (doc.y > 750) {
        doc.addPage();
      }
    }

    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

export interface GenerateDocumentOptions {
  documentId: string;
  template: TemplateMetadata;
  fieldValues: Record<string, any>;
  club: ClubBranding;
}

export interface GenerateDocumentResult {
  docxPath: string;
  pdfPath: string;
  docxUrl: string;
  pdfUrl: string;
  pdfEngineUsed: "pdf_lib_direct" | "libreoffice" | "institutional_pdfkit";
  format: "docx" | "pdf";
}

/**
 * Main unified document generator:
 * - Validates all required fields
 * - If PDF template: fills the original PDF directly using pdf-lib
 * - If DOCX template: fills original DOCX using docxtemplater and converts/renders PDF
 * - Verifies generated outputs exist on disk
 */
export async function generateDocument(
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult> {
  const { documentId, template, fieldValues, club } = options;

  // 1. Server-side validation gate
  const validation = validateTemplateSubmission(template, fieldValues);
  if (!validation.valid) {
    const errorDetails = validation.errors.map((e) => `${e.label}: ${e.message}`).join(", ");
    throw new Error(`Validation failed for template '${template.name}': ${errorDetails}`);
  }

  const generatedDir = path.join(process.cwd(), "public", "generated");
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const isPdfTemplate =
    template.format === "pdf" || template.fileUrl.toLowerCase().endsWith(".pdf");

  if (isPdfTemplate) {
    // Generate directly from original PDF template
    const pdfFileName = `${documentId}.pdf`;
    const pdfFullPath = path.join(generatedDir, pdfFileName);

    const pdfBuffer = await fillPdfTemplate(template.fileUrl, template, fieldValues);
    fs.writeFileSync(pdfFullPath, pdfBuffer);

    // Verify file exists and is readable
    if (!fs.existsSync(pdfFullPath) || fs.statSync(pdfFullPath).size === 0) {
      throw new Error(`Failed to write valid generated PDF file for ${documentId}`);
    }

    return {
      docxPath: "",
      pdfPath: pdfFullPath,
      docxUrl: "",
      pdfUrl: `/generated/${pdfFileName}`,
      pdfEngineUsed: "pdf_lib_direct",
      format: "pdf",
    };
  } else {
    // DOCX Template Pipeline
    const docxFileName = `${documentId}.docx`;
    const pdfFileName = `${documentId}.pdf`;
    const docxFullPath = path.join(generatedDir, docxFileName);
    const pdfFullPath = path.join(generatedDir, pdfFileName);

    const docxBuffer = await fillDocxTemplate(template.fileUrl, template, fieldValues);
    fs.writeFileSync(docxFullPath, docxBuffer);

    let pdfEngineUsed: "libreoffice" | "institutional_pdfkit" = "institutional_pdfkit";
    const libreResult = await tryLibreOfficeConversion(docxFullPath, generatedDir);

    if (libreResult && fs.existsSync(libreResult)) {
      pdfEngineUsed = "libreoffice";
      if (libreResult !== pdfFullPath) {
        fs.copyFileSync(libreResult, pdfFullPath);
      }
    } else {
      await generatePdfFromFilledDocx(
        docxBuffer,
        pdfFullPath,
        `${template.name} - ${fieldValues.eventName || "Official Document"}`,
        club
      );
      pdfEngineUsed = "institutional_pdfkit";
    }

    if (!fs.existsSync(docxFullPath) || !fs.existsSync(pdfFullPath)) {
      throw new Error(`Generated files verification failed for ${documentId}`);
    }

    return {
      docxPath: docxFullPath,
      pdfPath: pdfFullPath,
      docxUrl: `/generated/${docxFileName}`,
      pdfUrl: `/generated/${pdfFileName}`,
      pdfEngineUsed,
      format: "docx",
    };
  }
}
