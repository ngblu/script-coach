"use client";

import { motion } from "framer-motion";
import { Building2, Users, Trash2, Search, Pencil } from "lucide-react";
import type { Vertical } from "@/lib/brains/types";

// ---------- ICP fit radar chart (pure SVG, 5 axes) ----------
const AXES = ["Keywords", "Titles", "ICP Def", "Size Range", "Industry"] as const;

function icpDimensions(v: Vertical): number[] {
  // Score each dimension 0-100 by how filled-out it is
  return [
    Math.min(v.keywords.length * 25, 100),
    Math.min(v.targetTitles.length * 34, 100),
    Math.min(Math.floor(v.icpDescription.length / 1.5), 100),
    v.companySizeMin !== undefined || v.companySizeMax !== undefined ? 100 : 20,
    v.industry.trim() ? 100 : 20,
  ];
}

function RadarChart({ vertical }: { vertical: Vertical }) {
  const dims = icpDimensions(vertical);
  const cx = 60;
  const cy = 60;
  const r = 44;
  const points = dims
    .map((val, i) => {
      const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
      const dist = (val / 100) * r;
      return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`;
    })
    .join(" ");

  const gridLevels = [0.33, 0.66, 1];

  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0" aria-label="ICP completeness radar chart">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={dims
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
              return `${cx + Math.cos(angle) * r * level},${cy + Math.sin(angle) * r * level}`;
            })
            .join(" ")}
          fill="none"
          stroke="#1e2130"
          strokeWidth="1"
        />
      ))}
      {dims.map((_, i) => {
        const angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * r}
            y2={cy + Math.sin(angle) * r}
            stroke="#1e2130"
            strokeWidth="1"
          />
        );
      })}
      <motion.polygon
        points={points}
        fill="#6c8cff33"
        stroke="#6c8cff"
        strokeWidth="1.5"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ transformOrigin: "60px 60px" }}
      />
      {AXES.map((label, i) => {
        const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 11);
        const ly = cy + Math.sin(angle) * (r + 11);
        return (
          <text
            key={label}
            x={lx}
            y={ly}
            fontSize="6.5"
            fill="#5c6370"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

interface VerticalCardProps {
  vertical: Vertical;
  leadCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onFindLeads: () => void;
}

export default function VerticalCard({
  vertical,
  leadCount,
  onEdit,
  onDelete,
  onFindLeads,
}: VerticalCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className="bg-surface border border-border rounded-xl p-5 hover:border-primary/30 transition-colors flex flex-col"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold text-text-primary truncate">{vertical.name}</h3>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{vertical.industry}</p>
          <p className="text-sm text-text-secondary mt-2 line-clamp-3 leading-relaxed">
            {vertical.icpDescription || "No ICP description yet."}
          </p>
        </div>
        <RadarChart vertical={vertical} />
      </div>

      {vertical.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {vertical.keywords.slice(0, 5).map((k) => (
            <span
              key={k}
              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium"
            >
              {k}
            </span>
          ))}
          {vertical.keywords.length > 5 && (
            <span className="px-2 py-0.5 text-[10px] text-text-muted">
              +{vertical.keywords.length - 5} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Users className="w-3.5 h-3.5" />
          <span className="font-semibold text-text-primary">{leadCount}</span> leads
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onFindLeads}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            aria-label={`Find leads for ${vertical.name}`}
          >
            <Search className="w-3.5 h-3.5" />
            Find Leads
          </button>
          <button
            onClick={onEdit}
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label={`Edit ${vertical.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-text-muted hover:text-danger hover:bg-surface-hover transition-colors"
            aria-label={`Delete ${vertical.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
