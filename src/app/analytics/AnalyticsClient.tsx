"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Phone, Trophy, Sparkles, Users, Download, TrendingUp, Swords } from "lucide-react";
import { computeAnalytics, analyticsToCSV, type AnalyticsSummary } from "@/lib/analytics-store";
import StatCard from "@/components/analytics/StatCard";
import { LineChart, BarChart, DonutChart } from "@/components/analytics/Charts";

export default function AnalyticsClient() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  // Compute client-side after mount (localStorage-backed)
  useEffect(() => {
    setAnalytics(computeAnalytics());
  }, []);

  const coachingImpact = useMemo(() => {
    if (!analytics || analytics.scoreHistory.length < 2) return null;
    const half = Math.floor(analytics.scoreHistory.length / 2);
    const firstHalf = analytics.scoreHistory.slice(0, half);
    const secondHalf = analytics.scoreHistory.slice(half);
    const avg = (arr: { score: number }[]) =>
      Math.round(arr.reduce((s, x) => s + x.score, 0) / arr.length);
    return { before: avg(firstHalf), after: avg(secondHalf) };
  }, [analytics]);

  const exportCSV = () => {
    if (!analytics) return;
    const blob = new Blob([analyticsToCSV(analytics)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `script-coach-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!analytics) {
    return <div className="p-8 pt-16 lg:pt-8 text-text-muted">Loading analytics...</div>;
  }

  const hasAnyData =
    analytics.callsMade > 0 ||
    analytics.scriptsAnalyzed > 0 ||
    analytics.practiceSessions > 0 ||
    analytics.leadsGenerated > 0;

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            What's working, what isn't, and where the deals are.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-surface border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </motion.div>

      {!hasAnyData && (
        <div className="border border-dashed border-border rounded-xl p-10 text-center mb-8">
          <TrendingUp className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="font-semibold text-text-primary">No data yet</h2>
          <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
            Run live calls, practice sessions, and script analyses — your numbers build up here
            automatically.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Calls Made" value={analytics.callsMade} icon={Phone} color="#6c8cff" sub={analytics.avgCallSeconds > 0 ? `avg ${Math.floor(analytics.avgCallSeconds / 60)}m ${analytics.avgCallSeconds % 60}s` : undefined} delay={0} />
        <StatCard label="Win Rate" value={`${analytics.winRate}%`} icon={Trophy} color="#06d6a0" sub={`${analytics.outcomes.won} won / ${analytics.outcomes.lost} lost`} delay={0.05} />
        <StatCard label="Scripts Analyzed" value={analytics.scriptsAnalyzed} icon={Sparkles} color="#f59e0b" delay={0.1} />
        <StatCard label="Leads in Pipeline" value={analytics.leadsInPipeline} icon={Users} color="#22c55e" sub={`${analytics.leadsClosed} closed all-time`} delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Calls per day */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Calls — Last 30 Days</h2>
          <LineChart data={analytics.callsPerDay} ariaLabel="Line chart of calls per day over the last 30 days" />
        </motion.div>

        {/* Win rate by script */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Win Rate by Script</h2>
          {analytics.scriptPerformance.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">
              Log outcomes on your scripts (won / lost / meeting booked) to see which scripts close.
            </p>
          ) : (
            <BarChart
              data={analytics.scriptPerformance.map((s) => ({
                label: s.title,
                value: s.winRate,
                sub: `${s.won}/${s.total}`,
              }))}
              ariaLabel="Bar chart of win rate by script"
            />
          )}
        </motion.div>

        {/* Objection breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Objection Breakdown</h2>
          {analytics.topObjections.length === 0 ? (
            <p className="text-xs text-text-muted py-6 text-center">
              Objections spotted in your live call transcripts will be tallied here.
            </p>
          ) : (
            <DonutChart
              data={analytics.topObjections.map((o, i) => ({
                label: o.label,
                value: o.count,
                color: ["#6c8cff", "#06d6a0", "#f59e0b", "#ef4444", "#22c55e", "#9ca3b4", "#a78bfa"][i % 7],
              }))}
              ariaLabel="Donut chart of most common objections"
            />
          )}
        </motion.div>

        {/* Coaching impact */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Coaching Impact</h2>
          {!coachingImpact ? (
            <p className="text-xs text-text-muted py-6 text-center">
              Analyze scripts over time to track how coaching improves your scores.
            </p>
          ) : (
            <div className="flex items-center justify-around py-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-text-muted">{coachingImpact.before}</p>
                <p className="text-[11px] text-text-muted mt-1">Earlier avg score</p>
              </div>
              <TrendingUp
                className={`w-8 h-8 ${coachingImpact.after >= coachingImpact.before ? "text-success" : "text-danger rotate-90"}`}
              />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{coachingImpact.after}</p>
                <p className="text-[11px] text-text-muted mt-1">Recent avg score</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-2 pt-3 border-t border-border">
            <Swords className="w-3.5 h-3.5 text-text-muted" />
            <p className="text-[11px] text-text-muted">
              {analytics.practiceSessions} practice session{analytics.practiceSessions === 1 ? "" : "s"} completed
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
