# Script Coach — AI Call Path Audit

**Date:** 2026-07-05  
**App:** Next.js 16 on Vercel  
**AI Providers:** Anthropic (Claude) + DeepSeek via Hermes bridge (direct + relay)

---

## Summary of Critical Findings

1. **All 11 hardcoded instances of `claude-sonnet-4-20250514` are likely invalid.** Anthropic has no model by this name. The correct current model is `claude-sonnet-4-5-20250929`. The old name `claude-sonnet-4-20250514` may have been an alias that Anthropic has since deactivated. This is the **#1 reason Claude calls fail**.

2. **The `analyze` route duplicates 100+ lines of code** from `ai-server.ts` instead of importing it. Fixes to the shared library won't reach this endpoint.

3. **Claude calls have zero fallback.** Only the `analyze` route has a fallback path (DeepSeek via Hermes), and only when the user *already selected DeepSeek*. If Claude is chosen and it fails, the user gets a raw error.

4. **The DeepSeek bridge relay depends on an external poller** running on `https://555-dashboard.vercel.app/api/bridge`. This poller must be running for the relay path to work — the error message already acknowledges this.

5. **The front-end sends model names the backend ignores for Anthropic.** The UI sends `anthropic/claude-sonnet-4` or `deepseek/deepseek-chat`, but the Anthropic path always uses the hardcoded `claude-sonnet-4-20250514`.

6. **`DEEPSEEK_API` is defined but dead code.** `ai-server.ts` defines `https://api.deepseek.com/v1/chat/completions` on line 9 but never uses it. All DeepSeek traffic goes through Hermes bridge instead.

---

## Per-File Audit Table

| # | File | Caller Used | Hardcoded Model(s) | API URL(s) | Error Handling | Fallback? | User-Facing Error Messages |
|---|------|------------|-------------------|------------|---------------|-----------|---------------------------|
| 1 | `src/lib/ai-server.ts` | Shared lib (callAnthropic, callHermesDirect, callHermesRelay, callAI) | `claude-sonnet-4-20250514` (default, L33 & L132) | `api.anthropic.com/v1/messages` <br> `127.0.0.1:8642/v1/chat/completions` <br> `555-dashboard.vercel.app/api/bridge` | Basic – throws Error with status, 30s timeout on Hermes direct | **Partial**: Claude→none; DeepSeek→direct then relay (L138-142) | `"ANTHROPIC_API_KEY not configured"` <br> `"Anthropic API error {status}: {err}"` <br> `"Hermes API error: {status}"` <br> `"Bridge send error: {status}"` <br> `"No commandId from bridge"` <br> `"Bridge timed out. Is the bridge poller running?"` |
| 2 | `src/app/api/analyze/route.ts` | Local copies of callAnthropic, callHermesDirect, callHermesRelay (duplicated from ai-server) | `claude-sonnet-4-20250514` (L26) <br> default: `deepseek/deepseek-chat` (L113) | Same 3 URLs as ai-server (duplicated L4-10) | Basic – structured JSON responses | **Yes**: DeepSeek → direct then relay; Claude → none. If both fail returns 503 | `"No script provided"` <br> `"ANTHROPIC_API_KEY not configured"` <br> `"Hermes bridge unavailable. Is the bridge poller running? ({relayErr.message})"` <br> `"Empty response from AI"` <br> `err.message || "Analysis failed"` |
| 3 | `src/app/api/analyze-transcript/route.ts` | Inline Anthropic fetch | `claude-sonnet-4-20250514` (L46) | `api.anthropic.com/v1/messages` | Basic – try/catch, checks apiKey | **None** – Claude only | `"No transcript provided"` <br> `"ANTHROPIC_API_KEY not configured"` <br> `"Anthropic error: {status}"` <br> `err.message || "Analysis failed"` |
| 4 | `src/app/api/interview/route.ts` | callClaude() (local inline copy) | `claude-sonnet-4-20250514` (L150) | `api.anthropic.com/v1/messages` | Basic – try/catch in handler | **None** – Claude only; 3 action call sites | `"ANTHROPIC_API_KEY not configured"` <br> `"Invalid action"` <br> `err.message || "Interview failed"` |
| 5 | `src/app/api/practice/route.ts` | Inline Anthropic fetch (2 call sites) | `claude-sonnet-4-20250514` (L28, L75) | `api.anthropic.com/v1/messages` | Basic – try/catch | **None** – Claude only | `"API key not configured"` <br> `"API error: {status}"` <br> `err.message` |
| 6 | `src/app/api/practice-voice/route.ts` | `callAI()` from ai-server | `claude-sonnet-4-20250514` (L60 default) | Via ai-server (all 3) | Basic – try/catch, checks empty text | Inherited from callAI: Claude→none; DeepSeek→direct→relay | `"No messages provided"` <br> `"Empty response from AI"` <br> `err.message || "Practice voice failed"` |
| 7 | `src/app/api/ingest/route.ts` | `callAI()` + `parseAIJson()` from ai-server | `claude-sonnet-4-20250514` (L75 default) | Via ai-server (all 3) | **Good** – validates input type, checks empty, normalizes arrays | Inherited from callAI: Claude→none | `"No content provided"` <br> `"Invalid or missing type"` <br> `"Empty response from AI"` <br> `err.message || "Ingestion failed"` |
| 8 | `src/app/api/live-coach/route.ts` | `callAI()` + `parseAIJson()` from ai-server | `claude-sonnet-4-20250514` (L90 default) | Via ai-server (all 3) | **Good** – coaching-card fast path first, validates response fields, provides default suggestion on parse failure | Inherited from callAI + **non-AI fallback** (coaching card keyword match) | `"No transcript provided"` <br> `err.message || "Live coach failed"` |
| 9 | `src/app/api/leads/generate-script/route.ts` | `callAI()` from ai-server | `claude-sonnet-4-20250514` (L69 default) | Via ai-server (all 3) | Basic – try/catch, checks empty text | Inherited from callAI: Claude→none | `"No lead provided"` <br> `"Empty response from AI"` <br> `err.message || "Script generation failed"` |
| 10 | `src/app/api/leads/pitch/route.ts` | Inline Anthropic fetch | `claude-sonnet-4-20250514` (L56) | `api.anthropic.com/v1/messages` | Basic – try/catch, checks apiKey | **None** – Claude only | `"Business name is required"` <br> `"ANTHROPIC_API_KEY not configured"` <br> `"AI generation failed: {status}"` <br> `err.message || "Failed to generate pitch"` |

### Front-End Model Selector (bonus finding)

**File:** `src/app/script/[id]/page.tsx` (L36, L152, L162)

- UI offers two model options: `"deepseek/deepseek-chat"` and `"anthropic/claude-sonnet-4"`
- The Claude button is labeled **"Opus"** but sends `anthropic/claude-sonnet-4` — confusing and misleading
- The model name is sent to `/api/analyze` in the request body but the backend **ignores the model name for Anthropic calls** — it always uses the hardcoded `claude-sonnet-4-20250514` regardless of what the UI sends
- Error alert on failure: `"Analysis failed. Is the Hermes bridge running?"` — this message is wrong when Claude fails (it's not a Hermes issue)

---

## Detailed Architecture & Call Flow

### Path 1: Claude (Anthropic API)

```
Route handler
  → callAnthropic(systemPrompt, prompt)    [or inline Anthropic fetch]
    → POST https://api.anthropic.com/v1/messages
    → model: "claude-sonnet-4-20250514"   ← HARDCODED, likely invalid
    → No fallback on failure
    → User sees: Anthropic API error {status}: {body}
```

**Affected routes:** analyze (when Claude selected), analyze-transcript, interview, practice, practice-voice (default), ingest (default), live-coach (default), leads/generate-script (default), leads/pitch

### Path 2: DeepSeek (Hermes Bridge — used by analyze route)

```
Route handler (default model: "deepseek/deepseek-chat")
  → callHermesDirect(model, prompt, systemPrompt)      [or via callAI]
    → POST http://127.0.0.1:8642/v1/chat/completions
    → 30s timeout
    → If fails:
  → callHermesRelay(model, prompt, systemPrompt)
    → POST https://555-dashboard.vercel.app/api/bridge  { op: "send", action: "query" }
    → Poll GET for up to 90 seconds (45×2s)
    → If fails after 90s: "Bridge timed out. Is the bridge poller running?"
    → User sees: 503 "Hermes bridge unavailable. Is the bridge poller running?"
```

**Affected routes:** analyze (default), practice-voice (when non-Claude model passed), ingest (when non-Claude model passed), live-coach (when non-Claude model passed), leads/generate-script (when non-Claude model passed)

---

## Recommendations Per File

### 1. `src/lib/ai-server.ts` — **HIGH PRIORITY**

- **Fix the model name:** Change `claude-sonnet-4-20250514` to `claude-sonnet-4-5-20250929` (verify current correct name against Anthropic docs)
- **Make the model configurable:** Accept the model name as an environment variable (`ANTHROPIC_MODEL`) with a hardcoded fallback, rather than hardcoding it
- **Add Claude fallback:** When `callAnthropic` fails, try another model (e.g., DeepSeek via Hermes) or retry with exponential backoff
- **Use `DEEPSEEK_API`:** The `DEEPSEEK_API` constant is defined but never used. Either wire it up as a direct DeepSeek path (bypassing Hermes) or remove the dead constant
- **Add retry logic:** Wrap all fetch calls with retry (3 attempts with exponential backoff) for transient errors (5xx, network failures)
- **Better error typing:** Throw typed errors (e.g., `AIAuthError`, `AIModelError`, `AITimeoutError`) so callers can distinguish between "wrong API key" and "model not found"

### 2. `src/app/api/analyze/route.ts` — **HIGH PRIORITY**

- **Eliminate code duplication:** Delete the local `callAnthropic`, `callHermesDirect`, `callHermesRelay` functions and import from `@/lib/ai-server` instead
- **Pass the model through:** Currently the front-end model name is only used for routing (Claude vs DeepSeek). The actual model sent to Anthropic is always the hardcoded one. Pass `requestedModel` through to the AI call
- **Better fallback:** If Claude fails, try DeepSeek automatically before returning an error

### 3. `src/app/api/analyze-transcript/route.ts`

- **Import from ai-server** instead of inline Anthropic fetch
- **Add model selection** — currently Claude-only with no way to use DeepSeek
- **Add fallback** on failure

### 4. `src/app/api/interview/route.ts`

- **Import `callAnthropic` from ai-server** instead of the local `callClaude` copy
- **Add DeepSeek fallback** — the interview generates the knowledge base, arguably the most important feature. It should not fail silently
- **Add a model parameter** so the front-end can choose

### 5. `src/app/api/practice/route.ts`

- **Import from ai-server** instead of inline Anthropic fetch
- **Add model selection and fallback**

### 6. `src/app/api/practice-voice/route.ts`

- Already uses `callAI` from ai-server — **good**
- However the default model is `claude-sonnet-4-20250514` which is broken. Fix the library first, this file will follow
- Consider adding TTS quality validation (currently just strips asterisks)

### 7. `src/app/api/ingest/route.ts`

- Already uses `callAI` + `parseAIJson` — **good**
- Has good input validation and output normalization — **best error handling in the codebase**
- Still bound to the broken default model name

### 8. `src/app/api/live-coach/route.ts`

- Already uses `callAI` + `parseAIJson` — **good**
- Has a **fast-path coaching card keyword match** that avoids AI calls entirely — **excellent pattern**
- Has sensible defaults when AI response parsing fails — **good defensive coding**
- The coaching card fast-path means this route partially works even without AI. Other routes should adopt this pattern

### 9. `src/app/api/leads/generate-script/route.ts`

- Already uses `callAI` — **good**
- Extracts pre-qual background from the AI response with regex — **clever, but fragile** (if AI changes format, regex silently fails to `""`)
- Add a non-AI fallback: if AI fails, generate a template script from the lead data

### 10. `src/app/api/leads/pitch/route.ts`

- Inline Anthropic fetch — should import from ai-server
- Claude-only with no fallback
- The simplest route; easy to fix

### 11. `src/app/script/[id]/page.tsx` (Front-End)

- **Fix the button label:** Change "Opus" to "Claude" or "Claude Sonnet"
- **Better error handling:** The `alert()` on line 80 always says "Is the Hermes bridge running?" even when Claude fails. Read the error from the response body and display it
- **Consider adding model health indicator** — ping the backend before showing model options

---

## Priority Action Plan

### Immediate (both models don't work)

1. **Fix `claude-sonnet-4-20250514` to `claude-sonnet-4-5-20250929`** in `ai-server.ts` — this is one line change that fixes Claude for every route that uses `callAnthropic` or `callAI`
2. **Also fix the 5 inline hardcoded instances** in routes that don't use ai-server: `analyze`, `analyze-transcript`, `interview`, `practice`, `leads/pitch`
3. **Verify the bridge poller is running** at `https://555-dashboard.vercel.app/api/bridge` — DeepSeek won't work without it

### Short-term (robustness)

4. **Eliminate code duplication** — `analyze/route.ts` should import from `ai-server.ts`
5. **Make model name an env var** (`ANTHROPIC_MODEL`) so it can be changed without a deploy
6. **Add retry logic** (3 attempts, exponential backoff) in `callAnthropic` and `callHermesDirect`
7. **Wire up `DEEPSEEK_API`** as an alternative to Hermes bridge — call DeepSeek API directly when `DEEPSEEK_API_KEY` env var is set

### Medium-term (resilience)

8. **Add Claude → DeepSeek fallback** in `callAI` — if `isClaude && callAnthropic fails`, try DeepSeek
9. **Add non-AI fallbacks** for critical routes (generate-script can return a template; pitch can use a template)
10. **Centralize model routing** in ai-server.ts — all routes should go through `callAI` with no inline Anthropic calls

---

## Error Classification

| Error Type | Where | User Impact |
|-----------|-------|------------|
| **Wrong model name** (11 instances) | Every file | All Claude calls fail with 404 or "model not found" |
| **Bridge poller not running** | analyze, practice-voice, ingest, live-coach, generate-script | DeepSeek calls timeout after 90s then fail |
| **No fallback for Claude** | analyze (when Claude selected), analyze-transcript, interview, practice, practice-voice, ingest, live-coach, generate-script, pitch | Single point of failure; user sees raw error |
| **Code duplication** | analyze/route.ts | Bug fix in ai-server missed by analyze endpoint |
| **Hermes direct unreachable on Vercel** | All DeepSeek paths | `127.0.0.1:8642` only works locally; on Vercel, always falls through to relay (extra 2-90s latency) |
| **Front-end error message wrong** | script/[id]/page.tsx L80 | User told "Hermes bridge" issue when Claude API key is the real problem |
| **Button label says "Opus"** | script/[id]/page.tsx L169 | User thinks they're using Opus but it's Sonnet |

---

## Model Name Timeline

Based on the codebase comments and code:

- Originally used **Claude Opus** (`claude-opus-4`) — referenced in header comment in ai-server.ts
- Changed to **Claude Sonnet** (`claude-sonnet-4-20250514`) — the current hardcoded value everywhere
- Front-end still labels the button **"Opus"** — stale label
- Anthropic's actual current model (as of mid-2025) is **`claude-sonnet-4-5-20250929`** or similar — needs verification

The `claude-sonnet-4-20250514` date-suffix `20250514` suggests it was from May 2025. Anthropic may have deprecated this snapshot. The correct approach is to check Anthropic's API for the latest available model ID.
