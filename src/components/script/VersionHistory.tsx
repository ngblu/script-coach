"use client";

import type { ScriptVersion } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { GitBranch, Clock } from "lucide-react";

interface VersionHistoryProps {
  versions: ScriptVersion[];
}

export default function VersionHistory({ versions }: VersionHistoryProps) {
  const reversed = [...versions].reverse();

  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">No versions yet. Save your script to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reversed.map((version, i) => (
        <div
          key={version.id}
          className="bg-surface border border-border rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-text-primary">
                {version.label}
              </span>
              {i === 0 && (
                <span className="px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded-full font-medium">
                  LATEST
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(version.createdAt)}
            </span>
          </div>
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap bg-background border border-border rounded-lg p-4 max-h-64 overflow-y-auto leading-relaxed">
            {version.content || "(empty)"}
          </pre>
        </div>
      ))}
    </div>
  );
}
