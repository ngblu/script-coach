"use client";

// Web Speech API helpers — browser SpeechRecognition (STT) and
// SpeechSynthesis (TTS). Free, no API keys, works in Chrome/Edge/Safari.

export interface SpeechRecognitionResultLike {
  transcript: string;
  isFinal: boolean;
}

type RecognitionCallback = (result: SpeechRecognitionResultLike) => void;

// Minimal typings for the vendor-prefixed webkitSpeechRecognition
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function speechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function createRecognizer(
  onResult: RecognitionCallback,
  onError: (error: string) => void,
  onEnd: () => void
): SpeechRecognitionInstance | null {
  if (!speechRecognitionSupported()) return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor;
  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-US";
  rec.onresult = (event) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onResult({ transcript: transcript.trim(), isFinal });
  };
  rec.onerror = (event) => onError(event.error);
  rec.onend = onEnd;
  return rec;
}

/** Pick a reasonable male US voice for the prospect, if available. */
function pickProspectVoice(): SpeechSynthesisVoice | null {
  if (!speechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith("en-US") && /david|mark|guy|male/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en-US")) ||
    voices.find((v) => v.lang.startsWith("en"));
  return preferred || null;
}

export function speak(text: string, onDone?: () => void): void {
  if (!speechSynthesisSupported()) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickProspectVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel();
}
