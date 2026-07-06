"use client";

// Playbook store — localStorage-backed, same listener pattern as other stores
import { useState, useEffect, useCallback } from "react";
import type { Playbook } from "./brains/types";

const STORAGE_KEY = "script-coach-playbooks";

function load(): Playbook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(playbooks: Playbook[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks));
}

let globalPlaybooks: Playbook[] = [];
let initialized = false;
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function getPlaybooks(): Playbook[] {
  if (!initialized) {
    globalPlaybooks = load();
    initialized = true;
  }
  return globalPlaybooks;
}

export function addPlaybook(playbook: Playbook) {
  getPlaybooks();
  globalPlaybooks = [playbook, ...globalPlaybooks];
  save(globalPlaybooks);
  notify();
}

export function updatePlaybook(id: string, updates: Partial<Playbook>) {
  getPlaybooks();
  globalPlaybooks = globalPlaybooks.map((p) =>
    p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
  );
  save(globalPlaybooks);
  notify();
}

export function deletePlaybook(id: string) {
  getPlaybooks();
  globalPlaybooks = globalPlaybooks.filter((p) => p.id !== id);
  save(globalPlaybooks);
  notify();
}

/** Set a playbook active — deactivates all others (single active playbook). */
export function setActivePlaybook(id: string) {
  getPlaybooks();
  globalPlaybooks = globalPlaybooks.map((p) => ({
    ...p,
    active: p.id === id,
    updatedAt: p.id === id || p.active ? new Date().toISOString() : p.updatedAt,
  }));
  save(globalPlaybooks);
  notify();
}

export function getActivePlaybook(): Playbook | undefined {
  return getPlaybooks().find((p) => p.active);
}

export function usePlaybooks(): Playbook[] {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);
  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);
  return getPlaybooks();
}
