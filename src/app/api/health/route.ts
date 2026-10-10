import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  let libreOfficeDetected = false;
  let libreOfficeVersion = "";

  try {
    const customPath = process.env.LIBREOFFICE_PATH || "soffice";
    const { stdout } = await execAsync(`${customPath} --version`, { timeout: 3000 });
    libreOfficeDetected = true;
    libreOfficeVersion = stdout.trim();
  } catch {
    libreOfficeDetected = false;
  }

  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-"));
  const useMockAi = process.env.USE_MOCK_AI === "true" || !hasOpenAiKey;
  const hasMongoUri = Boolean(process.env.MONGODB_URI);

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: {
      libreOffice: {
        detected: libreOfficeDetected,
        version: libreOfficeVersion || "Not found (Using built-in Institutional PDF Vector Engine)",
      },
      ai: {
        mode: useMockAi ? "Deterministic Smart Mock AI (Active)" : "OpenAI API (Live)",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        apiKeyConfigured: hasOpenAiKey,
      },
      database: {
        type: hasMongoUri ? "MongoDB Atlas" : "Local Persistent Memory Store (Active)",
      },
    },
  });
}
