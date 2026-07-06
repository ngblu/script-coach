"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Volume2, VolumeX, Trophy, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createRecognizer,
  speak,
  stopSpeaking,
  speechRecognitionSupported,
  speechSynthesisSupported,
} from "@/lib/speech";

export interface PracticeMessage {
  role: "prospect" | "rep";
  content: string;
}

interface VoicePracticeUIProps {
  messages: PracticeMessage[];
  thinking: boolean;
  speaking: boolean;
  graded: boolean;
  onRepMessage: (text: string) => void;
  onGrade: () => void;
  onReset: () => void;
  onSpeakingChange: (speaking: boolean) => void;
}

export default function VoicePracticeUI({
  messages,
  thinking,
  speaking,
  graded,
  onRepMessage,
  onGrade,
  onReset,
  onSpeakingChange,
}: VoicePracticeUIProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const finalTranscriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supported = speechRecognitionSupported();
  const ttsSupported = speechSynthesisSupported();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interim]);

  // Speak the latest prospect message aloud
  const lastProspectIdx = useRef(-1);
  useEffect(() => {
    const idx = messages.length - 1;
    const last = messages[idx];
    if (last?.role === "prospect" && idx !== lastProspectIdx.current && ttsSupported) {
      lastProspectIdx.current = idx;
      onSpeakingChange(true);
      speak(last.content, () => onSpeakingChange(false));
    }
  }, [messages, ttsSupported, onSpeakingChange]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      recognizerRef.current?.abort();
      stopSpeaking();
    },
    []
  );

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!supported || thinking || graded) return;
    stopSpeaking();
    onSpeakingChange(false);
    setError(null);
    setInterim("");
    finalTranscriptRef.current = "";

    const rec = createRecognizer(
      (result) => {
        setInterim(result.transcript);
        if (result.isFinal) {
          finalTranscriptRef.current = result.transcript;
        }
      },
      (err) => {
        if (err === "not-allowed") {
          setError("Microphone access denied. Allow mic access in your browser settings.");
        } else if (err !== "aborted" && err !== "no-speech") {
          setError(`Speech recognition error: ${err}`);
        }
        setListening(false);
      },
      () => {
        setListening(false);
        setInterim("");
        const text = finalTranscriptRef.current.trim();
        if (text) onRepMessage(text);
      }
    );

    if (rec) {
      recognizerRef.current = rec;
      rec.start();
      setListening(true);
    }
  }, [supported, thinking, graded, onRepMessage, onSpeakingChange]);

  if (!supported) {
    return (
      <div className="bg-surface border border-warning/30 rounded-xl p-6 text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-warning mx-auto mb-3" />
        <h3 className="font-semibold text-text-primary">Voice not supported in this browser</h3>
        <p className="text-sm text-text-secondary mt-1">
          Voice practice needs the Web Speech API. Use Chrome or Edge, or switch to Text Practice
          above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conversation */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
            <span className="text-xs text-text-secondary">
              {speaking ? "Prospect speaking..." : listening ? "Listening to you..." : "Voice call active"}
            </span>
          </div>
          {speaking && (
            <button
              onClick={() => {
                stopSpeaking();
                onSpeakingChange(false);
              }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary min-h-[32px] px-2"
              aria-label="Stop prospect audio"
            >
              <VolumeX className="w-3.5 h-3.5" />
              Mute
            </button>
          )}
        </div>

        <div className="h-[40vh] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !listening && (
            <p className="text-sm text-text-muted text-center py-8">
              Tap the mic and deliver your opener. The prospect answers out loud.
            </p>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.role === "rep" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "rep"
                    ? "bg-primary/10 border border-primary/20 rounded-br-md"
                    : "bg-surface-hover border border-border rounded-bl-md"
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium mb-0.5 text-text-muted">
                  {msg.role === "prospect" && <Volume2 className="w-3 h-3" />}
                  {msg.role === "rep" ? "You" : "Prospect"}
                </div>
                <p className="text-text-primary">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          {interim && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-primary/5 border border-primary/10 rounded-br-md">
                <p className="text-text-muted italic">{interim}…</p>
              </div>
            </div>
          )}
          {thinking && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Prospect thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-danger text-center"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Mic control */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onReset}
          className="p-3 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-surface border border-border text-text-muted hover:text-text-primary transition-colors"
          aria-label="Reset session"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <motion.button
          onClick={listening ? stopListening : startListening}
          disabled={thinking || graded}
          animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={listening ? { duration: 1.2, repeat: Infinity } : {}}
          className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center transition-colors disabled:opacity-40",
            listening ? "bg-danger text-white" : "bg-primary text-primary-foreground hover:opacity-90"
          )}
          aria-label={listening ? "Stop listening" : "Start speaking"}
        >
          {listening && (
            <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-30" aria-hidden="true" />
          )}
          {listening ? <MicOff className="w-8 h-8 relative" /> : <Mic className="w-8 h-8 relative" />}
        </motion.button>

        <button
          onClick={onGrade}
          disabled={messages.length < 4 || thinking || graded}
          className="p-3 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-surface border border-success/30 text-success hover:bg-success/10 transition-colors disabled:opacity-40"
          aria-label="End call and get graded"
        >
          <Trophy className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-text-muted text-center">
        {listening ? "Speak now — tap to stop" : "Tap the mic, speak, and release"}
      </p>
    </div>
  );
}
