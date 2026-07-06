import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-server";

interface GenerateScriptRequest {
  lead: {
    id: string;
    businessName: string;
    industry?: string;
    website?: string;
    auditScore?: number;
    talkingPoints?: string[];
    notes?: string;
  };
  brainContext?: string;
  model?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateScriptRequest = await req.json();
    const { lead, brainContext, model } = body;

    if (!lead || !lead.businessName) {
      return NextResponse.json({ error: "No lead provided" }, { status: 400 });
    }

    const systemPrompt =
      "You are an elite cold-call script writer for Noah at 555 Digital, a solo web design agency selling websites to local service businesses. Pricing: landing page $1,000, full site $2,500, maintenance $99-500/mo. Write scripts in Noah's direct, no-BS but friendly style. Return plain text with section markers, no markdown headers.";

    const contextBlock =
      brainContext && brainContext.trim()
        ? `\n\nBUSINESS INTELLIGENCE (Noah's brains — use this to sharpen the script):\n${brainContext.slice(0, 10000)}\n`
        : "";

    const prompt = `Write a personalized cold-call script for this SPECIFIC prospect. Not generic — reference their actual business situation.
${contextBlock}
PROSPECT:
- Business: ${lead.businessName}
- Industry: ${lead.industry || "local services"}
- Website: ${lead.website || "NO WEBSITE FOUND (major selling point)"}
- Website audit score: ${lead.auditScore !== undefined ? `${lead.auditScore}/100` : "not audited"}
${lead.talkingPoints?.length ? `- Talking points:\n${lead.talkingPoints.map((t) => `  - ${t}`).join("\n")}` : ""}
${lead.notes ? `- Notes: ${lead.notes}` : ""}

FORMAT — use these exact section markers:

[PRE-QUAL BACKGROUND]
2-3 sentences Noah reads BEFORE dialing: who this prospect is, their likely situation, and the angle to take.

[INTRO]
The opener. Reference something specific about THEIR business. Pattern-interrupt, not salesy.

[THE PROBLEM]
The specific problem THIS prospect has (no/bad website, low audit score, competitors outranking them in THEIR industry).

[VALUE PROP]
What Noah does, tied directly to this prospect's situation and industry. Include a relevant proof point.

[OBJECTIONS]
The 3 most likely objections from THIS type of prospect, each with a ready response. Format:
"objection" - response

[CLOSE]
A specific low-commitment ask tailored to this prospect (free audit angle usually works). Include the exact closing line.

Keep the whole script tight enough to guide a 3-5 minute call. Make it sound like a human, not a telemarketer.`;

    const raw = await callAI(systemPrompt, prompt, {
      model: model || "claude-opus-4-20250514",
      maxTokens: 2500,
      temperature: 0.7,
    });

    if (!raw || !raw.trim()) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    // Extract pre-qual background separately for the Leads Brain
    const preQualMatch = raw.match(/\[PRE-QUAL BACKGROUND\]\s*([\s\S]*?)(?=\[INTRO\]|$)/);
    const preQualBackground = preQualMatch?.[1]?.trim() || "";
    const script = raw.trim();

    return NextResponse.json({ script, preQualBackground });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script generation failed";
    console.error("Generate script error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
