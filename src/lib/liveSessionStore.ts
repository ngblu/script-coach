"use client";

// Live call session history — localStorage-backed
import { useState, useEffect, useCallback } from "react";
import type { LiveSession } from "./brains/types";

const STORAGE_KEY = "script-coach-live-sessions";

function loadSessions(): LiveSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: LiveSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

let globalSessions: LiveSession[] = [];
let initialized = false;
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function getLiveSessions(): LiveSession[] {
  if (!initialized) {
    globalSessions = loadSessions();
    initialized = true;
  }
  return globalSessions;
}

export function addLiveSession(session: LiveSession) {
  getLiveSessions();
  globalSessions = [session, ...globalSessions];
  saveSessions(globalSessions);
  notify();
}

export function updateLiveSession(id: string, updates: Partial<LiveSession>) {
  getLiveSessions();
  globalSessions = globalSessions.map((s) => (s.id === id ? { ...s, ...updates } : s));
  saveSessions(globalSessions);
  notify();
}

export function deleteLiveSession(id: string) {
  getLiveSessions();
  globalSessions = globalSessions.filter((s) => s.id !== id);
  saveSessions(globalSessions);
  notify();
}

export function useLiveSessions(): LiveSession[] {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);
  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);
  return getLiveSessions();
}
