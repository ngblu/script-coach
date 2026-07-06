import { NextResponse } from "next/server";
import { DEFAULT_AI_MODEL } from "@/lib/ai-server";

// ── API endpoints ──────────────────────────────────────────────────────────
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions";
const HERMES_DIRECT = "http://127.0.0.1:8642/v1/models";
const HERMES_RELAY = "https://555-dashboard.vercel.app/api/bridge";

// ── Timeouts (ms) ──────────────────────────────────────────────────────────
const TIMEOUT_MS = 5_000; // per-provider cap
const HERMES_DIRECT_TIMEOUT_MS = 3_000; // shorter for local check

// ── Helpers ────────────────────────────────────────────────────────────────

/** Abortable fetch that rejects on timeout. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

interface ProviderStatus {
  status: "ok" | "error";
  model: string;
  latency_ms: number;
  error?: string;
}

/** Build a consistent status object from a test result. */
function status(
  ok: boolean,
  model: string,
  start: number,
  errMsg?: string
): ProviderStatus {
  return {
    status: ok ? "ok" : "error",
    model,
    latency_ms: Math.round(Date.now() - start),
    ...(errMsg ? { error: errMsg } : {}),
  };
}

// ── Per-provider tests ─────────────────────────────────────────────────────

async function testAnthropic(): Promise<ProviderStatus> {
  const start = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return status(false, DEFAULT_AI_MODEL, start, "ANTHROPIC_API_KEY not configured");

  try {
    const res = await fetchWithTimeout(
      ANTHROPIC_API,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: DEFAULT_AI_MODEL,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
      },
      TIMEOUT_MS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return status(false, DEFAULT_AI_MODEL, start, `HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    return status(true, DEFAULT_AI_MODEL, start);
  } catch (err: any) {
    const msg = err.name === "AbortError" ? "Request timed out" : (err.message ?? String(err));
    return status(false, DEFAULT_AI_MODEL, start, msg);
  }
}

async function testDeepSeekDirect(): Promise<ProviderStatus> {
  const start = Date.now();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return status(false, "deepseek-chat", start, "DEEPSEEK_API_KEY not configured");

  try {
    const res = await fetchWithTimeout(
      DEEPSEEK_API,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 10,
        }),
      },
      TIMEOUT_MS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return status(false, "deepseek-chat", start, `HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    return status(true, "deepseek-chat", start);
  } catch (err: any) {
    const msg = err.name === "AbortError" ? "Request timed out" : (err.message ?? String(err));
    return status(false, "deepseek-chat", start, msg);
  }
}

async function testHermesDirect(): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(
      HERMES_DIRECT,
      { method: "GET" },
      HERMES_DIRECT_TIMEOUT_MS
    );

    if (!res.ok) {
      return status(false, "hermes-local", start, `HTTP ${res.status}`);
    }

    // Try to extract the first model id from the response
    let model = "hermes-local";
    try {
      const data = await res.json();
      if (data?.data?.[0]?.id) model = data.data[0].id;
    } catch {
      // fine — keep default label
    }

    return status(true, model, start);
  } catch (err: any) {
    const msg = err.name === "AbortError" ? "Request timed out" : (err.message ?? String(err));
    return status(false, "hermes-local", start, msg);
  }
}

async function testHermesRelay(): Promise<ProviderStatus> {
  const start = Date.now();
  try {
    // Lightweight health ping through the bridge — just check it's reachable
    const res = await fetchWithTimeout(
      HERMES_RELAY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "health" }),
      },
      TIMEOUT_MS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return status(false, "hermes-relay", start, `HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    return status(true, "hermes-relay", start);
  } catch (err: any) {
    const msg = err.name === "AbortError" ? "Request timed out" : (err.message ?? String(err));
    return status(false, "hermes-relay", start, msg);
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET() {
  // Fire all checks concurrently
  const [anthropic, deepseek_direct, hermes_direct, hermes_relay] =
    await Promise.all([
      testAnthropic(),
      testDeepSeekDirect(),
      testHermesDirect(),
      testHermesRelay(),
    ]);

  const body = {
    anthropic,
    deepseek_direct,
    hermes_direct,
    hermes_relay,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
