import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-server";

interface PracticeMessage {
  role: "prospect" | "rep";
  content: string;
}

function aiError(
  message: string,
  retry = true,
  suggestion = "Check your API keys in Settings or try again later."
) {
  return NextResponse.json({ error: message, retry, suggestion }, { status: 503 });
}

export async function POST(req: NextRequest) {
  try {
    const { script, industry, messages, action } = await req.json();

    if (action === "grade") {
      // Grade the full conversation
      const convo = messages.map((m: PracticeMessage) =>
        `${m.role === "rep" ? "Rep (Noah)" : "Prospect"}: ${m.content}`
      ).join("\n\n");

      const gradePrompt = `You are an expert sales coach. Grade this practice sales call. The rep was following this script as a guide:\n\n${script || "No script provided"}\n\nFULL CONVERSATION:\n${convo}\n\nGrade the rep on these dimensions and return ONLY valid JSON:\n\n{\n  \"overallGrade\": \"A/B/C/D/F\",\n  \"scores\": {\n    \"rapport\": number 1-100,\n    \"objectionHandling\": number 1-100,\n    \"valuePropDelivery\": number 1-100,\n    \"closeAttempt\": number 1-100,\n    \"activeListening\": number 1-100\n  },\n  \"whatWentWell\": [\"2-3 specific things\"],\n  \"whatToImprove\": [\"2-3 specific things with actionable advice\"],\n  \"summary\": \"1-2 sentences summarizing the rep's performance\"\n}`;

      const { result: raw } = await callAI(
        "You are an expert sales coach. Return only valid JSON, no markdown wrapping.",
        gradePrompt,
        { maxTokens: 2000, temperature: 0.7 }
      );

      if (!raw) return aiError("AI returned empty response for grading.", true);

      let text = raw.trim();
      if (text.startsWith("```")) text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");

      const grade = JSON.parse(text);
      grade.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
      return NextResponse.json({ type: "grade", grade });
    }

    // Continue the conversation - AI plays the prospect
    const systemPrompt = `You are playing the role of a skeptical business owner in the ${industry || "local services"} industry. You received a cold call from a web designer named Noah from 555 Digital.

Your personality: busy, skeptical but not rude, open to value but needs convincing. You have a real business with a real website that's "fine" but not great. You get calls like this occasionally.

RULES:
- Stay in character as the prospect. Never break character.
- Keep responses natural and conversational (1-3 sentences)
- Throw realistic objections based on what the rep says
- Don't make it too easy - push back on claims, ask for specifics
- If the rep builds real value, gradually warm up
- If the rep is vague or pushy, stay cold
- Vary your objections: budget, time, "already have someone", "not now", "send me info"
- Never say "yes" or agree to buy. The goal is to test the rep.

The rep is using this script as a guide (they may deviate):\n\n${script || "No script provided"}

The rep just said: "${messages[messages.length - 1]?.content || "Hello"}"\n\nRespond in character as the prospect. 1-3 sentences maximum.`;

    const lastMsgContent = messages[messages.length - 1]?.content || "Hello";

    const { result: responseText } = await callAI(systemPrompt, lastMsgContent, {
      maxTokens: 300,
      temperature: 0.9,
    });

    if (!responseText) return aiError("AI returned empty response for prospect role-play.", true);

    const response = responseText.trim();
    return NextResponse.json({ type: "response", content: response });
  } catch (err: any) {
    console.error("Practice error:", err);
    if (err instanceof SyntaxError) {
      return aiError("AI returned invalid JSON for grading. Try again.", true, "The AI returned a malformed response. Try re-running the grade.");
    }
    return aiError(err.message || "Practice failed", true);
  }
}
