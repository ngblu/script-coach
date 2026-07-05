"use client";

import { Sparkles, TrendingUp, AlertCircle, Lightbulb, ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

interface AnalysisPanelProps {
  analyses: AnalysisResult[];
  onRunAnalysis: () => void;
  analyzing: boolean;
  hasContent: boolean;
}

export default function AnalysisPanel({
  analyses,
  onRunAnalysis,
  analyzing,
  hasContent,
}: AnalysisPanelProps) {
  if (analyses.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-secondary mb-2">
          No analysis yet
        </h3>
        <p className="text-text-muted text-sm mb-6 max-w-md mx-auto">
          Run an AI analysis to get scores, strengths, weaknesses, and rewritten sections for your script.
        </p>
        <button
          onClick={onRunAnalysis}
          disabled={analyzing || !hasContent}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </button>
      </div>
    );
  }

  const latest = analyses[analyses.length - 1];

  return (
    <div className="space-y-6">
      {/* Score overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ScoreCard label="Overall" value={latest.overallScore} color="primary" />
        <ScoreCard label="Clarity" value={latest.scores.clarity} color="accent" />
        <ScoreCard label="Persuasion" value={latest.scores.persuasion} color="warning" />
        <ScoreCard label="Objections" value={latest.scores.objectionHandling} color="danger" />
        <ScoreCard label="Closing" value={latest.scores.closingStrength} color="success" />
      </div>

      {/* Summary */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Summary</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{latest.summary}</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-success/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-success flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" />
            Strengths
          </h3>
          <ul className="space-y-2">
            {latest.strengths.map((s, i) => (
              <li key={i} className="text-sm text-text-secondary flex gap-2">
                <span className="text-success shrink-0 mt-0.5">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface border border-danger/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-danger flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" />
            Weaknesses
          </h3>
          <ul className="space-y-2">
            {latest.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-text-secondary flex gap-2">
                <span className="text-danger shrink-0 mt-0.5">-</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Suggestions */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-warning flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4" />
          Improvement Suggestions
        </h3>
        <ul className="space-y-2">
          {latest.suggestions.map((s, i) => (
            <li key={i} className="text-sm text-text-secondary flex gap-2">
              <span className="text-warning shrink-0 mt-0.5">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Rewritten sections */}
      {latest.rewrittenSections.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Rewritten Sections
          </h3>
          {latest.rewrittenSections.map((section, i) => (
            <RewriteCard key={i} section={section} index={i} />
          ))}
        </div>
      )}

      {/* Analysis history */}
      {analyses.length > 1 && (
        <details className="bg-surface border border-border rounded-xl p-5">
          <summary className="text-sm font-semibold text-text-primary cursor-pointer">
            Analysis History ({analyses.length})
          </summary>
          <div className="mt-3 space-y-2">
            {analyses.slice().reverse().map((a, i) => (
              <div key={a.id} className="flex items-center justify-between text-xs text-text-muted py-1 border-b border-border/50 last:border-0">
                <span>Analysis #{analyses.length - i}</span>
                <span>Score: {a.overallScore}/100</span>
                <span>{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Re-analyze */}
      <div className="text-center pt-4">
        <button
          onClick={onRunAnalysis}
          disabled={analyzing}
          className="text-sm text-text-muted hover:text-primary transition-colors disabled:opacity-40"
        >
          {analyzing ? "Analyzing..." : "Re-analyze current script"}
        </button>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "text-primary border-primary/20",
    accent: "text-accent border-accent/20",
    warning: "text-warning border-warning/20",
    danger: "text-danger border-danger/20",
    success: "text-success border-success/20",
  };

  return (
    <div className={`bg-surface border rounded-xl p-4 text-center ${colorMap[color] || colorMap.primary}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
    </div>
  );
}

function RewriteCard({
  section,
  index,
}: {
  section: { original: string; improved: string; reason: string };
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-hover transition-colors"
      >
        <div>
          <span className="text-xs text-text-muted">Section {index + 1}</span>
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">{section.reason}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-slide-up">
          <div>
            <div className="text-xs font-medium text-danger mb-1">Original</div>
            <p className="text-sm text-text-secondary bg-background border border-border rounded-lg p-3">
              {section.original}
            </p>
          </div>
          <div>
            <div className="text-xs font-medium text-success mb-1">Improved</div>
            <p className="text-sm text-text-primary bg-success/5 border border-success/20 rounded-lg p-3">
              {section.improved}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
