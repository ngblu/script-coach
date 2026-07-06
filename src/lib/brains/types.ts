// ============================================================
// Three-Brain Architecture — shared types
// Market Brain: what we know about industries, verticals, competitors
// Leads Brain: per-lead intelligence (scripts, backgrounds, history)
// Coaching Brain: what makes Noah a better closer
// ============================================================

export type BrainKind = "market" | "leads" | "coaching";

// ---------- Vertical / ICP ----------
export interface Vertical {
  id: string;
  name: string;
  industry: string;
  icpDescription: string;
  keywords: string[];
  targetTitles: string[];
  companySizeMin?: number;
  companySizeMax?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Market Brain ----------
export interface MarketFact {
  id: string;
  fact: string;
  source: string; // "interview" | "transcript" | "document" | "call" | "manual"
  confidence: number; // 0-100
  createdAt: string;
}

export interface CompetitorInfo {
  id: string;
  name: string;
  notes: string;
  strengths: string[];
  weaknesses: string[];
  createdAt: string;
}

export interface MarketTrend {
  id: string;
  trend: string;
  relevance: string;
  createdAt: string;
}

export interface MarketBrain {
  industry: string;
  verticals: Vertical[];
  competitors: CompetitorInfo[];
  trends: MarketTrend[];
  marketFacts: MarketFact[];
  updatedAt: string;
}

// ---------- Leads Brain ----------
export interface CallHistoryEntry {
  id: string;
  date: string;
  type: "live" | "practice";
  transcript: { speaker: "rep" | "prospect"; content: string }[];
  coachingLog: string[];
  outcome?: "won" | "lost" | "no-response" | "meeting-booked";
  notes: string;
}

export interface LeadIntel {
  id: string;
  leadId: string;
  personalizedScript: string;
  preQualBackground: string;
  talkingPoints: string[];
  objections: string[];
  callHistory: CallHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadsBrain {
  intel: LeadIntel[];
  updatedAt: string;
}

// ---------- Coaching Brain ----------
export type CoachingCategory =
  | "objection-handling"
  | "rapport-building"
  | "value-prop"
  | "closing"
  | "redirect"
  | "compliance";

export interface CoachingCard {
  id: string;
  title: string;
  category: CoachingCategory;
  triggerCondition: string; // "Use when prospect says..."
  suggestion: string;
  examples: string[];
  priority: number; // 1-10, higher = surfaces first in live coaching
  favorite: boolean;
  source: string; // "interview" | "call" | "manual" | "generated"
  createdAt: string;
}

export interface BestPractice {
  id: string;
  practice: string;
  context: string;
  timesReinforced: number;
  createdAt: string;
}

export interface CommonMistake {
  id: string;
  mistake: string;
  fix: string;
  createdAt: string;
}

export interface VoiceProfile {
  tone: string;
  pace: string;
  strengths: string[];
  habits: string[];
  updatedAt: string;
}

export interface CoachingBrain {
  coachingCards: CoachingCard[];
  bestPractices: BestPractice[];
  commonMistakes: CommonMistake[];
  voiceProfile: VoiceProfile;
  updatedAt: string;
}

// ---------- Ingestion ----------
export type IngestSourceType = "transcript" | "document" | "interview" | "call";

export interface IngestInsight {
  brain: BrainKind;
  kind: string; // "marketFact" | "competitor" | "trend" | "objection" | "bestPractice" | "mistake" | "coachingCard" | "leadIntel"
  summary: string;
}

export interface IngestResult {
  sourceType: IngestSourceType;
  fileName?: string;
  insights: IngestInsight[];
  ingestedAt: string;
}

// ---------- Live coaching ----------
export type CoachingUrgency = "high" | "medium" | "low";
export type LiveCoachCategory = "objection" | "redirect" | "close" | "rapport";

export interface LiveCoachSuggestion {
  id: string;
  suggestion: string;
  urgency: CoachingUrgency;
  category: LiveCoachCategory;
  fromCardId?: string; // set when suggestion came from a coaching card
  createdAt: string;
}

export interface LiveSession {
  id: string;
  leadId?: string;
  scriptId?: string;
  startedAt: string;
  endedAt?: string;
  transcript: { speaker: "rep" | "prospect"; content: string; at: string }[];
  coachingLog: LiveCoachSuggestion[];
  outcome?: "won" | "lost" | "no-response" | "meeting-booked";
}

// ---------- Playbooks ----------
export interface Playbook {
  id: string;
  name: string;
  verticalId: string;
  scriptIds: string[];
  coachingCardIds: string[];
  targetICP: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Analytics ----------
export interface DayCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AnalyticsData {
  callsMade: number;
  callsPerDay: DayCount[];
  scriptsAnalyzed: number;
  practiceSessions: number;
  practicePerDay: DayCount[];
  totalCallSeconds: number;
  objectionCounts: Record<string, number>;
  scriptOutcomes: Record<string, { won: number; lost: number; noResponse: number; meetingBooked: number }>;
  analysisScoreHistory: { date: string; score: number; scriptId: string }[];
  leadsGenerated: number;
  leadsClosed: number;
  updatedAt: string;
}
