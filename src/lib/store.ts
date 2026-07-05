"use client";

import { useState, useEffect, useCallback } from "react";
import type { Script } from "./types";

const STORAGE_KEY = "script-coach-scripts";

function loadScripts(): Script[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScripts(scripts: Script[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

let globalScripts: Script[] = [];
let listeners: (() => void)[] = [];
let initialized = false;

function notify() {
  listeners.forEach((fn) => fn());
}

export function getScripts(): Script[] {
  if (!initialized) {
    globalScripts = loadScripts();
    initialized = true;
  }
  return globalScripts;
}

export function addScript(script: Script) {
  globalScripts = [script, ...globalScripts];
  saveScripts(globalScripts);
  notify();
}

export function updateScript(id: string, updates: Partial<Script>) {
  globalScripts = globalScripts.map((s) =>
    s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
  );
  saveScripts(globalScripts);
  notify();
}

export function deleteScript(id: string) {
  globalScripts = globalScripts.filter((s) => s.id !== id);
  saveScripts(globalScripts);
  notify();
}

export function getScript(id: string): Script | undefined {
  return getScripts().find((s) => s.id === id);
}

export function useScripts() {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);

  return getScripts();
}

export function useScript(id: string): Script | undefined {
  const scripts = useScripts();
  return scripts.find((s) => s.id === id);
}
