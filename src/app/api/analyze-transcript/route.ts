import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  try {
    const { transcript, scriptTitle, scriptContent } = await req.json();

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
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

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Anthropic error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
    let rawContent = textBlocks.map((b: any) => b.text).join("\n") || "";

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
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}
