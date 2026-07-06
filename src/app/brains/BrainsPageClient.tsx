"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Sparkles } from "lucide-react";
import BrainDashboard from "@/components/brains/BrainDashboard";

export default function BrainsPageClient() {
  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">The Brains</h1>
          <p className="text-sm text-text-secondary mt-1">
            Three intelligence layers working together. Everything you feed in makes every call smarter.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ingest"
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" />
            Feed the Brains
          </Link>
          <Link
            href="/interview"
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-surface border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Interview Me
          </Link>
        </div>
      </motion.div>

      <BrainDashboard />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-text-muted text-center mt-8"
      >
        Live calls, practice sessions, uploads, and interviews all feed back into these brains automatically.
      </motion.p>
    </div>
  );
}
