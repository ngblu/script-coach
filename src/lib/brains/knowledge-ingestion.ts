"use client";

// ============================================================
// Knowledge ingestion pipeline — takes AI-extracted insights
// and distributes them into the three brains. The AI extraction
// itself happens server-side in /api/ingest; this module handles
// the client-side distribution + provides the raw ingest helpers.
// ============================================================

import { generateId } from "@/lib/utils";
import type {
  IngestSourceType,
  IngestResult,
  IngestInsight,
  CoachingCategory,
} from "./types";
import {
  addMarketFact,
  addCompetitor,
  addTrend,
  addCoachingCard,
  addBestPractice,
  addCommonMistake,
  getLeadIntel,
  upsertLeadIntel,
} from "./store";

// Shape returned by /api/ingest extraction
export interface ExtractedKnowledge {
  marketFacts: string[];
  competitors: { name: string; notes: string }[];
  trends: string[];
  objections: { objection: string; response: string }[];
  bestPractices: string[];
  mistakes: { mistake: string; fix: string }[];
  leadInfo?: { businessName?: string; talkingPoints?: string[]; background?: string };
  summary: string;
}

const VALID_CATEGORIES: CoachingCategory[] = [
  "objection-handling",
  "rapport-building",
  "value-prop",
  "closing",
  "redirect",
  "compliance",
];

export function coerceCategory(raw: string): CoachingCategory {
  const c = (raw || "").toLowerCase().trim() as CoachingCategory;
  return VALID_CATEGORIES.includes(c) ? c : "objection-handling";
}

/**
 * Distribute extracted knowledge into the three brains.
 * Returns the list of insights that were stored (for the "What I Learned" UI).
 */
export function distributeKnowledge(
  extracted: ExtractedKnowledge,
  sourceType: IngestSourceType,
  fileName?: string,
  leadId?: string
): IngestResult {
  const insights: IngestInsight[] = [];
  const now = new Date().toISOString();
  const source = fileName ? `${sourceType}:${fileName}` : sourceType;

  // --- Market Brain ---
  for (const fact of extracted.marketFacts || []) {
    if (!fact?.trim()) continue;
    addMarketFact({ id: generateId(), fact: fact.trim(), source, confidence: 75, createdAt: now });
    insights.push({ brain: "market", kind: "marketFact", summary: fact.trim() });
  }

  for (const comp of extracted.competitors || []) {
    if (!comp?.name?.trim()) continue;
    addCompetitor({
      id: generateId(),
      name: comp.name.trim(),
      notes: comp.notes || "",
      strengths: [],
      weaknesses: [],
      createdAt: now,
    });
    insights.push({ brain: "market", kind: "competitor", summary: `Competitor: ${comp.name.trim()}` });
  }

  for (const trend of extracted.trends || []) {
    if (!trend?.trim()) continue;
    addTrend({ id: generateId(), trend: trend.trim(), relevance: "", createdAt: now });
    insights.push({ brain: "market", kind: "trend", summary: trend.trim() });
  }

  // --- Coaching Brain ---
  for (const obj of extracted.objections || []) {
    if (!obj?.objection?.trim()) continue;
    addCoachingCard({
      id: generateId(),
      title: obj.objection.trim().slice(0, 60),
      category: "objection-handling",
      triggerCondition: `Use when prospect says: "${obj.objection.trim()}"`,
      suggestion: obj.response || "Acknowledge, reframe around value, and ask a follow-up question.",
      examples: obj.response ? [obj.response] : [],
      priority: 6,
      favorite: false,
      source,
      createdAt: now,
    });
    insights.push({ brain: "coaching", kind: "coachingCard", summary: `Objection: ${obj.objection.trim()}` });
  }

  for (const practice of extracted.bestPractices || []) {
    if (!practice?.trim()) continue;
    addBestPractice({
      id: generateId(),
      practice: practice.trim(),
      context: source,
      timesReinforced: 1,
      createdAt: now,
    });
    insights.push({ brain: "coaching", kind: "bestPractice", summary: practice.trim() });
  }

  for (const m of extracted.mistakes || []) {
    if (!m?.mistake?.trim()) continue;
    addCommonMistake({ id: generateId(), mistake: m.mistake.trim(), fix: m.fix || "", createdAt: now });
    insights.push({ brain: "coaching", kind: "mistake", summary: m.mistake.trim() });
  }

  // --- Leads Brain ---
  if (leadId && extracted.leadInfo) {
    const existing = getLeadIntel(leadId);
    upsertLeadIntel({
      id: existing?.id || generateId(),
      leadId,
      personalizedScript: existing?.personalizedScript || "",
      preQualBackground: extracted.leadInfo.background || existing?.preQualBackground || "",
      talkingPoints: [
        ...(existing?.talkingPoints || []),
        ...(extracted.leadInfo.talkingPoints || []),
      ],
      objections: existing?.objections || [],
      callHistory: existing?.callHistory || [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    insights.push({
      brain: "leads",
      kind: "leadIntel",
      summary: `Updated intel for lead ${extracted.leadInfo.businessName || leadId}`,
    });
  }

  return { sourceType, fileName, insights, ingestedAt: now };
}

/**
 * Call the /api/ingest endpoint to extract knowledge from raw content,
 * then distribute it into the brains. This is the single entry point
 * pages should use.
 */
async function ingest(
  content: string,
  type: IngestSourceType,
  fileName?: string,
  leadId?: string
): Promise<IngestResult> {
  const res = await fetch("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, content, fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Ingest failed (${res.status})`);
  }
  const extracted: ExtractedKnowledge = await res.json();
  return distributeKnowledge(extracted, type, fileName, leadId);
}

export function ingestTranscript(text: string, leadId?: string): Promise<IngestResult> {
  return ingest(text, "transcript", undefined, leadId);
}

export function ingestDocument(text: string, fileName: string): Promise<IngestResult> {
  return ingest(text, "document", fileName);
}

export function ingestCallRecording(transcript: string, leadId?: string): Promise<IngestResult> {
  return ingest(transcript, "call", undefined, leadId);
}

export function ingestInterview(
  conversation: { role: "ai" | "noah"; content: string }[]
): Promise<IngestResult> {
  const text = conversation.map((m) => `${m.role === "noah" ? "Noah" : "Interviewer"}: ${m.content}`).join("\n\n");
  return ingest(text, "interview");
}
