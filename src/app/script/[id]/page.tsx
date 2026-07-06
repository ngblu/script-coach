"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  ChevronDown,
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
import AIErrorCard from "@/components/ui/AIErrorCard";
import { buildFullBrainContext } from "@/lib/brains/context";
import {
  getModels,
  getSelectedModel,
  setSelectedModel,
  type ModelInfo,
} from "@/lib/models";

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ScriptDetailInner id={id} />;
}

function ScriptDetailInner({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<"edit" | "analysis" | "versions" | "outcomes" | "transcripts" | "practice">("edit");
  const [analyzing, setAnalyzing] = useState(false);
  const [model, setModel] = useState<string>(getSelectedModel);
  const [error, setError] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<string>("");
  const router = useRouter();
  const script = useScript(id);
  const models = getModels();

  // Persist model choice to localStorage on every change
  const handleModelChange = useCallback((newModel: string) => {
    setModel(newModel);
    setSelectedModel(newModel);
  }, []);

  // If the persisted model is no longer in the list, fall back to first available
  useEffect(() => {
    if (!models.some((m) => m.id === model)) {
      setModel(models[0].id);
    }
  }, [models, model]);

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
    setError(null);
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
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Analysis failed");
        setErrorSuggestion(data.suggestion || "Check your API keys in Settings or try again.");
        return;
      }
      const analysis: AnalysisResult = data;
      updateScript(script.id, {
        analyses: [...script.analyses, analysis],
      });
      setActiveTab("analysis");
    } catch (err) {
      setError("Analysis failed — network error or API unavailable.");
      setErrorSuggestion("Check your API keys in Settings or ensure the server is running.");
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
      {/* AI Error */}
      {error && (
        <div className="mb-4">
          <AIErrorCard
            error={error}
            suggestion={errorSuggestion}
            onRetry={handleAnalyze}
            retrying={analyzing}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

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
          {/* Model selector — native <select> for simplicity */}
          <div className="relative">
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="appearance-none bg-surface border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-text-primary cursor-pointer hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
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
