"use client";

import { AlertTriangle, RefreshCw, X } from "lucide-react";

interface AIErrorCardProps {
  error: string;
  suggestion?: string;
  onRetry: () => void;
  onDismiss?: () => void;
  retrying?: boolean;
}

export default function AIErrorCard({
  error,
  suggestion,
  onRetry,
  onDismiss,
  retrying,
}: AIErrorCardProps) {
  return (
    <div
      className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-medium">{error}</p>
          {suggestion && (
            <p className="text-amber-400/70 text-xs mt-1">{suggestion}</p>
          )}
          <button
            onClick={onRetry}
            disabled={retrying}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-md text-xs font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Retrying..." : "Retry"}
          </button>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-400/60 hover:text-amber-400 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
