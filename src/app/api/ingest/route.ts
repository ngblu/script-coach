import { NextRequest, NextResponse } from "next/server";
import { callAI, parseAIJson } from "@/lib/ai-server";

interface IngestRequest {
  type: "transcript" | "document" | "interview" | "call";
  content: string;
  fileName?: string;
  model?: string;
}

interface ExtractedKnowledge {
  marketFacts: string[];
  competitors: { name: string; notes: string }[];
  trends: string[];
  objections: { objection: string; response: string }[];
  bestPractices: string[];
  mistakes: { mistake: string; fix: string }[];
  leadInfo?: { businessName?: string; talkingPoints?: string[]; background?: string };
  summary: string;
}

function aiError(
  message: string,
  retry = true,
  suggestion = "Check your API keys in Settings or try again later."
) {
  return NextResponse.json({ error: message, retry, suggestion }, { status: 503 });
}

const TYPE_HINTS: Record<IngestRequest["type"], string> = {
  transcript:
    "This is a sales call or conversation transcript. Pay attention to objections raised, what worked, what didn't, and any market/competitor mentions.",
  document:
    "This is a document (research, notes, competitor analysis, or industry material). Extract market intelligence, trends, and competitive insights.",
  interview:
    "This is a self-interview where Noah (the salesperson, owner of 555 Digital web design agency) describes his own business. Extract his sales wisdom, market knowledge, objection responses, and best practices.",
  call: "This is a recorded sales call transcript. Extract objections with how they were (or should be) handled, techniques that worked, mistakes made, and any prospect/market intelligence.",
};

export async function POST(req: NextRequest) {
  try {
    const body: IngestRequest = await req.json();
    const { type, content, fileName, model } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "No content provided", retry: false, suggestion: "Paste or upload some content to analyze." }, { status: 400 });
    }
    if (!type || !TYPE_HINTS[type]) {
      return NextResponse.json({ error: "Invalid or missing type", retry: false, suggestion: "Select a content type (Document, Transcript, or Call)." }, { status: 400 });
    }

    const systemPrompt =
      "You are a sales intelligence extraction engine for 555 Digital, a web design agency selling to local service businesses. Return ONLY valid JSON, no markdown wrapping, no code fences.";

    const prompt = `Extract structured sales intelligence from the following content.

CONTEXT: ${TYPE_HINTS[type]}${fileName ? ` File name: ${fileName}` : ""}

Return ONLY valid JSON with this exact structure:

{
  "marketFacts": ["specific facts about the market, industry, or customer behavior worth remembering"],
  "competitors": [{ "name": "competitor name", "notes": "what we learned about them" }],
  "trends": ["industry or market trends mentioned"],
  "objections": [{ "objection": "the objection a prospect raised or might raise", "response": "the best response to it (from the content, or expert-crafted if the content shows a bad response)" }],
  "bestPractices": ["sales techniques or approaches that worked or are recommended"],
  "mistakes": [{ "mistake": "what went wrong or should be avoided", "fix": "how to fix it" }],
  "leadInfo": { "businessName": "prospect business name if identifiable", "talkingPoints": ["lead-specific talking points"], "background": "1-2 sentence pre-qualification background on this specific prospect" },
  "summary": "2-3 sentences on what was learned overall"
}

RULES:
- Only extract what is ACTUALLY supported by the content. Empty arrays are fine.
- marketFacts must be specific and reusable ("Plumbers in TN check phones between jobs, best call window 11am-1pm"), never generic ("websites are important").
- Each objection must be phrased how a real prospect would say it.
- leadInfo only if the content is clearly about ONE specific prospect; otherwise omit it.
- Maximum 8 items per array. Quality over quantity.

CONTENT:
${content.slice(0, 24000)}`;

    const { result: raw, model_used, attempt_number } = await callAI(systemPrompt, prompt, {
      model: model || undefined,
      maxTokens: 3000,
      temperature: 0.4,
    });

    if (!raw || !raw.trim()) {
      return aiError("AI returned an empty response. All providers may be unavailable.", true);
    }

    const extracted = parseAIJson<ExtractedKnowledge>(raw);

    // Normalize: guarantee arrays exist so the client never crashes
    const result: ExtractedKnowledge = {
      marketFacts: Array.isArray(extracted.marketFacts) ? extracted.marketFacts : [],
      competitors: Array.isArray(extracted.competitors) ? extracted.competitors : [],
      trends: Array.isArray(extracted.trends) ? extracted.trends : [],
      objections: Array.isArray(extracted.objections) ? extracted.objections : [],
      bestPractices: Array.isArray(extracted.bestPractices) ? extracted.bestPractices : [],
      mistakes: Array.isArray(extracted.mistakes) ? extracted.mistakes : [],
      leadInfo: extracted.leadInfo,
      summary: extracted.summary || "",
    };

    return NextResponse.json({ ...result, model_used, attempt_number });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    console.error("Ingest error:", err);
    return aiError(message, true);
  }
}
