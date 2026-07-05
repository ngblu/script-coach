"use client";

import { useState } from "react";
import { Mic, Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TranscriptAnalysis {
  id: string;
  createdAt: string;
  adherence: number;
  effectiveness: number;
  whatWorked: string[];
  whatDidntWork: string[];
  newObjections: string[];
  closeAnalysis: string;
  keyTakeaways: string[];
  summary: string;
}

interface TranscriptPanelProps {
  scriptContent: string;
  scriptTitle: string;
}

export default function TranscriptPanel({ scriptContent, scriptTitle }: TranscriptPanelProps) {
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyses, setAnalyses] = useState<TranscriptAnalysis[]>([]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, scriptTitle, scriptContent }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const analysis: TranscriptAnalysis = await res.json();
      setAnalyses((prev) => [analysis, ...prev]);
      setTranscript("");
    } catch (err) {
      alert("Transcript analysis failed. Is the bridge running?");
    } finally {
      setAnalyzing(false);
    }
  };

  const latest = analyses[0];

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Paste Call Transcript</h3>
        </div>
        <p className="text-xs text-text-muted">
          Paste a transcript from your sales call. The AI will compare it to your script and tell you what worked, what didn't, and what objections came up.
        </p>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={`Paste your call transcript here...

Example:
Rep: Hey, this is Noah with 555 Digital...
Prospect: I'm actually happy with my current site
Rep: That's great, when was the last time you...
...`}
          className="w-full h-40 bg-background border border-border rounded-lg p-4 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent/30 font-mono leading-relaxed"
        />
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !transcript.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyzing..." : "Analyze Transcript"}
        </button>
      </div>

      {/* Results */}
      {analyses.length === 0 && (
        <div className="text-center py-12">
          <Mic className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary text-sm">No transcripts analyzed yet. Paste one above to get started.</p>
        </div>
      )}

      {latest && (
        <div className="space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-primary/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{latest.adherence}%</div>
              <div className="text-xs text-text-muted mt-1">Script Adherence</div>
            </div>
            <div className="bg-surface border border-success/20 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-success">{latest.effectiveness}%</div>
              <div className="text-xs text-text-muted mt-1">Call Effectiveness</div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Summary</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{latest.summary}</p>
          </div>

          {/* What worked vs didn't */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface border border-success/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-success flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" /> What Worked
              </h3>
              <ul className="space-y-2">
                {latest.whatWorked.map((w, i) => (
                  <li key={i} className="text-sm text-text-secondary flex gap-2">
                    <span className="text-success shrink-0 mt-0.5">+</span> {w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface border border-danger/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-danger flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" /> What Didn't Work
              </h3>
              <ul className="space-y-2">
                {latest.whatDidntWork.map((w, i) => (
                  <li key={i} className="text-sm text-text-secondary flex gap-2">
                    <span className="text-danger shrink-0 mt-0.5">-</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* New objections */}
          {latest.newObjections.length > 0 && (
            <div className="bg-surface border border-warning/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-warning flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" /> New Objections Encountered
              </h3>
              <ul className="space-y-2">
                {latest.newObjections.map((o, i) => (
                  <li key={i} className="text-sm text-text-secondary flex gap-2">
                    <span className="text-warning shrink-0 mt-0.5">{i + 1}.</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Close */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Close Analysis</h3>
            <p className="text-sm text-text-secondary">{latest.closeAnalysis}</p>
          </div>

          {/* Takeaways */}
          <div className="bg-surface border border-accent/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-accent flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" /> Key Takeaways
            </h3>
            <ul className="space-y-2">
              {latest.keyTakeaways.map((t, i) => (
                <li key={i} className="text-sm text-text-secondary flex gap-2">
                  <span className="text-accent shrink-0 mt-0.5">{i + 1}.</span> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* History */}
          {analyses.length > 1 && (
            <details className="bg-surface border border-border rounded-xl p-5">
              <summary className="text-sm font-semibold text-text-primary cursor-pointer">
                Previous Analyses ({analyses.length - 1})
              </summary>
              <div className="mt-3 space-y-2">
                {analyses.slice(1).map((a, i) => (
                  <div key={a.id} className="text-xs text-text-muted py-1 border-b border-border/50 last:border-0 flex justify-between">
                    <span>Analysis #{analyses.length - i - 1}</span>
                    <span>Adherence: {a.adherence}%</span>
                    <span>{formatDate(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
