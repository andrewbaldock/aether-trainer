import type { StationId } from "./stations";

// EXPLAIN deck: a broad interview prompt. The player narrates the path; as they
// name stations IN ORDER the machine traces the data flow live. `mustHit` is the
// model-answer checklist of stations that should appear; `boss` prompts require
// several stations mastered to attempt.

export type ExplainPrompt = {
  id: string;
  prompt: string;
  /** Stations the answer should hit, in a sensible order (used for the live trace). */
  mustHit: StationId[];
  /** Bullet checklist of must-say points for self-grading + AI rubric. */
  rubric: string[];
  boss?: boolean;
};

export const EXPLAIN_PROMPTS: ExplainPrompt[] = [
  {
    id: "exp-send-to-widget",
    prompt:
      "Walk me through everything that happens from the moment a user hits Send to a widget appearing on the canvas.",
    mustHit: [
      "frontend",
      "chat-pipe",
      "contract",
      "backend",
      "planner",
      "agent-loop",
      "providers",
      "tools",
      "sse",
      "widgets",
      "bigsail",
      "persistence",
    ],
    rubric: [
      "useChat POSTs /api/chat with messages + sessionId/userId/model/clarified (SSE).",
      "Backend checks ownership (if persisting) and builds the right LLM client per model/graphMode.",
      "Planner pre-pass (Haiku): plan | clarify | null. Clarify exits early with tappable options.",
      "Agent loop runs (wire-format agnostic, 6-iteration cap): stream → execute tools → self-correct → append.",
      "Render tools are pass-throughs: their input JSON IS the widget spec.",
      "SSE streams back one-event-per-line; tool_partial drives progressive render; [DONE] terminates.",
      "Frontend parses events, useStreamingEntries upserts entries, Bigsail shows skeletons → real cards.",
      "Turn persists (user + assistant messages), session auto-titles, widget_data/graph_data saved.",
    ],
    boss: true,
  },
  {
    id: "exp-wire-sync",
    prompt:
      "How do the frontend and backend keep their wire types in sync? What stops them drifting apart?",
    mustHit: ["contract", "sse", "backend", "chat-pipe"],
    rubric: [
      "shared/contract is the single source of truth, imported via @contract/* on both sides.",
      "The SseEvent union (~12 types + [DONE]) and render specs live there, never re-declared.",
      "createSseEmitter is typed against the union — a typo is a compile error.",
      "parseSseChunk on the frontend reads the same one-event-per-line format.",
    ],
  },
  {
    id: "exp-provider-agnostic",
    prompt:
      "Aether supports Claude, Gemini, DeepSeek and Mistral with one agent loop. How?",
    mustHit: ["agent-loop", "providers"],
    rubric: [
      "runAgentLoop is wire-format agnostic; a WireAdapter emits a normalized LoopEvent stream.",
      "Claude adapter uses the Anthropic SDK; one OpenAI-compat adapter serves Google/DeepSeek/Mistral.",
      "The loop keys on LoopEvent presence, not finish_reason (immune to the Gemini 'stop' bug).",
      "Only Claude does prompt caching (ephemeral cache_control); others have baseURL + apiKeyEnv.",
      "MAX_ITERATIONS=6; tools stripped on the last iteration to force a text answer.",
    ],
  },
  {
    id: "exp-progressive-render",
    prompt:
      "Explain how a widget renders progressively as the model is still streaming its tool call.",
    mustHit: ["tools", "sse", "widgets", "bigsail"],
    rubric: [
      "Streamable render tools stream their input JSON as tool_partial (120ms throttled + final).",
      "Render tools are pass-throughs: input JSON = tool_result = widget spec.",
      "useStreamingEntries upserts a streaming entry per partial, finalizing on isComplete/tool_result.",
      "bestEffortJson salvages truncation; parsers guard shape and return null on malformed data.",
      "Bigsail shows skeletons in real grid slots, replaced in place as data arrives.",
    ],
  },
  {
    id: "exp-persistence-model",
    prompt:
      "How does Aether persist a conversation's widgets and graph, and how does it avoid losing user work?",
    mustHit: ["persistence", "widgets", "bigsail"],
    rubric: [
      "sessions row holds graph_data/widget_data/ui_state (frontend-owned) + image_data (backend-owned) jsonb.",
      "mergeWidgetSnapshot: null/absent incoming field keeps stored array unless reset=true (no silent wipes).",
      "schemaVersion is advisory — shape guard is the only gate; mismatch heals, never discards.",
      "WidgetPersistenceBridge self-heals (persists lastGood over null) and retries cold-start loads.",
      "image_data is split out to dodge a read-then-write race with the frontend.",
    ],
  },
  {
    id: "exp-planner",
    prompt:
      "What is the planner pre-pass and why does it exist?",
    mustHit: ["planner", "backend", "agent-loop"],
    rubric: [
      "A cheap Haiku pre-pass before the main loop, returning plan | clarify | null.",
      "mightNeedPlan / mightClarify are conservative gates; a miss just falls back to plain ReAct.",
      "A clarify streams ONE question + tappable options and exits — no loop that turn.",
      "clarified=true bypasses the gate so a short answer still gets a full composition plan.",
      "The plan is abstract (capabilities + relationships, no coordinates) and steers the loop via a preamble.",
    ],
  },
  {
    id: "exp-loading-contract",
    prompt:
      "Describe the Bigsail loading sequence on a brand-new conversation, start to finish.",
    mustHit: ["chat-pipe", "bigsail", "widgets"],
    rubric: [
      "useAgentBusy { replay: true } so a mid-turn mount still sees 'busy' and starts the anim.",
      "Borderless gathering animation first; then skeletons in REAL grid slots (never a bare spinner).",
      "DRIP: one skeleton per interval until first real data; FULL: all planned skeletons, then replaced in place.",
      "Every planned widget executes; the grid ends fully filled; the anim is gone on first real data.",
    ],
    boss: true,
  },
  {
    id: "exp-caching-cost",
    prompt:
      "Where does Aether save money and bandwidth — prompt caching, ETags, health probes?",
    mustHit: ["providers", "backend", "agent-loop"],
    rubric: [
      "Claude prompt caching: system + last tool block + last message tail marked ephemeral; prefix read from cache on iter 2+.",
      "ETag/304 on READ_PATHS GETs (private, no-cache, must-revalidate); mutations + streams skip it.",
      "Provider health probe is a cached 1-token completion (60s TTL); Claude-down degrades to full picker.",
      "Planner is Haiku (cheap) and gated so most turns skip it.",
    ],
  },
];

export const EXPLAIN_BY_ID: Record<string, ExplainPrompt> = Object.fromEntries(
  EXPLAIN_PROMPTS.map((p) => [p.id, p]),
);
