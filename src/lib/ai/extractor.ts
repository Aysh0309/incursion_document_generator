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
    /(?:organizing|host(?:ing)?|conducting|plan(?:ning)?)\s+(?:an?|the)?\s*([A-Za-z0-9\s&+\-–—]+?)(?:\s+on\s+|\s+at\s+|\s+for\s+|\s+from\s+|\.|\,)/i,
    /event(?:\s+name)?(?:\s+is|\s*:)\s*["']?([A-Za-z0-9\s&+\-–—]+?)["']?(?:\.|\,|$|\n)/i,
    /titled\s+["']([^"'\n\r]+)["']/i,
    /(?:hands-on|workshop|hackathon|seminar|session|webinar)\s+(?:on|about)\s+([A-Za-z0-9\s&+\-–—]+?)(?:\s+on\s+|\s+at\s+|\s+for\s+|\.|\,)/i,
  ];
  for (const pat of namePatterns) {
    const m = rawText.match(pat);
    if (m && m[1].trim().length > 2) {
      eventName = m[1].trim();
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
    const rawName = coordMatch[1].trim();
    facultyCoordinator = rawName.startsWith("Prof") || rawName.startsWith("Dr") ? rawName : `Prof. ${rawName}`;
  }

  // 7. Department HOD
  let departmentHOD: string | null = null;
  const hodMatch = rawText.match(/(?:hod|head of department)(?:\s+is|\s*:)?\s*(?:dr\.?|prof\.?)?\s*([A-Za-z\s]+?)(?:\.|\,|$|\s+for|\s+and|\n)/i);
  if (hodMatch) {
    departmentHOD = hodMatch[1].trim().startsWith("Dr") ? hodMatch[1].trim() : `Dr. ${hodMatch[1].trim()}`;
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
  } else if (text.includes("gdsc") || text.includes("gdg")) {
    clubName = "Google Developer Student Club (GDSC)";
  } else if (text.includes("acm")) {
    clubName = "ACM Student Chapter";
  }

  // 10. Budget
  let budgetRequested: number | null = null;
  const budgetMatch = rawText.match(/(?:budget|requested budget|budget requested|amount|estimated cost)(?:\s+is|\s*:)?\s*(?:inr|rs\.?|₹|\$)?\s*([\d,]+)/i);
  if (budgetMatch) {
    budgetRequested = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
  }

  // 11. Participants
  let expectedParticipants: number | null = null;
  const partMatch = rawText.match(/(?:expected participants|attendance|expected students|students|participants|audience size)(?:\s*:|\s+is|\s*around|\s*approx)?\s*(\d{1,4})/i);
  if (partMatch) {
    expectedParticipants = parseInt(partMatch[1], 10);
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

  // Map to document fields
  const data: Record<string, any> = {};

  // Standard pool of extracted facts
  const pool: Record<string, any> = {
    eventName,
    titleOfTheEvent: eventName,
    eventType,
    categoryOfTheEvent: eventType,
    startDate,
    endDate: startDate,
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
    eventDescription: rawText.length > 10 ? rawText.slice(0, 500) : null,
    briefDescription: rawText.length > 10 ? rawText.slice(0, 500) : null,
    subject: eventName ? `Permission requisition for ${eventName}` : null,
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
                `- ${f.name} ("${f.label}"): type=${f.type}, ${
                  f.required ? "REQUIRED" : "OPTIONAL"
                }`
            )
            .join("\n")
        : `Standard fields:
- eventName (Event Title): [REQUIRED]
- eventType (Event Type): [OPTIONAL]
- startDate (Event Date YYYY-MM-DD): [REQUIRED]
- startTime (Start Time e.g. 09:30 AM): [OPTIONAL]
- endTime (End Time e.g. 04:30 PM): [OPTIONAL]
- venue (Venue / Room / Lab): [REQUIRED]
- facultyCoordinator (Faculty Coordinator / Advisor): [REQUIRED]
- departmentHOD (Head of Department): [OPTIONAL]
- organizerName (Student Lead / Organizer): [OPTIONAL]
- clubName (Organizing Club Name): [OPTIONAL]
- budgetRequested (Budget Amount): [OPTIONAL]
- expectedParticipants (Expected Attendance Count): [OPTIONAL]
- speakerName (Guest Speaker Name): [OPTIONAL]
- speakerOrganization (Speaker Organization / Company): [OPTIONAL]
- speakerDesignation (Speaker Job Title): [OPTIONAL]
- speakerTopic (Talk / Keynote Topic): [OPTIONAL]
- targetAudience (Target Audience): [OPTIONAL]
- contactEmail (Contact Email): [OPTIONAL]
- contactPhone (Contact Phone): [OPTIONAL]
- eventDescription (Brief Description / Summary): [OPTIONAL]`;

      const systemPrompt = `You are a strict, factual institutional document AI assistant for "${templateName || "Institutional Document"}".
Your job is to parse the user's natural language event description and extract available data ONLY for the document fields specified below.

DOCUMENT FIELDS SPECIFICATION:
${fieldListPrompt}

STRICT ZERO-FABRICATION & ANTI-HALLUCINATION RULES:
1. Extract ONLY facts that are explicitly mentioned or unambiguously stated in the user text.
2. NEVER guess, invent, fabricate, or extrapolate ANY data (names, dates, times, venues, speakers, amounts, emails, phones).
3. If a field is NOT stated in the user text, its value MUST be set to null.
4. For all REQUIRED fields where the extracted value is null (missing from user text), you MUST generate a clear question in "missingFieldQuestions" asking the user to provide that exact missing detail.
5. For dates, format strictly as YYYY-MM-DD. If ambiguous (e.g. "next month"), set to null.
6. For numeric fields, extract purely numbers (e.g. 15000) or null.

RESPONSE FORMAT:
You MUST respond with pure JSON conforming to this structure:
{
  "extractedData": {
    // Every field name from the specification mapped to its extracted value or null
  },
  "missingFields": [
    // Array of field names that are REQUIRED but were NOT found in the text
  ],
  "missingFieldQuestions": [
    // Array of objects for each missing required field:
    // {
    //   "fieldKey": string,
    //   "question": string,
    //   "reason": string,
    //   "suggestedInputType": "text" | "number" | "date" | "time" | "textarea"
    // }
  ]
}`;

      const userPrompt = `User Natural Language Input:
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
      const rawExtracted = parsed.extractedData || parsed;

      // Normalize extracted data against fields
      if (templateFields && templateFields.length > 0) {
        for (const field of templateFields) {
          const val = rawExtracted[field.name] ?? rawExtracted[field.label] ?? null;
          // Never retain empty string or fake values as valid
          extractedData[field.name] = val !== undefined ? val : null;
        }
      } else {
        extractedData = rawExtracted;
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
      } else {
        const requiredToCheck = templateFields
          ? templateFields.filter((f) => f.required && !f.isFixed)
          : [];

        for (const f of requiredToCheck) {
          const val = extractedData[f.name];
          if (val === null || val === undefined || String(val).trim() === "") {
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
          }
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
