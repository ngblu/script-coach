"use client";

import { useState, useEffect } from "react";
import { Check, X, Clock, Calendar, MessageSquare, Trash2 } from "lucide-react";
import type { Outcome, ScriptVersion } from "@/lib/types";
import { generateId, formatDate } from "@/lib/utils";

interface OutcomeTrackerProps {
  outcomes: Outcome[];
  versions: ScriptVersion[];
  onAdd: (outcome: Outcome) => void;
  onDelete: (outcomeId: string) => void;
}

const resultOptions: { value: Outcome["result"]; label: string; icon: typeof Check; color: string }[] = [
  { value: "won", label: "Won", icon: Check, color: "text-success bg-success/10 border-success/20" },
  { value: "lost", label: "Lost", icon: X, color: "text-danger bg-danger/10 border-danger/20" },
  { value: "meeting-booked", label: "Meeting Booked", icon: Calendar, color: "text-primary bg-primary/10 border-primary/20" },
  { value: "no-response", label: "No Response", icon: Clock, color: "text-warning bg-warning/10 border-warning/20" },
];

export default function OutcomeTracker({ outcomes, versions, onAdd, onDelete }: OutcomeTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState<Outcome["result"]>("won");
  const [notes, setNotes] = useState("");
  const [versionId, setVersionId] = useState(versions[versions.length - 1]?.id || "");

  // Sync versionId when versions change (e.g., new version saved)
  useEffect(() => {
    setVersionId(versions[versions.length - 1]?.id || "");
  }, [versions]);

  const handleSubmit = () => {
    if (!versionId) return;
    onAdd({
      id: generateId(),
      versionId,
      result,
      notes: notes.trim(),
      date: new Date().toISOString(),
    });
    setNotes("");
    setShowForm(false);
  };

  const wonCount = outcomes.filter((o) => o.result === "won").length;
  const total = outcomes.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {resultOptions.map((opt) => {
            const count = outcomes.filter((o) => o.result === opt.value).length;
            return (
              <div key={opt.value} className="bg-surface border border-border rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{count}</div>
                <div className="text-[10px] text-text-muted">{opt.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-dashed border-border rounded-xl text-sm text-text-secondary hover:text-primary hover:border-primary/30 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        Log Call Outcome
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {resultOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setResult(opt.value)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                  result === opt.value
                    ? opt.color
                    : "border-border text-text-muted hover:text-text-secondary"
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary/30"
          >
            {versions.length === 0 && (
              <option value="" disabled>No versions yet — save your script first</option>
            )}
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} - {formatDate(v.createdAt)}
              </option>
            ))}
          </select>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened? What worked? What didn't? (optional)"
            aria-label="Call outcome notes"
            className="w-full h-20 bg-background border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/30"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Log Outcome
            </button>
          </div>
        </div>
      )}

      {/* Outcome list */}
      <div className="space-y-2">
        {[...outcomes].reverse().map((outcome) => {
          const opt = resultOptions.find((r) => r.value === outcome.result);
          const version = versions.find((v) => v.id === outcome.versionId);
          return (
            <div
              key={outcome.id}
              className="bg-surface border border-border rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg ${opt?.color || ""}`}>
                  {opt && <opt.icon className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">{opt?.label}</div>
                  {version && (
                    <div className="text-xs text-text-muted mt-0.5">{version.label}</div>
                  )}
                  {outcome.notes && (
                    <p className="text-xs text-text-secondary mt-1.5 max-w-md">{outcome.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-text-muted">{formatDate(outcome.date)}</span>
                <button
                  onClick={() => onDelete(outcome.id)}
                  className="p-2 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                  aria-label="Delete outcome"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
