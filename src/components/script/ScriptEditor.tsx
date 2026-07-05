"use client";

import { useState, useEffect, useCallback } from "react";

interface ScriptEditorProps {
  content: string;
  onSave: (content: string) => void;
}

export default function ScriptEditor({ content: initialContent, onSave }: ScriptEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = useCallback(() => {
    onSave(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [content, onSave]);

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Paste your sales script below. Use clear sections for intro, pitch, objections, and close.
        </p>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-success animate-fade-in">Saved!</span>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:text-primary hover:border-primary/30 transition-colors"
          >
            Save Version
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        aria-label="Sales script content editor"
        placeholder={`Paste or write your sales script here...

Example structure:

[INTRO]
Hi, this is [Name] from 555 Digital. How are you today?

[VALUE PROP]
We build websites that actually bring in leads, not just look pretty...

[OBJECTIONS]
"I'm happy with my current site" - I hear that a lot. But here's what usually happens...

[CLOSE]
Let's do a free audit of your current site and I'll show you exactly what you're missing...`}
        className="w-full h-[60vh] bg-surface border border-border rounded-xl p-6 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/30 font-mono leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}
