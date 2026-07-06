"use client";

// Analytics aggregation — computes metrics from all existing stores.
// Derived on-demand rather than double-stored, so numbers never drift.

import { getScripts } from "@/lib/store";
import { getLeads } from "@/lib/leadsStore";
import { getLiveSessions } from "@/lib/liveSessionStore";
import { getPracticeSessions } from "@/lib/practiceSessionStore";
import type { DayCount } from "./brains/types";

export interface AnalyticsSummary {
  callsMade: number;
  callsPerDay: DayCount[];
  scriptsAnalyzed: number;
  practiceSessions: number;
  winRate: number; // 0-100, from script outcomes
  outcomes: { won: number; lost: number; noResponse: number; meetingBooked: number };
  topObjections: { label: string; count: number }[];
  scriptPerformance: { title: string; won: number; total: number; winRate: number }[];
  scoreHistory: { date: string; score: number }[];
  leadsGenerated: number;
  leadsClosed: number;
  leadsInPipeline: number;
  avgCallSeconds: number;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function computeAnalytics(): AnalyticsSummary {
  const scripts = getScripts();
  const leads = getLeads();
  const liveSessions = getLiveSessions();
  const practiceSessions = getPracticeSessions();

  // Calls per day (live sessions over the last 30 days)
  const callCounts = new Map<string, number>();
  for (const s of liveSessions) {
    const key = dayKey(s.startedAt);
    callCounts.set(key, (callCounts.get(key) || 0) + 1);
  }
  const callsPerDay: DayCount[] = lastNDays(30).map((date) => ({
    date,
    count: callCounts.get(date) || 0,
  }));

  // Outcomes from script outcome tracking
  const outcomes = { won: 0, lost: 0, noResponse: 0, meetingBooked: 0 };
  for (const script of scripts) {
    for (const o of script.outcomes) {
      if (o.result === "won") outcomes.won++;
      else if (o.result === "lost") outcomes.lost++;
      else if (o.result === "no-response") outcomes.noResponse++;
      else if (o.result === "meeting-booked") outcomes.meetingBooked++;
    }
  }
  const decidedTotal = outcomes.won + outcomes.lost;
  const winRate = decidedTotal > 0 ? Math.round((outcomes.won / decidedTotal) * 100) : 0;

  // Per-script performance
  const scriptPerformance = scripts
    .filter((s) => s.outcomes.length > 0)
    .map((s) => {
      const won = s.outcomes.filter((o) => o.result === "won" || o.result === "meeting-booked").length;
      return {
        title: s.title,
        won,
        total: s.outcomes.length,
        winRate: Math.round((won / s.outcomes.length) * 100),
      };
    })
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 8);

  // Objection frequency: mine live session transcripts for common objection phrases
  const OBJECTION_PATTERNS: { label: string; patterns: RegExp }[] = [
    { label: "Too expensive / budget", patterns: /expensive|budget|afford|cost too|price/i },
    { label: "Already have someone", patterns: /already have|got a guy|current (web|site)|existing/i },
    { label: "Not interested", patterns: /not interested|no thanks|don'?t need/i },
    { label: "Send me info", patterns: /send (me )?(some )?(info|email|details)/i },
    { label: "Bad timing / busy", patterns: /busy|bad time|call (me )?back|not (right )?now|later/i },
    { label: "Happy with current site", patterns: /happy with|site('s| is) fine|works fine/i },
    { label: "Need to think / talk to partner", patterns: /think about|talk to my|discuss with/i },
  ];
  const objectionCounts = new Map<string, number>();
  for (const session of liveSessions) {
    for (const entry of session.transcript) {
      if (entry.speaker !== "prospect") continue;
      for (const { label, patterns } of OBJECTION_PATTERNS) {
        if (patterns.test(entry.content)) {
          objectionCounts.set(label, (objectionCounts.get(label) || 0) + 1);
        }
      }
    }
  }
  const topObjections = Array.from(objectionCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Analysis score history (coaching impact over time)
  const scoreHistory = scripts
    .flatMap((s) => s.analyses.map((a) => ({ date: a.createdAt, score: a.overallScore })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Average call duration
  const durations = liveSessions
    .filter((s) => s.endedAt)
    .map((s) => (new Date(s.endedAt as string).getTime() - new Date(s.startedAt).getTime()) / 1000)
    .filter((d) => d > 0 && d < 3600);
  const avgCallSeconds =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return {
    callsMade: liveSessions.length,
    callsPerDay,
    scriptsAnalyzed: scripts.reduce((sum, s) => sum + s.analyses.length, 0),
    practiceSessions: practiceSessions.length,
    winRate,
    outcomes,
    topObjections,
    scriptPerformance,
    scoreHistory: scoreHistory.map((s) => ({ date: dayKey(s.date), score: s.score })),
    leadsGenerated: leads.length,
    leadsClosed: leads.filter((l) => l.status === "closed").length,
    leadsInPipeline: leads.filter((l) => l.status !== "closed").length,
    avgCallSeconds,
  };
}

export function analyticsToCSV(a: AnalyticsSummary): string {
  const lines: string[] = [
    "metric,value",
    `calls_made,${a.callsMade}`,
    `win_rate_pct,${a.winRate}`,
    `scripts_analyzed,${a.scriptsAnalyzed}`,
    `practice_sessions,${a.practiceSessions}`,
    `leads_generated,${a.leadsGenerated}`,
    `leads_closed,${a.leadsClosed}`,
    `leads_in_pipeline,${a.leadsInPipeline}`,
    `avg_call_seconds,${a.avgCallSeconds}`,
    "",
    "date,calls",
    ...a.callsPerDay.map((d) => `${d.date},${d.count}`),
    "",
    "objection,count",
    ...a.topObjections.map((o) => `"${o.label}",${o.count}`),
    "",
    "script,won,total,win_rate_pct",
    ...a.scriptPerformance.map((s) => `"${s.title}",${s.won},${s.total},${s.winRate}`),
  ];
  return lines.join("\n");
}
