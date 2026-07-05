"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead } from "./types";

const STORAGE_KEY = "script-coach-leads";

function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

let globalLeads: Lead[] = [];
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function getLeads(): Lead[] {
  if (globalLeads.length === 0) globalLeads = loadLeads();
  return globalLeads;
}

export function addLead(lead: Lead) {
  globalLeads = [lead, ...globalLeads];
  saveLeads(globalLeads);
  notify();
}

export function updateLead(id: string, updates: Partial<Lead>) {
  globalLeads = globalLeads.map((l) =>
    l.id === id ? { ...l, ...updates } : l
  );
  saveLeads(globalLeads);
  notify();
}

export function deleteLead(id: string) {
  globalLeads = globalLeads.filter((l) => l.id !== id);
  saveLeads(globalLeads);
  notify();
}

export function getLead(id: string): Lead | undefined {
  return getLeads().find((l) => l.id === id);
}

export function useLeads() {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);

  return getLeads();
}

export function useLead(id: string): Lead | undefined {
  const leads = useLeads();
  return leads.find((l) => l.id === id);
}
