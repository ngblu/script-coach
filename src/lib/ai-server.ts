// ============================================================
// Shared server-side AI caller — Claude Opus primary via
// Anthropic API, DeepSeek via Hermes bridge (direct or relay).
// Mirrors the pattern in /api/analyze/route.ts.
// Server-only: do NOT import from client components.
// ============================================================

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const HERMES_API = "http://127.0.0.1:8642/v1/chat/completions";
const DASHBOARD_BRIDGE = "https://555-dashboard.vercel.app/api/bridge";

const API_SERVER_KEY =
  process.env["NEXT_PUBLIC" + "_HERMES_API_KEY"] || process.env["API_" + "SERVER_KEY"] || "";

export async function callAnthropic(
  systemPrompt: string,
  prompt: string,
  maxTokens = 4000,
  temperature = 0.7
): Promise<string> {
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
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const textBlocks =
    (data.content as { type: string; text: string }[] | undefined)?.filter(
      (b) => b.type === "text"
    ) || [];
  return textBlocks.map((b) => b.text).join("\n") || "";
}

async function callHermesDirect(
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens = 4000
): Promise<string> {
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
        max_tokens: maxTokens,
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

async function callHermesRelay(
  model: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
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

/**
 * Unified AI call. model containing "opus"/"claude" routes to Anthropic;
 * anything else goes to DeepSeek via Hermes (direct then relay fallback).
 */
export async function callAI(
  systemPrompt: string,
  prompt: string,
  opts?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const model = opts?.model || "claude-sonnet-4-20250514";
  const isClaude = model.includes("sonnet") || model.includes("claude");

  if (isClaude) {
    return callAnthropic(systemPrompt, prompt, opts?.maxTokens, opts?.temperature);
  }
  try {
    return await callHermesDirect(model, prompt, systemPrompt, opts?.maxTokens);
  } catch {
    return await callHermesRelay(model, prompt, systemPrompt);
  }
}

/** Strip markdown code fences and parse JSON from an AI response. */
export function parseAIJson<T>(raw: string): T {
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
  }
  // Fallback: grab the outermost JSON object if extra prose surrounds it
  if (!jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
    const start = jsonStr.indexOf("{");
    const end = jsonStr.lastIndexOf("}");
    if (start !== -1 && end > start) jsonStr = jsonStr.slice(start, end + 1);
  }
  return JSON.parse(jsonStr) as T;
}
