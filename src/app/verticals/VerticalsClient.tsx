"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Layers, Loader2 } from "lucide-react";
import { useMarketBrain, addVertical, updateVertical, deleteVertical } from "@/lib/brains/store";
import { useLeads } from "@/lib/leadsStore";
import type { Vertical } from "@/lib/brains/types";
import { generateId } from "@/lib/utils";
import VerticalCard from "@/components/verticals/VerticalCard";

interface VerticalForm {
  name: string;
  industry: string;
  icpDescription: string;
  keywords: string;
  targetTitles: string;
  companySizeMin: string;
  companySizeMax: string;
}

const EMPTY_FORM: VerticalForm = {
  name: "",
  industry: "",
  icpDescription: "",
  keywords: "",
  targetTitles: "",
  companySizeMin: "",
  companySizeMax: "",
};

function formFromVertical(v: Vertical): VerticalForm {
  return {
    name: v.name,
    industry: v.industry,
    icpDescription: v.icpDescription,
    keywords: v.keywords.join(", "),
    targetTitles: v.targetTitles.join(", "),
    companySizeMin: v.companySizeMin?.toString() || "",
    companySizeMax: v.companySizeMax?.toString() || "",
  };
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function VerticalsClient() {
  const market = useMarketBrain();
  const leads = useLeads();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VerticalForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (v: Vertical) => {
    setEditingId(v.id);
    setForm(formFromVertical(v));
    setError(null);
    setModalOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      setError("Vertical name is required");
      return;
    }
    if (!form.industry.trim()) {
      setError("Industry is required");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data = {
        name: form.name.trim(),
        industry: form.industry.trim(),
        icpDescription: form.icpDescription.trim(),
        keywords: splitList(form.keywords),
        targetTitles: splitList(form.targetTitles),
        companySizeMin: form.companySizeMin ? parseInt(form.companySizeMin, 10) : undefined,
        companySizeMax: form.companySizeMax ? parseInt(form.companySizeMax, 10) : undefined,
      };
      if (editingId) {
        updateVertical(editingId, data);
      } else {
        addVertical({ id: generateId(), ...data, createdAt: now, updatedAt: now });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }, [form, editingId]);

  // Count leads whose industry loosely matches the vertical
  const leadCountFor = (v: Vertical): number =>
    leads.filter((l) => {
      const li = (l.industry || "").toLowerCase();
      return (
        li.includes(v.industry.toLowerCase()) ||
        v.keywords.some((k) => li.includes(k.toLowerCase()))
      );
    }).length;

  const inputCls =
    "w-full bg-background border border-border rounded-lg px-3 py-2.5 text-base sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30";

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Verticals</h1>
          <p className="text-sm text-text-secondary mt-1">
            Define who you sell to. Each vertical sharpens lead finding, scripts, and coaching.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Vertical
        </button>
      </motion.div>

      {market.verticals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-dashed border-border rounded-xl p-12 text-center"
        >
          <Layers className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="font-semibold text-text-primary">No verticals yet</h2>
          <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
            A vertical is a market segment you sell into, like &quot;Plumbers in Tennessee&quot; or
            &quot;Auto detailers&quot;. Create your first one to focus your lead hunting and scripts.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Your First Vertical
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence>
            {market.verticals.map((v) => (
              <VerticalCard
                key={v.id}
                vertical={v}
                leadCount={leadCountFor(v)}
                onEdit={() => openEdit(v)}
                onDelete={() => {
                  if (confirm(`Delete vertical "${v.name}"?`)) deleteVertical(v.id);
                }}
                onFindLeads={() => router.push(`/leads?vertical=${encodeURIComponent(v.name)}`)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
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
              transition={{ duration: 0.2 }}
              className="fixed z-50 inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-surface border border-border sm:rounded-xl p-5 sm:p-6 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label={editingId ? "Edit vertical" : "Create vertical"}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-text-primary">
                  {editingId ? "Edit Vertical" : "Create Vertical"}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="v-name" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Vertical Name *
                  </label>
                  <input
                    id="v-name"
                    className={inputCls}
                    placeholder="Plumbers in Middle Tennessee"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="v-industry" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Industry *
                  </label>
                  <input
                    id="v-industry"
                    className={inputCls}
                    placeholder="Plumbing"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="v-icp" className="block text-xs font-medium text-text-secondary mb-1.5">
                    ICP Description
                  </label>
                  <textarea
                    id="v-icp"
                    rows={3}
                    className={inputCls}
                    placeholder="Owner-operated plumbing companies, 2-15 employees, established 5+ years, outdated or no website, strong Google reviews but weak online presence..."
                    value={form.icpDescription}
                    onChange={(e) => setForm({ ...form, icpDescription: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="v-keywords" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Target Keywords (comma-separated)
                  </label>
                  <input
                    id="v-keywords"
                    className={inputCls}
                    placeholder="plumber, plumbing, septic, drain cleaning"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="v-titles" className="block text-xs font-medium text-text-secondary mb-1.5">
                    Target Job Titles (comma-separated)
                  </label>
                  <input
                    id="v-titles"
                    className={inputCls}
                    placeholder="Owner, General Manager, Operations Manager"
                    value={form.targetTitles}
                    onChange={(e) => setForm({ ...form, targetTitles: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="v-min" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Min Company Size
                    </label>
                    <input
                      id="v-min"
                      type="number"
                      min="1"
                      className={inputCls}
                      placeholder="2"
                      value={form.companySizeMin}
                      onChange={(e) => setForm({ ...form, companySizeMin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="v-max" className="block text-xs font-medium text-text-secondary mb-1.5">
                      Max Company Size
                    </label>
                    <input
                      id="v-max"
                      type="number"
                      min="1"
                      className={inputCls}
                      placeholder="25"
                      value={form.companySizeMax}
                      onChange={(e) => setForm({ ...form, companySizeMax: e.target.value })}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {editingId ? "Save Changes" : "Create Vertical"}
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 min-h-[44px] rounded-lg bg-surface-hover border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
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
