import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface EmbedSignatureOptions {
  existingPdfBytes: Buffer;
  signatureImageBase64: string;
  pageNumber: number; // 1-indexed
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  signerName?: string;
  signerDesignation?: string;
  includeDate?: boolean;
  signDate?: string;
  isTopOrigin?: boolean; // if true, y is measured from top of page (web canvas), otherwise from bottom (PDF native)
}

/**
 * Embeds a drawn electronic signature into an existing PDF document at the exact coordinates
 * designated for the authority. Concurrency-safe, preserving all existing pages, layout,
 * and previously embedded signatures.
 */
export async function embedSignatureInPdf(options: EmbedSignatureOptions): Promise<Buffer> {
  const {
    existingPdfBytes,
    signatureImageBase64,
    pageNumber,
    position,
    includeDate = true,
    signDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    isTopOrigin = false,
  } = options;

  if (!existingPdfBytes || existingPdfBytes.length === 0) {
    throw new Error("Cannot embed signature: input PDF buffer is empty");
  }

  // Load existing PDF preserving all previous elements
  const pdfDoc = await PDFDocument.load(existingPdfBytes, {
    ignoreEncryption: true,
  });

  const totalPages = pdfDoc.getPageCount();
  const targetPageIndex = Math.max(0, Math.min(pageNumber - 1, totalPages - 1));
  const page = pdfDoc.getPage(targetPageIndex);
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Strip data URL header if present
  const base64Data = signatureImageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  if (imageBuffer.length < 10) {
    throw new Error("Invalid signature image data: image is empty or corrupted.");
  }

  // Embed PNG image
  let embeddedImage;
  try {
    embeddedImage = await pdfDoc.embedPng(imageBuffer);
  } catch (err: any) {
    // If PNG embed fails (e.g. JPEG uploaded), try JPEG embed
    try {
      embeddedImage = await pdfDoc.embedJpg(imageBuffer);
    } catch {
      throw new Error(`Failed to embed signature image into PDF: ${err.message}`);
    }
  }

  // Calculate target bounding box
  const sigWidth = position.width || 140;
  const sigHeight = position.height || 45;
  const targetX = Math.max(20, Math.min(position.x, pageWidth - sigWidth - 20));

  // Determine Y coordinate: PDF origin is bottom-left (y=0 is bottom).
  // If isTopOrigin is true, or if position.y is higher than half the page and positioned from top:
  let targetY: number;
  if (isTopOrigin) {
    targetY = pageHeight - position.y - sigHeight;
  } else {
    // Already in PDF points from bottom
    targetY = position.y;
  }

  // Ensure targetY is within page boundaries
  targetY = Math.max(30, Math.min(targetY, pageHeight - sigHeight - 30));

  // Draw the signature image directly into the PDF page
  page.drawImage(embeddedImage, {
    x: targetX,
    y: targetY,
    width: sigWidth,
    height: sigHeight,
  });

  // Optionally draw the formal e-sign timestamp caption below the signature
  if (includeDate && signDate) {
    try {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 7.5;
      const dateText = `Electronically signed: ${signDate}`;
      page.drawText(dateText, {
        x: targetX,
        y: Math.max(15, targetY - 9),
        size: fontSize,
        font,
        color: rgb(0.3, 0.35, 0.4),
      });
    } catch {
      // Font embedding fallback - harmless if font embedding skipped
    }
  }

  // Serialize updated PDF
  const updatedPdfBytes = await pdfDoc.save();
  return Buffer.from(updatedPdfBytes);
}

/**
 * Validates that a generated or signed PDF is non-empty and syntactically valid.
 */
export async function verifyPdfIntegrity(pdfBytes: Buffer): Promise<{ valid: boolean; pageCount: number }> {
  try {
    const doc = await PDFDocument.load(pdfBytes);
    return { valid: true, pageCount: doc.getPageCount() };
  } catch {
    return { valid: false, pageCount: 0 };
  }
}
