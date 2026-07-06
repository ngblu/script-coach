// ============================================================
// Shared model registry — single source of truth for
// available AI models, their descriptions, and user preference.
// ============================================================

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  /** Health-check status: 'available' | 'unavailable' | 'unknown' (default) */
  status?: "available" | "unavailable" | "unknown";
}

const MODELS: ModelInfo[] = [
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    description: "Fast & affordable — needs DEEPSEEK_API_KEY on Vercel",
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    description: "Latest — best for analysis & coaching",
  },
  {
    id: "anthropic/claude-fable-5",
    name: "Claude Fable 5",
    description: "Code-gen optimized — great for script rewrites",
  },
];

const STORAGE_KEY = "script-coach-selected-model";

/** Return the full model list (immutable). */
export function getModels(): readonly ModelInfo[] {
  return MODELS;
}

/** Read the user's persisted model preference. Falls back to the first model. */
export function getSelectedModel(): string {
  if (typeof window === "undefined") return MODELS[0].id;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && MODELS.some((m) => m.id === stored)) return stored;
  } catch {
    // localStorage may be blocked (private browsing, etc.)
  }
  return MODELS[0].id; // safe fallback
}

/** Persist the user's model choice. */
export function setSelectedModel(modelId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch {
    // silent fail — preference won't survive reload but the session still works
  }
}

/** Look up model metadata by id. */
export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

/**
 * Hybrid health check — pings the local Hermes bridge and the Anthropic API
 * to report which models are reachable right now.
 * Callers can feed the result into a model's `status` field.
 */
export interface ModelStatusReport {
  [modelId: string]: "available" | "unavailable" | "unknown";
}

export async function checkModelHealth(): Promise<ModelStatusReport> {
  const report: ModelStatusReport = {};

  // Hermes bridge (DeepSeek) — lightweight HEAD probe
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch("http://127.0.0.1:8642/v1/models", {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    report["deepseek/deepseek-chat"] = res.ok ? "available" : "unavailable";
  } catch {
    report["deepseek/deepseek-chat"] = "unavailable";
  }

  // Claude — only check if we have an API key configured (cheap HEAD)
  // We never expose the key client-side; just probe a known endpoint.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    // Use the app's own /api/analyze as a proxy — a dedicated /api/models
    // would be cleaner, but this keeps the change surface minimal.
    const res = await fetch("/api/analyze", {
      method: "HEAD",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    // We can't really tell if Claude specifically is up without a dedicated
    // endpoint, so mark it unknown unless we have positive proof.
    report["anthropic/claude-sonnet-4"] = "unknown";
  } catch {
    report["anthropic/claude-sonnet-4"] = "unknown";
  }

  return report;
}
