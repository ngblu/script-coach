"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Target,
  GraduationCap,
  ChevronDown,
  Trash2,
  TrendingUp,
  Building2,
  Lightbulb,
  AlertTriangle,
  Award,
  Layers,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import {
  useMarketBrain,
  useLeadsBrain,
  useCoachingBrain,
  marketNeuronCount,
  leadsNeuronCount,
  coachingNeuronCount,
  deleteMarketFact,
  deleteCompetitor,
  deleteTrend,
  deleteBestPractice,
  deleteCommonMistake,
  deleteCoachingCard,
} from "@/lib/brains/store";
import type { BrainKind } from "@/lib/brains/types";

// ---------- pulsing neuron mini-viz ----------
function NeuronViz({ color, count }: { color: string; count: number }) {
  const nodes = Math.min(Math.max(count, 3), 12);
  return (
    <div className="relative h-16 w-full overflow-hidden" aria-hidden="true">
      {Array.from({ length: nodes }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: color,
            left: `${(i * 83) % 92}%`,
            top: `${(i * 37) % 70}%`,
          }}
          animate={{ opacity: [0.25, 0.9, 0.25], scale: [1, 1.35, 1] }}
          transition={{ duration: 2 + (i % 3) * 0.7, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
    </div>
  );
}

// ---------- connection lines between brains ----------
function ConnectionLines() {
  return (
    <svg
      className="hidden md:block absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      {[
        "M 16.66% 50% C 33% 20%, 50% 20%, 50% 50%",
        "M 50% 50% C 66% 20%, 83% 20%, 83.33% 50%",
        "M 16.66% 55% C 40% 90%, 60% 90%, 83.33% 55%",
      ].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="#6c8cff"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          strokeOpacity="0.35"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: 0.3 + i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

interface BrainCardProps {
  kind: BrainKind;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  neuronCount: number;
  updatedAt: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function BrainCard({
  title,
  description,
  icon: Icon,
  color,
  neuronCount,
  updatedAt,
  expanded,
  onToggle,
  children,
}: BrainCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={cn(
        "relative bg-surface border rounded-xl overflow-hidden transition-colors",
        expanded ? "border-primary/40" : "border-border hover:border-primary/25"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-5 min-h-[44px]"
        aria-expanded={expanded}
        aria-label={`${title}: ${neuronCount} neurons. ${expanded ? "Collapse" : "Expand"} details`}
      >
        <div className="flex items-start justify-between">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}1a` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-text-muted transition-transform duration-300",
              expanded && "rotate-180"
            )}
          />
        </div>
        <h2 className="mt-3 font-semibold text-text-primary">{title}</h2>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{description}</p>
        <NeuronViz color={color} count={neuronCount} />
        <div className="flex items-center justify-between mt-1">
          <span className="text-2xl font-bold" style={{ color }}>
            {neuronCount}
            <span className="text-xs font-normal text-text-muted ml-1.5">neurons</span>
          </span>
          <span className="text-[10px] text-text-muted">Updated {formatDate(updatedAt)}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 max-h-96 overflow-y-auto space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionLabel({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span className="text-text-muted">({count})</span>
    </div>
  );
}

function ItemRow({ text, onDelete }: { text: string; onDelete?: () => void }) {
  return (
    <div className="flex items-start gap-2 group py-1.5 px-2 rounded-md hover:bg-surface-hover">
      <span className="text-sm text-text-primary flex-1 leading-snug">{text}</span>
      {onDelete && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-text-muted hover:text-danger transition-all shrink-0 p-1"
          aria-label={`Delete: ${text.slice(0, 40)}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-text-muted italic py-2">{text}</p>;
}

export default function BrainDashboard() {
  const market = useMarketBrain();
  const leads = useLeadsBrain();
  const coaching = useCoachingBrain();
  const [expanded, setExpanded] = useState<BrainKind | null>(null);

  const toggle = (kind: BrainKind) => setExpanded((e) => (e === kind ? null : kind));

  return (
    <div className="relative">
      <ConnectionLines />
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* MARKET BRAIN */}
        <BrainCard
          kind="market"
          title="Market Brain"
          description="Industry knowledge, verticals, competitors, and trends. Learns about your market every time you feed it."
          icon={Brain}
          color="#6c8cff"
          neuronCount={marketNeuronCount()}
          updatedAt={market.updatedAt}
          expanded={expanded === "market"}
          onToggle={() => toggle("market")}
        >
          <div className="space-y-1.5">
            <SectionLabel icon={Layers} label="Verticals" count={market.verticals.length} />
            {market.verticals.length === 0 && <EmptyHint text="No verticals yet. Create one on the Verticals page." />}
            {market.verticals.map((v) => (
              <ItemRow key={v.id} text={`${v.name} — ${v.industry}`} />
            ))}
          </div>
          <div className="space-y-1.5">
            <SectionLabel icon={Building2} label="Competitors" count={market.competitors.length} />
            {market.competitors.length === 0 && <EmptyHint text="No competitors tracked yet." />}
            {market.competitors.map((c) => (
              <ItemRow key={c.id} text={`${c.name}${c.notes ? ` — ${c.notes}` : ""}`} onDelete={() => deleteCompetitor(c.id)} />
            ))}
          </div>
          <div className="space-y-1.5">
            <SectionLabel icon={TrendingUp} label="Trends" count={market.trends.length} />
            {market.trends.length === 0 && <EmptyHint text="No trends recorded yet." />}
            {market.trends.map((t) => (
              <ItemRow key={t.id} text={t.trend} onDelete={() => deleteTrend(t.id)} />
            ))}
          </div>
          <div className="space-y-1.5">
            <SectionLabel icon={Lightbulb} label="Market Facts" count={market.marketFacts.length} />
            {market.marketFacts.length === 0 && <EmptyHint text="Ingest transcripts or documents to add facts." />}
            {market.marketFacts.map((f) => (
              <ItemRow key={f.id} text={f.fact} onDelete={() => deleteMarketFact(f.id)} />
            ))}
          </div>
        </BrainCard>

        {/* LEADS BRAIN */}
        <BrainCard
          kind="leads"
          title="Leads Brain"
          description="Per-lead intelligence: personalized scripts, pre-qual backgrounds, talking points, and call history."
          icon={Target}
          color="#06d6a0"
          neuronCount={leadsNeuronCount()}
          updatedAt={leads.updatedAt}
          expanded={expanded === "leads"}
          onToggle={() => toggle("leads")}
        >
          {leads.intel.length === 0 && (
            <EmptyHint text="No lead intelligence yet. Import leads and generate scripts to populate this brain." />
          )}
          {leads.intel.map((i) => (
            <div key={i.id} className="border border-border rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-text-primary">Lead: {i.leadId}</p>
              <p className="text-xs text-text-secondary">
                {i.personalizedScript ? "Personalized script ready" : "No script yet"} · {i.talkingPoints.length}{" "}
                talking points · {i.callHistory.length} calls logged
              </p>
              {i.preQualBackground && (
                <p className="text-xs text-text-muted line-clamp-2">{i.preQualBackground}</p>
              )}
            </div>
          ))}
        </BrainCard>

        {/* COACHING BRAIN */}
        <BrainCard
          kind="coaching"
          title="Coaching Brain"
          description="What makes you a better closer: coaching cards, proven practices, and mistakes to avoid."
          icon={GraduationCap}
          color="#f59e0b"
          neuronCount={coachingNeuronCount()}
          updatedAt={coaching.updatedAt}
          expanded={expanded === "coaching"}
          onToggle={() => toggle("coaching")}
        >
          <div className="space-y-1.5">
            <SectionLabel icon={Lightbulb} label="Coaching Cards" count={coaching.coachingCards.length} />
            {coaching.coachingCards.length === 0 && (
              <EmptyHint text="No cards yet. Visit Coaching Cards to create or generate them." />
            )}
            {coaching.coachingCards.slice(0, 10).map((c) => (
              <ItemRow key={c.id} text={`[${c.category}] ${c.title}`} onDelete={() => deleteCoachingCard(c.id)} />
            ))}
          </div>
          <div className="space-y-1.5">
            <SectionLabel icon={Award} label="Best Practices" count={coaching.bestPractices.length} />
            {coaching.bestPractices.length === 0 && <EmptyHint text="Wins from calls will be recorded here." />}
            {coaching.bestPractices.map((p) => (
              <ItemRow
                key={p.id}
                text={`${p.practice}${p.timesReinforced > 1 ? ` (×${p.timesReinforced})` : ""}`}
                onDelete={() => deleteBestPractice(p.id)}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <SectionLabel icon={AlertTriangle} label="Common Mistakes" count={coaching.commonMistakes.length} />
            {coaching.commonMistakes.length === 0 && <EmptyHint text="Mistakes spotted in calls land here." />}
            {coaching.commonMistakes.map((m) => (
              <ItemRow key={m.id} text={m.mistake} onDelete={() => deleteCommonMistake(m.id)} />
            ))}
          </div>
        </BrainCard>
      </div>
    </div>
  );
}
