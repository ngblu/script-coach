// ============================================================
// Shared server-side AI caller — Claude (Anthropic API) primary,
// DeepSeek via Hermes bridge (direct or relay fallback).
// Server-only: do NOT import from client components.
// ============================================================

// ---- Configurable default model ---------------------------------
// Anthropic models: https://docs.anthropic.com/en/docs/about-claude/models
// claude-3-5-sonnet-20241022 — latest Claude 3.5 Sonnet (established)
// claude-sonnet-4-20250514      — Claude Sonnet 4 (newer; verify availability)
export const DEFAULT_AI_MODEL = "claude-3-5-sonnet-20241022";

// ---- Anthropic key check on module load (no API call) -----------
const ANTHROPIC_KEY_WARNING = !process.env.ANTHROPIC_API_KEY
  ? "⚠ ANTHROPIC_API_KEY is not set. Claude calls will fail."
  : null;
if (ANTHROPIC_KEY_WARNING) console.warn(ANTHROPIC_KEY_WARNING);

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const HERMES_API = "http://127.0.0.1:8642/v1/chat/completions";
const DASHBOARD_BRIDGE = "https://555-dashboard.vercel.app/api/bridge";

const API_SERVER_KEY =
  process.env["NEXT_PUBLIC" + "_HERMES_API_KEY"] || process.env["API_" + "SERVER_KEY"] || "";

// ---- Helpers ----------------------------------------------------

/** Build a human-readable error from an Anthropic HTTP status. */
function anthropicError(status: number, body: string): string {
  switch (status) {
    case 401:
      return "Invalid API key — check ANTHROPIC_API_KEY.";
    case 404:
      return "Model not available — the requested model may not exist or may not be accessible with your plan.";
    case 429: {
      const retry = body.match(/retry[_-]?after[:\s]+(\d+)/i)?.[1];
      return `Rate limited, retry in ${retry || "a few"}s.`;
    }
    default:
      if (status >= 500) return "Anthropic servers are down — try again later.";
      return `Anthropic API error ${status}: ${body}`;
  }
}

// ------------------------------------------------------------------
// Internal helpers (unchanged signatures, but now return null on error)
// ------------------------------------------------------------------

async function tryAnthropic(
  systemPrompt: string,
  prompt: string,
  maxTokens = 4000,
  temperature = 0.7,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ai-server] Anthropic: no API key configured");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10-second timeout

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: DEFAULT_AI_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[ai-server] Anthropic HTTP ${res.status}: ${anthropicError(res.status, body)}`);
      return null;
    }

    const data = await res.json();
    const textBlocks =
      (data.content as { type: string; text: string }[] | undefined)?.filter(
        (b) => b.type === "text",
      ) || [];
    const text = textBlocks.map((b) => b.text).join("\n") || "";
    return text || null;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("[ai-server] Anthropic: request timed out after 10s");
    } else {
      console.error("[ai-server] Anthropic fetch error:", err.message || err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryDeepSeekDirect(
  systemPrompt: string,
  prompt: string,
  maxTokens = 4000,
  temperature = 0.7
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(DEEPSEEK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function tryHermesDirect(
  model: string,
  prompt: string,
  systemPrompt: string,
  maxTokens = 4000
): Promise<string | null> {
  if (!API_SERVER_KEY) return null;

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
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Bridge Relay config ──────────────────────────────────────────
const BRIDGE_POLL_MAX = 15;        // max poll attempts
const BRIDGE_POLL_INTERVAL = 3000; // ms between polls
const BRIDGE_TOTAL_TIMEOUT = 50_000; // hard cap in ms (send + polls)

async function tryHermesRelay(
  model: string,
  prompt: string,
  systemPrompt: string
): Promise<string | null> {
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  const deadline = Date.now() + BRIDGE_TOTAL_TIMEOUT;

  try {
    const sendRes = await fetch(DASHBOARD_BRIDGE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "send",
        action: "query",
        params: { text: fullPrompt, model },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!sendRes.ok) return null;
    const { commandId, bridgeConnected } = await sendRes.json();
    if (!commandId) return null;

    for (let attempt = 1; attempt <= BRIDGE_POLL_MAX; attempt++) {
      // Hard deadline check before sleeping
      if (Date.now() >= deadline) {
        console.warn(
          `[ai-server] Bridge total timeout (${BRIDGE_TOTAL_TIMEOUT / 1000}s) ` +
          `exceeded waiting for ${commandId}`
        );
        return null;
      }

      await new Promise((r) => setTimeout(r, BRIDGE_POLL_INTERVAL));

      let pollRes: Response;
      try {
        pollRes = await fetch(`${DASHBOARD_BRIDGE}?cmdId=${commandId}`, {
          signal: AbortSignal.timeout(5_000),
        });
      } catch {
        continue; // network blip — retry
      }

      if (!pollRes.ok) continue;
      const { result } = await pollRes.json().catch(() => ({ result: null }));
      if (result) {
        if (result.status === "error") return null;
        return result.data || result.response || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Public API types
// ------------------------------------------------------------------

export interface AIResult {
  result: string | null;
  model_used: string;
  attempt_number: number;
  error?: string;
}

// ------------------------------------------------------------------
// Unified AI caller with cascading fallback
// ------------------------------------------------------------------

/**
 * Unified AI call with automatic cascading fallback.
 *
 * Cascade order (hard-coded):
 *   1. Claude Sonnet via Anthropic
 *   2. DeepSeek Direct API
 *   3. Hermes bridge direct
 *   4. Hermes bridge relay
 *
 * The requested model only influences which cascade step we START at —
 * it does not change the cascade order.  We skip any step whose model
 * key we already tried.
 *
 * Never throws; always returns an AIResult object.
 */
export async function callAI(
  systemPrompt: string,
  prompt: string,
  opts?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<AIResult> {
  const requestedModel = opts?.model || DEFAULT_AI_MODEL;
  const maxTokens = opts?.maxTokens ?? 4000;
  const temperature = opts?.temperature ?? 0.7;

  // Build the cascade in priority order
  interface CascadeStep {
    label: string;       // used as model_used identifier
    fn: () => Promise<string | null>;
  }

  const cascade: CascadeStep[] = [
    {
      label: `anthropic/${DEFAULT_AI_MODEL}`,
      fn: () => tryAnthropic(systemPrompt, prompt, maxTokens, temperature),
    },
    {
      label: `deepseek/deepseek-chat`,
      fn: () => tryDeepSeekDirect(systemPrompt, prompt, maxTokens, temperature),
    },
    {
      label: `hermes-direct:${requestedModel}`,
      fn: () => tryHermesDirect(requestedModel, prompt, systemPrompt, maxTokens),
    },
    {
      label: `hermes-relay:${requestedModel}`,
      fn: () => tryHermesRelay(requestedModel, prompt, systemPrompt),
    },
  ];

  // Determine where to start the cascade based on the requested model
  const isClaude = requestedModel.includes("sonnet") || requestedModel.includes("claude");
  const isDeepSeek = requestedModel.includes("deepseek") || requestedModel.includes("deep-seek");

  let startIndex = 0;
  if (isDeepSeek) startIndex = 1;

  const errors: string[] = [];

  for (let i = startIndex; i < cascade.length; i++) {
    const step = cascade[i];
    try {
      const text = await step.fn();
      if (text && text.trim()) {
        return {
          result: text,
          model_used: step.label,
          attempt_number: i - startIndex + 1,
        };
      }
      errors.push(`${step.label}: empty or null response`);
    } catch (err: unknown) {
      errors.push(`${step.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // If we started after index 0, also try the earlier steps
  if (startIndex > 0) {
    for (let i = 0; i < startIndex; i++) {
      const step = cascade[i];
      try {
        const text = await step.fn();
        if (text && text.trim()) {
          return {
            result: text,
            model_used: step.label,
            attempt_number: startIndex - i + 1,
          };
        }
        errors.push(`${step.label}: empty or null response`);
      } catch (err: unknown) {
        errors.push(`${step.label}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return {
    result: null,
    model_used: "none",
    attempt_number: cascade.length,
    error: `All AI providers failed. Details: ${errors.join("; ")}`,
  };
}

// ------------------------------------------------------------------
// Legacy helpers (kept for backward compatibility — unused internally)
// ------------------------------------------------------------------

export async function callAnthropic(
  systemPrompt: string,
  prompt: string,
  maxTokens = 4000,
  temperature = 0.7
): Promise<string> {
  const result = await tryAnthropic(systemPrompt, prompt, maxTokens, temperature);
  if (result === null) throw new Error("Anthropic API call failed");
  return result;
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
