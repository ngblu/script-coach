"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Keyboard, Mic, Trophy, User } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import { useScripts } from "@/lib/store";
import { useLeads } from "@/lib/leadsStore";
import { getLeadIntel } from "@/lib/brains/store";
import { buildFullBrainContext } from "@/lib/brains/context";
import { addPracticeSession } from "@/lib/practiceSessionStore";
import { runFeedbackLoop } from "@/lib/brains/feedback-loop";
import PracticePanel from "@/components/script/PracticePanel";
import VoicePracticeUI, { type PracticeMessage } from "@/components/practice/VoicePracticeUI";

interface GradeResult {
  overallGrade: string;
  scores: Record<string, number>;
  whatWentWell: string[];
  whatToImprove: string[];
  summary: string;
}

type Mode = "text" | "voice";

export default function PracticeClient() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "";
  const scripts = useScripts();
  const leads = useLeads();

  const lead = leads.find((l) => l.id === leadId);
  const leadIntel = leadId ? getLeadIntel(leadId) : undefined;

  const [mode, setMode] = useState<Mode>("text");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [messages, setMessages] = useState<PracticeMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);

  // Script priority: lead's personalized script > selected script > first script
  const activeScript = useMemo(() => {
    if (leadIntel?.personalizedScript) {
      return { title: `Personalized: ${lead?.businessName || "lead"}`, content: leadIntel.personalizedScript };
    }
    const s = scripts.find((x) => x.id === selectedScriptId) || scripts[0];
    return s ? { title: s.title, content: s.content } : { title: "No script", content: "" };
  }, [leadIntel, lead, scripts, selectedScriptId]);

  const industry = lead?.industry || "local services";

  const handleRepMessage = useCallback(
    async (text: string) => {
      const updated: PracticeMessage[] = [...messages, { role: "rep", content: text }];
      setMessages(updated);
      setThinking(true);
      try {
        const res = await fetch("/api/practice-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated,
            script: activeScript.content,
            industry,
            leadName: lead?.businessName,
            leadContext: leadId ? buildFullBrainContext(leadId) : undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [...prev, { role: "prospect", content: data.text }]);
        }
      } catch {
        // best-effort
      } finally {
        setThinking(false);
      }
    },
    [messages, activeScript, industry, lead, leadId]
  );

  const handleGrade = useCallback(async () => {
    if (messages.length < 4) return;
    setThinking(true);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: activeScript.content,
          industry,
          messages,
          action: "grade",
        }),
      });
      const data = await res.json();
      if (data.type === "grade") {
        setGrade(data.grade);
        addPracticeSession({
          id: generateId(),
          date: new Date().toISOString(),
          mode: "voice",
          industry,
          leadId: leadId || undefined,
          scriptTitle: activeScript.title,
          exchangeCount: messages.length,
          overallGrade: data.grade.overallGrade,
          scores: data.grade.scores,
        });
        // Feed practice transcript back into the brains
        runFeedbackLoop(
          messages.map((m) => ({ speaker: m.role === "rep" ? ("rep" as const) : ("prospect" as const), content: m.content })),
          leadId || undefined
        ).catch(() => {});
      }
    } catch {
      // grading is best-effort
    } finally {
      setThinking(false);
    }
  }, [messages, activeScript, industry, leadId]);

  const handleReset = useCallback(() => {
    setMessages([]);
    setGrade(null);
    setThinking(false);
  }, []);

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Practice</h1>
        <p className="text-sm text-text-secondary mt-1">
          Sharpen your pitch against an AI prospect
          {lead ? (
            <span className="text-primary"> playing {lead.businessName}</span>
          ) : (
            ""
          )}
          . Sessions are graded and feed your brains.
        </p>
        {lead && (
          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            <User className="w-3 h-3" />
            {lead.businessName} · {lead.industry || "local services"}
          </span>
        )}
      </motion.div>

      {/* Mode toggle */}
      <div
        className="flex gap-1 p-1 bg-surface border border-border rounded-lg mb-6 w-fit"
        role="tablist"
        aria-label="Practice mode"
      >
        {(
          [
            { value: "text", label: "Text Practice", icon: Keyboard },
            { value: "voice", label: "Voice Practice", icon: Mic },
          ] as { value: Mode; label: string; icon: React.ElementType }[]
        ).map((opt) => (
          <button
            key={opt.value}
            role="tab"
            aria-selected={mode === opt.value}
            onClick={() => setMode(opt.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-md text-sm font-medium transition-colors",
              mode === opt.value
                ? "bg-primary/15 text-primary"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Script selector (when no lead script) */}
      {!leadIntel?.personalizedScript && scripts.length > 0 && (
        <div className="mb-6">
          <label htmlFor="practice-script" className="block text-xs font-medium text-text-secondary mb-1.5">
            Practice with script
          </label>
          <select
            id="practice-script"
            value={selectedScriptId}
            onChange={(e) => setSelectedScriptId(e.target.value)}
            className="w-full sm:w-auto bg-surface border border-border rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-text-primary focus:outline-none focus:border-primary/50"
          >
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "text" ? (
        <PracticePanel scriptContent={activeScript.content} scriptTitle={activeScript.title} />
      ) : (
        <>
          <VoicePracticeUI
            messages={messages}
            thinking={thinking}
            speaking={speaking}
            graded={!!grade}
            onRepMessage={handleRepMessage}
            onGrade={handleGrade}
            onReset={handleReset}
            onSpeakingChange={setSpeaking}
          />

          {/* Grade card for voice mode */}
          {grade && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-surface border border-success/20 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" />
                  Practice Results
                </h3>
                <span
                  className={cn(
                    "text-3xl font-black",
                    grade.overallGrade === "A"
                      ? "text-success"
                      : grade.overallGrade === "B"
                        ? "text-primary"
                        : grade.overallGrade === "C"
                          ? "text-warning"
                          : "text-danger"
                  )}
                >
                  {grade.overallGrade}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(grade.scores).map(([key, val]) => (
                  <div key={key} className="bg-background rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-text-primary">{val}</div>
                    <div className="text-[10px] text-text-muted capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-success mb-2">What Went Well</h4>
                  <ul className="space-y-1">
                    {grade.whatWentWell.map((w, i) => (
                      <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                        <span className="text-success shrink-0">+</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-danger mb-2">What to Improve</h4>
                  <ul className="space-y-1">
                    {grade.whatToImprove.map((w, i) => (
                      <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                        <span className="text-danger shrink-0">-</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs text-text-muted italic border-t border-border pt-3">{grade.summary}</p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
