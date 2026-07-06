"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Plus,
  Minus,
  Brain,
} from "lucide-react";
import { useScript, updateScript } from "@/lib/store";
import type { AnalysisResult, ScriptVersion, Outcome } from "@/lib/types";
import { generateId, formatDate } from "@/lib/utils";
import ScriptEditor from "@/components/script/ScriptEditor";
import AnalysisPanel from "@/components/script/AnalysisPanel";
import VersionHistory from "@/components/script/VersionHistory";
import OutcomeTracker from "@/components/script/OutcomeTracker";
import TranscriptPanel from "@/components/script/TranscriptPanel";
import PracticePanel from "@/components/script/PracticePanel";
import { buildFullBrainContext } from "@/lib/brains/context";

export default function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ScriptDetailInner params={params} />;
}

function ScriptDetailInner({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "analysis" | "versions" | "outcomes" | "transcripts" | "practice">("edit");
  const [analyzing, setAnalyzing] = useState(false);
  const [model, setModel] = useState<"deepseek/deepseek-chat" | "anthropic/claude-opus-4">("deepseek/deepseek-chat");
  const router = useRouter();

  // Resolve params
  useEffect(() => {
    paramsPromise.then(setResolvedParams);
  }, [paramsPromise]);

  const script = resolvedParams ? useScript(resolvedParams.id) : undefined;

  const handleSave = useCallback(
    (content: string) => {
      if (!script || !content.trim()) return;
      // Don't create a version if content hasn't changed from current
      if (content === script.content && script.versions.length > 0) return;
      const version: ScriptVersion = {
        id: generateId(),
        content,
        createdAt: new Date().toISOString(),
        label: `v${script.versions.length + 1}`,
      };
      updateScript(script.id, {
        content,
        versions: [...script.versions, version],
      });
    },
    [script]
  );

  const handleAnalyze = useCallback(async () => {
    if (!script || !script.content.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.content,
          title: script.title,
          model,
          brainContext: buildFullBrainContext(),
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const analysis: AnalysisResult = await res.json();
      updateScript(script.id, {
        analyses: [...script.analyses, analysis],
      });
      setActiveTab("analysis");
    } catch (err) {
      alert("Analysis failed. Is the Hermes bridge running?");
    } finally {
      setAnalyzing(false);
    }
  }, [script, model]);

  const handleAddOutcome = useCallback(
    (outcome: Outcome) => {
      if (!script) return;
      updateScript(script.id, {
        outcomes: [...script.outcomes, outcome],
      });
    },
    [script]
  );

  const handleDeleteOutcome = useCallback(
    (outcomeId: string) => {
      if (!script) return;
      updateScript(script.id, {
        outcomes: script.outcomes.filter((o) => o.id !== outcomeId),
      });
    },
    [script]
  );

  if (!resolvedParams) {
    return <div className="p-8 text-text-muted">Loading...</div>;
  }

  if (!script) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-secondary mb-4">Script not found</p>
        <button
          onClick={() => router.push("/")}
          className="text-primary hover:underline text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const latestAnalysis = script.analyses[script.analyses.length - 1];

  const tabs = [
    { key: "edit" as const, label: "Editor" },
    { key: "analysis" as const, label: "Analysis", badge: script.analyses.length },
    { key: "versions" as const, label: "Versions", badge: script.versions.length },
    { key: "outcomes" as const, label: "Outcomes", badge: script.outcomes.length },
    { key: "transcripts" as const, label: "Transcripts" },
    { key: "practice" as const, label: "Practice", badge: undefined },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">{script.title}</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Updated {formatDate(script.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Model selector */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
            <button
              onClick={() => setModel("deepseek/deepseek-chat")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                model === "deepseek/deepseek-chat"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              DeepSeek
            </button>
            <button
              onClick={() => setModel("anthropic/claude-opus-4")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                model === "anthropic/claude-opus-4"
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Opus
            </button>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !script.content.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyzing..." : "Analyze Script"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-surface-hover text-text-muted">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "edit" && (
        <ScriptEditor
          content={script.content}
          onSave={handleSave}
        />
      )}
      {activeTab === "analysis" && (
        <AnalysisPanel
          analyses={script.analyses}
          onRunAnalysis={handleAnalyze}
          analyzing={analyzing}
          hasContent={!!script.content.trim()}
        />
      )}
      {activeTab === "versions" && (
        <VersionHistory versions={script.versions} />
      )}
      {activeTab === "outcomes" && (
        <OutcomeTracker
          outcomes={script.outcomes}
          versions={script.versions}
          onAdd={handleAddOutcome}
          onDelete={handleDeleteOutcome}
        />
      )}
      {activeTab === "transcripts" && (
        <TranscriptPanel scriptContent={script.content} scriptTitle={script.title} />
      )}
      {activeTab === "practice" && (
        <PracticePanel scriptContent={script.content} scriptTitle={script.title} />
      )}
    </div>
  );
}
