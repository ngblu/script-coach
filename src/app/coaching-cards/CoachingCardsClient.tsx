"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Search,
  Star,
  Trash2,
  Pencil,
  Loader2,
  Wand2,
  LayoutGrid,
} from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import {
  useCoachingBrain,
  addCoachingCard,
  updateCoachingCard,
  deleteCoachingCard,
} from "@/lib/brains/store";
import { distributeKnowledge, type ExtractedKnowledge } from "@/lib/brains/knowledge-ingestion";
import type { CoachingCard, CoachingCategory } from "@/lib/brains/types";

const CATEGORIES: { value: CoachingCategory; label: string; color: string }[] = [
  { value: "objection-handling", label: "Objections", color: "#f59e0b" },
  { value: "rapport-building", label: "Rapport", color: "#22c55e" },
  { value: "value-prop", label: "Value Prop", color: "#6c8cff" },
  { value: "closing", label: "Closing", color: "#06d6a0" },
  { value: "redirect", label: "Redirect", color: "#ef4444" },
  { value: "compliance", label: "Compliance", color: "#9ca3b4" },
];

function categoryMeta(cat: CoachingCategory) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];
}

interface CardForm {
  title: string;
  category: CoachingCategory;
  triggerCondition: string;
  suggestion: string;
  examples: string;
}

const EMPTY_FORM: CardForm = {
  title: "",
  category: "objection-handling",
  triggerCondition: "",
  suggestion: "",
  examples: "",
};

export default function CoachingCardsClient() {
  const coaching = useCoachingBrain();
  const [filter, setFilter] = useState<CoachingCategory | "all" | "favorites">("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CardForm>(EMPTY_FORM);
  const [genOpen, setGenOpen] = useState(false);
  const [genText, setGenText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const cards = coaching.coachingCards;

  const filtered = useMemo(() => {
    let list = cards;
    if (filter === "favorites") list = list.filter((c) => c.favorite);
    else if (filter !== "all") list = list.filter((c) => c.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.triggerCondition.toLowerCase().includes(q) ||
          c.suggestion.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.priority - a.priority);
  }, [cards, filter, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (card: CoachingCard) => {
    setEditingId(card.id);
    setForm({
      title: card.title,
      category: card.category,
      triggerCondition: card.triggerCondition,
      suggestion: card.suggestion,
      examples: card.examples.join("\n"),
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.suggestion.trim()) return;
    const examples = form.examples.split("\n").map((e) => e.trim()).filter(Boolean);
    if (editingId) {
      updateCoachingCard(editingId, {
        title: form.title.trim(),
        category: form.category,
        triggerCondition: form.triggerCondition.trim(),
        suggestion: form.suggestion.trim(),
        examples,
      });
    } else {
      addCoachingCard({
        id: generateId(),
        title: form.title.trim(),
        category: form.category,
        triggerCondition: form.triggerCondition.trim() || `Use when relevant: ${form.title.trim()}`,
        suggestion: form.suggestion.trim(),
        examples,
        priority: 5,
        favorite: false,
        source: "manual",
        createdAt: new Date().toISOString(),
      });
    }
    setModalOpen(false);
  };

  const handleGenerate = useCallback(async () => {
    if (!genText.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    setGenResult(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "call", content: genText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Generation failed (${res.status})`);
      }
      const extracted: ExtractedKnowledge = await res.json();
      const result = distributeKnowledge(extracted, "call");
      const cardCount = result.insights.filter((i) => i.kind === "coachingCard").length;
      setGenResult(
        cardCount > 0
          ? `Generated ${cardCount} coaching card${cardCount === 1 ? "" : "s"} from your transcript (plus ${result.insights.length - cardCount} other insights).`
          : "No coaching moments found. Try a transcript with objections or specific exchanges."
      );
      setGenText("");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [genText, generating]);

  const inputCls =
    "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50";

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Coaching Cards</h1>
          <p className="text-sm text-text-secondary mt-1">
            Trigger-based plays for live calls. When a prospect says the trigger, the card surfaces.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGenOpen(!genOpen)}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-surface border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Generate from Call
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>
      </motion.div>

      {/* Generate from call panel */}
      <AnimatePresence>
        {genOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <p className="text-xs text-text-secondary">
                Paste a call transcript. AI extracts coaching moments and creates cards automatically.
              </p>
              <textarea
                rows={5}
                value={genText}
                onChange={(e) => setGenText(e.target.value)}
                placeholder={"Noah: Hey, this is Noah with 555 Digital...\nProspect: We already have a website guy...\nNoah: Totally fair. Quick question though..."}
                className={cn(inputCls, "resize-y font-mono text-xs")}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!genText.trim() || generating}
                  className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {generating ? "Extracting..." : "Generate Cards"}
                </button>
                {genResult && <p className="text-xs text-success">{genResult}</p>}
                {genError && <p className="text-xs text-danger">{genError}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className={cn(inputCls, "pl-9")}
            aria-label="Search coaching cards"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Category filter">
          {[
            { value: "all" as const, label: "All" },
            { value: "favorites" as const, label: "★ Favorites" },
            ...CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          ].map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap border transition-colors",
                filter === f.value
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-surface border-border text-text-secondary hover:text-text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <LayoutGrid className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="font-semibold text-text-primary">
            {cards.length === 0 ? "No coaching cards yet" : "No cards match your filter"}
          </h2>
          <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
            {cards.length === 0
              ? "Create cards manually, generate them from call transcripts, or feed the brains — objections found in transcripts become cards automatically."
              : "Try a different search or category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((card) => {
              const meta = categoryMeta(card.category);
              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -3 }}
                  className="bg-surface border border-border rounded-xl p-4 hover:border-primary/25 transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => updateCoachingCard(card.id, { favorite: !card.favorite })}
                        className={cn(
                          "p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md transition-colors",
                          card.favorite ? "text-warning" : "text-text-muted hover:text-warning"
                        )}
                        aria-label={card.favorite ? "Unfavorite" : "Favorite"}
                      >
                        <Star className={cn("w-3.5 h-3.5", card.favorite && "fill-warning")} />
                      </button>
                      <button
                        onClick={() => openEdit(card)}
                        className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-text-muted hover:text-text-primary transition-colors"
                        aria-label={`Edit ${card.title}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCoachingCard(card.id)}
                        className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-md text-text-muted hover:text-danger transition-colors"
                        aria-label={`Delete ${card.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm text-text-primary mt-2">{card.title}</h3>
                  <p className="text-[11px] text-text-muted mt-1 italic">{card.triggerCondition}</p>
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed flex-1">
                    {card.suggestion}
                  </p>
                  {card.examples.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1">
                      {card.examples.slice(0, 2).map((ex, i) => (
                        <p key={i} className="text-[11px] text-text-muted leading-snug">
                          &ldquo;{ex}&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit modal */}
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
              className="fixed z-50 inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-surface border border-border sm:rounded-xl p-5 sm:p-6 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label={editingId ? "Edit coaching card" : "Add coaching card"}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-text-primary">
                  {editingId ? "Edit Card" : "Add Coaching Card"}
                </h2>
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
                  <label htmlFor="c-title" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Title *
                  </label>
                  <input
                    id="c-title"
                    className={inputCls}
                    placeholder="Budget objection: too expensive"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="c-cat" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Category
                  </label>
                  <select
                    id="c-cat"
                    className={cn(inputCls, "min-h-[44px]")}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as CoachingCategory })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-trigger" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Trigger Condition
                  </label>
                  <input
                    id="c-trigger"
                    className={inputCls}
                    placeholder='Use when prospect says: "that sounds expensive"'
                    value={form.triggerCondition}
                    onChange={(e) => setForm({ ...form, triggerCondition: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="c-suggestion" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Suggestion *
                  </label>
                  <textarea
                    id="c-suggestion"
                    rows={3}
                    className={cn(inputCls, "resize-y")}
                    placeholder="Acknowledge, then reframe: one new customer covers the whole project. Ask what a new customer is worth to them."
                    value={form.suggestion}
                    onChange={(e) => setForm({ ...form, suggestion: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="c-examples" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Example Phrases (one per line)
                  </label>
                  <textarea
                    id="c-examples"
                    rows={2}
                    className={cn(inputCls, "resize-y")}
                    placeholder="Fair enough — what's a new customer worth to you, roughly?"
                    value={form.examples}
                    onChange={(e) => setForm({ ...form, examples: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={!form.title.trim() || !form.suggestion.trim()}
                    className="flex-1 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {editingId ? "Save Changes" : "Add Card"}
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
