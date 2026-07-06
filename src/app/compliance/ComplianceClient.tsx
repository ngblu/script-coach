"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Scale, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUSStates, getCountries, getRule } from "@/lib/compliance-data";
import ComplianceCard from "@/components/compliance/ComplianceCard";

const SAVED_KEY = "script-coach-compliance-saved";

function loadSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ComplianceClient() {
  const [country, setCountry] = useState<"US" | string>("US");
  const [stateCode, setStateCode] = useState("US-TN");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const activeCode = country === "US" ? stateCode : country;
  const rule = getRule(activeCode);

  const toggleSaved = useCallback(() => {
    setSaved((prev) => {
      const next = prev.includes(activeCode)
        ? prev.filter((c) => c !== activeCode)
        : [...prev, activeCode].slice(0, 8);
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }, [activeCode]);

  const selectSaved = (code: string) => {
    if (code.startsWith("US-")) {
      setCountry("US");
      setStateCode(code);
    } else {
      setCountry(code);
    }
  };

  const usStates = getUSStates();
  const countries = getCountries();
  const selectCls =
    "bg-surface border border-border rounded-lg px-3 py-2.5 min-h-[44px] text-base sm:text-sm text-text-primary focus:outline-none focus:border-primary/50";

  return (
    <div className="p-4 pt-16 lg:pt-8 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" />
          Compliance Checker
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Pick where you&apos;re calling. Get the rules, the calling window, and a pre-call
          checklist so you&apos;re never doing anything illegal.
        </p>
      </motion.div>

      {/* Saved regions */}
      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Saved regions">
          {saved.map((code) => {
            const r = getRule(code);
            if (!r) return null;
            return (
              <button
                key={code}
                onClick={() => selectSaved(code)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium border transition-colors",
                  activeCode === code
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-surface border-border text-text-secondary hover:text-text-primary"
                )}
              >
                <Star className="w-3 h-3 fill-current" />
                {r.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <label htmlFor="comp-country" className="block text-xs font-medium text-text-secondary mb-1.5">
            Country
          </label>
          <select
            id="comp-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={cn(selectCls, "w-full")}
          >
            <option value="US">United States</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {country === "US" && (
          <div className="flex-1">
            <label htmlFor="comp-state" className="block text-xs font-medium text-text-secondary mb-1.5">
              State
            </label>
            <select
              id="comp-state"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className={cn(selectCls, "w-full")}
            >
              {usStates.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="sm:self-end">
          <button
            onClick={toggleSaved}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm border transition-colors w-full sm:w-auto justify-center",
              saved.includes(activeCode)
                ? "bg-warning/10 text-warning border-warning/30"
                : "bg-surface border-border text-text-secondary hover:text-text-primary"
            )}
            aria-pressed={saved.includes(activeCode)}
          >
            <Star className={cn("w-4 h-4", saved.includes(activeCode) && "fill-warning")} />
            {saved.includes(activeCode) ? "Saved" : "Save Region"}
          </button>
        </div>
      </div>

      {rule ? (
        <ComplianceCard rule={rule} />
      ) : (
        <p className="text-sm text-text-muted">Select a region to see its rules.</p>
      )}
    </div>
  );
}
