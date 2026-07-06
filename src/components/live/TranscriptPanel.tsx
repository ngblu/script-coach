"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface LiveTranscriptEntry {
  speaker: "rep" | "prospect";
  content: string;
  at: string;
}

interface TranscriptPanelProps {
  entries: LiveTranscriptEntry[];
}

export default function TranscriptPanel({ entries }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div
      className="flex-1 overflow-y-auto space-y-3 p-4"
      role="log"
      aria-label="Call transcript"
      aria-live="polite"
    >
      {entries.length === 0 && (
        <p className="text-sm text-text-muted text-center py-10">
          Transcript will appear here as the call progresses.
        </p>
      )}
      {entries.map((entry, i) => (
        <motion.div
          key={`${entry.at}-${i}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn("flex", entry.speaker === "rep" ? "justify-end" : "justify-start")}
        >
          <div
            className={cn(
              "max-w-[85%] rounded-xl px-3.5 py-2.5",
              entry.speaker === "rep"
                ? "bg-primary/15 border border-primary/20"
                : "bg-surface-hover border border-border"
            )}
          >
            <p
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide mb-0.5",
                entry.speaker === "rep" ? "text-primary" : "text-text-muted"
              )}
            >
              {entry.speaker === "rep" ? "Noah" : "Prospect"}
            </p>
            <p className="text-sm text-text-primary leading-relaxed">{entry.content}</p>
          </div>
        </motion.div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
