import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import PDFDocument from "pdfkit";
import { ClubBranding, DocumentType, StructuredEventData } from "@/types";
import { ensureDefaultTemplatesExist } from "./templates";

const execAsync = promisify(exec);

export interface GenerateDocumentOptions {
  documentId: string;
  templateFileUrl: string;
  documentType: DocumentType;
  eventData: StructuredEventData;
  club: ClubBranding;
}

export interface GenerateDocumentResult {
  docxPath: string;
  pdfPath: string;
  docxUrl: string;
  pdfUrl: string;
  pdfEngineUsed: "libreoffice" | "institutional_pdfkit";
}

/**
 * Enriches raw event data into human-friendly string values for template interpolation.
 */
function enrichTemplateContext(data: StructuredEventData, club: ClubBranding) {
  const formattedBudget = data.budgetRequested
    ? `INR ${data.budgetRequested.toLocaleString("en-IN")}/-`
    : "Not Applicable";

  let formattedDateRange = data.startDate || "Date To Be Confirmed";
  if (data.startDate && data.endDate && data.startDate !== data.endDate) {
    formattedDateRange = `${data.startDate} to ${data.endDate}`;
  }

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    ...data,
    clubName: data.clubName || club.name,
    universityName: club.universityName,
    department: club.department,
    contactEmail: data.contactEmail || club.contactEmail,
    contactPhone: data.contactPhone || club.contactPhone,
    facultyCoordinator: data.facultyCoordinator || club.facultyCoordinator.name,
    departmentHOD: data.departmentHOD || "The Head of Department",
    organizerName: data.organizerName || "Student Representative",
    venue: data.venue || "Venue Pending Confirmation",
    formattedBudget,
    formattedDateRange,
    currentDate,
    startTime: data.startTime || "09:00 AM",
    endTime: data.endTime || "05:00 PM",
    expectedParticipants: data.expectedParticipants || 50,
    speakerName: data.speaker?.name || "Distinguished Guest",
    speakerDesignation: data.speaker?.designation || "Resource Person",
    speakerOrganization: data.speaker?.organization || "Industry Partner",
    speakerTopic: data.speaker?.topic || data.eventName || "Technical Presentation",
    requiresLabComputers: data.requiresLabComputers ?? false,
    hasBudgetRequested: (data.budgetRequested ?? 0) > 0,
  };
}

/**
 * Compiles a native DOCX file using Docxtemplater & PizZip.
 */
export async function compileDocx(
  templateRelativePath: string,
  enrichedContext: Record<string, any>
): Promise<Buffer> {
  ensureDefaultTemplatesExist();

  const fullTemplatePath = path.join(process.cwd(), "public", templateRelativePath.replace(/^\//, ""));
  if (!fs.existsSync(fullTemplatePath)) {
    throw new Error(`Template file not found at: ${fullTemplatePath}`);
  }

  const templateContent = fs.readFileSync(fullTemplatePath);
  const zip = new PizZip(templateContent);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });

  doc.render(enrichedContext);

  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return buf;
}

/**
 * Attempts to convert a DOCX to PDF using headless LibreOffice.
 */
async function tryLibreOfficeConversion(docxPath: string, outputDir: string): Promise<string | null> {
  try {
    const customPath = process.env.LIBREOFFICE_PATH || "soffice";
    // Check if executable runs within a 6-second timeout
    const cmd = `${customPath} --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;
    await execAsync(cmd, { timeout: 6000 });

    const baseName = path.basename(docxPath, path.extname(docxPath));
    const generatedPdfPath = path.join(outputDir, `${baseName}.pdf`);

    if (fs.existsSync(generatedPdfPath)) {
      return generatedPdfPath;
    }
  } catch {
    // LibreOffice not available or failed; graceful fallback
  }
  return null;
}

/**
 * Vectorized Institutional PDF Generator (using PDFKit)
 * Generates an official university-standard document when LibreOffice is not installed.
 */
function generateInstitutionalPdf(
  outputPath: string,
  docType: DocumentType,
  context: Record<string, any>,
  club: ClubBranding
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: 54, right: 54 },
      info: {
        Title: `${context.eventName || "Official Document"} - ${club.name}`,
        Author: club.name,
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Primary Colors
    const primaryColor = club.primaryColor || "#4F46E5";
    const darkText = "#18181B";
    const mutedText = "#475569";
    const lightBorder = "#E2E8F0";

    // 1. Institutional Letterhead Header
    doc
      .fontSize(16)
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .text(club.universityName.toUpperCase(), { align: "center" });

    doc
      .fontSize(10)
      .fillColor(mutedText)
      .font("Helvetica")
      .text(`${club.department} | ${club.name}`, { align: "center" })
      .moveDown(0.2);

    doc
      .fontSize(8)
      .fillColor("#64748B")
      .text(`Email: ${club.contactEmail}  •  Phone: ${club.contactPhone}`, { align: "center" })
      .moveDown(0.6);

    // Top Header Divider Bar
    const currentY = doc.y;
    doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(54, currentY).lineTo(541, currentY).stroke();
    doc.strokeColor("#94A3B8").lineWidth(0.5).moveTo(54, currentY + 3).lineTo(541, currentY + 3).stroke();
    doc.y = currentY + 12;

    // Date & Reference
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(darkText)
      .text(`Ref: ${club.slug.toUpperCase()}/${new Date().getFullYear()}/${context.eventType || "DOC"}`, 54, doc.y, { continued: true })
      .text(`Date: ${context.currentDate}`, { align: "right" })
      .moveDown(1);

    // 2. Document Title Banner
    let bannerTitle = "OFFICIAL EVENT PROPOSAL";
    if (docType === "PERMISSION_LETTER") bannerTitle = "FACILITY & LAB PERMISSION REQUISITION";
    if (docType === "INVITATION_LETTER") bannerTitle = "OFFICIAL INVITATION TO GUEST SPEAKER";

    doc
      .rect(54, doc.y, 487, 24)
      .fill("#F1F5F9")
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(bannerTitle, 54, doc.y + 6, { align: "center" })
      .moveDown(1.2);

    // 3. Body Content customized by Document Type
    if (docType === "PERMISSION_LETTER") {
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(darkText)
        .text("To,")
        .font("Helvetica")
        .text(`The Head of Department,`)
        .text(club.department)
        .text(club.universityName)
        .moveDown(0.8);

      doc
        .font("Helvetica-Bold")
        .text(`Subject: Requisition for room and lab allocation for "${context.eventName}"`)
        .moveDown(0.8);

      doc
        .font("Helvetica")
        .fontSize(9.5)
        .text("Respected Sir/Madam,")
        .moveDown(0.5)
        .text(
          `We, the student coordinators of ${club.name}, are planning to organize an event titled "${context.eventName}" for ${context.targetAudience || "our college students"}.`
        )
        .moveDown(0.5);

      // Logistics Table Box
      const tableY = doc.y;
      doc.rect(54, tableY, 487, 85).strokeColor(lightBorder).stroke();
      doc.fillColor(darkText).font("Helvetica-Bold").fontSize(9);

      const items = [
        ["Event Name:", context.eventName || "—"],
        ["Scheduled Date:", context.formattedDateRange],
        ["Timings:", `${context.startTime} to ${context.endTime}`],
        ["Requested Venue / Lab:", context.venue || "—"],
        ["Expected Attendees:", `${context.expectedParticipants} students`],
      ];

      items.forEach((item, idx) => {
        const rowY = tableY + 8 + idx * 15;
        doc.font("Helvetica-Bold").text(item[0], 64, rowY);
        doc.font("Helvetica").text(item[1], 210, rowY);
      });

      doc.y = tableY + 98;
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .text(`Objectives & Summary:\n${context.eventDescription || "Hands-on academic and technical session."}`)
        .moveDown(0.5)
        .text(
          "We kindly request your permission to utilize the premises and computing infrastructure to conduct the session smoothly."
        )
        .moveDown(1.5);
    } else if (docType === "INVITATION_LETTER") {
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(darkText)
        .text("To,")
        .font("Helvetica-Bold")
        .text(context.speakerName)
        .font("Helvetica")
        .text(context.speakerDesignation)
        .text(context.speakerOrganization)
        .moveDown(0.8);

      doc
        .font("Helvetica-Bold")
        .text(`Subject: Official Invitation as Keynote Speaker for "${context.eventName}"`)
        .moveDown(0.8);

      doc
        .font("Helvetica")
        .fontSize(9.5)
        .text(`Dear ${context.speakerName},`)
        .moveDown(0.5)
        .text(
          `On behalf of ${club.name} and the ${club.department} at ${club.universityName}, we have the distinct privilege of inviting you as our distinguished speaker for "${context.eventName}".`
        )
        .moveDown(0.5)
        .text(
          `The session is scheduled on ${context.formattedDateRange} from ${context.startTime} to ${context.endTime} at ${context.venue}.`
        )
        .moveDown(0.5)
        .text(
          `Topic / Presentation Area: ${context.speakerTopic}\nTarget Audience: ${context.targetAudience || "Undergraduate Engineering Students"} (approx. ${context.expectedParticipants} attendees).`
        )
        .moveDown(0.5)
        .text(
          `We would be deeply honored by your presence and look forward to your valuable insights. Kindly confirm your availability at ${context.contactEmail}.`
        )
        .moveDown(1.5);
    } else {
      // Event Proposal
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("1. BASIC EVENT DETAILS")
        .font("Helvetica")
        .fontSize(9.5)
        .text(`• Title: ${context.eventName}`)
        .text(`• Type: ${context.eventType}`)
        .text(`• Target Audience: ${context.targetAudience || "College Students"}`)
        .moveDown(0.6);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("2. LOGISTICS & TIMINGS")
        .font("Helvetica")
        .fontSize(9.5)
        .text(`• Date(s): ${context.formattedDateRange}`)
        .text(`• Timings: ${context.startTime} to ${context.endTime}`)
        .text(`• Venue: ${context.venue}`)
        .moveDown(0.6);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("3. OBJECTIVES & SYNOPSIS")
        .font("Helvetica")
        .fontSize(9.5)
        .text(context.eventDescription || "Technical and practical learning initiative.")
        .moveDown(0.6);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("4. FINANCIAL & ATTENDANCE ESTIMATE")
        .font("Helvetica")
        .fontSize(9.5)
        .text(`• Expected Attendance: ${context.expectedParticipants} participants`)
        .text(`• Budget Requested: ${context.formattedBudget}`)
        .moveDown(1.5);
    }

    // 4. Institutional Sign-Off Block
    const signY = Math.max(doc.y + 10, 680);
    doc.strokeColor(lightBorder).lineWidth(0.5).moveTo(54, signY - 8).lineTo(541, signY - 8).stroke();

    doc
      .fontSize(9)
      .fillColor(darkText)
      .font("Helvetica-Bold")
      .text("Submitted By:", 64, signY)
      .text("Endorsed & Forwarded By:", 340, signY)
      .moveDown(2);

    doc
      .font("Helvetica-Bold")
      .text(context.organizerName || "Student Lead", 64, signY + 36)
      .text(context.facultyCoordinator || "Faculty Coordinator", 340, signY + 36);

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(mutedText)
      .text(`Student Lead, ${club.name}`, 64, signY + 48)
      .text(`Faculty Advisor, ${club.department}`, 340, signY + 48);

    doc.end();

    stream.on("finish", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

/**
 * Main document generation orchestrator:
 * 1. Prepares enriched context
 * 2. Compiles binary DOCX via Docxtemplater
 * 3. Compiles PDF via LibreOffice (or institutional PDFKit engine)
 * 4. Persists files to public/generated/
 */
export async function generateDocument(
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult> {
  const generatedDir = path.join(process.cwd(), "public", "generated");
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const enrichedContext = enrichTemplateContext(options.eventData, options.club);
  const docxFileName = `${options.documentId}.docx`;
  const pdfFileName = `${options.documentId}.pdf`;

  const docxFullPath = path.join(generatedDir, docxFileName);
  const pdfFullPath = path.join(generatedDir, pdfFileName);

  // 1. Generate DOCX
  const docxBuffer = await compileDocx(options.templateFileUrl, enrichedContext);
  fs.writeFileSync(docxFullPath, docxBuffer);

  // 2. Generate PDF
  let pdfEngineUsed: "libreoffice" | "institutional_pdfkit" = "institutional_pdfkit";
  const libreResult = await tryLibreOfficeConversion(docxFullPath, generatedDir);

  if (libreResult && fs.existsSync(libreResult)) {
    pdfEngineUsed = "libreoffice";
    if (libreResult !== pdfFullPath) {
      fs.copyFileSync(libreResult, pdfFullPath);
    }
  } else {
    // High-fidelity Institutional PDFKit generation
    await generateInstitutionalPdf(pdfFullPath, options.documentType, enrichedContext, options.club);
    pdfEngineUsed = "institutional_pdfkit";
  }

  return {
    docxPath: docxFullPath,
    pdfPath: pdfFullPath,
    docxUrl: `/generated/${docxFileName}`,
    pdfUrl: `/generated/${pdfFileName}`,
    pdfEngineUsed,
  };
}
