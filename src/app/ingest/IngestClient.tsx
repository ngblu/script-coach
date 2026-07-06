"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, ArrowRight } from "lucide-react";
import UploadZone from "@/components/ingestion/UploadZone";

export default function IngestClient() {
  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Feed the Brains</h1>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
          Everything you upload gets analyzed and distributed into your Market, Leads, and Coaching
          Brains. Call transcripts, competitor research, industry articles — the more you feed it,
          the smarter every call gets.
        </p>
        <Link
          href="/brains"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline"
        >
          <Brain className="w-3.5 h-3.5" />
          View your brains
          <ArrowRight className="w-3 h-3" />
        </Link>
      </motion.div>

      <UploadZone />
    </div>
  );
}
