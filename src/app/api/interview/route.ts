import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface ConversationMessage {
  role: "ai" | "noah";
  content: string;
}

interface InterviewRequest {
  action: "start" | "respond" | "summarize";
  conversation?: ConversationMessage[];
  currentPhase?: number;
}

// Base questions the AI can draw from
const BASE_QUESTIONS = [
  {
    phase: "services",
    question: "Let's start with the basics. What exactly does 555 Digital do? Walk me through your core services and what a typical engagement looks like.",
  },
  {
    phase: "pricing",
    question: "How do you price your services? What's the range, and how do you position the value when someone asks about cost?",
  },
  {
    phase: "idealCustomers",
    question: "Who's your perfect customer? Describe the business type, size, industry, and the person you usually talk to on the call.",
  },
  {
    phase: "competitors",
    question: "Who are you competing against? Not just other web designers — think about where your prospects' budget could go instead.",
  },
  {
    phase: "differentiation",
    question: "When a prospect asks 'Why should I go with you instead of the other 10 web designers who called me this week?' — what's your actual answer? What makes 555 Digital genuinely different?",
  },
  {
    phase: "bestCalls",
    question: "Tell me about your best call ever. The one where everything clicked. What made it work? What did you say that landed perfectly?",
  },
  {
    phase: "commonObjections",
    question: "What are the top 3 objections you hear on almost every call? Walk me through how you typically handle each one.",
  },
  {
    phase: "salesApproach",
    question: "Describe your overall sales philosophy. Are you consultative, direct, relationship-driven? What's your go-to approach when the call starts?",
  },
  {
    phase: "marketKnowledge",
    question: "What's the market like right now for small business websites? What are business owners worried about, and what opportunities are you seeing that most people miss?",
  },
];

function buildSystemPrompt(): string {
  return `You are an expert interviewer helping Noah, the founder of 555 Digital (a web design/dev agency for local service businesses), capture his business knowledge so it can improve AI-powered sales script coaching.

Your job: Ask insightful questions ONE AT A TIME to extract Noah's deep knowledge about his business, sales approach, and market. 

GUIDELINES:
- Be conversational and warm — this should feel like a thoughtful chat, not an interrogation
- After Noah answers, ask ONE thoughtful follow-up that digs deeper into what he just said before moving to the next topic
- Follow-ups should feel natural and show you're actually listening: "That's interesting — when you say [specific thing he mentioned], can you tell me more about..."
- After 1-2 follow-ups on a topic, transition smoothly to the next base question
- Don't repeat questions he's already answered
- Keep questions open-ended — never ask yes/no questions
- If his answer is short, probe deeper before moving on
- Reference his previous answers to show continuity: "Earlier you mentioned X — how does that connect to..."
- The goal is to build a rich knowledge base that makes future script analysis hyper-relevant to HIS specific business`;
}

function buildQuestionPrompt(
  conversation: ConversationMessage[],
  currentPhase: number
): string {
  const convText = conversation
    .map((m) => `${m.role === "ai" ? "Interviewer" : "Noah"}: ${m.content}`)
    .join("\n\n");

  const remainingPhases = BASE_QUESTIONS.slice(currentPhase);
  const nextPhase = remainingPhases[0];
  const remainingTopics = remainingPhases
    .slice(1, 4)
    .map((q) => q.phase)
    .join(", ");

  const lastExchange =
    conversation.length >= 2
      ? conversation.slice(-2)
      : [];

  const hasRecentFollowUp = lastExchange.length >= 2 && lastExchange[0].role === "noah";

  return `CONVERSATION SO FAR:\n${convText || "(just starting)"}\n\n${
    nextPhase
      ? `CURRENT TOPIC: ${nextPhase.phase} — base question: "${nextPhase.question}"\nUPCOMING TOPICS: ${remainingTopics}\nPHASE: ${currentPhase + 1} of ${BASE_QUESTIONS.length}\n`
      : "ALL TOPICS COVERED — it's time to wrap up.\n"
  }${
    hasRecentFollowUp
      ? `\nNoah just answered your last question. Based on his answer, decide:
1. If his answer was detailed and thorough, move to the next topic with a smooth transition: "Great, that gives me a really clear picture. Let me shift gears — [next base question, rephrased naturally]"
2. If there's something specific in his answer worth exploring deeper, ask ONE more follow-up question that references exactly what he said. Be specific — quote or paraphrase his words.
\nReturn ONLY your next question as plain text. No labels, no "Interviewer:", just the question. Make it feel natural and conversational.`
      : `\nThis is the start of the conversation or the start of a new topic. Ask your question naturally — reference what Noah has shared so far if relevant. Return ONLY your question as plain text. No labels, just the question.`
  }`;
}

function buildSummaryPrompt(conversation: ConversationMessage[]): string {
  const convText = conversation
    .map((m) => `${m.role === "ai" ? "Interviewer" : "Noah"}: ${m.content}`)
    .join("\n\n");

  return `Based on the following interview conversation with Noah from 555 Digital, generate a structured Knowledge Base summary.

CONVERSATION:
${convText}

Return ONLY valid JSON (no markdown, no code fences):

{
  "businessName": "555 Digital",
  "summary": "A 2-3 paragraph executive summary capturing the essence of 555 Digital — what they do, who they serve, what makes them special, and their market position",
  "services": "Detailed description of the services 555 Digital offers, including any specialties or unique approaches Noah mentioned",
  "pricing": "Summary of pricing structure, ranges, how Noah positions value vs cost, and any pricing strategies he uses",
  "idealCustomers": "Profile of the ideal customer — industry, business size, role of the decision maker, pain points, and what makes them a good fit",
  "competitors": "Who 555 Digital competes against, both direct (other web designers/agencies) and indirect (alternative uses of budget, DIY platforms, etc.)",
  "differentiation": "What makes 555 Digital genuinely different — their unique value proposition, approach, guarantees, or results that competitors can't match",
  "bestCalls": "Patterns from Noah's best sales calls — what works, key phrases, rapport-building techniques, and how he closes successfully",
  "commonObjections": "The most frequent objections Noah encounters and his specific rebuttals/strategies for handling each one",
  "salesApproach": "Noah's overall sales philosophy, style (consultative/direct/blunt/relationship), opening strategy, and closing approach",
  "marketKnowledge": "Noah's insights about the local service business web design market — trends, fears, opportunities, and what prospects are really thinking"
}

CRITICAL: Make every section specific and actionable. Include actual phrases, numbers, and examples Noah used. This knowledge base will be injected into future AI prompts to analyze sales scripts — so it needs to be RICH with specific details that make the analysis hyper-relevant to 555 Digital. Don't summarize vaguely — capture the details.`;
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const textBlocks = data.content?.filter((b: any) => b.type === "text") || [];
  return textBlocks.map((b: any) => b.text).join("\n").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { action, conversation = [], currentPhase = 0 }: InterviewRequest =
      await req.json();

    if (action === "start") {
      const question = await callClaude(
        buildSystemPrompt(),
        `Start the interview with Noah from 555 Digital. Introduce yourself briefly and warmly, then ask the first question naturally. The first topic is: "${BASE_QUESTIONS[0].question}"

Return ONLY your first question/message as plain text. Keep it warm and conversational — not like a form.`
      );

      return NextResponse.json({
        question,
        phase: 0,
        phaseName: BASE_QUESTIONS[0].phase,
        progress: { current: 1, total: BASE_QUESTIONS.length },
        isComplete: false,
      });
    }

    if (action === "respond") {
      // Determine if we should advance phase
      const recentAiMessages = conversation
        .filter((m) => m.role === "ai")
        .slice(-3);
      const followUpCount = recentAiMessages.filter((m) =>
        // Count as follow-up if it's not a base question (heuristic)
        m.content.includes("?") && !BASE_QUESTIONS.some((q) =>
          m.content.includes(q.question.slice(0, 30))
        )
      ).length;

      // Advance phase if we've had enough follow-ups on this topic
      const shouldAdvance = followUpCount >= 2 || currentPhase >= BASE_QUESTIONS.length - 1;
      const nextPhase = shouldAdvance ? Math.min(currentPhase + 1, BASE_QUESTIONS.length) : currentPhase;

      // Check if we've covered all phases
      if (nextPhase >= BASE_QUESTIONS.length) {
        const question = await callClaude(
          buildSystemPrompt(),
          `We've covered all the main topics with Noah. Ask ONE final wrap-up question: "Is there anything else about 555 Digital, your sales process, or the market that we haven't covered but you think would be important for coaching your scripts?"

Return ONLY your question as plain text.`
        );

        return NextResponse.json({
          question,
          phase: nextPhase,
          phaseName: "wrapUp",
          progress: { current: BASE_QUESTIONS.length, total: BASE_QUESTIONS.length },
          isComplete: false,
          readyToSummarize: true,
        });
      }

      const question = await callClaude(
        buildSystemPrompt(),
        buildQuestionPrompt(conversation, shouldAdvance ? nextPhase : currentPhase)
      );

      return NextResponse.json({
        question,
        phase: shouldAdvance ? nextPhase : currentPhase,
        phaseName: BASE_QUESTIONS[shouldAdvance ? nextPhase : currentPhase]?.phase || "wrapUp",
        progress: {
          current: shouldAdvance ? nextPhase + 1 : currentPhase + 1,
          total: BASE_QUESTIONS.length,
        },
        isComplete: false,
      });
    }

    if (action === "summarize") {
      const rawContent = await callClaude(
        "You are an expert knowledge base generator. Return only valid JSON, no markdown wrapping.",
        buildSummaryPrompt(conversation)
      );

      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
      }

      const kb = JSON.parse(jsonStr);
      kb.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
      kb.createdAt = new Date().toISOString();
      kb.updatedAt = new Date().toISOString();
      kb.rawConversation = conversation;

      return NextResponse.json({ knowledgeBase: kb, isComplete: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Interview error:", err);
    return NextResponse.json(
      { error: err.message || "Interview failed" },
      { status: 500 }
    );
  }
}
