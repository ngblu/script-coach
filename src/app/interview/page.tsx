"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  MessageSquare,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  saveKnowledgeBase,
  getKnowledgeBase,
  deleteKnowledgeBase,
  type KnowledgeBase,
} from "@/lib/knowledge-base";
import { ingestInterview } from "@/lib/brains/knowledge-ingestion";

interface Message {
  role: "ai" | "noah";
  content: string;
}

interface InterviewState {
  phase: number;
  phaseName: string;
  progress: { current: number; total: number };
  isComplete: boolean;
  readyToSummarize: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  services: "Services & What You Do",
  pricing: "Pricing & Value",
  idealCustomers: "Ideal Customers",
  competitors: "Competition",
  differentiation: "What Makes You Different",
  bestCalls: "Best Calls & Wins",
  commonObjections: "Objections",
  salesApproach: "Sales Approach",
  marketKnowledge: "Market Knowledge",
  wrapUp: "Final Thoughts",
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex gap-1">
        <motion.div
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  );
}

export default function InterviewPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<InterviewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingKB, setViewingKB] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing KB on mount
  useEffect(() => {
    const existing = getKnowledgeBase();
    if (existing) setKnowledgeBase(existing);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input after AI responds
  useEffect(() => {
    if (!loading && state && !state.isComplete) {
      inputRef.current?.focus();
    }
  }, [loading, state]);

  const startInterview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessages([]);
    setKnowledgeBase(null);
    setViewingKB(false);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to start");

      const data = await res.json();
      setState(data);
      setMessages([{ role: "ai", content: data.question }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendAnswer = useCallback(async () => {
    const answer = input.trim();
    if (!answer || loading || !state) return;

    setInput("");
    const newMessages: Message[] = [...messages, { role: "noah", content: answer }];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          conversation: newMessages,
          currentPhase: state.phase,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed");

      const data = await res.json();
      setState(data);
      setMessages([...newMessages, { role: "ai", content: data.question }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, state, messages]);

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summarize",
          conversation: messages,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Failed to summarize");

      const data = await res.json();
      setState({ ...state!, isComplete: true, readyToSummarize: false });
      saveKnowledgeBase(data.knowledgeBase);
      setKnowledgeBase(data.knowledgeBase);
      // Also feed the interview into the three-brain system (non-blocking)
      ingestInterview(messages).catch(() => {
        // Brain ingestion is best-effort; KB save already succeeded
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "I've built your Knowledge Base from everything you've shared. It's been saved and distributed into your Market, Leads, and Coaching Brains — every script analysis and live call will now use it. You can view it anytime below, and update it whenever you want by starting a new interview.",
        },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [messages, state]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (state?.readyToSummarize) {
        generateSummary();
      } else {
        sendAnswer();
      }
    }
  };

  const resetInterview = () => {
    setMessages([]);
    setState(null);
    setInput("");
    setError(null);
    setViewingKB(false);
    // Don't delete KB — user may want to keep it
  };

  const hasStarted = messages.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="mb-6 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Seed the Brain</h1>
            <p className="text-sm text-text-secondary">
              Teach the AI about 555 Digital so it can coach you better
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {state && !state.isComplete && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-muted">
                {PHASE_LABELS[state.phaseName] || state.phaseName}
              </span>
              <span className="text-text-secondary font-mono">
                Topic {state.progress.current} of {state.progress.total}
              </span>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${(state.progress.current / state.progress.total) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {state?.isComplete && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-success font-medium">Knowledge Base saved</span>
            <span className="text-text-muted">— powering your script analysis</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2 shrink-0"
          >
            <span className="shrink-0">⚠</span>
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400/60 hover:text-red-400"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0">
        {!hasStarted && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Let&apos;s build your Knowledge Base
            </h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
              I&apos;ll ask you about 555 Digital — your services, pricing, customers,
              competitors, and what makes you different. Your answers will make every
              future script analysis smarter and more relevant.
            </p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-background rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Start the Interview
                </>
              )}
            </button>

            {knowledgeBase && (
              <div className="mt-8">
                <p className="text-xs text-text-muted mb-3">
                  You have an existing Knowledge Base from{" "}
                  {new Date(knowledgeBase.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setViewingKB(true)}
                    className="text-sm text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    View Knowledge Base
                  </button>
                  <span className="text-text-muted">·</span>
                  <button
                    onClick={() => {
                      deleteKnowledgeBase();
                      setKnowledgeBase(null);
                      setViewingKB(false);
                    }}
                    className="text-sm text-text-muted hover:text-red-400 transition-colors"
                  >
                    Delete & Start Fresh
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className={cn(
                "flex gap-3",
                msg.role === "noah" && "justify-end"
              )}
            >
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "ai"
                    ? "bg-surface border border-border text-text-primary rounded-tl-sm"
                    : "bg-primary/10 border border-primary/20 text-text-primary rounded-tr-sm"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "noah" && (
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-accent">
                  N
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && !state?.readyToSummarize && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      {hasStarted && !state?.isComplete && (
        <div className="shrink-0">
          {state?.readyToSummarize ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-primary/20 rounded-xl p-4"
            >
              <p className="text-sm text-text-secondary mb-3">
                Ready to generate your Knowledge Base? It&apos;ll capture everything
                you&apos;ve shared and power every future script analysis.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={generateSummary}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Building Knowledge Base...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Generate Knowledge Base
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setInput("");
                    inputRef.current?.focus();
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Add more first
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                rows={2}
                className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary/50 transition-colors"
                disabled={loading}
              />
              <button
                onClick={sendAnswer}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-background hover:bg-primary/90 transition-colors disabled:opacity-30 shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          <p className="text-xs text-text-muted mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}

      {/* Completed state actions */}
      {state?.isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 flex gap-3 items-center justify-center pt-2"
        >
          <button
            onClick={resetInterview}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-primary hover:border-primary/30 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Re-do Interview
          </button>
          <button
            onClick={() => setViewingKB(!viewingKB)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary hover:bg-primary/20 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            {viewingKB ? "Hide" : "View"} Knowledge Base
          </button>
        </motion.div>
      )}

      {/* Knowledge Base Viewer */}
      <AnimatePresence>
        {viewingKB && knowledgeBase && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setViewingKB(false)}
            />
            <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      Knowledge Base
                    </h2>
                    <p className="text-xs text-text-muted">
                      Generated {new Date(knowledgeBase.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingKB(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background text-text-muted hover:text-text-primary transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5">
                <KBSection title="Summary" content={knowledgeBase.summary} />
                <KBSection
                  title="Services"
                  icon="🔧"
                  content={knowledgeBase.services}
                />
                <KBSection
                  title="Pricing"
                  icon="💰"
                  content={knowledgeBase.pricing}
                />
                <KBSection
                  title="Ideal Customers"
                  icon="🎯"
                  content={knowledgeBase.idealCustomers}
                />
                <KBSection
                  title="Competitors"
                  icon="⚔️"
                  content={knowledgeBase.competitors}
                />
                <KBSection
                  title="What Makes 555 Digital Different"
                  icon="✨"
                  content={knowledgeBase.differentiation}
                />
                <KBSection
                  title="Best Calls & Wins"
                  icon="🏆"
                  content={knowledgeBase.bestCalls}
                />
                <KBSection
                  title="Common Objections"
                  icon="🛡️"
                  content={knowledgeBase.commonObjections}
                />
                <KBSection
                  title="Sales Approach"
                  icon="📞"
                  content={knowledgeBase.salesApproach}
                />
                <KBSection
                  title="Market Knowledge"
                  icon="📊"
                  content={knowledgeBase.marketKnowledge}
                />
              </div>

              <div className="mt-6 pt-4 border-t border-border flex gap-3">
                <button
                  onClick={() => {
                    deleteKnowledgeBase();
                    setKnowledgeBase(null);
                    setViewingKB(false);
                    resetInterview();
                  }}
                  className="text-sm text-text-muted hover:text-red-400 transition-colors"
                >
                  Delete Knowledge Base
                </button>
                <button
                  onClick={() => setViewingKB(false)}
                  className="ml-auto px-4 py-2 bg-primary text-background rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KBSection({
  title,
  content,
  icon,
}: {
  title: string;
  content: string;
  icon?: string;
}) {
  if (!content || content === "N/A") return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
