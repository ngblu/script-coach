"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Plus, FileText, TrendingUp, Target, MessageSquare } from "lucide-react";
import { useScripts, deleteScript, addScript } from "@/lib/store";
import type { Script } from "@/lib/types";
import { cn, formatDate, generateId } from "@/lib/utils";
import ScriptCard from "@/components/dashboard/ScriptCard";
import StatsBar from "@/components/dashboard/StatsBar";

function DashboardInner() {
  const scripts = useScripts();
  const searchParams = useSearchParams();
  const router = useRouter();
  const showNew = searchParams.get("new") === "true";
  const [newTitle, setNewTitle] = useState("");

  const totalOutcomes = scripts.reduce((sum, s) => sum + s.outcomes.length, 0);
  const wonCount = scripts.reduce(
    (sum, s) => sum + s.outcomes.filter((o) => o.result === "won").length,
    0
  );
  const winRate = totalOutcomes > 0 ? Math.round((wonCount / totalOutcomes) * 100) : 0;
  const analyzedCount = scripts.filter((s) => s.analyses.length > 0).length;

  const handleCreate = () => {
    const title = newTitle.trim() || "Untitled Script";
    const id = generateId();
    const now = new Date().toISOString();
    const script: Script = {
      id,
      title,
      content: "",
      createdAt: now,
      updatedAt: now,
      versions: [{ id: generateId(), content: "", createdAt: now, label: "v1" }],
      analyses: [],
      outcomes: [],
      tags: [],
    };
    addScript(script);
    router.push(`/script/${id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this script and all its versions?")) {
      deleteScript(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Script Coach</h1>
          <p className="text-text-secondary text-sm mt-1">
            AI-powered sales script analysis and coaching
          </p>
        </div>
        <button
          onClick={() => setNewTitle("")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Script
        </button>
      </div>

      {/* Stats */}
      <StatsBar
        totalScripts={scripts.length}
        analyzedCount={analyzedCount}
        winRate={winRate}
        totalOutcomes={totalOutcomes}
      />

      {/* New script modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => router.push("/")} />
          <div className="relative bg-surface border border-border rounded-xl p-6 w-full max-w-md animate-scale-in">
            <h2 className="text-lg font-semibold mb-4">New Sales Script</h2>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Script name (e.g., Cold Call - Plumbers)"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Create Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script list */}
      {scripts.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">No scripts yet</h3>
          <p className="text-text-muted text-sm mb-6">
            Create your first sales script to get AI-powered coaching
          </p>
          <button
            onClick={() => router.push("/?new=true")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Script
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onDelete={() => handleDelete(script.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-text-muted">Loading...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
