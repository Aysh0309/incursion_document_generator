import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import { TemplateField, DetectedAsset, FieldDataType } from "@/types";

export interface AnalysisResult {
  format: "docx" | "pdf";
  pageCount: number;
  pageDimensions: Array<{ width: number; height: number }>;
  fields: TemplateField[];
  detectedAssets: DetectedAsset[];
  warnings: string[];
  fullText: string;
}

/**
 * Normalizes a field label into a clean stable identifier key.
 * e.g. "Event Name:" -> "eventName", "Budget (INR)" -> "budget"
 */
export function normalizeFieldKey(label: string): string {
  let cleaned = label
    .trim()
    .replace(/[:_–—\(\)\[\]]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  // Common synonyms mapping
  const lower = cleaned.toLowerCase();
  if (lower === "event name" || lower === "event title" || lower === "name of event" || lower === "title") return "eventName";
  if (lower === "date" || lower === "event date" || lower === "date of event" || lower === "start date") return "startDate";
  if (lower === "end date") return "endDate";
  if (lower === "time" || lower === "start time" || lower === "timings") return "startTime";
  if (lower === "end time") return "endTime";
  if (lower === "venue" || lower === "location" || lower === "place" || lower === "room" || lower === "lab") return "venue";
  if (lower === "department" || lower === "dept") return "department";
  if (lower === "hod" || lower === "head of department" || lower === "department hod") return "departmentHOD";
  if (lower === "faculty coordinator" || lower === "coordinator" || lower === "faculty advisor") return "facultyCoordinator";
  if (lower === "organizer" || lower === "organizer name" || lower === "student lead" || lower === "lead") return "organizerName";
  if (lower === "budget" || lower === "budget requested" || lower === "estimated budget" || lower === "amount") return "budgetRequested";
  if (lower === "participants" || lower === "expected participants" || lower === "attendees" || lower === "student attendance") return "expectedParticipants";
  if (lower === "description" || lower === "event description" || lower === "objectives" || lower === "synopsis") return "eventDescription";
  if (lower === "target audience" || lower === "audience") return "targetAudience";
  if (lower === "speaker" || lower === "guest" || lower === "resource person" || lower === "speaker name") return "speakerName";
  if (lower === "speaker designation" || lower === "designation") return "speakerDesignation";
  if (lower === "speaker organization" || lower === "organization") return "speakerOrganization";
  if (lower === "contact email" || lower === "email") return "contactEmail";
  if (lower === "contact phone" || lower === "phone" || lower === "mobile") return "contactPhone";
  if (lower === "club" || lower === "club name" || lower === "student body") return "clubName";

  // Convert to camelCase
  const parts = cleaned.split(/[\s_-]+/);
  if (parts.length === 0) return "field_" + Math.random().toString(36).substring(2, 7);
  return (
    parts[0].toLowerCase() +
    parts
      .slice(1)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join("")
  );
}

/**
 * Infers data type from field key and label.
 */
export function inferFieldType(key: string, label: string): FieldDataType {
  const combined = (key + " " + label).toLowerCase();
  if (combined.includes("date")) return "date";
  if (combined.includes("time")) return "time";
  if (combined.includes("budget") || combined.includes("amount") || combined.includes("cost") || combined.includes("fee") || combined.includes("inr")) return "currency";
  if (combined.includes("participant") || combined.includes("count") || combined.includes("attendee") || combined.includes("number")) return "number";
  if (combined.includes("email") || combined.includes("mail")) return "email";
  if (combined.includes("phone") || combined.includes("mobile") || combined.includes("contact")) return "phone";
  if (combined.includes("description") || combined.includes("objective") || combined.includes("synopsis") || combined.includes("overview")) return "textarea";
  return "text";
}

/**
 * Checks if a field should default to required.
 */
export function isLikelyRequired(key: string, label: string): boolean {
  const combined = (key + " " + label).toLowerCase();
  const essentialPatterns = ["name", "title", "date", "venue", "coordinator", "hod", "organizer", "participants", "budget"];
  return essentialPatterns.some((pat) => combined.includes(pat));
}

/**
 * Analyzes a DOCX document buffer:
 * - Scans document.xml, headers, and footers
 * - Handles placeholders split across multiple Word runs
 * - Detects explicit {{placeholder}} and {placeholder}
 * - Detects labeled blank lines (e.g. "Event Name: _________________")
 * - Inspects table cells
 * - Detects embedded media assets (logos, images in word/media/)
 */
export async function analyzeDocxTemplate(buffer: Buffer): Promise<AnalysisResult> {
  const zip = new PizZip(buffer);
  const fieldsMap = new Map<string, TemplateField>();
  const detectedAssets: DetectedAsset[] = [];
  const warnings: string[] = [];
  let fullText = "";

  // 1. Detect embedded image and logo assets in word/media/
  const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith("word/media/"));
  mediaFiles.forEach((mediaPath, idx) => {
    const ext = mediaPath.split(".").pop() || "png";
    const fileData = zip.file(mediaPath);
    let dataUrl: string | undefined = undefined;
    if (fileData) {
      try {
        const b64 = Buffer.from(fileData.asBinary(), "binary").toString("base64");
        dataUrl = `data:image/${ext};base64,${b64}`;
      } catch {
        // ignore data url generation if binary fails
      }
    }

    detectedAssets.push({
      id: `asset_${idx + 1}`,
      type: mediaPath.toLowerCase().includes("logo") ? "logo" : "image",
      name: mediaPath.split("/").pop(),
      description: `Embedded media asset found at ${mediaPath}`,
      dataUrl,
    });
  });

  // 2. Identify all XML text parts: document.xml, header*.xml, footer*.xml
  const xmlParts = Object.keys(zip.files).filter((name) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(name)
  );

  for (const partName of xmlParts) {
    const xmlContent = zip.file(partName)?.asText() || "";
    const isHeaderOrFooter = partName.includes("header") || partName.includes("footer");

    // Extract text paragraph by paragraph to properly join runs (<w:t>)
    const paragraphRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let pMatch;

    while ((pMatch = paragraphRegex.exec(xmlContent)) !== null) {
      const pXml = pMatch[1];

      // Extract all text content from <w:t> tags in this paragraph
      const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let tMatch;
      let pText = "";
      while ((tMatch = tRegex.exec(pXml)) !== null) {
        if (tMatch[1]) pText += tMatch[1];
      }

      if (!pText.trim()) continue;
      fullText += pText + "\n";

      // A. Explicit placeholders: {{field_name}} or {field_name}
      const tagRegex = /(?:\{\{([a-zA-Z0-9_\.]+)\}\}|\{([a-zA-Z0-9_\.]+)\})/g;
      let match;
      while ((match = tagRegex.exec(pText)) !== null) {
        const rawKey = match[1] || match[2];
        if (!rawKey) continue;
        const normalizedKey = normalizeFieldKey(rawKey);

        if (fieldsMap.has(normalizedKey)) {
          // Repeated field occurrence
          const existing = fieldsMap.get(normalizedKey)!;
          if (!existing.repeatedFieldKeys?.includes(rawKey)) {
            existing.repeatedFieldKeys = existing.repeatedFieldKeys || [];
            existing.repeatedFieldKeys.push(rawKey);
          }
        } else {
          const label = rawKey
            .replace(/([A-Z])/g, " $1")
            .replace(/[_\.]/g, " ")
            .trim()
            .replace(/^\w/, (c) => c.toUpperCase());

          fieldsMap.set(normalizedKey, {
            id: `fld_${normalizedKey}`,
            name: normalizedKey,
            label,
            type: inferFieldType(normalizedKey, label),
            required: isLikelyRequired(normalizedKey, label),
            confidence: 0.98,
            adminConfirmed: true,
            sourceEvidence: `Explicit placeholder {${rawKey}} in ${partName}`,
            repeatedFieldKeys: [rawKey],
          });
        }
      }

      // B. Labeled blanks / underlines (e.g. "Event Name: _________________")
      const labelBlankRegex = /([A-Za-z0-9\s/&()-]{2,35}):\s*(?:_{2,}|\.{3,}|—+|–+|\[\s*\])/g;
      let lbMatch;
      while ((lbMatch = labelBlankRegex.exec(pText)) !== null) {
        const rawLabel = lbMatch[1].trim();
        const normalizedKey = normalizeFieldKey(rawLabel);

        if (!fieldsMap.has(normalizedKey)) {
          fieldsMap.set(normalizedKey, {
            id: `fld_${normalizedKey}`,
            name: normalizedKey,
            label: rawLabel,
            type: inferFieldType(normalizedKey, rawLabel),
            required: isLikelyRequired(normalizedKey, rawLabel),
            confidence: 0.85,
            adminConfirmed: false,
            sourceEvidence: `Labeled blank "${lbMatch[0].trim()}" in ${partName}`,
            repeatedFieldKeys: [rawLabel],
          });
        }
      }
    }

    // C. Inspect table rows: label cell followed by empty or blank cell
    const rowRegex = /<w:tr(?:\s+[^>]*)?>([\s\S]*?)<\/w:tr>/g;
    let rMatch;
    while ((rMatch = rowRegex.exec(xmlContent)) !== null) {
      const rXml = rMatch[1];
      const cellRegex = /<w:tc(?:\s+[^>]*)?>([\s\S]*?)<\/w:tc>/g;
      const cells: string[] = [];
      let cMatch;
      while ((cMatch = cellRegex.exec(rXml)) !== null) {
        const tInCell = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
        let cText = "";
        let tcMatch;
        while ((tcMatch = tInCell.exec(cMatch[1])) !== null) {
          if (tcMatch[1]) cText += tcMatch[1];
        }
        cells.push(cText.trim());
      }

      if (cells.length >= 2) {
        const labelCandidate = cells[0].replace(/:$/, "").trim();
        const valueCandidate = cells[1].trim();
        // If first cell looks like a label and second is empty, underscores, or placeholder
        if (
          labelCandidate.length > 2 &&
          labelCandidate.length < 35 &&
          /^[A-Za-z0-9\s/&()-]+$/.test(labelCandidate) &&
          (valueCandidate === "" || /^_{2,}$/.test(valueCandidate) || /^\{.*\}$/.test(valueCandidate))
        ) {
          const normalizedKey = normalizeFieldKey(labelCandidate);
          if (!fieldsMap.has(normalizedKey)) {
            fieldsMap.set(normalizedKey, {
              id: `fld_${normalizedKey}`,
              name: normalizedKey,
              label: labelCandidate,
              type: inferFieldType(normalizedKey, labelCandidate),
              required: isLikelyRequired(normalizedKey, labelCandidate),
              confidence: 0.82,
              adminConfirmed: false,
              sourceEvidence: `Table label cell "${labelCandidate}" with empty value cell`,
              repeatedFieldKeys: [labelCandidate],
            });
          }
        }
      }
    }
  }

  const fields = Array.from(fieldsMap.values());
  if (fields.length === 0) {
    warnings.push("No explicit placeholders or labeled blanks detected. You can add required fields manually.");
  }

  return {
    format: "docx",
    pageCount: 1, // Word page count is dynamic
    pageDimensions: [{ width: 595.28, height: 841.89 }], // A4 standard
    fields,
    detectedAssets,
    warnings,
    fullText,
  };
}

/**
 * Analyzes a PDF document buffer:
 * - Reads page dimensions and count using pdf-lib
 * - Detects AcroForm fillable fields
 * - Extracts text blocks with bounding boxes and coordinates using pdfjs-dist
 * - Detects explicit placeholders and labeled blanks
 * - Discovers embedded logos and image assets
 * - Warns if scanned or unselectable
 */
export async function analyzePdfTemplate(buffer: Buffer): Promise<AnalysisResult> {
  const fieldsMap = new Map<string, TemplateField>();
  const detectedAssets: DetectedAsset[] = [];
  const warnings: string[] = [];
  const pageDimensions: Array<{ width: number; height: number }> = [];
  let fullText = "";

  // 1. Inspect using pdf-lib for page geometry, AcroForms, and embedded images
  let pdfDoc: any;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err: any) {
    throw new Error(`Failed to load PDF structure: ${err.message}`);
  }

  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    pageDimensions.push({ width, height });
  }

  // Check AcroForm fields
  try {
    const form = pdfDoc.getForm();
    const acroFields = form.getFields();
    acroFields.forEach((af: any, idx: number) => {
      const fieldName = af.getName();
      const normalizedKey = normalizeFieldKey(fieldName);
      const label = fieldName
        .replace(/([A-Z])/g, " $1")
        .replace(/[_\.]/g, " ")
        .trim()
        .replace(/^\w/, (c: string) => c.toUpperCase());

      // Attempt to retrieve widget coordinates if available
      let boundingBox: any = undefined;
      let pageNumber = 1;
      try {
        const widgets = af.acroField?.getWidgets?.();
        if (widgets && widgets.length > 0) {
          const rect = widgets[0].getRectangle();
          boundingBox = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          };
        }
      } catch {
        // widget bounds unavailable, fallback to form field name
      }

      fieldsMap.set(normalizedKey, {
        id: `fld_${normalizedKey}`,
        name: normalizedKey,
        label,
        type: inferFieldType(normalizedKey, label),
        required: isLikelyRequired(normalizedKey, label),
        pageNumber,
        boundingBox,
        formFieldName: fieldName,
        confidence: 0.99,
        adminConfirmed: true,
        sourceEvidence: `AcroForm interactive PDF field: "${fieldName}"`,
        repeatedFieldKeys: [fieldName],
      });
    });
  } catch {
    // PDF has no AcroForm, proceed to text and visual extraction
  }

  // 2. Extract positional text with coordinates using pdfjs-dist
  try {
    // Dynamic import legacy build of pdfjs-dist to safely run in Node environment
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const doc = await loadingTask.promise;

    let totalTextItemsCount = 0;

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<any>;
      totalTextItemsCount += items.length;

      // Group text items by roughly equal Y position to reconstruct lines
      const lineMap = new Map<number, Array<any>>();
      for (const item of items) {
        if (!item.str) continue;
        fullText += item.str + " ";
        // item.transform: [scaleX, skewY, skewX, scaleY, tx, ty]
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push(item);
      }
      fullText += "\n";

      // Process reconstructed lines
      lineMap.forEach((lineItems, y) => {
        // Sort items in line by X coordinate
        lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = lineItems.map((it) => it.str).join(" ");
        const firstItem = lineItems[0];
        const lastItem = lineItems[lineItems.length - 1];
        const lineX = firstItem.transform[4];
        const lineWidth = lastItem.transform[4] + (lastItem.width || 0) - lineX;
        const lineHeight = Math.max(12, firstItem.height || 12);

        // A. Check for explicit {{tag}} or {tag} in line
        const tagRegex = /(?:\{\{([a-zA-Z0-9_\.]+)\}\}|\{([a-zA-Z0-9_\.]+)\})/g;
        let match;
        while ((match = tagRegex.exec(lineText)) !== null) {
          const rawKey = match[1] || match[2];
          if (!rawKey) continue;
          const normalizedKey = normalizeFieldKey(rawKey);

          if (!fieldsMap.has(normalizedKey)) {
            const label = rawKey
              .replace(/([A-Z])/g, " $1")
              .replace(/[_\.]/g, " ")
              .trim()
              .replace(/^\w/, (c) => c.toUpperCase());

            fieldsMap.set(normalizedKey, {
              id: `fld_${normalizedKey}`,
              name: normalizedKey,
              label,
              type: inferFieldType(normalizedKey, label),
              required: isLikelyRequired(normalizedKey, label),
              pageNumber: pageNum,
              boundingBox: {
                x: Math.round(lineX),
                y: Math.round(y),
                width: Math.max(120, Math.round(lineWidth)),
                height: Math.round(lineHeight),
              },
              confidence: 0.95,
              adminConfirmed: true,
              sourceEvidence: `Placeholder {${rawKey}} at page ${pageNum} (x:${Math.round(lineX)}, y:${Math.round(y)})`,
              repeatedFieldKeys: [rawKey],
            });
          }
        }

        // B. Check for labeled blanks: e.g. "Event Title: ________________" or "Date: ___________"
        const labelBlankRegex = /([A-Za-z0-9\s/&()-]{2,35}):\s*(?:_{2,}|\.{3,}|—+|–+|\[\s*\])/g;
        let lbMatch;
        while ((lbMatch = labelBlankRegex.exec(lineText)) !== null) {
          const rawLabel = lbMatch[1].trim();
          const normalizedKey = normalizeFieldKey(rawLabel);

          if (!fieldsMap.has(normalizedKey)) {
            fieldsMap.set(normalizedKey, {
              id: `fld_${normalizedKey}`,
              name: normalizedKey,
              label: rawLabel,
              type: inferFieldType(normalizedKey, rawLabel),
              required: isLikelyRequired(normalizedKey, rawLabel),
              pageNumber: pageNum,
              boundingBox: {
                x: Math.round(lineX + 100),
                y: Math.round(y),
                width: Math.max(160, Math.round(lineWidth)),
                height: Math.round(lineHeight),
              },
              confidence: 0.88,
              adminConfirmed: false,
              sourceEvidence: `Labeled blank "${lbMatch[0].trim()}" at page ${pageNum} (y:${Math.round(y)})`,
              repeatedFieldKeys: [rawLabel],
            });
          }
        }
      });
    }

    if (totalTextItemsCount < 10) {
      warnings.push(
        "Low selectable text detected. This document may be a scanned or flattened PDF. Visual coordinates will require administrator review."
      );
    }
  } catch (err: any) {
    warnings.push(`Text coordinate extraction warning: ${err.message}`);
  }

  // 3. Embedded graphics / logo count
  try {
    const rawPdfStr = buffer.toString("binary");
    const imageCount = (rawPdfStr.match(/\/Subtype\s*\/Image/g) || []).length;
    for (let i = 0; i < imageCount; i++) {
      detectedAssets.push({
        id: `pdf_asset_${i + 1}`,
        type: i === 0 ? "logo" : "image",
        description: `Preserved PDF vector / raster image asset #${i + 1}`,
      });
    }
  } catch {
    // image scan optional
  }

  const fields = Array.from(fieldsMap.values());
  if (fields.length === 0) {
    warnings.push("No automatic fields could be recognized. Please use the template editor to place variable fields.");
  }

  return {
    format: "pdf",
    pageCount,
    pageDimensions,
    fields,
    detectedAssets,
    warnings,
    fullText,
  };
}

/**
 * Main unified analyzer for both PDF and DOCX templates.
 */
export async function analyzeUploadedTemplate(
  buffer: Buffer,
  fileName: string
): Promise<AnalysisResult> {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    return analyzePdfTemplate(buffer);
  } else if (ext === "docx") {
    return analyzeDocxTemplate(buffer);
  } else {
    throw new Error(`Unsupported template file type '.${ext}'. Please upload a valid .docx or .pdf template.`);
  }
}
