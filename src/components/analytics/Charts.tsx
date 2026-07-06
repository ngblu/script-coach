"use client";

import { motion } from "framer-motion";
import type { DayCount } from "@/lib/brains/types";

// ============ LINE CHART ============
interface LineChartProps {
  data: DayCount[];
  color?: string;
  height?: number;
  ariaLabel: string;
}

export function LineChart({ data, color = "#6c8cff", height = 160, ariaLabel }: LineChartProps) {
  const w = 600;
  const h = height;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.count), 1);

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (d.count / max) * (h - pad * 2);
    return { x, y, ...d };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1]?.x || pad} ${h - pad} L ${pad} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={ariaLabel}>
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={pad}
          x2={w - pad}
          y1={h - pad - f * (h - pad * 2)}
          y2={h - pad - f * (h - pad * 2)}
          stroke="#1e2130"
          strokeWidth="1"
        />
      ))}
      <motion.path
        d={areaPath}
        fill={`${color}18`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />
      {/* max label */}
      <text x={pad} y={pad - 8} fontSize="10" fill="#5c6370">
        max {max}
      </text>
      {/* first + last date labels */}
      <text x={pad} y={h - 6} fontSize="9" fill="#5c6370">
        {data[0]?.date.slice(5)}
      </text>
      <text x={w - pad} y={h - 6} fontSize="9" fill="#5c6370" textAnchor="end">
        {data[data.length - 1]?.date.slice(5)}
      </text>
    </svg>
  );
}

// ============ BAR CHART ============
interface BarDatum {
  label: string;
  value: number; // 0-100 for percentages, or raw
  sub?: string;
}

interface BarChartProps {
  data: BarDatum[];
  color?: string;
  suffix?: string;
  ariaLabel: string;
}

export function BarChart({ data, color = "#06d6a0", suffix = "%", ariaLabel }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5" role="img" aria-label={ariaLabel}>
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-secondary truncate mr-2">{d.label}</span>
            <span className="text-text-primary font-semibold shrink-0">
              {d.value}
              {suffix} {d.sub && <span className="text-text-muted font-normal">({d.sub})</span>}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ DONUT CHART ============
interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  ariaLabel: string;
}

export function DonutChart({ data, ariaLabel }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const r = 54;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5" role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e2130" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circumference;
          const el = (
            <motion.circle
              key={d.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
            />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="#e8e8ed">
          {total}
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#5c6370">
          total
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-text-secondary">{d.label}</span>
            <span className="text-text-primary font-semibold ml-auto pl-3">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
