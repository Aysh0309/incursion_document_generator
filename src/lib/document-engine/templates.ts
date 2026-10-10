import fs from "fs";
import path from "path";
import PizZip from "pizzip";

function createMinimalDocxXml(contentParagraphs: string[]): string {
  const paragraphsXml = contentParagraphs
    .map(
      (p) => `<w:p>
        <w:pPr>
          <w:spacing w:line="280" w:lineRule="auto" w:after="160"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:sz w:val="22"/>
          </w:rPr>
          <w:t xml:space="preserve">${p}</w:t>
        </w:r>
      </w:p>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

export function generateDocxBufferFromText(paragraphs: string[]): Buffer {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES_XML);
  zip.file("_rels/.rels", RELS_XML);
  zip.file("word/_rels/document.xml.rels", WORD_RELS_XML);
  zip.file("word/document.xml", createMinimalDocxXml(paragraphs));

  return zip.generate({ type: "nodebuffer" });
}

export function ensureDefaultTemplatesExist() {
  const templatesDir = path.join(process.cwd(), "public", "templates");
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // 1. Event Proposal Template
  const proposalPath = path.join(templatesDir, "event_proposal_template.docx");
  if (!fs.existsSync(proposalPath)) {
    const proposalParagraphs = [
      "INSTITUTIONAL EVENT PROPOSAL",
      "{universityName}",
      "{department}",
      "Organized by: {clubName}",
      "--------------------------------------------------------------------------------",
      "Date of Submission: {currentDate}",
      "",
      "1. EVENT TITLE & CATEGORY",
      "Event Name: {eventName}",
      "Event Type: {eventType}",
      "Target Audience: {targetAudience}",
      "",
      "2. SCHEDULE & VENUE DETAILS",
      "Date(s): {formattedDateRange}",
      "Time: {startTime} to {endTime}",
      "Venue: {venue}",
      "",
      "3. OBJECTIVES & OVERVIEW",
      "{eventDescription}",
      "",
      "4. ATTENDANCE & FINANCIAL SANCTION",
      "Expected Student Attendance: {expectedParticipants} participants",
      "Estimated Budget Requested: {formattedBudget}",
      "",
      "5. COORDINATION & SIGN-OFF",
      "Student Lead / Organizer: {organizerName}",
      "Faculty Coordinator: {facultyCoordinator}",
      "",
      "Submitted for Approval and Venue Allocation.",
    ];
    fs.writeFileSync(proposalPath, generateDocxBufferFromText(proposalParagraphs));
  }

  // 2. Permission Letter Template
  const permissionPath = path.join(templatesDir, "permission_letter_template.docx");
  if (!fs.existsSync(permissionPath)) {
    const permissionParagraphs = [
      "DEPARTMENT PERMISSION REQUEST LETTER",
      "{clubName} | {universityName}",
      "--------------------------------------------------------------------------------",
      "Date: {currentDate}",
      "",
      "To,",
      "The Head of Department,",
      "{department},",
      "{universityName}.",
      "",
      "Subject: Requisition for room and lab allocation for '{eventName}'",
      "",
      "Respected Sir/Madam,",
      "",
      "We, the student coordinators of {clubName}, are planning to organize an event titled '{eventName}' for {targetAudience}.",
      "",
      "Event Logistics:",
      "- Date: {formattedDateRange}",
      "- Time: {startTime} to {endTime}",
      "- Requested Venue / Lab: {venue}",
      "- Expected Participants: {expectedParticipants}",
      "",
      "Brief Description:",
      "{eventDescription}",
      "",
      "We request your kind permission to access the premises and computing facilities to conduct the session smoothly.",
      "",
      "Yours sincerely,",
      "",
      "{organizerName}                                    {facultyCoordinator}",
      "Student Lead, {clubName}                           Faculty Coordinator",
      "Ph: {contactPhone}                                 Email: {contactEmail}",
    ];
    fs.writeFileSync(permissionPath, generateDocxBufferFromText(permissionParagraphs));
  }

  // 3. Invitation Letter Template
  const invitationPath = path.join(templatesDir, "invitation_letter_template.docx");
  if (!fs.existsSync(invitationPath)) {
    const invitationParagraphs = [
      "OFFICIAL GUEST INVITATION LETTER",
      "{clubName} - {universityName}",
      "--------------------------------------------------------------------------------",
      "Date: {currentDate}",
      "",
      "To,",
      "{speakerName}",
      "{speakerDesignation}",
      "{speakerOrganization}",
      "",
      "Subject: Invitation as Keynote Speaker for '{eventName}'",
      "",
      "Dear {speakerName},",
      "",
      "On behalf of {clubName} and the {department} at {universityName}, we are delighted to invite you as our distinguished speaker for '{eventName}'.",
      "",
      "The session is scheduled on {formattedDateRange} from {startTime} to {endTime} at {venue}.",
      "",
      "Topic / Focus Area: {speakerTopic}",
      "Target Audience: {targetAudience} (approx. {expectedParticipants} attendees)",
      "",
      "We would be deeply honored by your presence and expertise. Kindly let us know your availability at {contactEmail}.",
      "",
      "Warm regards,",
      "",
      "{facultyCoordinator}                              {organizerName}",
      "Faculty Coordinator, {clubName}                   Student Lead",
      "Email: {contactEmail}                             Phone: {contactPhone}",
    ];
    fs.writeFileSync(invitationPath, generateDocxBufferFromText(invitationParagraphs));
  }
}
