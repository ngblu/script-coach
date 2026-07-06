import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

export async function POST(req: NextRequest) {
  try {
    const { businessName, website, industry, talkingPoints } = await req.json();

    if (!businessName) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
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

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", res.status, err);
      return NextResponse.json(
        { error: `AI generation failed: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
    const pitch = textBlocks.map((b: any) => b.text).join("\n").trim();

    return NextResponse.json({ pitch });
  } catch (err: any) {
    console.error("Pitch generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate pitch" },
      { status: 500 }
    );
  }
}
