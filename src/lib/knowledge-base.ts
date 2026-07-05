"use client";

export interface KnowledgeBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  businessName: string;
  summary: string;
  services: string;
  pricing: string;
  idealCustomers: string;
  competitors: string;
  differentiation: string;
  bestCalls: string;
  commonObjections: string;
  salesApproach: string;
  marketKnowledge: string;
  rawConversation: { role: "ai" | "noah"; content: string }[];
}

const STORAGE_KEY = "script-coach-knowledge-base";

export function getKnowledgeBase(): KnowledgeBase | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveKnowledgeBase(kb: KnowledgeBase) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kb));
}

export function deleteKnowledgeBase() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getKnowledgeBasePrompt(): string {
  const kb = getKnowledgeBase();
  if (!kb) return "";

  return `## BUSINESS CONTEXT (555 Digital - seeded by Noah)
The following is what Noah has shared about his business, 555 Digital. Use this context to make your script analysis more relevant and specific to his actual business.

**Business:** ${kb.businessName || "555 Digital"}

**Services:**
${kb.services || "N/A"}

**Pricing:**
${kb.pricing || "N/A"}

**Ideal Customers:**
${kb.idealCustomers || "N/A"}

**Competitors:**
${kb.competitors || "N/A"}

**What Makes 555 Digital Different:**
${kb.differentiation || "N/A"}

**Best Calls & Wins:**
${kb.bestCalls || "N/A"}

**Common Objections:**
${kb.commonObjections || "N/A"}

**Sales Approach:**
${kb.salesApproach || "N/A"}

**Market Knowledge:**
${kb.marketKnowledge || "N/A"}

**Overall Summary:**
${kb.summary || "N/A"}

---
When analyzing scripts, tailor your suggestions to 555 Digital's specific business context above. Use Noah's actual objection responses, pricing, and competitive positioning in your rewrite suggestions. Reference his best calls as examples of what works. Make the analysis feel like it was written by someone who deeply understands HIS business, not generic advice.`;
}
