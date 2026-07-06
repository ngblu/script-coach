"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Swords, FileText } from "lucide-react";

interface PersonalizedScriptProps {
  script: string;
  onPractice: () => void;
}

interface ScriptSection {
  title: string;
  body: string;
}

function parseSections(script: string): ScriptSection[] {
  const matches = [...script.matchAll(/\[([A-Z][A-Z\s-]+)\]\s*([\s\S]*?)(?=\[[A-Z][A-Z\s-]+\]|$)/g)];
  if (matches.length === 0) return [{ title: "SCRIPT", body: script }];
  return matches.map((m) => ({ title: m[1].trim(), body: m[2].trim() }));
}

export default function PersonalizedScript({ script, onPractice }: PersonalizedScriptProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const sections = parseSections(script);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (key === "__all__") {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1800);
      } else {
        setCopiedSection(key);
        setTimeout(() => setCopiedSection(null), 1800);
      }
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 border border-primary/20 rounded-lg bg-background/60">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <span className="flex items-center gap-2 text-xs font-semibold text-primary">
            <FileText className="w-3.5 h-3.5" />
            Personalized Script
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => copy(script, "__all__")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-md bg-surface-hover text-xs text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Copy full script"
            >
              {copiedAll ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copiedAll ? "Copied" : "Copy All"}
            </button>
            <button
              onClick={onPractice}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-md bg-primary/15 text-xs text-primary font-medium hover:bg-primary/25 transition-colors"
              aria-label="Practice this script against an AI prospect"
            >
              <Swords className="w-3 h-3" />
              Practice This Lead
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="group">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                  {section.title}
                </h4>
                <button
                  onClick={() => copy(section.body, section.title)}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-text-muted hover:text-text-primary transition-all"
                  aria-label={`Copy ${section.title} section`}
                >
                  {copiedSection === section.title ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
