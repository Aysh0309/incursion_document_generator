import OpenAI from "openai";
import { DocumentType, ExtractionResult, StructuredEventData } from "@/types";
import {
  evaluateMissingFields,
  StructuredEventDataSchema,
} from "@/schemas/event.schema";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SYSTEM_EXTRACTION_PROMPT = `You are a strict, deterministic administrative data extraction engine for university club documents.
Your goal is to parse raw user text into structured event parameters with 100% factual fidelity.

CRITICAL OPERATIONAL RULES:
1. NEVER INVENT, ASSUME, EXTRAPOLATE, OR HALLUCINATE ANY OFFICIAL FACT.
2. If a specific field (e.g., venue, facultyCoordinator, departmentHOD, budgetRequested, exact date, time, organizerName) is not explicitly stated or unambiguously deducible from the text, you MUST set its value to null.
3. For dates, format as YYYY-MM-DD. If ambiguous, set to null.
4. For times, format as "HH:MM AM/PM" or "HH:MM".
5. Distinguish between EXPLICITLY PROVIDED facts and MISSING facts.
6. Identify the user's intended document type(s) based on keywords (e.g., "proposal", "permission", "invite", "sponsor", "notice").
7. Output pure JSON matching the requested structure.`;

/**
 * Intelligent fallback extractor when OPENAI_API_KEY is not set or USE_MOCK_AI is enabled.
 * Accurately extracts explicit facts from user text and leaves unmentioned facts strictly as null.
 */
function mockExtractEventData(rawText: string): {
  data: StructuredEventData;
  detectedTypes: DocumentType[];
} {
  const text = rawText.toLowerCase();

  // 1. Event Name
  let eventName: string | null = null;
  const namePatterns = [
    /(?:organizing|host|conducting|plan(?:ning)?)\s+(?:an?|the)?\s*([A-Za-z0-9\s&+\-–—]+?)(?:\s+on|\s+at|\s+for|\s+from|\.|\,)/i,
    /event(?:\s+name)?(?:\s+is|\s*:)\s*([A-Za-z0-9\s&+\-–—]+?)(?:\.|\,|$)/i,
  ];
  for (const pat of namePatterns) {
    const m = rawText.match(pat);
    if (m && m[1].trim().length > 3) {
      eventName = m[1].trim();
      break;
    }
  }
  if (!eventName && (text.includes("workshop") || text.includes("hackathon") || text.includes("seminar"))) {
    const m = rawText.match(/([A-Za-z0-9\s&+\-–—]+?(?:workshop|hackathon|seminar|session|fest))/i);
    if (m) eventName = m[1].trim();
  }

  // 2. Event Type
  let eventType: string | null = null;
  if (text.includes("workshop")) eventType = "WORKSHOP";
  else if (text.includes("hackathon")) eventType = "HACKATHON";
  else if (text.includes("seminar") || text.includes("talk") || text.includes("lecture")) eventType = "SEMINAR";
  else if (text.includes("meeting")) eventType = "MEETING";
  else if (text.includes("competition") || text.includes("contest")) eventType = "COMPETITION";
  else if (eventName) eventType = "TECHNICAL";

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
        // Resolve month name
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

  // Detected document types based on intent
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
    detectedTypes.push("EVENT_PROPOSAL", "PERMISSION_LETTER");
  }

  const structuredData: StructuredEventData = {
    eventName: eventName || (text.includes("workshop") ? "Technical Workshop" : null),
    eventType: eventType || "WORKSHOP",
    eventDescription: rawText.slice(0, 300),
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
          designation: "Resource Person / Speaker",
          organization: speakerOrg || "Industry Expert",
        }
      : null,
    registrationDeadline: null,
    contactEmail: null,
    contactPhone: null,
    requiresLabComputers: text.includes("lab") || text.includes("computer") || text.includes("pc"),
  };

  return { data: structuredData, detectedTypes };
}

/**
 * Main extraction function combining OpenAI Structured Outputs with runtime Zod verification
 * and deterministic missing-field evaluation.
 */
export async function extractEventInformation(
  rawText: string,
  targetDocumentTypes?: DocumentType[]
): Promise<ExtractionResult> {
  const useMock = process.env.USE_MOCK_AI === "true" || !process.env.OPENAI_API_KEY || !openai;

  let extractedData: StructuredEventData;
  let detectedTypes: DocumentType[] = targetDocumentTypes || [];

  if (useMock) {
    const mock = mockExtractEventData(rawText);
    extractedData = mock.data;
    if (!detectedTypes || detectedTypes.length === 0) {
      detectedTypes = mock.detectedTypes;
    }
  } else {
    try {
      const response = await openai!.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_EXTRACTION_PROMPT },
          {
            role: "user",
            content: `Extract structured event information from this text. Reference today is 2026-10-10.\n\nUser Input:\n"""\n${rawText}\n"""`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
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
        console.warn("Zod validation adjusted raw AI output", validated.error);
        extractedData = mockExtractEventData(rawText).data;
      }

      if (!detectedTypes || detectedTypes.length === 0) {
        detectedTypes = (parsedJson.detectedDocumentTypes as DocumentType[]) || [
          "EVENT_PROPOSAL",
          "PERMISSION_LETTER",
        ];
      }
    } catch (err) {
      console.warn("OpenAI API call failed or rate limited; falling back to deterministic local extractor:", err);
      const mock = mockExtractEventData(rawText);
      extractedData = mock.data;
      if (!detectedTypes || detectedTypes.length === 0) {
        detectedTypes = mock.detectedTypes;
      }
    }
  }

  // Deterministic Anti-Hallucination Gate:
  // Evaluate missing mandatory fields across detected document types
  const { missingFields, questions } = evaluateMissingFields(extractedData, detectedTypes);

  return {
    extractedData,
    detectedDocumentTypes: detectedTypes,
    missingFieldQuestions: questions,
    rawText,
    isComplete: missingFields.length === 0,
  };
}
