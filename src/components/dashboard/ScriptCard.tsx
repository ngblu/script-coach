"use client";

import Link from "next/link";
import { FileText, Trash2, ChevronRight, Sparkles, TrendingUp, Clock } from "lucide-react";
import type { Script } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface ScriptCardProps {
  script: Script;
  onDelete: () => void;
}

export default function ScriptCard({ script, onDelete }: ScriptCardProps) {
  const latestAnalysis = script.analyses[script.analyses.length - 1];
  const wonCount = script.outcomes.filter((o) => o.result === "won").length;
  const versionCount = script.versions.length;

  return (
    <Link
      href={`/script/${script.id}`}
      className="group block bg-surface hover:bg-surface-hover border border-border hover:border-primary/20 rounded-xl p-4 transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
              {script.title}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(script.updatedAt)}
              </span>
              <span className="text-xs text-text-muted">
                {versionCount} version{versionCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {latestAnalysis && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-success/10 border border-success/20 rounded-full">
              <Sparkles className="w-3 h-3 text-success" />
              <span className="text-xs font-medium text-success">
                {latestAnalysis.overallScore}/100
              </span>
            </div>
          )}

          {wonCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">{wonCount} won</span>
            </div>
          )}

          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="p-2.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Delete script"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
