"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mic,
  ClipboardList,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ComplianceRule,
  getCallWindowStatus,
  buildChecklist,
} from "@/lib/compliance-data";

interface ComplianceCardProps {
  rule: ComplianceRule;
}

export default function ComplianceCard({ rule }: ComplianceCardProps) {
  const window = getCallWindowStatus(rule);

  const windowColor =
    window.status === "open"
      ? "text-success bg-success/10 border-success/30"
      : window.status === "closing-soon"
        ? "text-warning bg-warning/10 border-warning/30"
        : "text-danger bg-danger/10 border-danger/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      {/* Header with call window */}
      <div className="p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-text-primary text-lg">{rule.name}</h2>
            <p className="text-xs text-text-secondary">{rule.country}</p>
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium", windowColor)}>
            <Clock className="w-4 h-4" />
            <div>
              <p className="leading-none">{window.message}</p>
              <p className="text-[10px] opacity-75 mt-0.5">Local time: {window.localTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regulation grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-text-primary">Calling Hours</p>
            <p className="text-xs text-text-secondary">
              {rule.allowedHoursStart}:00 - {rule.allowedHoursEnd}:00 local time
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          {rule.requiresRegistration ? (
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-xs font-medium text-text-primary">Registration</p>
            <p className="text-xs text-text-secondary">
              {rule.requiresRegistration ? "Registration required" : "No registration required"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-text-primary">Do Not Call Registry</p>
            <p className="text-xs text-text-secondary">{rule.doNotCallRegistry}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Mic
            className={cn(
              "w-4 h-4 shrink-0 mt-0.5",
              rule.recordingConsent === "two-party" ? "text-warning" : "text-success"
            )}
          />
          <div>
            <p className="text-xs font-medium text-text-primary">Recording Consent</p>
            <p className="text-xs text-text-secondary">
              {rule.recordingConsent === "two-party"
                ? "Two-party — everyone must consent"
                : "One-party — your consent is enough"}
            </p>
          </div>
        </div>

        {rule.maxAttemptsPerDay && (
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-text-primary">Attempt Limit</p>
              <p className="text-xs text-text-secondary">
                Max {rule.maxAttemptsPerDay} attempts per 24 hours
              </p>
            </div>
          </div>
        )}

        {rule.restrictedIndustries.length > 0 && (
          <div className="flex items-start gap-2.5">
            <Ban className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-text-primary">Restricted</p>
              <p className="text-xs text-text-secondary">{rule.restrictedIndustries.join(", ")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Before You Call checklist */}
      <div className="px-5 pb-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          <ClipboardList className="w-3.5 h-3.5" />
          Before You Call
        </h3>
        <ul className="space-y-2">
          {buildChecklist(rule).map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex items-start gap-2 text-xs text-text-primary"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-px" />
              {item}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Notes */}
      <div className="px-5 pb-5">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
          Key Rules
        </h3>
        <ul className="space-y-1.5">
          {rule.notes.map((note, i) => (
            <li key={i} className="text-xs text-text-secondary leading-relaxed flex gap-1.5">
              <span className="text-text-muted shrink-0">•</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 py-3 border-t border-border bg-background/40">
        <p className="text-[10px] text-text-muted">
          General guidance only, not legal advice. Rules change — verify with official sources
          before large campaigns.
        </p>
      </div>
    </motion.div>
  );
}
