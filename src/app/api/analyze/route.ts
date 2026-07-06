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
    const { script, title, model: requestedModel, brainContext } = await req.json();

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "No script provided", retry: false, suggestion: "Enter a script to analyze." }, { status: 400 });
    }

    const model = requestedModel || "deepseek/deepseek-chat";

    const systemPrompt = "You are an expert sales script coach. Return only valid JSON, no markdown wrapping, no code fences.";

    const contextBlock =
      brainContext && typeof brainContext === "string" && brainContext.trim()
        ? `\n\nBUSINESS INTELLIGENCE CONTEXT (from Noah's Market Brain, Leads Brain, and Coaching Brain — use this to make the analysis specific to HIS business, not generic advice):\n${brainContext.slice(0, 12000)}\n\n---\n`
        : "";

    const prompt = `Analyze the following sales script and provide a detailed, actionable analysis.${contextBlock}

Return ONLY valid JSON with this exact structure (no markdown, no code fences):

{
  "overallScore": number from 1-100,
  "scores": {
    "clarity": number 1-100,
    "persuasion": number 1-100,
    "objectionHandling": number 1-100,
    "closingStrength": number 1-100
  },
  "strengths": ["3-5 specific strengths"],
  "weaknesses": ["3-5 specific weaknesses with actionable fixes"],
  "suggestions": ["5-7 specific, actionable improvement suggestions"],
  "rewrittenSections": [
    {
      "original": "exact text from the script that needs improvement",
      "improved": "rewritten version that is more effective",
      "reason": "why this rewrite is better"
    }
  ],
  "summary": "2-3 sentence overall assessment"
}

CRITICAL: rewrittenSections should contain 3-5 sections. Each "original" must be an EXACT quote from the provided script. Each "improved" should be a significantly better version. Be harsh and specific - no generic advice.

Script title: ${title || "Untitled"}

Script:
${script}`;

    const { result: rawContent, model_used, attempt_number } = await callAI(systemPrompt, prompt, {
      model,
      maxTokens: 4000,
      temperature: 0.7,
    });

    if (!rawContent || !rawContent.trim()) {
      return aiError("AI returned an empty response. All providers may be unavailable.", true);
    }

    // Clean markdown code fences
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    const analysis = JSON.parse(jsonStr);
    analysis.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
    analysis.createdAt = new Date().toISOString();
    analysis.model = model_used;

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Analysis error:", err);
    if (err instanceof SyntaxError) {
      return aiError("AI returned invalid JSON. Try again — the model may have misformatted the response.", true, "The AI returned a malformed response. Try re-running the analysis.");
    }
    return aiError(err.message || "Analysis failed", true);
  }
}
