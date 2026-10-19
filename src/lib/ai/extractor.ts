import OpenAI from "openai";
import {
  DocumentType,
  ExtractionResult,
  MissingFieldQuestion,
  StructuredEventData,
  TemplateField,
} from "@/types";
import { evaluateMissingFields } from "@/schemas/event.schema";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Deterministic zero-fabrication fallback extractor.
 * Strictly extracts only what the user explicitly stated.
 * Missing details are strictly null and trigger targeted questions.
 */
function mockExtractEventData(
  rawText: string,
  templateFields?: TemplateField[],
  templateName?: string
): {
  data: Record<string, any>;
  detectedTypes: DocumentType[];
  missingFieldQuestions: MissingFieldQuestion[];
} {
  const text = rawText.toLowerCase();

  // 1. Event Name
  let eventName: string | null = null;
  const namePatterns = [
    /(?:titled|named|called)\s+["']?([^"'\n\r,\.]+?)["']?(?:\s+on\s+|\s+at\s+|\s+for\s+|\s+from\s+|\.|\,|$|\n)/i,
    /event(?:\s+name)?(?:\s+is|\s*:)\s*["']?([A-Za-z0-9\s&+\-–—]+?)["']?(?:\.|\,|$|\n)/i,
    /(?:organizing|host(?:ing)?|conducting|plan(?:ning)?)\s+(?:an?|the)?\s*([A-Za-z0-9\s&+\-–—]+?)(?:\s+on\s+|\s+at\s+|\s+for\s+|\s+from\s+|\.|\,)/i,
    /(?:hands-on|workshop|hackathon|seminar|session|webinar)\s+(?:on|about)\s+([A-Za-z0-9\s&+\-–—]+?)(?:\s+on\s+|\s+at\s+|\s+for\s+|\.|\,)/i,
  ];
  for (const pat of namePatterns) {
    const m = rawText.match(pat);
    if (m && m[1].trim().length > 2) {
      let candidate = m[1].trim();
      candidate = candidate.replace(/^(?:an?\s+|the\s+)?(?:workshop|event|seminar|hackathon|session|webinar)\s+(?:titled|named|called)\s+/i, "");
      eventName = candidate.replace(/^["']|["']$/g, "").trim();
      break;
    }
  }

  // 2. Event Type
  let eventType: string | null = null;
  if (text.includes("workshop")) eventType = "Workshop";
  else if (text.includes("hackathon")) eventType = "Hackathon";
  else if (text.includes("seminar") || text.includes("talk") || text.includes("lecture")) eventType = "Seminar";
  else if (text.includes("meeting")) eventType = "Meeting";
  else if (text.includes("competition") || text.includes("contest")) eventType = "Competition";
  else if (text.includes("webinar")) eventType = "Webinar";

  // 3. Start Date
  let startDate: string | null = null;
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(?:on|date(?:\s+is|\s*:)?)\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i,
    /(?:on|date(?:\s+is|\s*:)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:,?\s*(\d{4}))?/i,
  ];
  for (const pat of datePatterns) {
    const m = rawText.match(pat);
    if (m) {
      if (m[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
        startDate = m[0];
      } else {
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthPart = isNaN(Number(m[1])) ? m[1] : m[2];
        const dayPart = isNaN(Number(m[1])) ? m[2] : m[1];
        const monthStr = monthPart.toLowerCase().slice(0, 3);
        const yearStr = m[3] || new Date().getFullYear().toString();
        const mIdx = monthNames.indexOf(monthStr);
        if (mIdx !== -1) {
          const mm = String(mIdx + 1).padStart(2, "0");
          const dd = String(dayPart).padStart(2, "0");
          startDate = `${yearStr}-${mm}-${dd}`;
        }
      }
      break;
    }
  }

  // 4. Start & End Times
  let startTime: string | null = null;
  let endTime: string | null = null;
  const timeRangeMatch = rawText.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (timeRangeMatch) {
    startTime = timeRangeMatch[1].trim();
    endTime = timeRangeMatch[2].trim();
  } else {
    const singleTimeMatch = rawText.match(/(?:at|from|time(?:\s+is|\s*:)?)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (singleTimeMatch) {
      startTime = singleTimeMatch[1].trim();
    }
  }

  // 5. Venue
  let venue: string | null = null;
  const venueMatch = rawText.match(/(?:at\s+the|at|venue(?:\s+is|\s*:))\s+([A-Za-z0-9\s,\-\.]+?)(?:\s+from|\s+on\s+|\s+with\s+|\s+organized|\.|\,|$|\n)/i);
  if (venueMatch && venueMatch[1].trim().length > 2) {
    venue = venueMatch[1].trim().replace(/^the\s+/i, "");
  }

  // 6. Faculty Coordinator
  let facultyCoordinator: string | null = null;
  const coordMatch = rawText.match(/(?:faculty coordinator|coordinator|faculty advisor|advisor|coordinated by|supervised by)(?:\s+is|\s*:)?\s*(?:prof\.?|dr\.?)?\s*([A-Za-z\s]+?)(?:\.|\,|$|\s+and|\s+from|\n)/i);
  if (coordMatch) {
    facultyCoordinator = coordMatch[1].trim();
  }

  // 7. Department HOD
  let departmentHOD: string | null = null;
  const hodMatch = rawText.match(/(?:hod|head of department)(?:\s+is|\s*:)?\s*(?:dr\.?|prof\.?)?\s*([A-Za-z\s]+?)(?:\.|\,|$|\s+for|\s+and|\n)/i);
  if (hodMatch) {
    departmentHOD = hodMatch[1].trim();
  }

  // 8. Organizer Name / Student Lead
  let organizerName: string | null = null;
  const orgMatch = rawText.match(/(?:student lead|organizer|submitted by|lead|coordinated by student)(?:\s+is|\s*:)?\s*([A-Za-z\s]+?)(?:\.|\,|$|\n)/i);
  if (orgMatch) {
    organizerName = orgMatch[1].trim();
  }

  // 9. Club Name
  let clubName: string | null = null;
  const clubMatch = rawText.match(/(?:organized by|by club|by society|club(?:\s+is|\s*:)?)\s*([A-Za-z0-9\s\(\)]+?(?:club|society|chapter|gdg|gdsc|acm|ieee))/i);
  if (clubMatch) {
    clubName = clubMatch[1].trim();
  } else {
    const standaloneClub = rawText.match(/\b(acm|gdsc|gdg|ieee|robotics club|coding club)\b/i);
    if (standaloneClub) {
      clubName = standaloneClub[0].trim();
    }
  }

  // 10. Budget
  let budgetRequested: number | null = null;
  const budgetMatch = rawText.match(/(?:budget|requested budget|budget requested|amount|estimated cost)(?:\s+is|\s*:)?\s*(?:inr|rs\.?|₹|\$)?\s*([\d,]+)/i);
  if (budgetMatch) {
    budgetRequested = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
  }

  // 11. Participants
  let expectedParticipants: number | null = null;
  const numFirstMatch = rawText.match(/(\d{1,5})\s+(?:participants|students|attendees|delegates|people|audience)/i);
  if (numFirstMatch) {
    expectedParticipants = parseInt(numFirstMatch[1], 10);
  } else {
    const partMatch = rawText.match(/(?:expected participants|attendance|expected students|students|participants|audience size|attendees)(?:\s*:|\s+is|\s*around|\s*approx|\s*of)?\s*(\d{1,5})/i);
    if (partMatch) {
      expectedParticipants = parseInt(partMatch[1], 10);
    }
  }

  // 12. Speaker Details
  let speakerName: string | null = null;
  let speakerOrg: string | null = null;
  let speakerDesignation: string | null = null;
  let speakerTopic: string | null = null;

  const speakerMatch = rawText.match(/(?:speaker|keynote speaker|guest speaker|inviting|guest)(?:\s+is|\s*:)?\s*([A-Za-z\s\.]+?)(?:\s+from|\s+of|\s*\(|,|\.|$|\n)/i);
  if (speakerMatch && speakerMatch[1].trim().length > 2) {
    speakerName = speakerMatch[1].trim();
    const orgMatch = rawText.match(new RegExp(`${speakerName}[^.\\n]*?(?:from|of|at)\\s+([A-Za-z0-9\\s]+?)(?:\\.|\\,|\\n|$)`, "i"));
    if (orgMatch) speakerOrg = orgMatch[1].trim();

    const desigMatch = rawText.match(/(?:senior|lead|principal|staff)?\s*(?:ai|software|cloud|systems)?\s*(?:engineer|scientist|director|professor|manager|architect)/i);
    if (desigMatch) speakerDesignation = desigMatch[0].trim();
  }

  const topicMatch = rawText.match(/(?:on the topic of|keynote on|topic(?:\s+is|\s*:)|session on)\s*["']?([^"'\n\r\.]+?)["']?(?:\.|\,|$|\n)/i);
  if (topicMatch) {
    speakerTopic = topicMatch[1].trim();
  }

  // 13. Target Audience
  let targetAudience: string | null = null;
  const audMatch = rawText.match(/(?:for|audience(?:\s+is)?)\s+([\d\w\s]+?(?:students|year|cse|ece|it|engineering))/i);
  if (audMatch) {
    targetAudience = audMatch[1].trim();
  }

  // 14. Email & Phone
  let contactEmail: string | null = null;
  const emailMatch = rawText.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) contactEmail = emailMatch[0];

  let contactPhone: string | null = null;
  const phoneMatch = rawText.match(/(?:\+91\s*)?[6-9]\d{9}|\b\d{10}\b/);
  if (phoneMatch) contactPhone = phoneMatch[0];

  // 15. Explicit description or subject if provided
  let eventDescription: string | null = null;
  const descMatch = rawText.match(/(?:description|about the event|summary|overview)(?:\s*:|\s+is)\s*([^.\n]+(?:\.[^.\n]+)*)/i);
  if (descMatch) eventDescription = descMatch[1].trim();

  let subject: string | null = null;
  const subjMatch = rawText.match(/(?:subject|re|regarding)(?:\s*:|\s+is)\s*([^.\n]+)/i);
  if (subjMatch) subject = subjMatch[1].trim();

  // Map to document fields
  const data: Record<string, any> = {};

  // Standard pool of extracted facts
  const pool: Record<string, any> = {
    eventName,
    titleOfTheEvent: eventName,
    eventType,
    categoryOfTheEvent: eventType,
    startDate,
    endDate: null,
    scheduleOfEvent: startDate,
    scheduleOfEventDateDay: startDate,
    startTime,
    endTime,
    venue,
    eventVenue: venue,
    facultyCoordinator,
    coordinator: facultyCoordinator,
    departmentHOD,
    organizerName,
    studentLead: organizerName,
    clubName,
    budgetRequested,
    amount: budgetRequested,
    expectedParticipants,
    speakerName,
    speakerOrganization: speakerOrg,
    speakerDesignation,
    speakerTopic,
    targetAudience,
    contactEmail,
    contactPhone,
    eventDescription,
    briefDescription: eventDescription,
    subject,
  };

  // Populate specified template fields or standard fields
  const fieldsToCheck = templateFields && templateFields.length > 0
    ? templateFields
    : Object.keys(pool).map((k) => ({
        id: k,
        name: k,
        label: k,
        type: "text" as any,
        required: ["eventName", "startDate", "venue", "facultyCoordinator"].includes(k),
      }));

  const missingFieldQuestions: MissingFieldQuestion[] = [];

  for (const field of fieldsToCheck) {
    const val = pool[field.name] ?? pool[field.id] ?? null;
    data[field.name] = val;

    // Zero-fabrication check: if required and missing, ask the user!
    if (field.required && (val === null || val === undefined || String(val).trim() === "")) {
      missingFieldQuestions.push({
        fieldKey: field.name,
        question: `Please provide the ${field.label || field.name} for this document.`,
        reason: `Mandatory detail required for "${templateName || "Document"}". Not found in your description.`,
        suggestedInputType:
          field.type === "textarea"
            ? "textarea"
            : field.type === "number" || field.type === "currency"
            ? "number"
            : field.type === "date"
            ? "date"
            : field.type === "time"
            ? "time"
            : "text",
      });
    }
  }

  const detectedTypes: DocumentType[] = [];
  if (text.includes("permission") || text.includes("lab") || text.includes("hall") || text.includes("hod")) {
    detectedTypes.push("PERMISSION_LETTER");
  }
  if (text.includes("proposal") || text.includes("budget") || text.includes("sanction")) {
    detectedTypes.push("EVENT_PROPOSAL");
  }
  if (text.includes("invite") || text.includes("speaker") || text.includes("guest")) {
    detectedTypes.push("INVITATION_LETTER");
  }
  if (detectedTypes.length === 0) detectedTypes.push("EVENT_PROPOSAL");

  return { data, detectedTypes, missingFieldQuestions };
}

/**
 * Main AI extraction engine.
 * Prompts the AI with the exact fields of the selected document template.
 * Strictly avoids inventing unmentioned facts (zero-fabrication) and
 * prompts the user with questions for any missing required data.
 */
export async function extractEventInformation(
  rawText: string,
  targetDocumentTypes?: DocumentType[],
  templateFields?: TemplateField[],
  templateName?: string
): Promise<ExtractionResult> {
  const useMock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY || !openai;

  let extractedData: Record<string, any> = {};
  let detectedTypes: DocumentType[] = targetDocumentTypes || [];
  let missingFieldQuestions: MissingFieldQuestion[] = [];

  if (useMock) {
    const mock = mockExtractEventData(rawText, templateFields, templateName);
    extractedData = mock.data;
    detectedTypes = detectedTypes.length > 0 ? detectedTypes : mock.detectedTypes;
    missingFieldQuestions = mock.missingFieldQuestions;
  } else {
    try {
      const fieldListPrompt = templateFields && templateFields.length > 0
        ? templateFields
            .map(
              (f) =>
                `- Field Key: "${f.name}"
  Label/Display Name: "${f.label}"
  Data Type: ${f.type}
  Requirement: ${f.required ? "REQUIRED (must be extracted if mentioned; if NOT mentioned, return null)" : "OPTIONAL (extract if mentioned, otherwise null)"}${f.description ? `\n  Field Context/Description: ${f.description}` : ""}`
            )
            .join("\n\n")
        : `Standard document fields to extract:
- Field Key: "eventName" | Label: "Event Title" | Type: text | Requirement: REQUIRED
- Field Key: "eventType" | Label: "Event Type" (e.g. Workshop, Hackathon, Seminar, Competition) | Type: text | Requirement: OPTIONAL
- Field Key: "startDate" | Label: "Start Date" (format YYYY-MM-DD) | Type: date | Requirement: REQUIRED
- Field Key: "endDate" | Label: "End Date" (format YYYY-MM-DD) | Type: date | Requirement: OPTIONAL
- Field Key: "startTime" | Label: "Start Time" (e.g. 10:00 AM) | Type: time | Requirement: OPTIONAL
- Field Key: "endTime" | Label: "End Time" (e.g. 01:00 PM) | Type: time | Requirement: OPTIONAL
- Field Key: "venue" | Label: "Venue / Room / Lab" | Type: text | Requirement: REQUIRED
- Field Key: "facultyCoordinator" | Label: "Faculty Coordinator" | Type: text | Requirement: REQUIRED
- Field Key: "departmentHOD" | Label: "Head of Department (HOD)" | Type: text | Requirement: OPTIONAL
- Field Key: "organizerName" | Label: "Student Lead / Organizer Name" | Type: text | Requirement: OPTIONAL
- Field Key: "clubName" | Label: "Organizing Club / Society / Chapter" | Type: text | Requirement: OPTIONAL
- Field Key: "budgetRequested" | Label: "Budget Amount" | Type: number | Requirement: OPTIONAL
- Field Key: "expectedParticipants" | Label: "Expected Participants Count" | Type: number | Requirement: OPTIONAL
- Field Key: "speakerName" | Label: "Guest Speaker Name" | Type: text | Requirement: OPTIONAL
- Field Key: "speakerOrganization" | Label: "Speaker Organization / Company" | Type: text | Requirement: OPTIONAL
- Field Key: "speakerDesignation" | Label: "Speaker Designation / Title" | Type: text | Requirement: OPTIONAL
- Field Key: "speakerTopic" | Label: "Speaker Topic / Presentation Title" | Type: text | Requirement: OPTIONAL
- Field Key: "targetAudience" | Label: "Target Audience" | Type: text | Requirement: OPTIONAL
- Field Key: "contactEmail" | Label: "Contact Email" | Type: email | Requirement: OPTIONAL
- Field Key: "contactPhone" | Label: "Contact Phone" | Type: phone | Requirement: OPTIONAL
- Field Key: "eventDescription" | Label: "Event Description / Summary" | Type: textarea | Requirement: OPTIONAL`;

      const systemPrompt = `You are a high-precision, zero-hallucination institutional data extraction AI.
Your task is to parse the user's natural language event description paragraph and extract available facts for the specified fields of the document template "${templateName || "Institutional Document"}".

SPECIFICATION OF FIELDS TO EXTRACT:
${fieldListPrompt}

STRICT RETRIEVAL & EXTRACTION RULES:
1. THOROUGH DATA RETRIEVAL:
   - Carefully examine every sentence, clause, number, and name in the user's paragraph.
   - Accurately map phrases from the user's paragraph to the corresponding document field based on the field's key, label, synonyms, and natural context:
     * Event title / name: e.g., "AI Agents Workshop", "HackNIT 2026", "Deep Learning Seminar".
     * Dates: When day, month, and year are clearly identifiable, convert to standard ISO format "YYYY-MM-DD" (e.g. "Nov 14, 2026" -> "2026-11-14").
     * Times: Extract start and end times cleanly (e.g., "10:00 AM", "01:00 PM").
     * Venues: Extract room, lab, auditorium, or location (e.g., "CS Lab 3", "Main Auditorium").
     * Club / Organization: Extract the organizing body (e.g., "ACM", "GDSC", "Robotics Club").
     * People / Roles: Extract exact names for roles explicitly stated (e.g. faculty coordinator, speaker, student lead).
     * Numbers & Financials: Extract clean numeric values without currency symbols or commas (e.g. 1200, 120).

2. ZERO-GUESSING & ZERO-FABRICATION (ABSOLUTE MANDATE):
   - CRITICAL: IF A FIELD IS MISSING OR NOT EXPLICITLY MENTIONED IN THE USER'S PARAGRAPH, YOU MUST LEAVE IT AS NULL.
   - DO NOT GUESS, ASSUME, EXTRAPOLATE, OR FABRICATE ANY VALUES.
   - Do NOT assume current year or default dates if the year is missing. If the date is incomplete (e.g., "on Friday"), return null.
   - Do NOT assume standard hours (e.g. 9:00 AM - 5:00 PM) if time is not specified in the text; return null.
   - Do NOT assume or invent names of people, faculty coordinators, HODs, or speakers.
   - Do NOT prepend honorifics or titles (e.g. "Dr." or "Prof.") unless the user explicitly included the title in their text.
   - Do NOT invent venues, rooms, participant counts, budgets, or contact information.
   - Do NOT output placeholder strings such as "N/A", "TBD", "None", "Unknown", or empty strings. Missing fields MUST be literal null.

3. HANDLING MISSING REQUIRED FIELDS:
   - For every REQUIRED field that is missing from the user's paragraph (and therefore set to null in extractedData), you MUST include a targeted, polite question in "missingFieldQuestions" asking the user to provide that specific required information.
   - Do NOT generate questions for optional fields that are missing/null.

RESPONSE FORMAT:
You MUST return pure JSON matching this exact structure:
{
  "extractedData": {
    // Every specified field key mapped to its extracted value (string, number, or null)
  },
  "missingFields": [
    // Array of REQUIRED field keys that are null
  ],
  "missingFieldQuestions": [
    {
      "fieldKey": "field_key_name",
      "question": "Clear, specific question asking the user to supply this detail",
      "reason": "Why this field is required for the document",
      "suggestedInputType": "text" | "number" | "date" | "time" | "textarea"
    }
  ]
}`;

      const userPrompt = `User Natural Language Input Paragraph:
"""
${rawText}
"""`;

      const response = await openai!.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.0,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from AI model");
      }

      const parsed = JSON.parse(content);
      const rawExtracted = parsed.extractedData || parsed.data || parsed;

      // Normalize extracted data against fields: do not retain empty strings, "null", "N/A", or fake placeholders
      if (templateFields && templateFields.length > 0) {
        for (const field of templateFields) {
          let val = rawExtracted[field.name];
          if (val === undefined || val === null) {
            val = rawExtracted[field.label] ?? rawExtracted[field.id];
          }

          if (
            val === undefined ||
            val === null ||
            val === "" ||
            val === "null" ||
            val === "N/A" ||
            val === "TBD" ||
            val === "None"
          ) {
            extractedData[field.name] = null;
          } else {
            extractedData[field.name] = val;
          }
        }
      } else {
        for (const [k, v] of Object.entries(rawExtracted)) {
          if (v === "" || v === "null" || v === "N/A" || v === "TBD" || v === "None" || v === undefined) {
            extractedData[k] = null;
          } else {
            extractedData[k] = v;
          }
        }
      }

      // Collect questions from AI or compute missing required fields deterministically
      if (Array.isArray(parsed.missingFieldQuestions) && parsed.missingFieldQuestions.length > 0) {
        missingFieldQuestions = parsed.missingFieldQuestions.map((q: any) => ({
          fieldKey: String(q.fieldKey || ""),
          question: String(q.question || ""),
          reason: String(q.reason || ""),
          suggestedInputType: (["text", "date", "time", "number", "select", "textarea"].includes(q.suggestedInputType)
            ? q.suggestedInputType
            : "text") as MissingFieldQuestion["suggestedInputType"],
        }));
      }

      // Guarantee every required field that is null has a question
      const requiredToCheck = templateFields
        ? templateFields.filter((f) => f.required && !f.isFixed)
        : [];
      const askedKeys = new Set(missingFieldQuestions.map((q) => String(q.fieldKey)));

      for (const f of requiredToCheck) {
        const val = extractedData[f.name];
        if ((val === null || val === undefined || String(val).trim() === "") && !askedKeys.has(f.name)) {
          missingFieldQuestions.push({
            fieldKey: f.name,
            question: `Please provide the ${f.label || f.name} for this document.`,
            reason: `Mandatory detail required for "${templateName || "Document"}".`,
            suggestedInputType:
              f.type === "textarea"
                ? "textarea"
                : f.type === "number" || f.type === "currency"
                ? "number"
                : f.type === "date"
                ? "date"
                : f.type === "time"
                ? "time"
                : "text",
          });
          askedKeys.add(f.name);
        }
      }
    } catch (err) {
      console.warn("OpenAI extraction error, falling back to local extractor:", err);
      const mock = mockExtractEventData(rawText, templateFields, templateName);
      extractedData = mock.data;
      detectedTypes = detectedTypes.length > 0 ? detectedTypes : mock.detectedTypes;
      missingFieldQuestions = mock.missingFieldQuestions;
    }
  }

  // Also build StructuredEventData format for downstream compatibility
  const structuredData: StructuredEventData = {
    eventName: extractedData.eventName || extractedData.titleOfTheEvent || null,
    eventType: extractedData.eventType || extractedData.categoryOfTheEvent || null,
    eventDescription: extractedData.eventDescription || extractedData.briefDescription || null,
    targetAudience: extractedData.targetAudience || null,
    expectedParticipants: extractedData.expectedParticipants || null,
    startDate: extractedData.startDate || extractedData.scheduleOfEvent || null,
    endDate: extractedData.endDate || extractedData.startDate || null,
    startTime: extractedData.startTime || null,
    endTime: extractedData.endTime || null,
    venue: extractedData.venue || extractedData.eventVenue || null,
    isOnline: false,
    meetingLink: null,
    organizerName: extractedData.organizerName || extractedData.studentLead || null,
    clubName: extractedData.clubName || null,
    facultyCoordinator: extractedData.facultyCoordinator || null,
    departmentHOD: extractedData.departmentHOD || null,
    budgetRequested: extractedData.budgetRequested || extractedData.amount || null,
    speaker: extractedData.speakerName
      ? {
          name: extractedData.speakerName,
          designation: extractedData.speakerDesignation || null,
          organization: extractedData.speakerOrganization || null,
        }
      : null,
    registrationDeadline: null,
    contactEmail: extractedData.contactEmail || null,
    contactPhone: extractedData.contactPhone || null,
    requiresLabComputers: false,
    ...extractedData,
  };

  const isComplete = missingFieldQuestions.length === 0;

  return {
    extractedData: structuredData,
    detectedDocumentTypes: detectedTypes,
    missingFieldQuestions,
    rawText,
    isComplete,
  };
}
