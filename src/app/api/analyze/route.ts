import { NextRequest, NextResponse } from "next/server";

// Anthropic API - used for Claude Opus
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// Hermes API server (OpenAI-compatible) - used for DeepSeek locally
const HERMES_API = "http://127.0.0.1:8642/v1/chat/completions";

// Dashboard bridge - used for DeepSeek on Vercel (cloud relay)
const DASHBOARD_BRIDGE = "https://555-dashboard.vercel.app/api/bridge";

const API_SERVER_KEY = process.env["NEXT_PUBLIC" + "_HERMES_API_KEY"] || process.env["API_" + "SERVER_KEY"] || "";

async function callAnthropic(systemPrompt: string, prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Anthropic returns content as array of text blocks
  const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
  return textBlocks.map((b: any) => b.text).join("\n") || "";
}

async function callHermesDirect(model: string, prompt: string, systemPrompt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
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
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Hermes API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

async function callHermesRelay(model: string, prompt: string, systemPrompt: string) {
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

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
    const { script, title, model: requestedModel, brainContext } = await req.json();

    if (!script || !script.trim()) {
      return NextResponse.json({ error: "No script provided" }, { status: 400 });
    }

    const model = requestedModel || "deepseek/deepseek-chat";
    const isOpus = model.includes("opus") || model.includes("claude");

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

    let rawContent: string;

    if (isOpus) {
      // Claude Opus → Anthropic API directly
      rawContent = await callAnthropic(systemPrompt, prompt);
    } else {
      // DeepSeek → Hermes bridge (direct or relay)
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
    }

    if (!rawContent || !rawContent.trim()) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
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
