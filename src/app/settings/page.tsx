"use client";

import { ArrowLeft, Key, Server } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/")}
          className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">AI Analysis Engine</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Script analysis runs through your local Hermes bridge for zero per-token API costs.
        </p>

        <div className="bg-background border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-text-primary">How it works</h3>
          <ul className="text-sm text-text-secondary space-y-1 list-disc pl-5">
            <li>When you hit "Analyze Script", the request goes to the Hermes bridge</li>
            <li>DeepSeek (default): fast, free via your Hermes setup, good for routine analysis</li>
            <li>Claude Opus (toggle on): deeper analysis for high-stakes closing scripts</li>
            <li>The bridge must be running locally (port 8642 or the dashboard bridge relay)</li>
          </ul>
        </div>

        <div className="bg-background border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-text-primary">Model quality</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-primary/20 rounded-lg p-3">
              <div className="text-xs font-medium text-primary mb-1">DeepSeek (Default)</div>
              <div className="text-xs text-text-muted">Fast, capable analysis. Included in Hermes.</div>
            </div>
            <div className="bg-surface border border-accent/20 rounded-lg p-3">
              <div className="text-xs font-medium text-accent mb-1">Claude Opus (Premium)</div>
              <div className="text-xs text-text-muted">Deep nuance, better rewrites. Higher cost per use.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
