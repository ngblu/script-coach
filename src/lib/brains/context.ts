"use client";

// ============================================================
// Brain summary helpers — client-side context builders that
// turn the three brains into prompt-ready context strings.
// Sent to API routes so server code never touches localStorage.
// ============================================================

import { getMarketBrain, getLeadsBrain, getCoachingBrain } from "./store";
import { getKnowledgeBase } from "@/lib/knowledge-base";

export function buildMarketContext(): string {
  const b = getMarketBrain();
  const parts: string[] = [];
  if (b.industry) parts.push(`Industry focus: ${b.industry}`);
  if (b.verticals.length) {
    parts.push(
      `Verticals: ${b.verticals.map((v) => `${v.name} (${v.industry}) — ICP: ${v.icpDescription}`).join("; ")}`
    );
  }
  if (b.competitors.length) {
    parts.push(`Known competitors: ${b.competitors.map((c) => `${c.name}${c.notes ? ` (${c.notes})` : ""}`).join("; ")}`);
  }
  if (b.trends.length) parts.push(`Market trends: ${b.trends.map((t) => t.trend).join("; ")}`);
  if (b.marketFacts.length) {
    parts.push(`Market facts:\n${b.marketFacts.slice(0, 25).map((f) => `- ${f.fact}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

export function buildLeadContext(leadId?: string): string {
  const b = getLeadsBrain();
  if (!leadId) {
    return b.intel.length
      ? `Lead intelligence exists on ${b.intel.length} leads.`
      : "";
  }
  const intel = b.intel.find((i) => i.leadId === leadId);
  if (!intel) return "";
  const parts: string[] = [];
  if (intel.preQualBackground) parts.push(`Pre-qualification background: ${intel.preQualBackground}`);
  if (intel.talkingPoints.length) parts.push(`Talking points:\n${intel.talkingPoints.map((t) => `- ${t}`).join("\n")}`);
  if (intel.objections.length) parts.push(`Known objections from this lead:\n${intel.objections.map((o) => `- ${o}`).join("\n")}`);
  if (intel.callHistory.length) {
    parts.push(
      `Call history: ${intel.callHistory.length} prior call(s). Most recent outcome: ${intel.callHistory[0]?.outcome || "unknown"}`
    );
  }
  return parts.join("\n\n");
}

export function buildCoachingContext(): string {
  const b = getCoachingBrain();
  const parts: string[] = [];
  if (b.coachingCards.length) {
    const top = [...b.coachingCards].sort((a, c) => c.priority - a.priority).slice(0, 15);
    parts.push(
      `Coaching cards (trigger → suggestion):\n${top.map((c) => `- [${c.category}] ${c.triggerCondition} → ${c.suggestion}`).join("\n")}`
    );
  }
  if (b.bestPractices.length) {
    parts.push(`Best practices (proven to work for Noah):\n${b.bestPractices.slice(0, 15).map((p) => `- ${p.practice}`).join("\n")}`);
  }
  if (b.commonMistakes.length) {
    parts.push(`Common mistakes to avoid:\n${b.commonMistakes.slice(0, 10).map((m) => `- ${m.mistake}${m.fix ? ` → Fix: ${m.fix}` : ""}`).join("\n")}`);
  }
  if (b.voiceProfile.tone || b.voiceProfile.strengths.length) {
    parts.push(
      `Noah's voice profile: tone=${b.voiceProfile.tone || "n/a"}, pace=${b.voiceProfile.pace || "n/a"}, strengths=${b.voiceProfile.strengths.join(", ") || "n/a"}`
    );
  }
  return parts.join("\n\n");
}

/**
 * Full three-brain context for AI prompts. Includes the legacy flat
 * knowledge base (interview) so nothing seeded before the brains
 * existed gets lost.
 */
export function buildFullBrainContext(leadId?: string): string {
  const sections: string[] = [];

  const kb = getKnowledgeBase();
  if (kb) {
    sections.push(`## BUSINESS KNOWLEDGE (from Noah's interview)
Business: ${kb.businessName || "555 Digital"}
Services: ${kb.services || "N/A"}
Pricing: ${kb.pricing || "N/A"}
Ideal customers: ${kb.idealCustomers || "N/A"}
Differentiation: ${kb.differentiation || "N/A"}
Sales approach: ${kb.salesApproach || "N/A"}
Common objections: ${kb.commonObjections || "N/A"}
Best calls: ${kb.bestCalls || "N/A"}`);
  }

  const market = buildMarketContext();
  if (market) sections.push(`## MARKET BRAIN\n${market}`);

  const leads = buildLeadContext(leadId);
  if (leads) sections.push(`## LEADS BRAIN${leadId ? " (this lead)" : ""}\n${leads}`);

  const coaching = buildCoachingContext();
  if (coaching) sections.push(`## COACHING BRAIN\n${coaching}`);

  return sections.join("\n\n---\n\n");
}
