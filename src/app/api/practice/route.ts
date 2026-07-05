import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface PracticeMessage {
  role: "prospect" | "rep";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { script, industry, messages, action } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    if (action === "grade") {
      // Grade the full conversation
      const convo = messages.map((m: PracticeMessage) =>
        `${m.role === "rep" ? "Rep (Noah)" : "Prospect"}: ${m.content}`
      ).join("\n\n");

      const gradePrompt = `You are an expert sales coach. Grade this practice sales call. The rep was following this script as a guide:\n\n${script || "No script provided"}\n\nFULL CONVERSATION:\n${convo}\n\nGrade the rep on these dimensions and return ONLY valid JSON:\n\n{\n  "overallGrade": "A/B/C/D/F",\n  "scores": {\n    "rapport": number 1-100,\n    "objectionHandling": number 1-100,\n    "valuePropDelivery": number 1-100,\n    "closeAttempt": number 1-100,\n    "activeListening": number 1-100\n  },\n  "whatWentWell": ["2-3 specific things"],\n  "whatToImprove": ["2-3 specific things with actionable advice"],\n  "summary": "1-2 sentences summarizing the rep's performance"\n}`;

      const res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-opus-4-20250514",
          max_tokens: 2000,
          system: "You are an expert sales coach. Return only valid JSON, no markdown wrapping.",
          messages: [{ role: "user", content: gradePrompt }],
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
      let raw = textBlocks.map((b: any) => b.text).join("\n");
      if (raw.startsWith("```")) raw = raw.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");

      const grade = JSON.parse(raw);
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

    const messagesList = messages.slice(-6).map((m: PracticeMessage) => ({
      role: m.role === "rep" ? "user" : "assistant",
      content: m.content,
    }));

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: messages[messages.length - 1]?.content || "Hello" }],
        temperature: 0.9,
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
    const response = textBlocks.map((b: any) => b.text).join("\n").trim();

    return NextResponse.json({ type: "response", content: response });
  } catch (err: any) {
    console.error("Practice error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
