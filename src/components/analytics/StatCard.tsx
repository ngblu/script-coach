"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  sub?: string;
  delay?: number;
}

export default function StatCard({ label, value, icon: Icon, color, sub, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-surface border border-border rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </span>
      </div>
      <p className="text-2xl font-bold text-text-primary mt-2">{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </motion.div>
  );
}
