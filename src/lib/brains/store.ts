"use client";

// ============================================================
// Three-Brain store — localStorage-backed, follows the same
// module-level listener pattern as store.ts / leadsStore.ts
// ============================================================

import { useState, useEffect, useCallback } from "react";
import type {
  MarketBrain,
  LeadsBrain,
  CoachingBrain,
  Vertical,
  MarketFact,
  CompetitorInfo,
  MarketTrend,
  LeadIntel,
  CoachingCard,
  BestPractice,
  CommonMistake,
  VoiceProfile,
} from "./types";

const MARKET_KEY = "script-coach-market-brain";
const LEADS_KEY = "script-coach-leads-brain";
const COACHING_KEY = "script-coach-coaching-brain";

// ---------- defaults ----------
function emptyMarketBrain(): MarketBrain {
  return {
    industry: "Web design for local service businesses",
    verticals: [],
    competitors: [],
    trends: [],
    marketFacts: [],
    updatedAt: new Date().toISOString(),
  };
}

function emptyLeadsBrain(): LeadsBrain {
  return { intel: [], updatedAt: new Date().toISOString() };
}

function emptyCoachingBrain(): CoachingBrain {
  return {
    coachingCards: [],
    bestPractices: [],
    commonMistakes: [],
    voiceProfile: { tone: "", pace: "", strengths: [], habits: [], updatedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
}

// ---------- generic load/save ----------
function load<T>(key: string, fallback: () => T): T {
  if (typeof window === "undefined") return fallback();
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback(), ...JSON.parse(raw) } : fallback();
  } catch {
    return fallback();
  }
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- module state + listeners ----------
let marketBrain: MarketBrain | null = null;
let leadsBrain: LeadsBrain | null = null;
let coachingBrain: CoachingBrain | null = null;
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

function touch<T extends { updatedAt: string }>(brain: T): T {
  return { ...brain, updatedAt: new Date().toISOString() };
}

// ============ MARKET BRAIN ============
export function getMarketBrain(): MarketBrain {
  if (!marketBrain) marketBrain = load(MARKET_KEY, emptyMarketBrain);
  return marketBrain;
}

export function setMarketBrain(brain: MarketBrain) {
  marketBrain = touch(brain);
  save(MARKET_KEY, marketBrain);
  notify();
}

export function addVertical(v: Vertical) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, verticals: [v, ...b.verticals] });
}

export function updateVertical(id: string, updates: Partial<Vertical>) {
  const b = getMarketBrain();
  setMarketBrain({
    ...b,
    verticals: b.verticals.map((v) =>
      v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    ),
  });
}

export function deleteVertical(id: string) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, verticals: b.verticals.filter((v) => v.id !== id) });
}

export function addMarketFact(f: MarketFact) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, marketFacts: [f, ...b.marketFacts] });
}

export function deleteMarketFact(id: string) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, marketFacts: b.marketFacts.filter((f) => f.id !== id) });
}

export function addCompetitor(c: CompetitorInfo) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, competitors: [c, ...b.competitors] });
}

export function deleteCompetitor(id: string) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, competitors: b.competitors.filter((c) => c.id !== id) });
}

export function addTrend(t: MarketTrend) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, trends: [t, ...b.trends] });
}

export function deleteTrend(id: string) {
  const b = getMarketBrain();
  setMarketBrain({ ...b, trends: b.trends.filter((t) => t.id !== id) });
}

// ============ LEADS BRAIN ============
export function getLeadsBrain(): LeadsBrain {
  if (!leadsBrain) leadsBrain = load(LEADS_KEY, emptyLeadsBrain);
  return leadsBrain;
}

export function setLeadsBrain(brain: LeadsBrain) {
  leadsBrain = touch(brain);
  save(LEADS_KEY, leadsBrain);
  notify();
}

export function getLeadIntel(leadId: string): LeadIntel | undefined {
  return getLeadsBrain().intel.find((i) => i.leadId === leadId);
}

export function upsertLeadIntel(intel: LeadIntel) {
  const b = getLeadsBrain();
  const exists = b.intel.some((i) => i.leadId === intel.leadId);
  setLeadsBrain({
    ...b,
    intel: exists
      ? b.intel.map((i) =>
          i.leadId === intel.leadId
            ? { ...i, ...intel, updatedAt: new Date().toISOString() }
            : i
        )
      : [intel, ...b.intel],
  });
}

export function updateLeadIntel(leadId: string, updates: Partial<LeadIntel>) {
  const b = getLeadsBrain();
  setLeadsBrain({
    ...b,
    intel: b.intel.map((i) =>
      i.leadId === leadId ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
    ),
  });
}

export function deleteLeadIntel(leadId: string) {
  const b = getLeadsBrain();
  setLeadsBrain({ ...b, intel: b.intel.filter((i) => i.leadId !== leadId) });
}

// ============ COACHING BRAIN ============
export function getCoachingBrain(): CoachingBrain {
  if (!coachingBrain) coachingBrain = load(COACHING_KEY, emptyCoachingBrain);
  return coachingBrain;
}

export function setCoachingBrain(brain: CoachingBrain) {
  coachingBrain = touch(brain);
  save(COACHING_KEY, coachingBrain);
  notify();
}

export function addCoachingCard(card: CoachingCard) {
  const b = getCoachingBrain();
  setCoachingBrain({ ...b, coachingCards: [card, ...b.coachingCards] });
}

export function updateCoachingCard(id: string, updates: Partial<CoachingCard>) {
  const b = getCoachingBrain();
  setCoachingBrain({
    ...b,
    coachingCards: b.coachingCards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  });
}

export function deleteCoachingCard(id: string) {
  const b = getCoachingBrain();
  setCoachingBrain({ ...b, coachingCards: b.coachingCards.filter((c) => c.id !== id) });
}

export function addBestPractice(p: BestPractice) {
  const b = getCoachingBrain();
  // reinforce if a very similar practice already exists
  const existing = b.bestPractices.find(
    (x) => x.practice.toLowerCase().trim() === p.practice.toLowerCase().trim()
  );
  if (existing) {
    setCoachingBrain({
      ...b,
      bestPractices: b.bestPractices.map((x) =>
        x.id === existing.id ? { ...x, timesReinforced: x.timesReinforced + 1 } : x
      ),
    });
  } else {
    setCoachingBrain({ ...b, bestPractices: [p, ...b.bestPractices] });
  }
}

export function deleteBestPractice(id: string) {
  const b = getCoachingBrain();
  setCoachingBrain({ ...b, bestPractices: b.bestPractices.filter((p) => p.id !== id) });
}

export function addCommonMistake(m: CommonMistake) {
  const b = getCoachingBrain();
  setCoachingBrain({ ...b, commonMistakes: [m, ...b.commonMistakes] });
}

export function deleteCommonMistake(id: string) {
  const b = getCoachingBrain();
  setCoachingBrain({ ...b, commonMistakes: b.commonMistakes.filter((m) => m.id !== id) });
}

export function setVoiceProfile(profile: VoiceProfile) {
  const b = getCoachingBrain();
  setCoachingBrain({ ...b, voiceProfile: { ...profile, updatedAt: new Date().toISOString() } });
}

// ============ NEURON COUNTS (for the /brains dashboard) ============
export function marketNeuronCount(): number {
  const b = getMarketBrain();
  return b.verticals.length + b.competitors.length + b.trends.length + b.marketFacts.length;
}

export function leadsNeuronCount(): number {
  const b = getLeadsBrain();
  return b.intel.reduce(
    (sum, i) =>
      sum + 1 + i.talkingPoints.length + i.objections.length + i.callHistory.length,
    0
  );
}

export function coachingNeuronCount(): number {
  const b = getCoachingBrain();
  return b.coachingCards.length + b.bestPractices.length + b.commonMistakes.length;
}

// ============ HOOKS ============
function useBrainSubscription() {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);
  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);
}

export function useMarketBrain(): MarketBrain {
  useBrainSubscription();
  return getMarketBrain();
}

export function useLeadsBrain(): LeadsBrain {
  useBrainSubscription();
  return getLeadsBrain();
}

export function useCoachingBrain(): CoachingBrain {
  useBrainSubscription();
  return getCoachingBrain();
}
