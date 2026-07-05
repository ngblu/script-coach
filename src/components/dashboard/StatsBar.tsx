"use client";

import { FileText, TrendingUp, Target, Activity } from "lucide-react";

interface StatsBarProps {
  totalScripts: number;
  analyzedCount: number;
  winRate: number;
  totalOutcomes: number;
}

const stats = [
  { key: "totalScripts", label: "Scripts", icon: FileText, color: "text-primary" },
  { key: "analyzedCount", label: "Analyzed", icon: Activity, color: "text-accent" },
  { key: "winRate", label: "Win Rate", icon: TrendingUp, color: "text-success", suffix: "%" },
  { key: "totalOutcomes", label: "Tracked Calls", icon: Target, color: "text-warning" },
];

export default function StatsBar(props: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map(({ key, label, icon: Icon, color, suffix }) => {
        const value = props[key as keyof StatsBarProps];
        return (
          <div
            key={key}
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                {value}{suffix || ""}
              </div>
              <div className="text-xs text-text-muted">{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
