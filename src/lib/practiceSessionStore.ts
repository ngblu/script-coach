"use client";

// Practice session history — localStorage-backed
import { useState, useEffect, useCallback } from "react";

export interface PracticeSessionRecord {
  id: string;
  date: string;
  mode: "text" | "voice";
  industry: string;
  leadId?: string;
  scriptTitle?: string;
  exchangeCount: number;
  overallGrade?: string;
  scores?: Record<string, number>;
}

const STORAGE_KEY = "script-coach-practice-sessions";

function load(): PracticeSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(sessions: PracticeSessionRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

let globalSessions: PracticeSessionRecord[] = [];
let initialized = false;
let listeners: (() => void)[] = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function getPracticeSessions(): PracticeSessionRecord[] {
  if (!initialized) {
    globalSessions = load();
    initialized = true;
  }
  return globalSessions;
}

export function addPracticeSession(session: PracticeSessionRecord) {
  getPracticeSessions();
  globalSessions = [session, ...globalSessions];
  save(globalSessions);
  notify();
}

export function usePracticeSessions(): PracticeSessionRecord[] {
  const [, forceUpdate] = useState(0);
  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);
  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);
  return getPracticeSessions();
}
