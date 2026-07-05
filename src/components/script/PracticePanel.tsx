"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, StopCircle, RotateCcw, Trophy, Sparkles, User, Bot } from "lucide-react";

interface PracticeMessage {
  role: "prospect" | "rep";
  content: string;
}

interface GradeResult {
  overallGrade: string;
  scores: {
    rapport: number;
    objectionHandling: number;
    valuePropDelivery: number;
    closeAttempt: number;
    activeListening: number;
  };
  whatWentWell: string[];
  whatToImprove: string[];
  summary: string;
}

interface PracticePanelProps {
  scriptContent: string;
  scriptTitle: string;
}

export default function PracticePanel({ scriptContent, scriptTitle }: PracticePanelProps) {
  const [messages, setMessages] = useState<PracticeMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [industry, setIndustry] = useState("local services");
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef(false); // Ref-based guard for concurrent calls

  // Keep ref in sync with thinking state
  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    if (thinkingRef.current) return; // Prevent concurrent starts
    setStarted(true);
    setMessages([]);
    setGrade(null);
    setThinking(true);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptContent,
          industry,
          messages: [{ role: "rep", content: "Hello, this is Noah from 555 Digital. Did I catch you at a bad time?" }],
        }),
      });
      const data = await res.json();
      if (data.type === "response") {
        setMessages([
          { role: "rep", content: "Hello, this is Noah from 555 Digital. Did I catch you at a bad time?" },
          { role: "prospect", content: data.content },
        ]);
      }
    } catch {
      alert("Failed to start practice. Is the API configured?");
      setStarted(false);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || thinkingRef.current) return;
    const repMsg = input.trim();
    setInput("");
    setThinking(true);
    // Use functional updater to get the latest messages, avoiding stale closure
    setMessages((prev) => [...prev, { role: "rep" as const, content: repMsg }]);
    // Build the full message list for the API call
    const updatedMessages = [...messages, { role: "rep" as const, content: repMsg }];
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptContent, industry, messages: updatedMessages }),
      });
      const data = await res.json();
      if (data.type === "response") {
        setMessages((prev) => [...prev, { role: "prospect", content: data.content }]);
      }
    } catch {
      alert("Practice API error");
    } finally {
      setThinking(false);
    }
  };

  const handleGrade = async () => {
    if (messages.length < 4 || thinkingRef.current) return;
    setThinking(true);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptContent, industry, messages, action: "grade" }),
      });
      const data = await res.json();
      if (data.type === "grade") {
        setGrade(data.grade);
      }
    } catch {
      alert("Grading failed");
    } finally {
      setThinking(false);
    }
  };

  const handleReset = () => {
    setStarted(false);
    setMessages([]);
    setGrade(null);
    setInput("");
  };

  return (
    <div className="space-y-4">
      {!started ? (
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <MessageSquare className="w-12 h-12 text-accent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">AI Voice Practice</h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
            The AI plays a skeptical prospect. You pitch using your script. Get graded on rapport, objection handling, value delivery, and closing.
          </p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <label className="text-xs text-text-muted">Industry:</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="local services">Local Services</option>
              <option value="plumbing">Plumbing</option>
              <option value="hvac">HVAC</option>
              <option value="landscaping">Landscaping</option>
              <option value="roofing">Roofing</option>
              <option value="cleaning">Cleaning</option>
              <option value="electrical">Electrical</option>
              <option value="general">General Business</option>
            </select>
          </div>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Start Practice Call
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chat area */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-text-secondary">Prospect on the line</span>
              </div>
              <span className="text-xs text-text-muted">{industry}</span>
            </div>

            <div className="h-[50vh] overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "rep" ? "justify-end" : ""}`}>
                  {msg.role === "prospect" && (
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-warning" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "rep"
                        ? "bg-primary/10 text-text-primary border border-primary/20 rounded-br-md"
                        : "bg-surface-hover text-text-secondary border border-border rounded-bl-md"
                    }`}
                  >
                    <div className="text-[10px] font-medium mb-0.5 text-text-muted">
                      {msg.role === "rep" ? "You" : "Prospect"}
                    </div>
                    {msg.content}
                  </div>
                  {msg.role === "rep" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-warning" />
                  </div>
                  <div className="bg-surface-hover border border-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={grade ? "Session graded. Reset to try again." : "Type your response..."}
                disabled={!!grade || thinking}
                aria-label="Type your sales response"
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted disabled:opacity-40 focus:outline-none focus:border-accent/30"
              />
              {!grade && (
                <>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || thinking}
                    className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-40 transition-colors"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleGrade}
                    disabled={messages.length < 4 || thinking}
                    className="px-3 py-2 bg-surface border border-success/30 text-success rounded-lg hover:bg-success/10 disabled:opacity-40 transition-colors"
                    title="End call and get graded"
                    aria-label="End call and get grade"
                  >
                    <Trophy className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-surface border border-border text-text-muted rounded-lg hover:text-text-secondary transition-colors"
                title="Reset"
                aria-label="Reset practice session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grade card */}
          {grade && (
            <div className="bg-surface border border-success/20 rounded-xl p-5 animate-slide-up space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" />
                  Practice Results
                </h3>
                <span className={`text-3xl font-black ${
                  grade.overallGrade === "A" ? "text-success" :
                  grade.overallGrade === "B" ? "text-primary" :
                  grade.overallGrade === "C" ? "text-warning" :
                  "text-danger"
                }`}>{grade.overallGrade}</span>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
