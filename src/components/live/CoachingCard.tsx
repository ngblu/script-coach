"use client";

import { motion } from "framer-motion";
import { X, AlertTriangle, MessageCircle, TrendingUp, Handshake, Zap } from "lucide-react";
import type { LiveCoachSuggestion } from "@/lib/brains/types";

const CATEGORY_META: Record<
  LiveCoachSuggestion["category"],
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  rapport: {
    label: "Rapport",
    icon: Handshake,
    color: "#22c55e",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  objection: {
    label: "Objection",
    icon: AlertTriangle,
    color: "#f59e0b",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  redirect: {
    label: "Redirect",
    icon: MessageCircle,
    color: "#ef4444",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  close: {
    label: "Close Signal",
    icon: TrendingUp,
    color: "#6c8cff",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
};

interface CoachingCardProps {
  suggestion: LiveCoachSuggestion;
  onDismiss: () => void;
}

export default function CoachingCard({ suggestion, onDismiss }: CoachingCardProps) {
  const meta = CATEGORY_META[suggestion.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-xl border ${meta.border} ${meta.bg} p-4 relative`}
      role="status"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: meta.color }}
        >
          <meta.icon className="w-3.5 h-3.5" />
          {meta.label}
          {suggestion.urgency === "high" && (
            <span className="flex items-center gap-0.5 text-danger">
              <Zap className="w-3 h-3" />
              NOW
            </span>
          )}
        </span>
        <button
          onClick={onDismiss}
          className="p-1 min-h-[28px] min-w-[28px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          aria-label="Dismiss coaching tip"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-text-primary leading-relaxed">{suggestion.suggestion}</p>
      {suggestion.fromCardId && (
        <p className="text-[10px] text-text-muted mt-2">From your coaching cards</p>
      )}
    </motion.div>
  );
}
