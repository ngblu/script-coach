import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai-server";

// Voice practice endpoint — generates the AI prospect's response text.
// TTS happens client-side via browser SpeechSynthesis (free, no API key),
// so this returns { text } and the client speaks it.

interface PracticeMessage {
  role: "prospect" | "rep";
  content: string;
}

interface PracticeVoiceRequest {
  messages: PracticeMessage[];
  script?: string;
  industry?: string;
  leadContext?: string; // brain context for lead-specific practice
  leadName?: string;
  model?: string;
}

function aiError(
  message: string,
  retry = true,
  suggestion = "Check your API keys in Settings or try again later."
) {
  return NextResponse.json({ error: message, retry, suggestion }, { status: 503 });
}

export async function POST(req: NextRequest) {
  try {
    const body: PracticeVoiceRequest = await req.json();
    const { messages, script, industry, leadContext, leadName, model } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided", retry: false, suggestion: "Provide at least one message." }, { status: 400 });
    }

    const lastRepMessage = messages[messages.length - 1]?.content || "Hello";

    const systemPrompt = `You are playing the role of a skeptical business owner${leadName ? ` named the owner of ${leadName}` : ""} in the ${industry || "local services"} industry. You received a cold call from a web designer named Noah from 555 Digital.

Your personality: busy, skeptical but not rude, open to value but needs convincing. You have a real business with a real website that's "fine" but not great. You get calls like this occasionally.
${leadContext ? `\nYOUR BUSINESS PROFILE (play this specific prospect):\n${leadContext.slice(0, 3000)}\n` : ""}
RULES:
- Stay in character as the prospect. Never break character.
- Keep responses natural and SHORT (1-2 sentences — this will be spoken aloud via text-to-speech)
- Throw realistic objections based on what the rep says
- Don't make it too easy - push back on claims, ask for specifics
- If the rep builds real value, gradually warm up
- If the rep is vague or pushy, stay cold
- Vary your objections: budget, time, "already have someone", "not now", "send me info"
- Never say "yes" or agree to buy. The goal is to test the rep.
- No stage directions, no asterisks, no formatting — just spoken words.

The rep is using this script as a guide (they may deviate):

${script || "No script provided"}`;

    const conversationLog = messages
      .slice(-8)
      .map((m) => `${m.role === "rep" ? "Rep (Noah)" : "You (Prospect)"}: ${m.content}`)
      .join("\n");

    const prompt = `Conversation so far:\n${conversationLog}\n\nThe rep just said: "${lastRepMessage}"\n\nRespond in character as the prospect. 1-2 sentences maximum, spoken words only.`;

    const { result: text, model_used, attempt_number } = await callAI(systemPrompt, prompt, {
      model: model || undefined,
      maxTokens: 200,
      temperature: 0.9,
    });

    if (!text || !text.trim()) {
      return aiError("AI returned an empty response. All providers may be unavailable.", true);
    }

    // Clean any accidental formatting for clean TTS output
    const clean = text
      .trim()
      .replace(/\*[^*]*\*/g, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    return NextResponse.json({ text: clean, model_used, attempt_number });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Practice voice failed";
    console.error("Practice voice error:", err);
    return aiError(message, true);
  }
}
