import { NextRequest, NextResponse } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai-server";

interface LiveCoachRequest {
  transcript: string; // what the prospect just said
  recentExchanges?: { speaker: "rep" | "prospect"; content: string }[];
  context?: {
    leadName?: string;
    industry?: string;
    script?: string;
    coachingCards?: { triggerCondition: string; suggestion: string; id: string; category: string }[];
  };
  model?: string;
}

interface LiveCoachResponse {
  suggestion: string;
  urgency: "high" | "medium" | "low";
  category: "objection" | "redirect" | "close" | "rapport";
  fromCardId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: LiveCoachRequest = await req.json();
    const { transcript, recentExchanges, context, model } = body;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    // First: check coaching cards for a trigger match (fast path, no AI call)
    const cards = context?.coachingCards || [];
    const lowerTranscript = transcript.toLowerCase();
    const matched = cards.find((card) => {
      // Extract key phrases from trigger conditions like: Use when prospect says: "too expensive"
      const quoted = card.triggerCondition.match(/"([^"]+)"/)?.[1];
      if (quoted && lowerTranscript.includes(quoted.toLowerCase().slice(0, 30))) return true;
      // Loose keyword match: >=2 significant trigger words present
      const words = card.triggerCondition
        .toLowerCase()
        .replace(/use when prospect says:?/i, "")
        .split(/\W+/)
        .filter((w) => w.length > 4);
      const hits = words.filter((w) => lowerTranscript.includes(w)).length;
      return words.length > 0 && hits >= Math.min(2, words.length);
    });

    if (matched) {
      const response: LiveCoachResponse = {
        suggestion: matched.suggestion,
        urgency: "high",
        category:
          matched.category === "objection-handling"
            ? "objection"
            : matched.category === "closing"
              ? "close"
              : matched.category === "rapport-building"
                ? "rapport"
                : "redirect",
        fromCardId: matched.id,
      };
      return NextResponse.json(response);
    }

    // AI path: generate a coaching suggestion within a tight token budget
    const exchangeLog = (recentExchanges || [])
      .slice(-6)
      .map((m) => `${m.speaker === "rep" ? "Noah" : "Prospect"}: ${m.content}`)
      .join("\n");

    const systemPrompt =
      "You are a real-time sales coach whispering in Noah's ear during a live cold call. Noah sells websites for 555 Digital to local service businesses. Respond FAST and SHORT. Return only valid JSON, no markdown.";

    const prompt = `The prospect just said: "${transcript}"

${exchangeLog ? `Recent conversation:\n${exchangeLog}\n` : ""}${context?.leadName ? `Prospect: ${context.leadName} (${context.industry || "local services"})` : ""}${context?.script ? `\nNoah's script (reference):\n${context.script.slice(0, 1500)}` : ""}

Give Noah ONE actionable coaching tip for his next response. Return ONLY this JSON:

{
  "suggestion": "1-2 sentence specific tip, actionable RIGHT NOW (e.g. 'Acknowledge the budget concern, then pivot: one new customer covers the whole project. Ask what a new customer is worth to them.')",
  "urgency": "high" | "medium" | "low",
  "category": "objection" | "redirect" | "close" | "rapport"
}

urgency=high if the prospect is objecting or about to hang up. category matches the situation: objection (they pushed back), redirect (conversation drifting), close (buying signal detected — tell Noah to close), rapport (build connection).`;

    const raw = await callAI(systemPrompt, prompt, {
      model: model || "claude-opus-4-20250514",
      maxTokens: 300,
      temperature: 0.5,
    });

    const parsed = parseAIJson<LiveCoachResponse>(raw);
    const response: LiveCoachResponse = {
      suggestion: parsed.suggestion || "Keep the prospect talking. Ask an open-ended question about their business.",
      urgency: ["high", "medium", "low"].includes(parsed.urgency) ? parsed.urgency : "medium",
      category: ["objection", "redirect", "close", "rapport"].includes(parsed.category)
        ? parsed.category
        : "rapport",
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Live coach failed";
    console.error("Live coach error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
