import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-server";

function aiError(
  message: string,
  retry = true,
  suggestion = "Check your API keys in Settings or try again later."
) {
  return NextResponse.json({ error: message, retry, suggestion }, { status: 503 });
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, scriptTitle, scriptContent } = await req.json();

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: "No transcript provided", retry: false, suggestion: "Paste a call transcript to analyze." }, { status: 400 });
    }

    const systemPrompt = "You are an expert sales call analyst. Return only valid JSON, no markdown wrapping.";

    const prompt = `Analyze this sales call transcript against the original script. Identify what worked, what didn't, and what can be improved.

${scriptContent ? `ORIGINAL SCRIPT:\n${scriptContent}\n\n` : ""}
CALL TRANSCRIPT:\n${transcript}

Return ONLY valid JSON (no markdown, no code fences):

{
  "adherence": number 1-100,
  "effectiveness": number 1-100,
  "whatWorked": ["3-5 things the rep did well on this call"],
  "whatDidntWork": ["3-5 things that didn't work or could improve"],
  "newObjections": ["any objections the prospect raised that weren't in the script"],
  "closeAnalysis": "1-2 sentences on how the close went",
  "keyTakeaways": ["3-5 actionable takeaways for the next call"],
  "summary": "2-3 sentence overall assessment of this call"
}`;

    const { result: rawContent } = await callAI(systemPrompt, prompt, {
      maxTokens: 3000,
      temperature: 0.7,
    });

    if (!rawContent || !rawContent.trim()) {
      return aiError("AI returned an empty response. All providers may be unavailable.", true);
    }

    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    const analysis = JSON.parse(jsonStr);
    analysis.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
    analysis.createdAt = new Date().toISOString();

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Transcript analysis error:", err);
    if (err instanceof SyntaxError) {
      return aiError("AI returned invalid JSON. Try again.", true, "The AI returned a malformed response. Try re-running the analysis.");
    }
    return aiError(err.message || "Analysis failed", true);
  }
}
