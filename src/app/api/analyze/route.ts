import { NextRequest, NextResponse } from "next/server";

// Hermes API server (OpenAI-compatible) - used when running locally
const HERMES_API = "http://127.0.0.1:8642/v1/chat/completions";

// Dashboard bridge - used when deployed on Vercel (cloud relay)
const DASHBOARD_BRIDGE = "https://555-dashboard.vercel.app/api/bridge";

const API_SERVER_KEY = process.env["NEXT_PUBLIC" + "_HERMES_API_KEY"] || process.env["API_" + "SERVER_KEY"] || "";

async function callHermesDirect(model: string, prompt: string, systemPrompt: string) {
  const res = await fetch(HERMES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_SERVER_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Hermes API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callHermesRelay(model: string, prompt: string, systemPrompt: string) {
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  const modelLabel = model.includes("opus") ? "Claude Opus" : model.includes("deepseek") ? "DeepSeek" : "Hermes";

  // Send command to bridge
  const sendRes = await fetch(DASHBOARD_BRIDGE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "send",
      action: "query",
      params: { text: fullPrompt, model },
    }),
  });

  if (!sendRes.ok) throw new Error(`Bridge send error: ${sendRes.status}`);
  const { commandId } = await sendRes.json();
  if (!commandId) throw new Error("No commandId from bridge");

  // Poll for result (up to 90s)
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${DASHBOARD_BRIDGE}?cmdId=${commandId}`);
    if (!pollRes.ok) continue;
    const { result } = await pollRes.json();
    if (result) {
      if (result.status === "error") throw new Error(result.error || "Bridge analysis failed");
      return result.data || result.response || "";
    }
  }
  throw new Error("Bridge timed out. Is the bridge poller running?");
}

export async function POST(req: NextRequest) {
  try {
    const { script, title, model: requestedModel } = await req.json();

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "No script provided" }, { status: 400 });
    }

    const model = requestedModel || "deepseek/deepseek-chat";

    const systemPrompt = "You are an expert sales script coach. Return only valid JSON, no markdown wrapping, no code fences.";

    const prompt = `Analyze the following sales script and provide a detailed, actionable analysis.

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

    let rawContent: string;

    // Try direct Hermes API first (works locally), fall back to relay (works on Vercel)
    try {
      rawContent = await callHermesDirect(model, prompt, systemPrompt);
    } catch {
      try {
        rawContent = await callHermesRelay(model, prompt, systemPrompt);
      } catch (relayErr: any) {
        return NextResponse.json(
          { error: `Hermes bridge unavailable. Is the bridge poller running? (${relayErr.message})` },
          { status: 503 }
        );
      }
    }

    if (!rawContent || !rawContent.trim()) {
      return NextResponse.json({ error: "Empty response from Hermes" }, { status: 500 });
    }

    // Clean markdown code fences
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    const analysis = JSON.parse(jsonStr);
    analysis.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
    analysis.createdAt = new Date().toISOString();
    analysis.model = model;

    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: err.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
