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
import mammoth from "mammoth";

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
        const newValStr = String(replacementVal).trim();
        if (newValStr !== "") {
          const valTc = tcs[valIdx];
          
          // Find or reuse existing paragraph to avoid inserting extra blank lines above the value
          const existingPs = valTc.getElementsByTagName("w:p");
          let targetP: any;
          if (existingPs.length > 0) {
            targetP = existingPs[0];
            // Remove any trailing extra paragraphs inside this cell that create unwanted blank lines
            for (let pIdx = existingPs.length - 1; pIdx >= 1; pIdx--) {
              valTc.removeChild(existingPs[pIdx]);
            }
          } else {
            targetP = doc.createElement("w:p");
            valTc.appendChild(targetP);
          }

          // Clear any old runs from targetP
          const existingRuns = targetP.getElementsByTagName("w:r");
          for (let rIdx = existingRuns.length - 1; rIdx >= 0; rIdx--) {
            targetP.removeChild(existingRuns[rIdx]);
          }

          // Create formatted run, inheriting font family and size from label cell
          const r = doc.createElement("w:r");
          const labelTc = tcs[0];
          const labelRPr = labelTc.getElementsByTagName("w:rPr")[0];
          if (labelRPr) {
            const rPr = doc.createElement("w:rPr");
            const sz = labelRPr.getElementsByTagName("w:sz")[0];
            if (sz) rPr.appendChild(sz.cloneNode(true));
            const szCs = labelRPr.getElementsByTagName("w:szCs")[0];
            if (szCs) rPr.appendChild(szCs.cloneNode(true));
            const rFonts = labelRPr.getElementsByTagName("w:rFonts")[0];
            if (rFonts) rPr.appendChild(rFonts.cloneNode(true));
            r.appendChild(rPr);
          }

          const t = doc.createElement("w:t");
          t.textContent = newValStr;
          r.appendChild(t);
          targetP.appendChild(r);
          modified = true;
        }
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

          const valStr = String(val).trim();
          if (valStr === "") continue;

          // Replace pattern like "Label: _____" or "Label: [   ]" or "Label: ...."
          // Note: Only match actual blank placeholders; NEVER match static headings ending with colons alone!
          const escapedLabel = f.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const labelPattern = new RegExp(
            `(${escapedLabel}):\\s*(_{2,}|\\.{3,}|—+|–+|\\[\\s*\\])`,
            "i"
          );
          if (labelPattern.test(pText)) {
            const replaced = pText.replace(labelPattern, `$1: ${valStr}`);
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
 * Searches for any available LibreOffice binary across system paths.
 */
async function tryLibreOfficeConversion(docxPath: string, outputDir: string): Promise<string | null> {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    "soffice",
    "libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/opt/homebrew/bin/soffice",
    "/usr/local/bin/soffice",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
  ].filter(Boolean) as string[];

  for (const customPath of candidates) {
    try {
      const cmd = `"${customPath}" --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;
      await execAsync(cmd, { timeout: 10000 });

      const baseName = path.basename(docxPath, path.extname(docxPath));
      const generatedPdfPath = path.join(outputDir, `${baseName}.pdf`);

      if (fs.existsSync(generatedPdfPath) && fs.statSync(generatedPdfPath).size > 1000) {
        return generatedPdfPath;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * Detects any available Chromium / Chrome / Brave / Edge browser binary.
 */
function findHeadlessBrowserBinary(): string | null {
  const custom = process.env.CHROME_BIN || process.env.BROWSER_PATH;
  if (custom && fs.existsSync(custom)) return custom;

  const candidatePaths = [
    // macOS paths
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    // Linux / container paths
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave-browser",
    "/snap/bin/chromium",
  ];

  for (const binPath of candidatePaths) {
    if (fs.existsSync(/* turbopackIgnore: true */ binPath)) {
      return binPath;
    }
  }

  return null;
}

/**
 * High-fidelity Vectorized PDF Generator using Mammoth and Headless Chromium/Brave/Edge.
 * Preserves 100% of original template tables, embedded logos, headers, spacing, and structure.
 */
async function convertDocxToPdfViaBrowser(
  docxBuffer: Buffer,
  outputPdfPath: string,
  browserBinary: string
): Promise<boolean> {
  try {
    const zip = new PizZip(docxBuffer);
    const DOMParser = require("@xmldom/xmldom").DOMParser;

    // 1. Extract embedded media (logos, banners, stamps)
    const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith("word/media/"));
    const mediaMap: Record<string, string> = {};
    for (const m of mediaFiles) {
      const ext = m.split(".").pop()?.toLowerCase();
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      mediaMap[m] = `data:${mime};base64,` + zip.file(m)?.asNodeBuffer().toString("base64");
    }

    // Identify standard institutional branding images if present
    const crestImg = mediaMap["word/media/image1.jpeg"] || mediaMap[mediaFiles.find((f) => /image\d*\.(jpe?g|png)/i.test(f)) || ""] || "";
    const bannerImg = mediaMap["word/media/image2.png"] || "";
    const badgeImg = mediaMap["word/media/image1.png"] || "";

    // 2. Extract table column widths from word/document.xml to preserve exact column alignment
    const tableColgroups: string[] = [];
    const docXmlStr = zip.file("word/document.xml")?.asText();
    if (docXmlStr) {
      try {
        const xmlDoc = new DOMParser().parseFromString(docXmlStr, "application/xml");
        const tbls = xmlDoc.getElementsByTagName("w:tbl");
        for (let t = 0; t < tbls.length; t++) {
          const grid = tbls[t].getElementsByTagName("w:tblGrid")[0];
          if (grid) {
            const cols = Array.from(grid.getElementsByTagName("w:gridCol")).map(
              (c: any) => Number(c.getAttribute("w:w")) || 1000
            );
            const total = cols.reduce((a: number, b: number) => a + b, 0);
            const colHtml = cols
              .map((c: number) => `<col style="width: ${((c / total) * 100).toFixed(2)}%">`)
              .join("");
            tableColgroups.push(`<colgroup>${colHtml}</colgroup>`);
          } else {
            tableColgroups.push("");
          }
        }
      } catch {
        // Fallback to auto widths
      }
    }

    const conversion = await mammoth.convertToHtml({ buffer: docxBuffer });
    let bodyContent = conversion.value;

    // 3. Remove raw sequentially dumped header images and orphan watermark paragraphs
    bodyContent = bodyContent.replace(/<img[^>]*>\s*<img[^>]*>\s*<img[^>]*>/, "");
    bodyContent = bodyContent.replace(/<p><strong>SVNIT<\/strong><\/p>/, "");

    // 4. Inject exact colgroups into tables
    let tblIdx = 0;
    bodyContent = bodyContent.replace(/<table>/g, () => {
      const cg = tableColgroups[tblIdx] || "";
      tblIdx++;
      return `<table>${cg}`;
    });

    // 5. Align Table 0 Row 0 ("Subject") with rows 1-4 so all colons align vertically
    bodyContent = bodyContent.replace(
      /<td><p><strong>Subject<\/strong><\/p><\/td><td><p><strong>:<\/strong><\/p><\/td><td colspan="3"><p>(.*?)<\/p><\/td>/,
      '<td colspan="3"><p><strong>Subject</strong></p></td><td><p><strong>:</strong></p></td><td><p>$1</p></td>'
    );

    // 6. Format No / Date letterhead line
    bodyContent = bodyContent.replace(/<p>No[\s\S]*?Date[\s\S]*?<\/p>/, (match) => {
      const noMatch = match.match(/ACM\/[^\s<]+|[A-Z0-9\/-]{5,}/);
      const dateMatch = match.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
      const noVal = noMatch ? noMatch[0] : "";
      const dateVal = dateMatch ? dateMatch[0] : "";
      return `
        <div class="doc-row-2">
          <span><strong>No:</strong> ${noVal}</span>
          <span><strong>Date:</strong> ${dateVal}</span>
        </div>
      `;
    });

    // 7. Format signatures & approval blocks into properly aligned flex rows
    bodyContent = bodyContent.replace(
      /<p>Signature of Student Head\s*Signature of Student Secretary<\/p>/,
      `
        <div class="sig-block-2">
          <span>Signature of Student Head</span>
          <span>Signature of Student Secretary</span>
        </div>
      `
    );
    bodyContent = bodyContent.replace(
      /<p>Signature of Faculty Co-Chairman<\/p>\s*<p>Signature of Faculty Chairman<\/p>/,
      `
        <div class="sig-block-2">
          <span>Signature of Faculty Co-Chairman</span>
          <span>Signature of Faculty Chairman</span>
        </div>
      `
    );
    bodyContent = bodyContent.replace(
      /<p>Recommended\/Not Recommended\s*Recommended\/Not Recommended\s*Approved\/Not Approved<\/p>/,
      `
        <div class="sig-block-3">
          <span>Recommended / Not Recommended</span>
          <span>Recommended / Not Recommended</span>
          <span>Approved / Not Approved</span>
        </div>
      `
    );
    bodyContent = bodyContent.replace(
      /<p><strong>Chairman, F&amp; SW\s*Associate Dean\(SW\)\s*Dean \(Students Welfare\)<\/strong><\/p>/,
      `
        <div class="sig-block-3 sig-title">
          <span>Chairman, F&amp; SW</span>
          <span>Associate Dean (SW)</span>
          <span>Dean (Students Welfare)</span>
        </div>
      `
    );

    // Also handle any other tabbed paragraphs in the document
    bodyContent = bodyContent.replace(/<p>(.*?)\t(.*?)\t(.*?)<\/p>/g, (_m, c1, c2, c3) => {
      return `<div class="doc-row-3"><span>${c1.trim()}</span><span>${c2.trim()}</span><span>${c3.trim()}</span></div>`;
    });
    bodyContent = bodyContent.replace(/<p>(.*?)\t(.*?)<\/p>/g, (_m, c1, c2) => {
      return `<div class="doc-row-2"><span>${c1.trim()}</span><span>${c2.trim()}</span></div>`;
    });

    // 8. Construct structured Institutional Header if images exist
    let headerHtml = "";
    if (crestImg && bannerImg) {
      headerHtml = `
        <div class="institutional-letterhead">
          <div class="logo-left"><img src="${crestImg}" alt="Institute Crest" /></div>
          <div class="title-center"><img src="${bannerImg}" alt="Institute Title Banner" /></div>
          ${badgeImg ? `<div class="badge-right"><img src="${badgeImg}" alt="Chapter Logo" /></div>` : ""}
        </div>
        <hr class="header-divider" />
      `;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 12mm 15mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    font-family: "Times New Roman", Times, Georgia, "Liberation Serif", serif;
    font-size: 10.5pt;
    line-height: 1.3;
    color: #000;
    margin: 0;
    padding: 0;
  }
  .institutional-letterhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    margin-bottom: 2px;
  }
  .logo-left img {
    width: 58px;
    height: 58px;
    object-fit: contain;
  }
  .title-center {
    flex: 1;
    text-align: center;
  }
  .title-center img {
    max-width: 100%;
    max-height: 54px;
    object-fit: contain;
  }
  .badge-right img {
    width: 48px;
    height: 28px;
    object-fit: contain;
  }
  .header-divider {
    border: none;
    border-top: 1.8px solid #000;
    margin: 3px 0 8px 0;
  }
  .doc-row-2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 4px 0 6px 0;
    font-size: 10pt;
  }
  .sig-block-2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 16px 20px 8px 20px;
    font-size: 9.5pt;
    font-weight: 600;
  }
  .sig-block-3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 12px 10px 4px 10px;
    font-size: 9.5pt;
  }
  .sig-block-3.sig-title {
    margin-top: 20px;
    font-weight: bold;
  }
  .sig-block-3 > span, .sig-block-2 > span {
    flex: 1;
    text-align: center;
  }
  .sig-block-2 > span:first-child {
    text-align: left;
  }
  .sig-block-2 > span:last-child {
    text-align: right;
  }
  .sig-block-3 > span:first-child {
    text-align: left;
  }
  .sig-block-3 > span:last-child {
    text-align: right;
  }
  h1, h2, h3 {
    font-size: 10.5pt;
    font-weight: bold;
    text-align: left;
    margin: 6px 0 4px 0;
    text-decoration: underline;
  }
  p {
    margin: 3px 0;
    line-height: 1.3;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0 6px 0;
    table-layout: fixed;
    page-break-inside: avoid;
  }
  table, th, td {
    border: 1px solid #000;
  }
  th, td {
    padding: 3.5px 6px;
    vertical-align: middle;
    font-size: 9.5pt;
    line-height: 1.25;
  }
  td[colspan="3"], td[colspan="5"] {
    background-color: #CED7E7;
    font-weight: bold;
    padding: 4px 6px;
    font-size: 10pt;
  }
  strong {
    font-weight: bold;
  }
  img {
    max-width: 100%;
    height: auto;
  }
</style>
</head>
<body>
  ${headerHtml}
  ${bodyContent}
</body>
</html>`;

    const tempDir = path.dirname(outputPdfPath);
    const tempHtmlPath = path.join(
      tempDir,
      `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.html`
    );
    fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");

    try {
      const cmd = `"${browserBinary}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "${tempHtmlPath}"`;
      await execAsync(cmd, { timeout: 15000 });
      return fs.existsSync(outputPdfPath) && fs.statSync(outputPdfPath).size > 1000;
    } finally {
      if (fs.existsSync(tempHtmlPath)) {
        try {
          fs.unlinkSync(tempHtmlPath);
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Headless browser PDF conversion note:", err);
    return false;
  }
}

/**
 * Robust fallback PDF Generator for DOCX templates:
 * Extracts original media (logos/stamps) from word/media/* and embeds them directly.
 * Parses document paragraphs and renders with clean margins without injecting artificial headers.
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

    // 1. Extract embedded images (logos, stamps) from word/media/
    const mediaFiles = Object.keys(zip.files).filter((name) =>
      /^word\/media\/image\d+\.(png|jpe?g)$/i.test(name)
    );

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
      if (pText.trim()) {
        paragraphs.push(pText.trim());
      }
    }

    const doc = new PDFKitDocument({
      size: "A4",
      margins: { top: 44, bottom: 44, left: 50, right: 50 },
      info: {
        Title: docTitle,
        Author: club.name,
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Embed primary logo if present in template
    if (mediaFiles.length > 0) {
      try {
        const firstImgBuf = zip.file(mediaFiles[0])?.asNodeBuffer();
        if (firstImgBuf) {
          doc.image(firstImgBuf, {
            fit: [140, 70],
            align: "center",
          });
          doc.moveDown(0.5);
        }
      } catch {
        // Logo embed optional
      }
    }

    const darkText = "#111827";

    // Render paragraphs from the original DOCX
    for (const para of paragraphs) {
      if (!para) {
        doc.moveDown(0.3);
        continue;
      }

      if (/^[0-9]+\.\s+[A-Z\s&]+$/.test(para) || /^[A-Z\s]{4,}$/.test(para)) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10.5)
          .fillColor(darkText)
          .text(para)
          .moveDown(0.3);
      } else if (para.startsWith("To,") || para.startsWith("Subject:") || para.startsWith("Submitted to")) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(darkText)
          .text(para)
          .moveDown(0.3);
      } else {
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(darkText)
          .text(para, { align: "justify", lineGap: 2.5 })
          .moveDown(0.35);
      }

      if (doc.y > 760) {
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
  pdfEngineUsed: "pdf_lib_direct" | "libreoffice" | "headless_browser" | "institutional_pdfkit";
  format: "docx" | "pdf";
}

/**
 * Main unified document generator:
 * - Validates all required fields
 * - If PDF template: fills the original PDF directly using pdf-lib (100% vector layout preserved)
 * - If DOCX template: fills original DOCX in-place via OpenXML table & blank replacement
 * - Converts DOCX to PDF using LibreOffice or Headless Chromium with Mammoth preserving logos, tables, fonts
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

    let pdfEngineUsed: "libreoffice" | "headless_browser" | "institutional_pdfkit" = "institutional_pdfkit";

    // 1. Try LibreOffice if installed
    const libreResult = await tryLibreOfficeConversion(docxFullPath, generatedDir);
    if (libreResult && fs.existsSync(libreResult)) {
      pdfEngineUsed = "libreoffice";
      if (libreResult !== pdfFullPath) {
        fs.copyFileSync(libreResult, pdfFullPath);
      }
    } else {
      // 2. High-fidelity HTML -> PDF via Headless Chromium / Brave / Edge
      const browserBinary = findHeadlessBrowserBinary();
      let browserSuccess = false;

      if (browserBinary) {
        browserSuccess = await convertDocxToPdfViaBrowser(docxBuffer, pdfFullPath, browserBinary);
        if (browserSuccess) {
          pdfEngineUsed = "headless_browser";
        }
      }

      // 3. Robust PDFKit fallback embedding logos & paragraphs
      if (!browserSuccess) {
        await generatePdfFromFilledDocx(
          docxBuffer,
          pdfFullPath,
          `${template.name} - ${fieldValues.eventName || "Official Document"}`,
          club
        );
        pdfEngineUsed = "institutional_pdfkit";
      }
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
