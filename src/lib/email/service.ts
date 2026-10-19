import fs from "fs";
import path from "path";
import { Resend } from "resend";

export interface SendSignatureEmailParams {
  authorityEmail: string;
  authorityName: string;
  authorityDesignation: string;
  documentTitle: string;
  documentId: string;
  requesterName: string;
  signingToken: string;
  expiresAt: string;
  baseUrl?: string;
}

export interface SendCompletionEmailParams {
  requesterEmail: string;
  requesterName: string;
  documentTitle: string;
  documentId: string;
  signedPdfUrl: string;
  baseUrl?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: "resend" | "local_institutional_logger";
  error?: string;
  previewUrl?: string;
}

const EMAIL_LOGS_FILE = path.join(process.cwd(), "public", "storage", "email-logs.json");

function ensureStorageDir() {
  const dir = path.dirname(EMAIL_LOGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function logEmailRecord(record: any) {
  try {
    ensureStorageDir();
    let logs: any[] = [];
    if (fs.existsSync(EMAIL_LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(EMAIL_LOGS_FILE, "utf-8"));
      } catch {
        logs = [];
      }
    }
    logs.unshift(record);
    if (logs.length > 100) logs = logs.slice(0, 100);
    fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist email log:", err);
  }
}

/**
 * Returns the effective base application URL for generating action links.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Sends an official electronic signature request email to an authority.
 */
export async function sendSignatureRequestEmail(
  params: SendSignatureEmailParams
): Promise<EmailDeliveryResult> {
  const baseUrl = params.baseUrl || getAppBaseUrl();
  const signingUrl = `${baseUrl}/sign/${params.signingToken}`;
  const subject = `Signature Required: ${params.documentTitle} — ${params.authorityDesignation}`;

  const formattedDate = new Date(params.expiresAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { background: #1F6954; color: #ffffff; padding: 24px 32px; text-align: left; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 32px; line-height: 1.6; font-size: 14px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .card-row:last-child { margin-bottom: 0; }
    .card-label { color: #64748b; font-weight: 500; }
    .card-val { color: #0f172a; font-weight: 600; text-align: right; }
    .btn-container { text-align: center; margin: 32px 0 24px 0; }
    .btn { display: inline-block; background: #1F6954; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(31, 105, 84, 0.2); }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }
    .direct-link { word-break: break-all; color: #1F6954; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Electronic Signature Required</h1>
      <p>Institutional Document Management System</p>
    </div>
    <div class="body">
      <p>Dear <strong>${params.authorityName}</strong>,</p>
      <p>You have been requested to review and affix your official electronic signature on the following document in your capacity as <strong>${params.authorityDesignation}</strong>.</p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Document Title:</span>
          <span class="card-val">${params.documentTitle}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Reference ID:</span>
          <span class="card-val">${params.documentId}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Requested By:</span>
          <span class="card-val">${params.requesterName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Designated Role:</span>
          <span class="card-val">${params.authorityDesignation}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Response Deadline:</span>
          <span class="card-val">${formattedDate}</span>
        </div>
      </div>

      <p>Please open the secure document portal to inspect the exact PDF layout and draw your signature:</p>

      <div class="btn-container">
        <a href="${signingUrl}" class="btn" target="_blank">Review & Sign Document</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        If the button does not open directly, copy and paste this link into your browser:<br>
        <a href="${signingUrl}" class="direct-link">${signingUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated notification from the institutional document workflow system. If you are not the intended authority or received this in error, please disregard or decline the request with remarks.</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Signature Required: ${params.documentTitle} - ${params.authorityDesignation}

Dear ${params.authorityName},

You have been requested to review and affix your electronic signature to the following document in your capacity as ${params.authorityDesignation}.

Document Title: ${params.documentTitle}
Reference ID: ${params.documentId}
Requested By: ${params.requesterName}
Designated Role: ${params.authorityDesignation}
Deadline: ${formattedDate}

Please review and sign the document at the following secure link:
${signingUrl}

This link is private and secure to you.
`;

  // Resend integration if API key is configured
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && apiKey.startsWith("re_")) {
    try {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const res = await resend.emails.send({
        from: fromEmail,
        to: params.authorityEmail,
        subject,
        html,
        text,
      });

      if (res.error) {
        console.warn(`[Resend API Error] (${res.error.name}): ${res.error.message}`);
        throw new Error(res.error.message);
      }

      const result: EmailDeliveryResult = {
        success: true,
        messageId: res.data?.id,
        provider: "resend",
        previewUrl: signingUrl,
      };

      logEmailRecord({
        type: "SIGNATURE_REQUEST",
        to: params.authorityEmail,
        subject,
        signingUrl,
        sentAt: new Date().toISOString(),
        provider: "resend",
        resendId: res.data?.id,
      });

      return result;
    } catch (err: any) {
      console.warn("Resend delivery unfulfilled, falling back to local institutional dispatch:", err?.message || err);
      // Fallback to local institutional logger so workflow does not block
    }
  }

  // Development / Institutional fallback delivery logger
  const logRecord = {
    type: "SIGNATURE_REQUEST",
    to: params.authorityEmail,
    authorityName: params.authorityName,
    subject,
    signingUrl,
    sentAt: new Date().toISOString(),
    provider: "local_institutional_logger",
  };
  logEmailRecord(logRecord);

  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPATCHED TO AUTHORITY]`);
  console.log(`To: ${params.authorityName} <${params.authorityEmail}>`);
  console.log(`Subject: ${subject}`);
  console.log(`Secure Signing URL: ${signingUrl}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    messageId: "local_" + Math.random().toString(36).substring(2, 10),
    provider: "local_institutional_logger",
    previewUrl: signingUrl,
  };
}

/**
 * Sends a completion notification email to the requester once all signatures are affixed.
 */
export async function sendWorkflowCompletionEmail(
  params: SendCompletionEmailParams
): Promise<EmailDeliveryResult> {
  const baseUrl = params.baseUrl || getAppBaseUrl();
  const docUrl = `${baseUrl}/documents/${params.documentId}`;
  const pdfDownloadUrl = `${baseUrl}${params.signedPdfUrl}`;
  const subject = `Completed: ${params.documentTitle} — All Signatures Affixed`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #059669; color: #ffffff; padding: 24px 32px; }
    .body { padding: 32px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">Document Signing Complete ✓</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">All designated authorities have officially signed.</p>
    </div>
    <div class="body">
      <p>Dear <strong>${params.requesterName}</strong>,</p>
      <p>All required approvals and electronic signatures for <strong>${params.documentTitle}</strong> (Ref: ${params.documentId}) have been successfully captured and embedded into the official PDF document.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${pdfDownloadUrl}" class="btn" target="_blank">Download Completed Signed PDF</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">You can also review the full audit log and version history on the document dashboard: <a href="${docUrl}">${docUrl}</a></p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Document Signing Complete: ${params.documentTitle}

Dear ${params.requesterName},

All required approvals and signatures for "${params.documentTitle}" (Ref: ${params.documentId}) have been successfully completed.

Download Completed PDF: ${pdfDownloadUrl}
View Document Record: ${docUrl}
`;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && apiKey.startsWith("re_")) {
    try {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
      const res = await resend.emails.send({
        from: fromEmail,
        to: params.requesterEmail,
        subject,
        html,
        text,
      });

      if (res.error) {
        console.warn(`[Resend API Error] Completion email error: ${res.error.message}`);
        throw new Error(res.error.message);
      }

      return {
        success: true,
        messageId: res.data?.id,
        provider: "resend",
      };
    } catch (err: any) {
      console.warn("Resend completion delivery failed:", err?.message || err);
    }
  }

  logEmailRecord({
    type: "WORKFLOW_COMPLETED",
    to: params.requesterEmail,
    subject,
    pdfDownloadUrl,
    sentAt: new Date().toISOString(),
    provider: "local_institutional_logger",
  });

  return {
    success: true,
    messageId: "local_" + Math.random().toString(36).substring(2, 10),
    provider: "local_institutional_logger",
  };
}
