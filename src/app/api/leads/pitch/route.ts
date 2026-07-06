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
    const { businessName, website, industry, talkingPoints } = await req.json();

    if (!businessName) {
      return NextResponse.json(
        { error: "Business name is required", retry: false, suggestion: "Provide a business name to generate a pitch." },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You are Noah's AI sales assistant at 555 Digital. You write personalized, direct, no-BS cold-call openings for local service businesses. Your tone is confident, conversational, and value-first. Never use corporate jargon. Open with a pattern interrupt. Focus on problems the business owner actually cares about (leads, revenue, time). Keep it under 150 words.";

    const pointsBlock = talkingPoints?.length
      ? `Key talking points about this lead:\n${talkingPoints.map((p: string) => `- ${p}`).join("\n")}`
      : "";

    const prompt = `Write a personalized cold-call opening pitch for the following business:

Business Name: ${businessName}
Industry: ${industry || "Unknown"}
Website: ${website || "N/A"}

${pointsBlock}

The pitch should:
1. Open with a pattern interrupt (not "Hi my name is...")
2. Reference something specific about their business or industry
3. Identify a real problem they likely have
4. Lead into the "free audit" value prop naturally
5. Sound like a real person talking, not a script

Return ONLY the pitch text with no additional commentary, no quotes around it, no markdown.`;

    const { result: pitchText } = await callAI(systemPrompt, prompt, {
      maxTokens: 600,
      temperature: 0.8,
    });

    if (!pitchText || !pitchText.trim()) {
      return aiError("AI returned an empty pitch. All providers may be unavailable.", true);
    }

    const pitch = pitchText.trim();

    return NextResponse.json({ pitch });
  } catch (err: any) {
    console.error("Pitch generation error:", err);
    return aiError(err.message || "Failed to generate pitch", true);
  }
}
