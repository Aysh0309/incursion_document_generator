import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import { TemplateField, DetectedAsset, FieldDataType, TemplateSignatureField } from "@/types";

export interface AnalysisResult {
  format: "docx" | "pdf";
  pageCount: number;
  pageDimensions: Array<{ width: number; height: number }>;
  fields: TemplateField[];
  signatureFields?: TemplateSignatureField[];
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
    .replace(/[:_–—\(\)\[\]\/,\\.]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  // Common synonyms mapping
  const lower = cleaned.toLowerCase();
  if (lower === "event name" || lower === "event title" || lower === "name of event" || lower === "title" || lower === "title of the event" || lower === "name of the event") return "eventName";
  if (lower === "date" || lower === "event date" || lower === "date of event" || lower === "start date" || lower === "schedule of event date day" || lower === "schedule of event" || lower === "date s" || lower === "date of submission") return "startDate";
  if (lower === "end date" || lower === "closing date") return "endDate";
  if (lower === "time" || lower === "start time" || lower === "timings" || lower === "timing" || lower === "schedule") return "startTime";
  if (lower === "end time") return "endTime";
  if (lower === "venue" || lower === "location" || lower === "place" || lower === "room" || lower === "lab" || lower === "event venue" || lower === "requested venue lab") return "venue";
  if (lower === "department" || lower === "dept") return "department";
  if (lower === "hod" || lower === "head of department" || lower === "department hod") return "departmentHOD";
  if (lower === "faculty coordinator" || lower === "coordinator" || lower === "faculty advisor" || lower === "faculty incharge" || lower === "faculty in charge") return "facultyCoordinator";
  if (lower === "organizer" || lower === "organizer name" || lower === "student lead" || lower === "lead" || lower === "student coordinator" || lower === "student head" || lower === "student secretary") return "organizerName";
  if (lower === "budget" || lower === "budget requested" || lower === "estimated budget" || lower === "amount" || lower === "estimated expenditure" || lower === "budget proposal" || lower === "financial proposal") return "budgetRequested";
  if (lower === "participants" || lower === "expected participants" || lower === "attendees" || lower === "student attendance" || lower === "expectednumberof participants" || lower === "expected number of participants" || lower === "expected student attendance") return "expectedParticipants";
  if (lower === "description" || lower === "event description" || lower === "synopsis" || lower === "brief description" || lower === "about the event" || lower === "objectives" || lower === "objectives overview") return "eventDescription";
  if (lower === "target audience" || lower === "audience" || lower === "participants category") return "targetAudience";
  if (lower === "speaker" || lower === "guest" || lower === "resource person" || lower === "speaker name" || lower === "keynote speaker" || lower === "chief guest") return "speakerName";
  if (lower === "speaker designation" || lower === "designation") return "speakerDesignation";
  if (lower === "speaker organization" || lower === "organization" || lower === "speaker affiliation" || lower === "affiliation") return "speakerOrganization";
  if (lower === "topic" || lower === "speaker topic" || lower === "talk topic" || lower === "theme" || lower === "focus area") return "speakerTopic";
  if (lower === "contact email" || lower === "email" || lower === "mail id" || lower === "email address") return "contactEmail";
  if (lower === "contact phone" || lower === "phone" || lower === "mobile" || lower === "contact no" || lower === "phone number") return "contactPhone";
  if (lower === "club" || lower === "club name" || lower === "student body" || lower === "chapter club society section name" || lower === "organized by") return "clubName";
  if (lower === "category of the event" || lower === "category" || lower === "event category" || lower === "type of event" || lower === "event type") return "eventType";
  if (lower === "subject" || lower === "subj") return "subject";
  if (lower === "no" || lower === "ref no" || lower === "ref" || lower === "doc no" || lower === "reference number" || lower === "document reference number") return "documentRefNumber";
  if (lower === "submitted to" || lower === "submitted for approval to") return "submittedTo";
  if (lower === "registration fee" || lower === "reg fee" || lower === "fees") return "registrationFee";
  if (lower === "mode of event" || lower === "event mode" || lower === "mode") return "eventMode";
  if (lower === "duration") return "duration";

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
  if (combined.includes("signature") || combined.includes("sign ") || combined.endsWith("sign") || combined.startsWith("sign")) return "signature";
  if (combined.includes("date")) return "date";
  if (combined.includes("time") || combined.includes("timings")) return "time";
  if (combined.includes("budget") || combined.includes("amount") || combined.includes("cost") || combined.includes("fee") || combined.includes("inr") || combined.includes("expense") || combined.includes("price")) return "currency";
  if (combined.includes("participant") || combined.includes("count") || combined.includes("attendee") || combined.includes("number of") || combined.includes("strength")) return "number";
  if (combined.includes("email") || combined.includes("mail")) return "email";
  if (combined.includes("phone") || combined.includes("mobile") || combined.includes("contact no")) return "phone";
  if (combined.includes("description") || combined.includes("objective") || combined.includes("synopsis") || combined.includes("overview") || combined.includes("about") || combined.includes("remarks") || combined.includes("note")) return "textarea";
  return "text";
}

/**
 * Checks whether a detected label or normalized key represents static institutional/letterhead
 * metadata (e.g. college name, branch, university, accreditation, address) that should NOT
 * be added as an extra variable document field.
 */
export function isStaticInstitutionalMetadata(label: string, key?: string): boolean {
  const clean = label
    .trim()
    .toLowerCase()
    .replace(/[:_–—\(\)\[\]\/,\\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const k = (key || normalizeFieldKey(label)).toLowerCase();

  // Protect signatories / approvers
  if (
    clean.includes("hod") ||
    clean.includes("head of department") ||
    clean.includes("coordinator") ||
    clean.includes("incharge") ||
    clean.includes("advisor") ||
    clean.includes("signature") ||
    clean.includes("sign") ||
    k.includes("hod") ||
    k.includes("coordinator")
  ) {
    return false;
  }

  // 1. College / University / Institute names (e.g. "Name of the College", "College Name", "College", "University")
  const collegeRegex =
    /^(?:name\s+of\s+(?:the\s+)?(?:college|institute|institution|university|campus|school)|college(?:\s+name)?|institute(?:\s+name)?|institution(?:\s+name)?|university(?:\s+name)?|campus(?:\s+name)?|school(?:\s+name)?)$/i;
  if (collegeRegex.test(clean)) return true;

  const collegeKeys = [
    "universityname",
    "collegename",
    "nameofthecollege",
    "college",
    "institutename",
    "nameoftheinstitute",
    "institutionname",
    "nameoftheinstitution",
    "campusname",
    "nameoftheuniversity",
    "nameofcollege",
    "nameofinstitute",
    "nameofinstitution",
    "nameofuniversity",
  ];
  if (collegeKeys.includes(k)) return true;

  // 2. Branch / Stream / Discipline / Department (e.g. "Branch", "Name of the Branch", "Branch Name", "Department")
  const branchRegex =
    /^(?:name\s+of\s+(?:the\s+)?(?:branch|stream|discipline|department)|branch(?:\s+name)?|stream|discipline|course(?:\s+name)?|programme(?:\s+name)?|program(?:\s+name)?|department(?:\s+name)?|dept)$/i;
  if (branchRegex.test(clean)) return true;

  const branchKeys = [
    "branch",
    "branchname",
    "nameofthebranch",
    "nameofbranch",
    "stream",
    "discipline",
    "departmentname",
    "nameofthedepartment",
    "department",
    "dept",
  ];
  if (branchKeys.includes(k)) return true;

  // 3. Boilerplate institutional letterhead (affiliation, accreditation, address, pin code)
  const boilerplateRegex =
    /^(?:affiliated\s+to|affiliation|approved\s+by|accredited\s+by|aicte|naac|nba|autonomous|ugc|pincode|pin\s*code|postal\s*code|college\s*code|inst\w*\s*code|website|web\s*portal|fax(?:\s*no)?|office\s+use(?:\s+only)?|for\s+office\s+use(?:\s+only)?|address|college\s+address|institute\s+address)$/i;
  if (boilerplateRegex.test(clean)) return true;

  return false;
}

/**
 * Checks if a field should default to required.
 */
export function isLikelyRequired(key: string, label: string): boolean {
  if (
    key === "currentDate" ||
    key === "formattedDateRange" ||
    key === "formattedBudget" ||
    key === "universityName"
  ) {
    return false;
  }
  const combined = (key + " " + label).toLowerCase();
  const essentialPatterns = ["name", "title", "date", "venue", "coordinator", "hod", "organizer", "participants", "budget", "subject"];
  return essentialPatterns.some((pat) => combined.includes(pat));
}

/**
 * Automatically detects candidate signature sections, printed names, and designations
 * from document text, headers, and tables. Suggests likely page, role, and coordinates.
 */
export function detectSignatureSections(fullText: string): TemplateSignatureField[] {
  const detected: TemplateSignatureField[] = [];

  const patterns = [
    { regex: /signature\s+of\s+student\s+head/i, designation: "Signature of Student Head", role: "STUDENT_HEAD" },
    { regex: /signature\s+of\s+student\s+secretary/i, designation: "Signature of Student Secretary", role: "STUDENT_SECRETARY" },
    { regex: /signature\s+of\s+student\s+coordinator|student\s+coordinator\s+signature/i, designation: "Signature of Student Coordinator", role: "STUDENT_COORDINATOR" },
    { regex: /signature\s+of\s+faculty\s+co[\s-]?chairman/i, designation: "Signature of Faculty Co-Chairman", role: "FACULTY_CO_CHAIRMAN" },
    { regex: /signature\s+of\s+faculty\s+chairman/i, designation: "Signature of Faculty Chairman", role: "FACULTY_CHAIRMAN" },
    { regex: /signature\s+of\s+faculty\s+coordinator|faculty\s+coordinator/i, designation: "Signature of Faculty Coordinator", role: "FACULTY_COORDINATOR" },
    { regex: /signature\s+of\s+faculty\s+advisor|faculty\s+advisor\s+signature/i, designation: "Signature of Faculty Advisor", role: "FACULTY_ADVISOR" },
    { regex: /signature\s+of\s+faculty\s+in[\s-]?charge|faculty\s+in[\s-]?charge/i, designation: "Signature of Faculty In-Charge", role: "FACULTY_INCHARGE" },
    { regex: /signature\s+of\s+head\s+of\s+department|signature\s+of\s+hod|head\s+of\s+department/i, designation: "Signature of Head of Department", role: "HOD" },
    { regex: /associate\s+dean/i, designation: "Signature of Associate Dean", role: "ASSOCIATE_DEAN" },
    { regex: /signature\s+of\s+dean|dean\s*\(\s*students?\s*welfare\s*\)/i, designation: "Signature of Dean (Student Welfare)", role: "DEAN" },
    { regex: /signature\s+of\s+director|director\s+signature/i, designation: "Signature of Director", role: "DIRECTOR" },
    { regex: /signature\s+of\s+principal|principal\s+signature/i, designation: "Signature of Principal", role: "PRINCIPAL" },
    { regex: /signature\s+of\s+registrar|registrar\s+signature/i, designation: "Signature of Registrar", role: "REGISTRAR" },
    { regex: /signature\s+of\s+treasurer|treasurer\s+signature/i, designation: "Signature of Treasurer", role: "TREASURER" },
    { regex: /signature\s+of\s+convenor|convenor/i, designation: "Signature of Convenor", role: "CONVENOR" },
    { regex: /authorized\s+signatory/i, designation: "Authorized Signatory", role: "AUTHORIZED_SIGNATORY" },
  ];

  let order = 1;
  const seenRoles = new Set<string>();

  for (const pat of patterns) {
    if (pat.regex.test(fullText) && !seenRoles.has(pat.role)) {
      seenRoles.add(pat.role);
      const isLeft = order % 2 === 1;
      const x = isLeft ? 72 : 380;
      const y = 120; // standard 120 points from bottom

      detected.push({
        id: `sig_${pat.role.toLowerCase()}`,
        name: `${pat.role.toLowerCase()}Signature`,
        printedName: "",
        designation: pat.designation,
        assignedRole: pat.role,
        defaultAuthorityId: "",
        pageNumber: 1,
        position: { x, y, width: 140, height: 45 },
        required: true,
        signingOrder: order++,
        actionType: order === 2 ? "APPROVAL_AND_SIGNATURE" : "SIGNATURE_ONLY",
        signMethod: "BOTH",
      });
    }
  }

  // Broad scan for any other "Signature of [Role]" or "[Role] Signature" in the document
  const genericSigRegex = /(?:signature\s+of\s+|signature\s*:\s*)([A-Za-z0-9\s/&()-]{2,35})/gi;
  let genericMatch: RegExpExecArray | null;
  while ((genericMatch = genericSigRegex.exec(fullText)) !== null) {
    const rawRole = genericMatch[1].trim();
    if (!rawRole || rawRole.length < 3 || rawRole.length > 35) continue;
    if (rawRole.includes("___") || rawRole.includes("...") || rawRole.toLowerCase().includes("online") || rawRole.toLowerCase().includes("offline")) continue;

    const roleKey = rawRole.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!roleKey || seenRoles.has(roleKey)) continue;

    seenRoles.add(roleKey);
    const isLeft = order % 2 === 1;
    const designation = `Signature of ${rawRole.replace(/^\w/, (c) => c.toUpperCase())}`;

    detected.push({
      id: `sig_${roleKey.toLowerCase()}`,
      name: `${roleKey.toLowerCase()}Signature`,
      printedName: "",
      designation,
      assignedRole: roleKey,
      pageNumber: 1,
      position: { x: isLeft ? 72 : 380, y: 120, width: 140, height: 45 },
      required: true,
      signingOrder: order++,
      actionType: "SIGNATURE_ONLY",
      signMethod: "BOTH",
    });
  }

  return detected;
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

  const DOMParser = require("@xmldom/xmldom").DOMParser;

  for (const partName of xmlParts) {
    const xmlContent = zip.file(partName)?.asText() || "";
    if (!xmlContent) continue;

    let doc: any;
    try {
      doc = new DOMParser().parseFromString(xmlContent, "application/xml");
    } catch {
      continue;
    }

    // Helper to register detected fields
    const registerField = (
      rawLabel: string,
      val: string,
      sourceEvidence: string
    ) => {
      const cleanLabel = rawLabel
        .replace(/[:_–—\s]+$/, "")
        .replace(/^[-•\*\d+\.\)]\s*/, "")
        .trim();
      if (!cleanLabel || cleanLabel.length < 2 || cleanLabel.length > 70) return;

      const lower = cleanLabel.toLowerCase();
      if (
        [
          "sr no",
          "s no",
          "sl no",
          "s.no",
          "sr. no",
          "total",
          "items",
          "item",
          "amount in words",
          "note",
          "nb",
          "page",
          "http",
          "https",
          "office use only",
          "for office use",
        ].includes(lower)
      ) {
        return;
      }

      // Check if value contains an explicit tag like {{tag}}
      const tagMatch = val.match(/\{\{([a-zA-Z0-9_\.]+)\}\}|\{([a-zA-Z0-9_\.]+)\}/);
      const normalizedKey = tagMatch
        ? normalizeFieldKey(tagMatch[1] || tagMatch[2])
        : normalizeFieldKey(cleanLabel);

      if (isStaticInstitutionalMetadata(cleanLabel, normalizedKey)) {
        return;
      }

      if (fieldsMap.has(normalizedKey)) {
        const existing = fieldsMap.get(normalizedKey)!;
        if (!existing.repeatedFieldKeys?.includes(cleanLabel)) {
          existing.repeatedFieldKeys = existing.repeatedFieldKeys || [];
          existing.repeatedFieldKeys.push(cleanLabel);
        }
      } else {
        const isSys = ["currentDate", "formattedDateRange", "formattedBudget"].includes(normalizedKey);
        const isFix = ["universityName"].includes(normalizedKey);
        const cleanVal = val.replace(/^[_\s\.\–—-]+|[_\s\.\–—-]+$/g, "").trim();
        const fType = inferFieldType(normalizedKey, cleanLabel);

        fieldsMap.set(normalizedKey, {
          id: `fld_${normalizedKey}`,
          name: normalizedKey,
          label: cleanLabel,
          type: fType,
          required: isSys || isFix ? false : isLikelyRequired(normalizedKey, cleanLabel),
          isSystem: isSys,
          isFixed: isFix,
          fixedValue: isFix ? "National Institute of Technology & Advanced Science" : undefined,
          isSignature: fType === "signature",
          defaultValue: cleanVal || undefined,
          confidence: tagMatch ? 0.98 : cleanVal ? 0.92 : 0.88,
          adminConfirmed: true,
          sourceEvidence,
          repeatedFieldKeys: [cleanLabel, normalizedKey],
          description: cleanVal
            ? `Template default / sample: "${cleanVal}"`
            : "Variable field (blank in template)",
        });
      }
    };

    const isHeaderOrFooter = partName.startsWith("word/header") || partName.startsWith("word/footer");

    // A. Parse tables: detect any key-value row (label cell + colon/empty + value or blank cell)
    // Only in main document body, skip headers and footers (which contain static college letterheads)
    if (!isHeaderOrFooter) {
      const trs = doc.getElementsByTagName("w:tr");
      for (let i = 0; i < trs.length; i++) {
        const tr = trs[i];
        const tcs = tr.getElementsByTagName("w:tc");
        if (tcs.length === 0) continue;

        const cellTexts: string[] = [];
        for (let c = 0; c < tcs.length; c++) {
          const ts = tcs[c].getElementsByTagName("w:t");
          let txt = "";
          for (let k = 0; k < ts.length; k++) {
            txt += ts[k].textContent || "";
          }
          cellTexts.push(txt.trim());
        }

        // Append table text to fullText for signature & keyword detection
        fullText += cellTexts.join(" | ") + "\n";

        // 1. Check if first cell is a serial number/counter (e.g. "1.", "1", "S.No", "(a)")
        let startIdx = 0;
        if (
          cellTexts.length >= 3 &&
          /^(?:\d+[\.\)]?|[a-zA-Z][\.\)]|s\.?\s*no\.?|sr\.?\s*no\.?|sl\.?\s*no\.?)$/i.test(cellTexts[0])
        ) {
          startIdx = 1;
        }

        // 2. Process primary key-value pair in this row
        if (cellTexts.length >= startIdx + 2) {
          const rawLabel = cellTexts[startIdx];
          let val = "";
          let nextIdx = startIdx + 1;

          if (
            cellTexts.length >= startIdx + 3 &&
            (cellTexts[startIdx + 1] === ":" || cellTexts[startIdx + 1] === "-" || cellTexts[startIdx + 1] === "")
          ) {
            val = cellTexts[startIdx + 2];
            nextIdx = startIdx + 3;
          } else {
            val = cellTexts[startIdx + 1];
            nextIdx = startIdx + 2;
          }

          if (rawLabel) {
            registerField(rawLabel, val, `Table row "${rawLabel}" in ${partName}`);
          }

          // 3. Process secondary key-value pair if 4+ columns exist (e.g. [Date, 12/10, Time, 10:00])
          if (cellTexts.length >= nextIdx + 2) {
            const secondLabel = cellTexts[nextIdx];
            let secondVal = "";
            if (
              cellTexts.length >= nextIdx + 3 &&
              (cellTexts[nextIdx + 1] === ":" || cellTexts[nextIdx + 1] === "-" || cellTexts[nextIdx + 1] === "")
            ) {
              secondVal = cellTexts[nextIdx + 2];
            } else {
              secondVal = cellTexts[nextIdx + 1];
            }
            if (secondLabel) {
              registerField(secondLabel, secondVal, `Table secondary column "${secondLabel}" in ${partName}`);
            }
          }
        }

        // 4. Check if individual cells contain embedded "Label: Value"
        for (const cText of cellTexts) {
          if (cText.includes(":") && !cText.startsWith("http")) {
            const m = cText.match(/^([A-Za-z0-9\s/&()-]{2,40}):\s*(.*)$/);
            if (m && m[1] && m[1].length < 40) {
              registerField(m[1].trim(), m[2]?.trim() || "", `Table cell text "${m[1].trim()}" in ${partName}`);
            }
          }
        }
      }
    }

    // B. Parse paragraphs: detect explicit placeholders, normal text key-values, and labeled blanks
    const ps = doc.getElementsByTagName("w:p");
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const ts = p.getElementsByTagName("w:t");
      let pText = "";
      for (let k = 0; k < ts.length; k++) {
        pText += ts[k].textContent || "";
      }
      pText = pText.trim();
      if (!pText) continue;
      fullText += pText + "\n";

      // 1. Explicit placeholders: {{field_name}} or {field_name}
      const tagRegex = /(?:\{\{([a-zA-Z0-9_\.]+)\}\}|\{([a-zA-Z0-9_\.]+)\})/g;
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(pText)) !== null) {
        const rawKey = match[1] || match[2];
        if (!rawKey) continue;
        const normalizedKey = normalizeFieldKey(rawKey);
        if (isStaticInstitutionalMetadata(rawKey, normalizedKey)) continue;

        if (fieldsMap.has(normalizedKey)) {
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
            .replace(/^\w/, (c: string) => c.toUpperCase());

          const isSys = ["currentDate", "formattedDateRange", "formattedBudget"].includes(normalizedKey);
          const isFix = ["universityName"].includes(normalizedKey);

          fieldsMap.set(normalizedKey, {
            id: `fld_${normalizedKey}`,
            name: normalizedKey,
            label,
            type: inferFieldType(normalizedKey, label),
            required: isSys || isFix ? false : isLikelyRequired(normalizedKey, label),
            isSystem: isSys,
            isFixed: isFix,
            fixedValue: isFix ? "National Institute of Technology & Advanced Science" : undefined,
            confidence: 0.98,
            adminConfirmed: true,
            sourceEvidence: `Explicit placeholder {${rawKey}} in ${partName}`,
          });
        }
      }

      // If this paragraph is in a header or footer, only explicit placeholders (above) are processed.
      // Skip normal text matching to prevent college letterheads/addresses from becoming form fields.
      if (isHeaderOrFooter) continue;

      // 2. Normal text fields and labeled blanks in paragraphs
      // Handles single or multiple fields on a line: e.g. "Event Name: Hackathon", "Date: 12/10/2026   Time: 10:00 AM"
      const kvPattern = /(?:^|\s{2,}|\t|;\s*|\n)([A-Za-z0-9][A-Za-z0-9\s/&()_\-\.]{1,40}):\s*([^\n\r\t]+?)(?=\s{3,}[A-Za-z0-9]|\t|\s*\|\s*|$)/g;
      let kvMatch: RegExpExecArray | null;
      while ((kvMatch = kvPattern.exec(pText)) !== null) {
        const rawLabel = kvMatch[1].trim();
        const rawVal = kvMatch[2]?.trim() || "";
        if (rawLabel.toLowerCase().startsWith("http") || rawLabel.toLowerCase() === "note") continue;
        registerField(rawLabel, rawVal, `Paragraph "${rawLabel}" in ${partName}`);
      }

      // 3. Dash-separated fields: e.g. "- Venue: Seminar Hall" or "Speaker - Dev Sharma"
      const dashPattern = /(?:^|\n)[-•\*\d+\.\)]*\s*([A-Za-z0-9][A-Za-z0-9\s/&()_\.]{2,35})\s+[-–—]\s+([^\n\r]+)/g;
      let dashMatch: RegExpExecArray | null;
      while ((dashMatch = dashPattern.exec(pText)) !== null) {
        const rawLabel = dashMatch[1].trim();
        const rawVal = dashMatch[2]?.trim() || "";
        if (rawLabel.length >= 3 && !rawLabel.toLowerCase().startsWith("http")) {
          registerField(rawLabel, rawVal, `Dash-separated field "${rawLabel}" in ${partName}`);
        }
      }

      // 4. Known administrative paragraph patterns (Date, No, Subject, Submitted to)
      const adminPatterns = [
        { regex: /(?:^|\s)Date:\s*([^\s\n\r]+|\s*_{2,}|\s*)/i, label: "Date", key: "startDate" },
        { regex: /(?:^|\s)No:\s*([^\s\n\r]+|\s*_{2,}|\s*)/i, label: "Document Reference Number", key: "documentRefNumber" },
        { regex: /(?:^|\s)Subject:\s*([^\n\r]+)/i, label: "Subject", key: "subject" },
        { regex: /(?:^|\s)Submitted to:\s*([^\n\r]+)/i, label: "Submitted To", key: "submittedTo" },
      ];

      for (const ptn of adminPatterns) {
        const pMatch = pText.match(ptn.regex);
        if (pMatch && !fieldsMap.has(ptn.key)) {
          const valStr = pMatch[1]?.trim() || "";
          registerField(ptn.label, valStr, `Administrative line "${ptn.label}" in ${partName}`);
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
    signatureFields: detectSignatureSections(fullText),
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
          if (isStaticInstitutionalMetadata(rawKey, normalizedKey)) continue;

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

        // B. Check for normal text fields and labeled blanks: e.g. "Event Title: National Hackathon" or "Date: ___________"
        const kvPdfPattern = /(?:^|\s{2,}|\t|;\s*)([A-Za-z0-9][A-Za-z0-9\s/&()_\-\.]{1,35}):\s*([^\n\r\t]+?)(?=\s{3,}[A-Za-z0-9]|\t|\s*\|\s*|$)/g;
        let kvMatch: RegExpExecArray | null;
        while ((kvMatch = kvPdfPattern.exec(lineText)) !== null) {
          const rawLabel = kvMatch[1].trim();
          const rawVal = kvMatch[2]?.trim() || "";
          if (rawLabel.toLowerCase().startsWith("http") || rawLabel.toLowerCase() === "note") continue;

          const cleanLabel = rawLabel.replace(/[:_–—\(\)\[\]]+$/, "").replace(/^[-•\*\d+\.\)]\s*/, "").trim();
          if (!cleanLabel || cleanLabel.length < 2 || cleanLabel.length > 50) continue;

          const normalizedKey = normalizeFieldKey(cleanLabel);
          if (isStaticInstitutionalMetadata(cleanLabel, normalizedKey)) continue;
          if (!fieldsMap.has(normalizedKey)) {
            const cleanVal = rawVal.replace(/^[_\s\.\–—-]+|[_\s\.\–—-]+$/g, "").trim();
            const fType = inferFieldType(normalizedKey, cleanLabel);

            fieldsMap.set(normalizedKey, {
              id: `fld_${normalizedKey}`,
              name: normalizedKey,
              label: cleanLabel,
              type: fType,
              required: isLikelyRequired(normalizedKey, cleanLabel),
              pageNumber: pageNum,
              boundingBox: {
                x: Math.round(lineX),
                y: Math.round(y),
                width: Math.max(140, Math.round(lineWidth)),
                height: Math.round(lineHeight),
              },
              isSignature: fType === "signature",
              defaultValue: cleanVal || undefined,
              confidence: cleanVal ? 0.92 : 0.88,
              adminConfirmed: true,
              sourceEvidence: `PDF text "${cleanLabel}: ${cleanVal || "blank"}" at page ${pageNum} (y:${Math.round(y)})`,
              repeatedFieldKeys: [cleanLabel, normalizedKey],
              description: cleanVal ? `Template default / sample: "${cleanVal}"` : "Variable field",
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
    signatureFields: detectSignatureSections(fullText),
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
