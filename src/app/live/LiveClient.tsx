"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Send, Loader2, User, FileText, RefreshCw } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { useScripts } from "@/lib/store";
import { useLeads } from "@/lib/leadsStore";
import { getCoachingBrain, getLeadIntel, upsertLeadIntel } from "@/lib/brains/store";
import { addLiveSession } from "@/lib/liveSessionStore";
import { runFeedbackLoop } from "@/lib/brains/feedback-loop";
import type { LiveCoachSuggestion, LiveSession } from "@/lib/brains/types";
import TranscriptPanel, { type LiveTranscriptEntry } from "@/components/live/TranscriptPanel";
import CoachingCard from "@/components/live/CoachingCard";

type CallState = "setup" | "active" | "ended";

const CARD_TTL_MS = 15000;

export default function LiveClient() {
  const scripts = useScripts();
  const leads = useLeads();

  const [callState, setCallState] = useState<CallState>("setup");
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [entries, setEntries] = useState<LiveTranscriptEntry[]>([]);
  const [suggestions, setSuggestions] = useState<LiveCoachSuggestion[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<LiveCoachSuggestion[]>([]);
  const [prospectInput, setProspectInput] = useState("");
  const [repInput, setRepInput] = useState("");
  const [coaching, setCoaching] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const script = scripts.find((s) => s.id === selectedScriptId);
  const lead = leads.find((l) => l.id === selectedLeadId);

  // Call duration ticker
  useEffect(() => {
    if (callState !== "active") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callState, startedAt]);

  // Cleanup dismiss timers
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const pushSuggestion = useCallback(
    (s: LiveCoachSuggestion) => {
      setSuggestions((prev) => [s, ...prev].slice(0, 4));
      setAllSuggestions((prev) => [s, ...prev]);
      const timer = setTimeout(() => dismissSuggestion(s.id), CARD_TTL_MS);
      timersRef.current.push(timer);
    },
    [dismissSuggestion]
  );

  const startCall = () => {
    setCallState("active");
    setStartedAt(new Date().toISOString());
    setEntries([]);
    setSuggestions([]);
    setAllSuggestions([]);
    setElapsed(0);
  };

  const submitProspect = useCallback(async () => {
    const text = prospectInput.trim();
    if (!text || coaching) return;
    const entry: LiveTranscriptEntry = {
      speaker: "prospect",
      content: text,
      at: new Date().toISOString(),
    };
    setEntries((prev) => [...prev, entry]);
    setProspectInput("");
    setCoaching(true);
    setCoachError(null);

    try {
      const coachingCards = getCoachingBrain().coachingCards.map((c) => ({
        id: c.id,
        triggerCondition: c.triggerCondition,
        suggestion: c.suggestion,
        category: c.category,
      }));

      const res = await fetch("/api/live-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          recentExchanges: [...entries, entry].slice(-6).map((e) => ({
            speaker: e.speaker,
            content: e.content,
          })),
          context: {
            leadName: lead?.businessName,
            industry: lead?.industry,
            script: script?.content,
            coachingCards,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setCoachError(data.suggestion || data.error);
        } else {
          pushSuggestion({
            id: generateId(),
            suggestion: data.suggestion,
            urgency: data.urgency,
            category: data.category,
            fromCardId: data.fromCardId,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        try {
          const errData = await res.json();
          setCoachError(errData.suggestion || errData.error || "Coaching unavailable");
        } catch {
          setCoachError("Coaching service unavailable. Check your API keys in Settings.");
        }
      }
    } catch {
      setCoachError("Coaching unavailable — network error. Check your connection.");
    } finally {
      setCoaching(false);
    }
  }, [prospectInput, coaching, entries, lead, script, pushSuggestion]);

  const submitRep = useCallback(() => {
    const text = repInput.trim();
    if (!text) return;
    setEntries((prev) => [
      ...prev,
      { speaker: "rep", content: text, at: new Date().toISOString() },
    ]);
    setRepInput("");
  }, [repInput]);

  const endCall = useCallback(async () => {
    setSaving(true);
    const session: LiveSession = {
      id: generateId(),
      leadId: selectedLeadId || undefined,
      scriptId: selectedScriptId || undefined,
      startedAt,
      endedAt: new Date().toISOString(),
      transcript: entries,
      coachingLog: allSuggestions,
    };
    addLiveSession(session);

    // Log call into lead intel history
    if (selectedLeadId) {
      const intel = getLeadIntel(selectedLeadId);
      const now = new Date().toISOString();
      upsertLeadIntel({
        id: intel?.id || generateId(),
        leadId: selectedLeadId,
        personalizedScript: intel?.personalizedScript || "",
        preQualBackground: intel?.preQualBackground || "",
        talkingPoints: intel?.talkingPoints || [],
        objections: intel?.objections || [],
        callHistory: [
          {
            id: generateId(),
            date: now,
            type: "live",
            transcript: entries.map((e) => ({ speaker: e.speaker, content: e.content })),
            coachingLog: allSuggestions.map((s) => s.suggestion),
            notes: "",
          },
          ...(intel?.callHistory || []),
        ],
        createdAt: intel?.createdAt || now,
        updatedAt: now,
      });
    }

    // Feed the call back into the brains (async, best-effort)
    if (entries.length >= 2) {
      runFeedbackLoop(entries, selectedLeadId || undefined).catch(() => {});
    }

    setSaving(false);
    setCallState("ended");
  }, [entries, allSuggestions, selectedLeadId, selectedScriptId, startedAt]);

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const inputCls =
    "flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50";

  // ============ SETUP ============
  if (callState === "setup") {
    return (
      <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary">Live Coach</h1>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            Real-time coaching while you&apos;re on the phone. Type what the prospect says and get
            instant tips. Everything feeds back into your brains when the call ends.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 bg-surface border border-border rounded-xl p-5 space-y-4"
        >
          <div>
            <label htmlFor="live-lead" className="block text-xs font-medium text-text-secondary mb-1.5">
              <User className="w-3.5 h-3.5 inline mr-1" />
              Who are you calling? (optional)
            </label>
            <select
              id="live-lead"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-text-primary focus:outline-none focus:border-primary/50"
            >
              <option value="">No specific lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.businessName} ({l.industry || "unknown industry"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="live-script" className="block text-xs font-medium text-text-secondary mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Script reference (optional)
            </label>
            <select
              id="live-script"
              value={selectedScriptId}
              onChange={(e) => setSelectedScriptId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-text-primary focus:outline-none focus:border-primary/50"
            >
              <option value="">No script</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={startCall}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Phone className="w-4 h-4" />
            Start Call
          </button>
        </motion.div>
      </div>
    );
  }

  // ============ ENDED ============
  if (callState === "ended") {
    return (
      <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface border border-border rounded-xl p-8 text-center"
        >
          <PhoneOff className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h1 className="text-xl font-bold text-text-primary">Call Ended</h1>
          <p className="text-sm text-text-secondary mt-2">
            {entries.length} exchanges captured · {allSuggestions.length} coaching tips delivered ·
            duration {formatElapsed(elapsed)}
          </p>
          <p className="text-xs text-text-muted mt-2">
            The transcript was saved and is being fed back into your brains.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => setCallState("setup")}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Phone className="w-4 h-4" />
              New Call
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ ACTIVE ============
  return (
    <div className="flex flex-col h-screen pt-14 lg:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-none">
              Call Active {lead ? `— ${lead.businessName}` : ""}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">{formatElapsed(elapsed)}</p>
          </div>
        </div>
        <button
          onClick={endCall}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-danger text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneOff className="w-3.5 h-3.5" />}
          End Call
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Transcript */}
        <div className="flex-1 flex flex-col min-h-0 lg:border-r border-border">
          <TranscriptPanel entries={entries} />

          {/* Inputs */}
          <div className="border-t border-border p-3 space-y-2 bg-surface">
            <div className="flex gap-2">
              <input
                value={prospectInput}
                onChange={(e) => setProspectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitProspect()}
                placeholder="What did the prospect say?"
                className={inputCls}
                aria-label="Prospect's words"
              />
              <button
                onClick={submitProspect}
                disabled={!prospectInput.trim() || coaching}
                className="px-4 min-h-[44px] rounded-lg bg-warning/20 text-warning text-xs font-semibold hover:bg-warning/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                aria-label="Log prospect's words and get coaching"
              >
                {coaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Prospect
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={repInput}
                onChange={(e) => setRepInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitRep()}
                placeholder="What did you say? (optional, improves coaching)"
                className={inputCls}
                aria-label="Your words"
              />
              <button
                onClick={submitRep}
                disabled={!repInput.trim()}
                className="px-4 min-h-[44px] rounded-lg bg-primary/20 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                aria-label="Log your words"
              >
                <Send className="w-3.5 h-3.5" />
                Me
              </button>
            </div>
          </div>
        </div>

        {/* Coaching cards — desktop right panel / mobile bottom overlay */}
        <div className="lg:w-80 shrink-0 border-t lg:border-t-0 border-border bg-background">
          <div className="p-3 lg:p-4">
            <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Live Coaching
            </h2>
            {/* Coaching error */}
            {coachError && (
              <div className="mb-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-xs" role="alert">
                <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300">{coachError}</p>
                  <button
                    onClick={() => {
                      setCoachError(null);
                      submitProspect();
                    }}
                    disabled={!prospectInput.trim() || coaching}
                    className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-300 rounded-md text-[10px] font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
                <button
                  onClick={() => setCoachError(null)}
                  className="text-amber-400/60 hover:text-amber-400 shrink-0"
                >
                  ×
                </button>
              </div>
            )}
            <div
              className={cn(
                "gap-3",
                "flex lg:flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto",
                "snap-x snap-mandatory lg:snap-none pb-2 lg:pb-0 lg:max-h-[calc(100vh-180px)]"
              )}
            >
              <AnimatePresence mode="popLayout">
                {suggestions.length === 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-text-muted py-4 shrink-0"
                  >
                    Coaching tips appear here when the prospect talks.
                  </motion.p>
                )}
                {suggestions.map((s) => (
                  <div key={s.id} className="min-w-[260px] lg:min-w-0 snap-start shrink-0 lg:shrink">
                    <CoachingCard suggestion={s} onDismiss={() => dismissSuggestion(s.id)} />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Script reference strip */}
      {script && (
        <div className="border-t border-border bg-surface px-4 py-2 max-h-28 overflow-y-auto">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">
            Script: {script.title}
          </p>
          <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
            {script.content.slice(0, 600)}
            {script.content.length > 600 ? "…" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
