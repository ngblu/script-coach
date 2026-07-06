"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Brain,
  Target,
  GraduationCap,
  AlertCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IngestResult, IngestSourceType, BrainKind } from "@/lib/brains/types";
import {
  ingestTranscript,
  ingestDocument,
  ingestCallRecording,
} from "@/lib/brains/knowledge-ingestion";

const BRAIN_META: Record<BrainKind, { label: string; icon: React.ElementType; color: string }> = {
  market: { label: "Market", icon: Brain, color: "#6c8cff" },
  leads: { label: "Leads", icon: Target, color: "#06d6a0" },
  coaching: { label: "Coaching", icon: GraduationCap, color: "#f59e0b" },
};

const ACCEPTED = [".txt", ".csv", ".md", ".pdf"];

type Status = "idle" | "parsing" | "done" | "error";

interface UploadZoneProps {
  defaultType?: IngestSourceType;
}

export default function UploadZone({ defaultType = "document" }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [contentType, setContentType] = useState<IngestSourceType>(defaultType);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runIngest = useCallback(
    async (content: string, fileName?: string) => {
      setStatus("parsing");
      setError(null);
      setResult(null);
      setProgress(10);

      // Animate progress while AI works
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 12, 88));
      }, 700);

      try {
        let res: IngestResult;
        if (contentType === "call") {
          res = await ingestCallRecording(content);
        } else if (contentType === "transcript") {
          res = await ingestTranscript(content);
        } else {
          res = await ingestDocument(content, fileName || "pasted-content.txt");
        }
        clearInterval(interval);
        setProgress(100);
        setResult(res);
        setStatus("done");
      } catch (err) {
        clearInterval(interval);
        setError(err instanceof Error ? err.message : "Ingestion failed");
        setStatus("error");
      }
    },
    [contentType]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        setError(`Unsupported file type: ${ext}. Accepted: ${ACCEPTED.join(", ")}`);
        setStatus("error");
        return;
      }
      if (ext === ".pdf") {
        setError(
          "PDF text extraction isn't supported in-browser yet. Copy the text and paste it below instead."
        );
        setStatus("error");
        return;
      }
      const text = await file.text();
      if (!text.trim()) {
        setError("File appears to be empty.");
        setStatus("error");
        return;
      }
      runIngest(text, file.name);
    },
    [runIngest]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setProgress(0);
    setPasteText("");
  };

  return (
    <div className="space-y-4">
      {/* Content type selector */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Content type">
        {(
          [
            { value: "document", label: "Document / Research" },
            { value: "transcript", label: "Conversation Transcript" },
            { value: "call", label: "Call Recording (text)" },
          ] as { value: IngestSourceType; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={contentType === opt.value}
            onClick={() => setContentType(opt.value)}
            className={cn(
              "px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border transition-colors",
              contentType === opt.value
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-surface border-border text-text-secondary hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border"
        )}
      >
        <Upload className={cn("w-8 h-8 mx-auto mb-3", dragOver ? "text-primary" : "text-text-muted")} />
        <p className="text-sm text-text-secondary">
          Drag and drop a file here, or{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-primary hover:underline font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-text-muted mt-1">.txt, .csv, .md supported (paste PDFs as text)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
          aria-label="Upload file"
        />
      </div>

      {/* Paste area */}
      <div>
        <label htmlFor="paste-content" className="block text-xs font-medium text-text-secondary mb-1.5">
          Or paste content directly
        </label>
        <textarea
          id="paste-content"
          rows={6}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste a call transcript, competitor research, industry article, or anything else worth learning from..."
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 resize-y"
        />
        <button
          onClick={() => pasteText.trim() && runIngest(pasteText)}
          disabled={!pasteText.trim() || status === "parsing"}
          className="mt-2 flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {status === "parsing" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Feed the Brains
        </button>
      </div>

      {/* Progress bar */}
      <AnimatePresence>
        {status === "parsing" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Extracting knowledge with AI...
              </div>
              <div className="h-1.5 bg-background rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {status === "error" && error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-danger/10 border border-danger/30 rounded-lg p-4"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger flex-1">{error}</p>
            <button onClick={reset} className="text-text-muted hover:text-text-primary" aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What I Learned */}
      <AnimatePresence>
        {status === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-surface border border-success/30 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-text-primary">What I Learned</h3>
                <span className="text-xs text-text-muted">
                  ({result.insights.length} insight{result.insights.length === 1 ? "" : "s"})
                </span>
              </div>
              <button
                onClick={reset}
                className="text-xs text-text-secondary hover:text-text-primary min-h-[36px] px-2"
              >
                Ingest more
              </button>
            </div>

            {result.insights.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Nothing new extracted from this content. Try content with more specific market,
                objection, or technique details.
              </p>
            ) : (
              <ul className="space-y-2">
                {result.insights.map((insight, i) => {
                  const meta = BRAIN_META[insight.brain];
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 mt-0.5"
                        style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                      >
                        <meta.icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                      <span className="text-text-primary leading-snug">{insight.summary}</span>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
