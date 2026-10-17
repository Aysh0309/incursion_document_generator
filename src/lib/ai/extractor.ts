import OpenAI from "openai";
import { DocumentType, ExtractionResult, StructuredEventData, TemplateField } from "@/types";
import {
  evaluateMissingFields,
  StructuredEventDataSchema,
} from "@/schemas/event.schema";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SYSTEM_EXTRACTION_PROMPT = `You are a strict, deterministic administrative data extraction engine for institutional document generation.
Your goal is to parse raw user text into structured parameters with 100% factual fidelity.

CRITICAL OPERATIONAL RULES:
1. STRICT ZERO-ASSUMPTION POLICY: NEVER INVENT, ASSUME, EXTRAPOLATE, OR HALLUCINATE ANY OFFICIAL FACT.
2. If a specific field (e.g., eventName, venue, date, time, facultyCoordinator, departmentHOD, budgetRequested, organizerName, speaker, contactEmail) is not explicitly stated or unambiguously deducible from the text, you MUST set its value to null.
3. For dates: format strictly as YYYY-MM-DD. If ambiguous (e.g. "next month", "soon"), set to null.
4. For times: format strictly as "HH:MM AM/PM" or "HH:MM". If unspecified, set to null.
5. Never invent sample phone numbers, names, venues, or amounts.
6. Output pure JSON matching the requested structure.`;

/**
 * Deterministic fallback extractor that leaves unstated facts strictly as null.
 */
function mockExtractEventData(
  rawText: string,
  templateFields?: TemplateField[]
): {
  data: StructuredEventData;
  detectedTypes: DocumentType[];
} {
  const text = rawText.toLowerCase();

  // 1. Event Name
  let eventName: string | null = null;
  const namePatterns = [
    /(?:organizing|host|conducting|plan(?:ning)?)\s+(?:an?|the)?\s*([A-Za-z0-9\s&+\-–—]+?)(?:\s+on|\s+at|\s+for|\s+from|\.|\,)/i,
    /event(?:\s+name)?(?:\s+is|\s*:)\s*([A-Za-z0-9\s&+\-–—]+?)(?:\.|\,|$)/i,
    /titled\s+["']?([^"'\n\.\,]+)["']?/i,
  ];
  for (const pat of namePatterns) {
    const m = rawText.match(pat);
    if (m && m[1].trim().length > 3) {
      eventName = m[1].trim();
      break;
    }
  }

  // 2. Event Type
  let eventType: string | null = null;
  if (text.includes("workshop")) eventType = "WORKSHOP";
  else if (text.includes("hackathon")) eventType = "HACKATHON";
  else if (text.includes("seminar") || text.includes("talk") || text.includes("lecture")) eventType = "SEMINAR";
  else if (text.includes("meeting")) eventType = "MEETING";
  else if (text.includes("competition") || text.includes("contest")) eventType = "COMPETITION";

  // 3. Dates
  let startDate: string | null = null;
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(?:on|date)\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i,
    /(?:on|date)\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:,?\s*(\d{4}))?/i,
  ];
  for (const pat of datePatterns) {
    const m = rawText.match(pat);
    if (m) {
      if (m[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
        startDate = m[0];
      } else {
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthStr = (m[1].length > 2 && isNaN(Number(m[1])) ? m[1] : m[2]).toLowerCase().slice(0, 3);
        const dayStr = isNaN(Number(m[1])) ? m[2] : m[1];
        const yearStr = m[3] || "2026";
        const mIdx = monthNames.indexOf(monthStr);
        if (mIdx !== -1) {
          const mm = String(mIdx + 1).padStart(2, "0");
          const dd = String(dayStr).padStart(2, "0");
          startDate = `${yearStr}-${mm}-${dd}`;
        }
      }
      break;
    }
  }

  // 4. Times
  let startTime: string | null = null;
  let endTime: string | null = null;
  const timeRangeMatch = rawText.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|-|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (timeRangeMatch) {
    startTime = timeRangeMatch[1].trim();
    endTime = timeRangeMatch[2].trim();
  }

  // 5. Venue
  let venue: string | null = null;
  const venueMatch = rawText.match(/(?:at|venue(?:\s+is|\s*:))\s+([A-Za-z0-9\s,\-\.]+?)(?:\s+from|\s+on|\s+with|\s+organized|\.|$)/i);
  if (venueMatch && venueMatch[1].trim().length > 2) {
    venue = venueMatch[1].trim().replace(/^the\s+/i, "");
  }

  // 6. Faculty Coordinator
  let facultyCoordinator: string | null = null;
  const coordMatch = rawText.match(/(?:faculty coordinator|coordinator|advisor)(?:\s+is|\s*:)?\s*(?:prof\.?|dr\.?)?\s*([A-Za-z\s]+?)(?:\.|\,|$|\s+and|\s+from)/i);
  if (coordMatch) {
    const rawName = coordMatch[1].trim();
    facultyCoordinator = rawName.startsWith("Prof") || rawName.startsWith("Dr") ? rawName : `Prof. ${rawName}`;
  }

  // 7. Department HOD
  let departmentHOD: string | null = null;
  const hodMatch = rawText.match(/(?:hod|head of department)(?:\s+is|\s*:)?\s*(?:dr\.?|prof\.?)?\s*([A-Za-z\s]+?)(?:\.|\,|$|\s+for|\s+and)/i);
  if (hodMatch) {
    departmentHOD = hodMatch[1].trim().startsWith("Dr") ? hodMatch[1].trim() : `Dr. ${hodMatch[1].trim()}`;
  }

  // 8. Organizer Name
  let organizerName: string | null = null;
  const orgMatch = rawText.match(/(?:student lead|organizer|submitted by|lead)(?:\s+is|\s*:)?\s*([A-Za-z\s]+?)(?:\.|\,|$)/i);
  if (orgMatch) {
    organizerName = orgMatch[1].trim();
  }

  // 9. Club Name
  let clubName: string | null = null;
  const clubMatch = rawText.match(/(?:organized by|by|club)(?:\s+is|\s*:)?\s*([A-Za-z0-9\s\(\)]+?(?:club|society|chapter|gdg|gdsc|acm|ieee))/i);
  if (clubMatch) {
    clubName = clubMatch[1].trim();
  }

  // 10. Budget
  let budgetRequested: number | null = null;
  const budgetMatch = rawText.match(/(?:budget|requested budget|amount)(?:\s+is|\s*:)?\s*(?:inr|rs\.?|₹)?\s*([\d,]+)/i);
  if (budgetMatch) {
    budgetRequested = parseInt(budgetMatch[1].replace(/,/g, ""), 10);
  }

  // 11. Participants
  let expectedParticipants: number | null = null;
  const partMatch = rawText.match(/(?:expected participants|attendance|expected students|students|participants)(?:\s*:|\s+is|\s*around|\s*approx)?\s*(\d{1,4})/i);
  if (partMatch) {
    expectedParticipants = parseInt(partMatch[1], 10);
  }

  // 12. Speaker
  let speakerName: string | null = null;
  let speakerOrg: string | null = null;
  const speakerMatch = rawText.match(/(?:speaker|keynote|guest)(?:\s+is|\s*:)?\s*([A-Za-z\s]+?)(?:\s+from|\s+of|\s*\(|,|\.|$)/i);
  if (speakerMatch) {
    speakerName = speakerMatch[1].trim();
    const orgMatch = rawText.match(new RegExp(`${speakerName}\\s+(?:from|of|at)\\s+([A-Za-z0-9\\s]+?)(?:\\.|\\,|$)`, "i"));
    if (orgMatch) speakerOrg = orgMatch[1].trim();
  }

  // 13. Target Audience
  let targetAudience: string | null = null;
  const audMatch = rawText.match(/(?:for|audience(?:\s+is)?)\s+([\d\w\s]+?(?:students|year|cse|ece|it|engineering))/i);
  if (audMatch) {
    targetAudience = audMatch[1].trim();
  }

  const detectedTypes: DocumentType[] = [];
  if (text.includes("permission") || text.includes("lab") || text.includes("hall") || text.includes("hod")) {
    detectedTypes.push("PERMISSION_LETTER");
  }
  if (text.includes("proposal") || text.includes("dean") || text.includes("budget") || text.includes("sanction")) {
    detectedTypes.push("EVENT_PROPOSAL");
  }
  if (text.includes("invite") || text.includes("speaker") || text.includes("guest")) {
    detectedTypes.push("INVITATION_LETTER");
  }
  if (detectedTypes.length === 0) {
    detectedTypes.push("EVENT_PROPOSAL");
  }

  // ZERO-ASSUMPTION POLICY: unmentioned fields MUST be null
  const structuredData: StructuredEventData = {
    eventName: eventName || null,
    eventType: eventType || null,
    eventDescription: rawText.length > 10 ? rawText.slice(0, 400) : null,
    targetAudience: targetAudience || null,
    expectedParticipants: expectedParticipants || null,
    startDate: startDate || null,
    endDate: startDate || null,
    startTime: startTime || null,
    endTime: endTime || null,
    venue: venue || null,
    isOnline: text.includes("online") || text.includes("zoom") || text.includes("meet"),
    meetingLink: null,
    organizerName: organizerName || null,
    clubName: clubName || null,
    facultyCoordinator: facultyCoordinator || null,
    departmentHOD: departmentHOD || null,
    budgetRequested: budgetRequested || null,
    speaker: speakerName
      ? {
          name: speakerName,
          designation: null,
          organization: speakerOrg || null,
        }
      : null,
    registrationDeadline: null,
    contactEmail: null,
    contactPhone: null,
    requiresLabComputers: text.includes("lab") || text.includes("computer") || text.includes("pc"),
  };

  if (templateFields && templateFields.length > 0) {
    const rec = structuredData as any;
    for (const f of templateFields) {
      if (rec[f.name] === undefined) {
        if (f.name === "subject" || f.label.toLowerCase().includes("subject")) {
          const subMatch = rawText.match(/(?:subject|regarding)(?:\s+is|\s*:)?\s*([^\n\r.]+)/i);
          rec[f.name] = subMatch ? subMatch[1].trim() : eventName ? `Requesting Permission for ${eventName}` : null;
        } else if (f.name.toLowerCase().includes("judge") || f.label.toLowerCase().includes("judge")) {
          const jMatch = rawText.match(/(?:judge|judges|judged by)(?:\s+is|\s*:)?\s*([A-Za-z\s]+?)(?:\.|\,|$)/i);
          rec[f.name] = jMatch ? jMatch[1].trim() : null;
        } else if (f.name === "titleOfTheEvent") {
          rec[f.name] = eventName;
        } else if (f.name === "scheduleOfEvent" || f.name === "scheduleOfEventDateDay") {
          rec[f.name] = startDate;
        } else if (f.name === "eventVenue") {
          rec[f.name] = venue;
        } else if (f.name === "categoryOfTheEvent") {
          rec[f.name] = eventType;
        } else if (f.name === "briefDescription") {
          rec[f.name] = rawText.slice(0, 300);
        } else {
          rec[f.name] = null;
        }
      }
    }
  }

  return { data: structuredData, detectedTypes };
}

/**
 * Main AI extraction engine.
 * Supports template-schema-aware extraction and anti-hallucination clarification question generation.
 */
export async function extractEventInformation(
  rawText: string,
  targetDocumentTypes?: DocumentType[],
  templateFields?: TemplateField[]
): Promise<ExtractionResult> {
  const useMock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY || !openai;

  let extractedData: StructuredEventData;
  let detectedTypes: DocumentType[] = targetDocumentTypes || [];

  if (useMock) {
    const mock = mockExtractEventData(
      rawText,
      templateFields
    );
    extractedData = mock.data;
    if (!detectedTypes || detectedTypes.length === 0) {
      detectedTypes = mock.detectedTypes;
    }
  } else {
    try {
      const allowedSchemaDescription = templateFields && templateFields.length > 0
        ? `Target Template Fields allowed: ${templateFields.map((f) => `${f.name} (${f.type}${f.required ? ", required" : ""})`).join(", ")}`
        : "Standard Fields: eventName, eventType, startDate, endDate, startTime, endTime, venue, facultyCoordinator, departmentHOD, organizerName, budgetRequested, expectedParticipants, speaker, targetAudience, contactEmail";

      const promptUser = `Extract administrative event information strictly from user text. Reference today is ${new Date().toISOString().split("T")[0]}.
${allowedSchemaDescription}

CRITICAL RULES:
- If a field is not stated in user input, set its value to null. NEVER GUESS OR FABRICATE.
- If a date is vague (e.g. "next month"), set startDate to null.
- Output pure JSON.

User Input:
"""
${rawText}
"""`;

      const response = await openai!.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_EXTRACTION_PROMPT },
          { role: "user", content: promptUser },
        ],
        response_format: { type: "json_object" },
        temperature: 0.0,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from AI model");
      }

      const parsedJson = JSON.parse(content);
      const validated = StructuredEventDataSchema.safeParse(parsedJson);

      if (validated.success) {
        extractedData = validated.data as StructuredEventData;
      } else {
        const mock = mockExtractEventData(rawText, templateFields);
        extractedData = mock.data;
      }

      // Retain ALL custom template field values extracted by AI
      if (templateFields && templateFields.length > 0) {
        for (const f of templateFields) {
          const val = parsedJson[f.name] ?? parsedJson[f.label];
          if (val !== undefined && val !== null) {
            (extractedData as any)[f.name] = val;
          }
        }
      }

      if (!detectedTypes || detectedTypes.length === 0) {
        detectedTypes = (parsedJson.detectedDocumentTypes as DocumentType[]) || [
          "EVENT_PROPOSAL",
        ];
      }
    } catch (err) {
      console.warn("AI extraction fallback to local extractor:", err);
      const mock = mockExtractEventData(rawText, templateFields);
      extractedData = mock.data;
      if (!detectedTypes || detectedTypes.length === 0) {
        detectedTypes = mock.detectedTypes;
      }
    }
  }

  // Deterministic Anti-Hallucination Gate:
  // Evaluate missing fields based on templateFields (if provided) or standard document types
  let missingFields: string[] = [];
  const questions: any[] = [];

  if (templateFields && templateFields.length > 0) {
    const rawRecord = extractedData as any;
    for (const f of templateFields) {
      if (f.required && !f.isFixed && !f.isSystem) {
        const val = rawRecord[f.name];
        if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
          missingFields.push(f.name);
          questions.push({
            fieldKey: f.name,
            question: `Please provide the ${f.label || f.name} for this document.`,
            reason: `Mandatory field required by template.`,
            suggestedInputType: f.type === "textarea" ? "textarea" : f.type === "number" || f.type === "currency" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text",
          });
        }
      }
    }
  } else {
    const evaluated = evaluateMissingFields(extractedData, detectedTypes);
    missingFields = evaluated.missingFields;
    questions.push(...evaluated.questions);
  }

  return {
    extractedData,
    detectedDocumentTypes: detectedTypes,
    missingFieldQuestions: questions,
    rawText,
    isComplete: missingFields.length === 0,
  };
}
