"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  BookOpen,
  Trash2,
  Download,
  Zap,
  FileText,
  LayoutGrid,
  Target,
  ChevronDown,
} from "lucide-react";
import { cn, generateId, formatDate } from "@/lib/utils";
import {
  usePlaybooks,
  addPlaybook,
  deletePlaybook,
  setActivePlaybook,
} from "@/lib/playbook-store";
import { useMarketBrain, useCoachingBrain } from "@/lib/brains/store";
import { useScripts } from "@/lib/store";
import type { Playbook } from "@/lib/brains/types";

type Tab = "scripts" | "cards" | "icp";

export default function PlaybooksClient() {
  const playbooks = usePlaybooks();
  const market = useMarketBrain();
  const coaching = useCoachingBrain();
  const scripts = useScripts();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("scripts");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!name.trim()) {
      setError("Playbook name is required");
      return;
    }
    const vertical = market.verticals.find((v) => v.id === verticalId);

    // Auto-populate: scripts whose title/content mention the vertical's keywords,
    // and coaching cards relevant to the vertical (or all cards if no match)
    const keywords = vertical
      ? [vertical.industry.toLowerCase(), ...vertical.keywords.map((k) => k.toLowerCase())]
      : [];

    const matchingScripts = keywords.length
      ? scripts.filter((s) =>
          keywords.some(
            (k) => s.title.toLowerCase().includes(k) || s.content.toLowerCase().includes(k)
          )
        )
      : scripts;

    const matchingCards = keywords.length
      ? coaching.coachingCards.filter((c) =>
          keywords.some(
            (k) =>
              c.title.toLowerCase().includes(k) ||
              c.suggestion.toLowerCase().includes(k) ||
              c.triggerCondition.toLowerCase().includes(k)
          )
        )
      : coaching.coachingCards;

    const now = new Date().toISOString();
    addPlaybook({
      id: generateId(),
      name: name.trim(),
      verticalId: verticalId || "",
      scriptIds: (matchingScripts.length ? matchingScripts : scripts).map((s) => s.id),
      coachingCardIds: (matchingCards.length ? matchingCards : coaching.coachingCards).map((c) => c.id),
      targetICP: vertical?.icpDescription || "",
      active: playbooks.length === 0,
      createdAt: now,
      updatedAt: now,
    });
    setName("");
    setVerticalId("");
    setError(null);
    setModalOpen(false);
  }, [name, verticalId, market.verticals, scripts, coaching.coachingCards, playbooks.length]);

  const exportPlaybook = (pb: Playbook) => {
    const vertical = market.verticals.find((v) => v.id === pb.verticalId);
    const pbScripts = scripts.filter((s) => pb.scriptIds.includes(s.id));
    const pbCards = coaching.coachingCards.filter((c) => pb.coachingCardIds.includes(c.id));

    const text = [
      `# PLAYBOOK: ${pb.name}`,
      vertical ? `Vertical: ${vertical.name} (${vertical.industry})` : "",
      pb.targetICP ? `\n## TARGET ICP\n${pb.targetICP}` : "",
      `\n## SCRIPTS (${pbScripts.length})`,
      ...pbScripts.map((s) => `\n### ${s.title}\n${s.content}`),
      `\n## COACHING CARDS (${pbCards.length})`,
      ...pbCards.map(
        (c) => `\n### [${c.category}] ${c.title}\nTrigger: ${c.triggerCondition}\nPlay: ${c.suggestion}${c.examples.length ? `\nExamples:\n${c.examples.map((e) => `- ${e}`).join("\n")}` : ""}`
      ),
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playbook-${pb.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls =
    "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50";

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Playbooks</h1>
          <p className="text-sm text-text-secondary mt-1">
            Bundle scripts, coaching cards, and an ICP into a ready-to-run package per vertical.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Playbook
        </button>
      </motion.div>

      {playbooks.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="font-semibold text-text-primary">No playbooks yet</h2>
          <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
            A playbook packages everything you need to run calls into one vertical: the scripts,
            the coaching cards, and the ICP definition.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Your First Playbook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {playbooks.map((pb) => {
              const vertical = market.verticals.find((v) => v.id === pb.verticalId);
              const pbScripts = scripts.filter((s) => pb.scriptIds.includes(s.id));
              const pbCards = coaching.coachingCards.filter((c) => pb.coachingCardIds.includes(c.id));
              const expanded = expandedId === pb.id;

              return (
                <motion.div
                  key={pb.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={cn(
                    "bg-surface border rounded-xl overflow-hidden transition-colors",
                    pb.active ? "border-success/40" : "border-border"
                  )}
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : pb.id)}
                    className="w-full text-left p-5"
                    aria-expanded={expanded}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-text-primary">{pb.name}</h2>
                          {pb.active && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold">
                              <Zap className="w-3 h-3" />
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">
                          {vertical ? `${vertical.name} · ` : ""}
                          {pbScripts.length} scripts · {pbCards.length} cards · updated{" "}
                          {formatDate(pb.updatedAt)}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-text-muted transition-transform shrink-0 mt-1",
                          expanded && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border"
                      >
                        {/* Tabs */}
                        <div className="flex gap-1 p-3 pb-0" role="tablist" aria-label="Playbook contents">
                          {(
                            [
                              { value: "scripts", label: `Scripts (${pbScripts.length})`, icon: FileText },
                              { value: "cards", label: `Cards (${pbCards.length})`, icon: LayoutGrid },
                              { value: "icp", label: "ICP Profile", icon: Target },
                            ] as { value: Tab; label: string; icon: React.ElementType }[]
                          ).map((t) => (
                            <button
                              key={t.value}
                              role="tab"
                              aria-selected={activeTab === t.value}
                              onClick={() => setActiveTab(t.value)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors",
                                activeTab === t.value
                                  ? "bg-primary/10 text-primary"
                                  : "text-text-secondary hover:text-text-primary"
                              )}
                            >
                              <t.icon className="w-3.5 h-3.5" />
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 max-h-72 overflow-y-auto">
                          {activeTab === "scripts" &&
                            (pbScripts.length === 0 ? (
                              <p className="text-xs text-text-muted">No scripts in this playbook.</p>
                            ) : (
                              <ul className="space-y-2">
                                {pbScripts.map((s) => (
                                  <li key={s.id} className="text-sm text-text-primary border border-border rounded-lg px-3 py-2">
                                    {s.title}
                                    <span className="text-[11px] text-text-muted ml-2">
                                      {s.content.split(/\s+/).length} words
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ))}
                          {activeTab === "cards" &&
                            (pbCards.length === 0 ? (
                              <p className="text-xs text-text-muted">No coaching cards in this playbook.</p>
                            ) : (
                              <ul className="space-y-2">
                                {pbCards.map((c) => (
                                  <li key={c.id} className="border border-border rounded-lg px-3 py-2">
                                    <p className="text-sm text-text-primary">{c.title}</p>
                                    <p className="text-[11px] text-text-muted italic">{c.triggerCondition}</p>
                                  </li>
                                ))}
                              </ul>
                            ))}
                          {activeTab === "icp" && (
                            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                              {pb.targetICP || "No ICP defined. Link this playbook to a vertical with an ICP description."}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 p-4 pt-0">
                          {!pb.active && (
                            <button
                              onClick={() => setActivePlaybook(pb.id)}
                              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Set Active
                            </button>
                          )}
                          <button
                            onClick={() => exportPlaybook(pb)}
                            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-surface-hover border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Export
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete playbook "${pb.name}"?`)) deletePlaybook(pb.id);
                            }}
                            className="ml-auto flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-danger hover:bg-danger/10 text-xs font-medium transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed z-50 inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-surface border border-border sm:rounded-xl p-5 sm:p-6 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Create playbook"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-text-primary">Create Playbook</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="pb-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Playbook Name *
                  </label>
                  <input
                    id="pb-name"
                    className={inputCls}
                    placeholder="TN Plumbers Playbook"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="pb-vertical" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Vertical (auto-populates relevant scripts + cards)
                  </label>
                  <select
                    id="pb-vertical"
                    className={cn(inputCls, "min-h-[44px]")}
                    value={verticalId}
                    onChange={(e) => setVerticalId(e.target.value)}
                  >
                    <option value="">All content (no vertical filter)</option>
                    {market.verticals.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.industry})
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Create Playbook
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 min-h-[44px] rounded-lg bg-surface-hover border border-border text-sm text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
