"use client";

// ============================================================
// Feedback loop — after every call (live or practice), extract
// insights from the transcript and feed them back into the
// three brains automatically. Human in the loop, brains learning.
// ============================================================

import { distributeKnowledge, type ExtractedKnowledge } from "./knowledge-ingestion";
import type { IngestResult } from "./types";

interface TranscriptEntry {
  speaker: "rep" | "prospect";
  content: string;
}

/**
 * Run the feedback loop on a completed call transcript.
 * Calls /api/ingest with type "call" and distributes results to the brains.
 * Best-effort: failures are swallowed by callers, the call data is already saved.
 */
export async function runFeedbackLoop(
  transcript: TranscriptEntry[],
  leadId?: string
): Promise<IngestResult | null> {
  if (!transcript || transcript.length < 2) return null;

  const text = transcript
    .map((e) => `${e.speaker === "rep" ? "Noah (rep)" : "Prospect"}: ${e.content}`)
    .join("\n");

  const res = await fetch("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "call", content: text }),
  });

  if (!res.ok) {
    throw new Error(`Feedback loop ingest failed: ${res.status}`);
  }

  const extracted: ExtractedKnowledge = await res.json();
  return distributeKnowledge(extracted, "call", undefined, leadId);
}
