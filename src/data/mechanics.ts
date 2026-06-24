import type { StationId } from "./stations";

// The INTERNAL mechanics of each station — the boxes-and-arrows plumbing shown
// inside a zone in Diagnose / Explain mode (Recall shows the flashcards instead).
// Authored from docs/ARCHITECTURE.md in the real aether repo, so the diagram is
// honest about what each station actually contains.
//
// Each `Mechanism` is a box (short `label`, full `detail` shown when expanded).
// `kind` classifies its NATURE — it drives a colored, shaped icon badge so boxes
// are visually distinct at a glance (see machine/mechKinds.ts). `flow` lists the
// arrows between boxes by id. Layout is auto-generated (see machine/layout.ts);
// this file is pure data so it's unit-testable and easy to extend per station.

/** The nature of a mechanism — drives its badge color / shape / icon. */
export type MechKind =
  | "endpoint" // an HTTP route or wire interface / entry point
  | "transform" // a parser / serializer / normalizer
  | "stream" // an event, SSE, or streaming construct
  | "store" // state container: provider, context, registry, table, type
  | "model" // an LLM client / planner / model routing
  | "guard" // a safety check, gotcha, or salvage path
  | "config"; // bootstrap / deploy / ops configuration

export const MECH_KINDS: MechKind[] = [
  "endpoint",
  "transform",
  "stream",
  "store",
  "model",
  "guard",
  "config",
];

export type Mechanism = {
  /** Unique within its station. */
  id: string;
  /** Short box label. */
  label: string;
  /** The nature of this box (drives its badge). */
  kind: MechKind;
  /** Full explanation, shown when the box is expanded. */
  detail: string;
  /** Optional source pointer into the real aether repo. */
  filePath?: string;
};

export type MechanismEdge = {
  /** Mechanism id this arrow leaves. */
  from: string;
  /** Mechanism id this arrow enters. */
  to: string;
  /** Optional short label on the arrow. */
  label?: string;
};

export type StationMechanics = {
  parts: Mechanism[];
  flow: MechanismEdge[];
};

export const MECHANICS: Partial<Record<StationId, StationMechanics>> = {
  // ───────────────────────── SSE STREAM-BACK ─────────────────────────
  sse: {
    parts: [
      {
        id: "emitter",
        label: "createSseEmitter()",
        kind: "endpoint",
        detail:
          "Typed wrapper over the response stream. Each method writes one `data: <JSON>\\n` line and is typed against the SseEvent union — so a misspelled event name or wrong payload is a COMPILE error, not a runtime surprise.",
        filePath: "backend/src/sse.ts",
      },
      {
        id: "union",
        label: "SseEvent union",
        kind: "stream",
        detail:
          "The wire vocabulary, declared once in shared/contract: text · tool_start · tool_partial · tool_result · status · loop_start · plan · clarify · persisted · warning · error. Both backend and frontend import it, so a new field breaks compilation on whichever side lags.",
        filePath: "shared/contract",
      },
      {
        id: "framing",
        label: "Line framing",
        kind: "transform",
        detail:
          "One event per line: `data: {type,...}\\n` — NOT multi-line SSE blocks. The frontend reader (parseSseChunk) buffers a partial trailing line across chunk boundaries so an event split mid-flight still parses.",
        filePath: "backend/src/sse.ts",
      },
      {
        id: "partial",
        label: "tool_partial throttle",
        kind: "stream",
        detail:
          "Render-tool input JSON is forwarded as it streams (input_json_delta), throttled to ~one frame per 120 ms, so a big answer paints its first rows in ~1 s. isComplete=true marks the final partial; the authoritative tool_result still follows.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "salvage",
        label: "bestEffort salvage",
        kind: "guard",
        detail:
          "On a max_tokens cutoff mid tool-input, closeTruncatedJson() rewinds to the last clean close point, drops the trailing partial element, and rebalances brackets; parseBestEffort() yields valid JSON. It only handles END truncation, is escape/nesting aware, and never throws. The loop emits the salvaged spec as a final tool_partial + a soft status.",
        filePath: "backend/src/bestEffortJson.ts",
      },
      {
        id: "done",
        label: "[DONE] sentinel",
        kind: "stream",
        detail:
          "A RAW string `data: [DONE]` (not JSON) — the reader must check for it BEFORE JSON.parse. It is sent AFTER the persisted/title events so those are consumed first, and it terminates the client's read loop.",
        filePath: "backend/src/sse.ts",
      },
    ],
    flow: [
      { from: "emitter", to: "union", label: "typed methods" },
      { from: "union", to: "framing", label: "one line each" },
      { from: "union", to: "partial", label: "render tools" },
      { from: "partial", to: "salvage", label: "on max_tokens" },
      { from: "framing", to: "done", label: "[DONE] last" },
    ],
  },

  // ───────────────────────── CHAT PIPE ─────────────────────────
  "chat-pipe": {
    parts: [
      {
        id: "use-chat",
        label: "useChat()",
        kind: "endpoint",
        detail:
          "The frontend stream reader. POSTs the full conversation to /api/chat, reads the SSE body, and appends tokens to the live assistant message. The view (ChatPanel) is dumb — useChat owns the turn.",
        filePath: "frontend/src/shell/useChat.ts",
      },
      {
        id: "parse",
        label: "parseSseChunk",
        kind: "transform",
        detail:
          "Splits the byte stream into `data:` lines, buffering a partial trailing line across chunk boundaries. Checks the raw [DONE] sentinel BEFORE attempting JSON.parse, then routes each typed event.",
        filePath: "frontend/src/shell/useChat.ts",
      },
      {
        id: "epoch",
        label: "Epoch guard",
        kind: "guard",
        detail:
          "Each turn bumps epochRef; updateAssistant() no-ops if the epoch is stale. This is what stops a previous turn's tokens from bleeding into a new conversation when you switch mid-stream. A bleed means the guard isn't being checked.",
        filePath: "frontend/src/shell/useChat.ts",
      },
      {
        id: "session",
        label: "SessionContext",
        kind: "store",
        detail:
          "Message state is lifted out of ChatPanel into SessionContext so both ChatPanel and the Sidebar read the same transcript. SessionContext owns the session lifecycle (create on mount / on '+ New conversation').",
        filePath: "frontend/src/shell/SessionContext.tsx",
      },
      {
        id: "busy",
        label: "useAgentBusy({replay:true})",
        kind: "stream",
        detail:
          "The busy/loading bus. Consumers that mount MID-turn (e.g. Bigsail) must subscribe with { replay: true } or they land busy=false and never play the gathering animation. The classic 'no skeletons on the first question' bug.",
        filePath: "frontend/src/shell/useAgentBusy.ts",
      },
      {
        id: "queue",
        label: "Abort + queue + cold-start retry",
        kind: "guard",
        detail:
          "abortRef holds the current turn's AbortController; queueRef is a FIFO of messages typed mid-turn (Stop aborts and drains). useChat retries a 502/503/504 ONCE before any bytes stream, never mid-stream. It strips empty PRIOR messages but PRESERVES an empty final turn (the attachments-only case).",
        filePath: "frontend/src/shell/useChat.ts",
      },
    ],
    flow: [
      { from: "use-chat", to: "parse", label: "reads stream" },
      { from: "parse", to: "epoch", label: "guard before apply" },
      { from: "epoch", to: "session", label: "updates transcript" },
      { from: "use-chat", to: "busy", label: "emits busy" },
    ],
  },

  // ───────────────────────── FRONTEND SHELL ─────────────────────────
  frontend: {
    parts: [
      {
        id: "main",
        label: "main.tsx",
        kind: "config",
        detail:
          "Wraps <App/> in QueryClientProvider (React Query) and renders into #root in StrictMode. The data layer (apiFetch, queries, optimistic mutations) lives below this provider.",
        filePath: "frontend/src/main.tsx",
      },
      {
        id: "providers",
        label: "App.tsx provider tree",
        kind: "store",
        detail:
          "Theme → Toaster → Appearance → Tooltip → BackendStatusBanner → AgentEvent → BigsailPlan → KnowledgeGraph → Table/Chart/Timeline/Images → Capability → Shell. Every widget state provider sits at the root so it can never miss an SSE payload — even for a tab that hasn't been opened yet.",
        filePath: "frontend/src/App.tsx",
      },
      {
        id: "shell",
        label: "Shell (three zones)",
        kind: "store",
        detail:
          "Desktop three-zone layout: fixed 240px sidebar + chat column + capability column. Small screens swap to MobileShell. Capability column width persists in localStorage, clamped 20–60%, default 36%.",
        filePath: "frontend/src/shell/Shell.tsx",
      },
      {
        id: "route",
        label: "useRoute (URL = truth)",
        kind: "transform",
        detail:
          "Reactive route parser on useSyncExternalStore + a popstate listener; the snapshot is just the pathname. The URL is the single source of truth for which capability tab is active; viewPath()/viewSlug() are the one canonical path builders so links never drift.",
        filePath: "frontend/src/hooks/useRoute.ts",
      },
      {
        id: "rrp-units",
        label: "react-resizable-panels v4",
        kind: "guard",
        detail:
          "panel.resize()/sizes read BARE NUMBERS AS PIXELS, not percent — always pass strings like \"32%\". A bare number compiles fine but silently opens the panel to a 32px sliver. This caused all the early capability-panel resize failures.",
        filePath: "frontend/src/shell/Shell.tsx",
      },
      {
        id: "tailwind",
        label: "Tailwind data-[state=open]",
        kind: "guard",
        detail:
          "Radix open-state styling relies on the bracket form `data-[state=open]:…`. A 'cleanup' to a canonical-looking `data-state-open` matches NOTHING and silently breaks the styling — no error. Always verify in the built CSS.",
        filePath: "frontend/src/shell/Shell.tsx",
      },
      {
        id: "first-arrival",
        label: "FirstArrivalWelcome",
        kind: "guard",
        detail:
          "Auto-opens on first visit on DESKTOP ONLY (on mobile the capability column is a fullscreen overlay and would hijack the screen). On mobile it skips WITHOUT setting the seen-flag, so a later desktop visit still gets the welcome. Respects explicit deep links.",
        filePath: "frontend/src/App.tsx",
      },
    ],
    flow: [
      { from: "main", to: "providers", label: "wraps App" },
      { from: "providers", to: "shell", label: "renders" },
      { from: "shell", to: "route", label: "URL drives tabs" },
      { from: "shell", to: "rrp-units", label: "panel sizing" },
    ],
  },

  // ───────────────────────── THE CONTRACT ─────────────────────────
  contract: {
    parts: [
      {
        id: "single-source",
        label: "shared/contract",
        kind: "config",
        detail:
          "The single source of truth for FE↔BE wire types. Both packages import it via the @contract/* tsconfig path alias; types are never re-declared on either side, so a rename or new field is a compile error on whichever side lags.",
        filePath: "shared/contract/README.md",
      },
      {
        id: "sse-union",
        label: "SseEvent union",
        kind: "stream",
        detail:
          "text · status · tool_start · tool_result · tool_partial · loop_start · plan · clarify · persisted · titled · warning · error — ~12 typed events, plus the raw [DONE] sentinel that terminates the stream.",
        filePath: "shared/contract/sse.ts",
      },
      {
        id: "widget-specs",
        label: "Render spec shapes",
        kind: "store",
        detail:
          "TableSpec {columns, rows}; ChartSpec {type: line|bar|area|pie, data, xKey, series}; TimelineSpec {items, groups?}; ImagesSpec {images}. The shapes the render tools emit and the widgets consume.",
        filePath: "shared/contract/widgets.ts",
      },
      {
        id: "graph-payload",
        label: "GraphPayload",
        kind: "store",
        detail:
          "{ entities, relationships, remove?, merge? }. Additive-merge semantics — new entities/relationships are appended, never reset. Entities carry id (slug), label, type (person|place|concept|org|event), optional wikipediaTitle + lucide icon.",
        filePath: "shared/contract/widgets.ts",
      },
      {
        id: "composition-plan",
        label: "CompositionPlan",
        kind: "model",
        detail:
          "{ intents, relationships } — abstract capabilities and how they relate. Deliberately carries NO coordinates/layout: the plan says WHAT to compose, never WHERE. Emitted over the `plan` SSE event.",
        filePath: "shared/contract/plan.ts",
      },
    ],
    flow: [
      { from: "single-source", to: "sse-union", label: "events" },
      { from: "single-source", to: "widget-specs", label: "render specs" },
      { from: "single-source", to: "composition-plan", label: "plan" },
      { from: "widget-specs", to: "graph-payload", label: "graph wire" },
    ],
  },

  // ───────────────────────── BACKEND SERVER ─────────────────────────
  backend: {
    parts: [
      {
        id: "chat-route",
        label: "POST /api/chat",
        kind: "endpoint",
        detail:
          "The streaming SSE chat turn. Body { messages, sessionId?, userId?, graphMode?, model?, clarified? }. Checks ownership if persisting, builds the right LLM client per model/graphMode, runs the planner pre-pass then the agent loop, streams SSE back. Not cached.",
        filePath: "backend/src/index.ts",
      },
      {
        id: "ownership",
        label: "Ownership gate",
        kind: "guard",
        detail:
          "callerId(c) reads the X-User-Id header → isSessionOwner() → 403 (NotOwnerError) if denied. Reads are OPEN (anyone can GET a session, which enables fork/share); only mutations are gated.",
        filePath: "backend/src/index.ts",
      },
      {
        id: "sessions-routes",
        label: "/api/sessions CRUD",
        kind: "endpoint",
        detail:
          "POST (create), GET ?userId (list), GET :id (open read), PATCH :id (title/graph_mode/model/ui_state, owner only), DELETE :id (owner only), POST :id/fork (can fork a foreign session).",
        filePath: "backend/src/index.ts",
      },
      {
        id: "subresources",
        label: "Session sub-resources",
        kind: "endpoint",
        detail:
          "GET/DELETE :id/messages, GET/PUT :id/graph, GET/PUT :id/widgets, POST :id/repair-prompts (Haiku backfill of recreation prompts).",
        filePath: "backend/src/index.ts",
      },
      {
        id: "etag",
        label: "ETag / 304",
        kind: "guard",
        detail:
          "READ_PATHS GETs set Cache-Control + an ETag; the browser sends If-None-Match and gets a 304 (empty body) on match, saving egress. Mutations (PUT/DELETE) and streaming endpoints are explicitly excluded before the etag check.",
        filePath: "backend/src/index.ts",
      },
    ],
    flow: [
      { from: "ownership", to: "sessions-routes", label: "gates writes" },
      { from: "sessions-routes", to: "subresources", label: "hang off :id" },
      { from: "sessions-routes", to: "etag", label: "reads cached" },
      { from: "chat-route", to: "sessions-routes", label: "persists turn" },
    ],
  },

  // ───────────────────────── THE PLANNER ─────────────────────────
  planner: {
    parts: [
      {
        id: "model",
        label: "Always Haiku",
        kind: "model",
        detail:
          "The planner pre-pass always runs on Haiku (claude-haiku-4-5), regardless of the conversation's chosen model (Sonnet/Opus/Gemini). It's a cheap pre-pass — the conversation model doesn't change it.",
        filePath: "backend/src/planner.ts",
      },
      {
        id: "context",
        label: "6-message context",
        kind: "store",
        detail:
          "The planner sees the 6 trailing messages (400 chars each) + the latest, not just the latest — given only the last message it misjudges what's been discussed. On clarified=true it reframes around what the user ultimately wants.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "gates",
        label: "mightNeedPlan / mightClarify",
        kind: "guard",
        detail:
          "Cheap pre-filters before spending a planner call. mightNeedPlan: ≥40 chars + compare/chart/table hints + multiple clauses. mightClarify: short broad questions that aren't greetings/arithmetic. Conservative — a false negative just means a plain ReAct turn.",
        filePath: "backend/src/planner.ts",
      },
      {
        id: "plan-turn",
        label: "planTurn() → 3 outcomes",
        kind: "transform",
        detail:
          "Returns { kind:'plan', plan } | { kind:'clarify', clarify } | null. null = proceed as plain ReAct. parsePlan() is very defensive (extracts JSON from prose, validates capabilities + indices) and degrades to ReAct on any failure.",
        filePath: "backend/src/planner.ts",
      },
      {
        id: "clarified",
        label: "clarified=true forces plan",
        kind: "guard",
        detail:
          "A user's answer to a clarifier is often short ('the second one'), which the 40-char gate would skip. clarified=true bypasses the gate so the thin-but-now-explodable turn still gets a full composition plan.",
        filePath: "backend/src/planner.ts",
      },
    ],
    flow: [
      { from: "model", to: "gates", label: "runs" },
      { from: "context", to: "gates", label: "feeds" },
      { from: "gates", to: "plan-turn", label: "if it might" },
      { from: "clarified", to: "plan-turn", label: "bypass gate" },
    ],
  },

  // ───────────────────────── THE AGENT LOOP ─────────────────────────
  "agent-loop": {
    parts: [
      {
        id: "premise",
        label: "runAgentLoop (wire-agnostic)",
        kind: "model",
        detail:
          "Hand-rolled (no LangChain). A WireAdapter emits a normalized LoopEvent stream; the loop consumes it identically whether the provider is Claude or an OpenAI-compat model. Only the adapter's wire format differs.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "wire-adapter",
        label: "WireAdapter",
        kind: "transform",
        detail:
          "Two methods: stream(history,{withTools}) → AsyncIterable<LoopEvent>, and appendToolRound() which writes the round back in that provider's shape (Claude: assistant content + tool_result user msg; OpenAI: assistant msg + N tool messages).",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "loop-event",
        label: "LoopEvent union",
        kind: "stream",
        detail:
          "text · tool_start · tool_delta · tool_meta (thoughtSignature) · server_tool_start · server_tool_result · usage (input/output/cacheRead/cacheCreation) · stop (end|tool_use|max_tokens|malformed_tool).",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "iteration",
        label: "One iteration (cap 6)",
        kind: "model",
        detail:
          "status/loop_start → stream output → execute tools in order → self-correct degenerate results (MAX_CORRECTIONS=1) → append the round to history. Loops until stopReason ≠ tool_use. On the FINAL iteration tools are stripped, forcing a text answer so the turn always terminates.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "salvage",
        label: "max_tokens salvage",
        kind: "guard",
        detail:
          "When a render tool is cut off mid-input, closeTruncatedJson() + parseBestEffort() run on each streamable tool; if any salvages to valid, non-degenerate JSON, emit a final partial + soft status and return. If nothing salvages, throw. One-shot, no retry.",
        filePath: "backend/src/llm.ts",
      },
    ],
    flow: [
      { from: "premise", to: "wire-adapter", label: "per provider" },
      { from: "wire-adapter", to: "loop-event", label: "normalizes" },
      { from: "loop-event", to: "iteration", label: "consumed by" },
      { from: "iteration", to: "salvage", label: "on max_tokens" },
    ],
  },

  // ───────────────────────── LLM PROVIDERS ─────────────────────────
  providers: {
    parts: [
      {
        id: "allowlist",
        label: "MODELS allowlist",
        kind: "store",
        detail:
          "7 entries: claude-sonnet-4-6 (default, first), claude-opus-4-8, claude-haiku-4-5, gemini-3.5-flash, gemini-3.1-flash-lite, deepseek-v4-flash, mistral-small-latest. Array order = UI display order. Always default to Sonnet.",
        filePath: "backend/src/models.ts",
      },
      {
        id: "resolve",
        label: "resolveModel / providerForModel",
        kind: "transform",
        detail:
          "resolveModel() validates a client-supplied model id against MODELS (rejecting unknown ids at the route). providerForModel() looks up which provider (claude|google|deepseek|mistral) serves it, routing the turn to the right client.",
        filePath: "backend/src/models.ts",
      },
      {
        id: "claude-client",
        label: "Claude client (Anthropic SDK)",
        kind: "model",
        detail:
          "Lazily initialized via createClaudeClient(). Sends system + tools + messages with cache_control: ephemeral breakpoints — on iterations 2+ the conversation prefix is read from cache instead of re-billed at full rate.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "openai-compat",
        label: "OpenAI-compat client",
        kind: "model",
        detail:
          "One implementation serves Google / DeepSeek / Mistral, each with its own baseURL + apiKeyEnv. No prompt caching (that's Anthropic-only). Keys are read lazily, so the app runs on Anthropic alone.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "gemini",
        label: "Gemini finish_reason quirk",
        kind: "guard",
        detail:
          "Gemini's OpenAI-compat layer mislabels streamed tool_calls with finish_reason 'stop' instead of 'tool_use'. Aether keys its loop on the PRESENCE of tool-call events, not finish_reason, so it's immune. MALFORMED_FUNCTION_CALL surfaces as a visible error.",
        filePath: "backend/src/llm.ts",
      },
      {
        id: "health",
        label: "Provider health probe",
        kind: "guard",
        detail:
          "A 1-token completion per provider, cached ~60s; the green set filters the model picker. If Claude (the default) is down it exposes the FULL picker (degrade, not break); other providers down are simply marked unavailable. Keyless data sources are never gated.",
        filePath: "backend/src/health.ts",
      },
    ],
    flow: [
      { from: "allowlist", to: "resolve", label: "validated by" },
      { from: "resolve", to: "claude-client", label: "claude" },
      { from: "resolve", to: "openai-compat", label: "google/ds/mistral" },
      { from: "openai-compat", to: "gemini", label: "quirk" },
    ],
  },

  // ───────────────────────── TOOLS BENCH ─────────────────────────
  tools: {
    parts: [
      {
        id: "render-passthrough",
        label: "Render tools = pass-through",
        kind: "transform",
        detail:
          "render_table/chart/timeline/images do NO work in executeTool — they return JSON.stringify(input). So a render tool's result IS the model's tool-input JSON, verbatim, which IS the widget spec. The model authors the spec by calling the tool.",
        filePath: "backend/src/tools.ts",
      },
      {
        id: "streamable-set",
        label: "STREAMABLE_RENDER_TOOLS",
        kind: "stream",
        detail:
          "render_table/chart/timeline/images + build_knowledge_graph. Their input JSON streams as tool_partial events (~120ms throttle + a final), driving progressive paint. Data tools aren't streamable — their result comes from a fetch, not the model's text.",
        filePath: "backend/src/tools.ts",
      },
      {
        id: "data-tools",
        label: "Data tools",
        kind: "endpoint",
        detail:
          "wikidata_search (Q/P resolution), wikidata_query (SPARQL), world_bank (indicator timeseries), wikipedia_summary (REST), openalex_search (scholarly). Base tools: get_current_datetime, search_images (Wikimedia + Unsplash), plus web_search (Anthropic server-side, Claude-only).",
        filePath: "backend/src/tools.ts",
      },
      {
        id: "graph-tool",
        label: "build_knowledge_graph",
        kind: "model",
        detail:
          "Gated to graphMode=true only. Additive-merge: new entities/relationships appended; remove/merge are maintenance ops. The model must reuse exact ids or merge dupes; lone nodes or zero relationships count as degenerate.",
        filePath: "backend/src/tools.ts",
      },
      {
        id: "degeneracy",
        label: "Degeneracy guard + correction",
        kind: "guard",
        detail:
          "Degenerate = empty rows/data/items, or graph with <2 entities AND 0 relationships. A correctionDirective is appended to steer one retry ('make 3+ connected entities', 're-derive / switch capability / say nothing to show').",
        filePath: "backend/src/tools.ts",
      },
      {
        id: "icons",
        label: "ICON_VOCABULARY (graph icons)",
        kind: "guard",
        detail:
          "A curated enum of 140+ lucide-react PascalCase icon names the model may pick from for graph entities. An icon name NOT in lucide-react is silently discarded by the frontend — no error, just no icon — which is exactly why the vocabulary is constrained.",
        filePath: "backend/src/tools.ts",
      },
      {
        id: "images",
        label: "search_images + Unsplash cap",
        kind: "endpoint",
        detail:
          "search_images merges Wikimedia (keyless, real captions) + Unsplash (glossier, optional). Unsplash is capped at 6 searches per conversation (image_data.unsplashSearches); past the cap it silently falls back to Wikimedia-only. Photographer credits are pinged on render.",
        filePath: "backend/src/tools.ts",
      },
    ],
    flow: [
      { from: "render-passthrough", to: "streamable-set", label: "streamed" },
      { from: "graph-tool", to: "streamable-set", label: "streamed" },
      { from: "data-tools", to: "degeneracy", label: "checked" },
      { from: "streamable-set", to: "degeneracy", label: "checked" },
    ],
  },

  // ───────────────────────── WIDGET FACTORY ─────────────────────────
  widgets: {
    parts: [
      {
        id: "capability-provider",
        label: "CapabilityProvider",
        kind: "store",
        detail:
          "Holds { activeId, isFullscreen, openTick, unseen }. activate bumps openTick (and clears unseen for that id); restore rehydrates WITHOUT bumping openTick, so a reload doesn't read as a fresh open.",
        filePath: "frontend/src/capabilities/useCapabilities.tsx",
      },
      {
        id: "catalog",
        label: "Capability catalog",
        kind: "config",
        detail:
          "CAPABILITIES: Bigsail (Tiles, home base), KnowledgeGraph, Table, Chart, Timeline, Images. Each has id, title, a custom SVG icon (not Lucide, to stay distinct), and a blurb. Every capability is always available — the chip set is fixed.",
        filePath: "frontend/src/capabilities/catalog.tsx",
      },
      {
        id: "registry",
        label: "Renderer registry",
        kind: "store",
        detail:
          "A Map<type, renderer>. registerRenderer(type, component) wires a renderer at import time; getRenderer(type) looks it up. No React subscription — renderers register on import, so the shell never knows what's inside a widget.",
        filePath: "frontend/src/capabilities/registry.ts",
      },
      {
        id: "streaming-entries",
        label: "useStreamingEntries",
        kind: "stream",
        detail:
          "Shared by Table/Chart/Timeline/Images. On tool_partial it upserts a streaming entry IN PLACE (paint as it arrives); on the final partial / tool_result it finalizes the slot and closes it on done/error/idle.",
        filePath: "frontend/src/capabilities/widgets/useStreamingEntries.ts",
      },
      {
        id: "title-merge",
        label: "title-merge de-dup",
        kind: "guard",
        detail:
          "When a fresh streaming slot opens with a title matching an existing entry (case-insensitive, trimmed), it RETARGETS onto that entry instead of appending a sibling. Fixes the follow-up-turn duplicate-widget bug. Only fresh slots; whole-set replace bypasses it.",
        filePath: "frontend/src/capabilities/widgets/useStreamingEntries.ts",
      },
      {
        id: "parsers",
        label: "Spec parsers + recreation prompts",
        kind: "guard",
        detail:
          "Defensive spec parsers (parseTableSpec etc.) return null on malformed data so a bad model call can't crash a widget. A card's recreation prompt lives in spec.summary / spec.blurb; missing ones are backfilled on load via POST /sessions/:id/repair-prompts (Haiku), then re-applied so regenerate has something to seed from.",
        filePath: "frontend/src/capabilities/widgets/Table/useTableState.tsx",
      },
    ],
    flow: [
      { from: "capability-provider", to: "catalog", label: "active id" },
      { from: "catalog", to: "registry", label: "type → renderer" },
      { from: "registry", to: "streaming-entries", label: "feeds widget" },
      { from: "streaming-entries", to: "title-merge", label: "dedup" },
    ],
  },

  // ───────────────────────── BIGSAIL CANVAS ─────────────────────────
  bigsail: {
    parts: [
      {
        id: "plan-provider",
        label: "BigsailPlanProvider",
        kind: "store",
        detail:
          "Subscribes to the bus and stores the latest composition plan (useBigsailPlan reads it). Sits at app root like the other widget providers so it never misses the plan SSE event — even before the Bigsail tab is opened.",
        filePath:
          "frontend/src/capabilities/widgets/Bigsail/BigsailPlanProvider.tsx",
      },
      {
        id: "widget-root",
        label: "BigsailWidget",
        kind: "store",
        detail:
          "Reads all widget providers (graph/table/chart/timeline/images), converts entries via toCards(), manages the skeleton lifecycle, persists layout to ui_state.tilesLayout on resize/drag, and tracks awaitingClarification.",
        filePath: "frontend/src/capabilities/widgets/Bigsail/BigsailWidget.tsx",
      },
      {
        id: "loading-contract",
        label: "Loading contract",
        kind: "stream",
        detail:
          "New-convo load = borderless gathering anim → skeletons in REAL grid slots (never a bare spinner) → real widgets replace them in place → grid fully filled, every planned widget executes. Requires useAgentBusy({ replay:true }). DRIP then FULL skeleton phases.",
        filePath: "frontend/src/capabilities/widgets/Bigsail/skeletonCards.ts",
      },
      {
        id: "two-systems",
        label: "Two-system GridStack handoff",
        kind: "guard",
        detail:
          "System 1 (streaming template packing) runs ONLY for the very first build (no saved tilesLayout). System 2 (vanilla float:false gravity) owns everything after. The template never re-runs in user mode — re-running would yank cards around mid-resize.",
        filePath: "frontend/src/capabilities/widgets/Bigsail/TilesCanvas.tsx",
      },
      {
        id: "gridstack-ownership",
        label: "GridStack owns the DOM",
        kind: "guard",
        detail:
          "GridStack owns the grid-item DOM and positions (imperative addWidget/removeWidget); React owns only the CONTENT, portaled into GridStack's nodes. React must never render grid items as JSX children or they collide with GridStack's moves.",
        filePath: "frontend/src/capabilities/widgets/Bigsail/TilesCanvas.tsx",
      },
      {
        id: "card-back",
        label: "Card back + regenerate",
        kind: "store",
        detail:
          "A card id is `${capability}:${entryId}` (stable, parseable). The back face shows the JSON spec + regenerate / duplicate / hide / reload and an editable recreation-prompt box. Regenerate fires an explore_request with the edited prompt and binds the next matching spec to this entry (replace-in-place). The knowledge-graph can't duplicate (it's a singleton).",
        filePath: "frontend/src/capabilities/widgets/Bigsail/CardBack.tsx",
      },
    ],
    flow: [
      { from: "plan-provider", to: "widget-root", label: "plan" },
      { from: "widget-root", to: "loading-contract", label: "skeletons" },
      { from: "widget-root", to: "two-systems", label: "layout" },
      { from: "two-systems", to: "gridstack-ownership", label: "DOM split" },
    ],
  },

  // ───────────────────────── PERSISTENCE ─────────────────────────
  persistence: {
    parts: [
      {
        id: "tables",
        label: "3 core tables",
        kind: "store",
        detail:
          "sessions (id, user_id, title?, graph_mode, graph_data/widget_data/image_data/ui_state jsonb, model?, timestamps), messages (id, session_id fk, role, content required), app_state (shared counters, anon read/write). saveMessage REJECTS empty content (the assistant route must supply a fallback) so a reloaded attachments-only turn still passes the /api/chat validator.",
        filePath: "backend/src/db.ts",
      },
      {
        id: "jsonb-columns",
        label: "jsonb ownership",
        kind: "store",
        detail:
          "graph_data, widget_data, ui_state are FRONTEND-owned (round-tripped as-is). image_data is BACKEND-owned (the Unsplash counter, written mid-turn) — kept separate from widget_data specifically to avoid a read-then-write race with the frontend.",
        filePath: "backend/src/db.ts",
      },
      {
        id: "merge-on-write",
        label: "mergeWidgetSnapshot",
        kind: "guard",
        detail:
          "If an incoming field is null/absent AND the stored array is non-empty, KEEP the stored value (unless reset=true). A frontend timing bug (rebuild clears-then-fails before save) could otherwise null a field and silently wipe the user's work.",
        filePath: "backend/src/db.ts",
      },
      {
        id: "schema-version",
        label: "schemaVersion guard",
        kind: "guard",
        detail:
          "A mismatch does NOT discard data — the shape guard is the only gate; a stale/missing stamp is healed (re-saved) on next load. Bumping a tool's version is bookkeeping for a breaking shape change, not a data-wipe trigger.",
        filePath: "frontend/src/lib/schemaVersion.ts",
      },
      {
        id: "rls",
        label: "RLS lockdown",
        kind: "guard",
        detail:
          "sessions/messages have RLS on with NO anon policy — the backend MUST use the service-role key or it reads zero rows. Critically: enable RLS only AFTER the backend uses the service-role key, or the live app's anon connection suddenly sees nothing.",
        filePath: "backend/sql/005_rls_lockdown.sql",
      },
      {
        id: "widget-bridge",
        label: "WidgetPersistenceBridge",
        kind: "store",
        detail:
          "Loads/saves the widget_data column (4 fields). On session change it GETs the snapshot and applies each field defensively (retry once on cold-start). Self-healing save: an empty field persists lastGood instead of null, so a transient blip can't overwrite real data. Also backfills missing recreation prompts via /repair-prompts on load.",
        filePath: "frontend/src/capabilities/widgets/WidgetPersistenceBridge.tsx",
      },
      {
        id: "cold-url-load",
        label: "consumeColdUrlLoad (deep-link restore)",
        kind: "guard",
        detail:
          "A one-shot flag, true iff the page was opened/refreshed directly on /c/:id. It must be set SYNCHRONOUSLY in the provider's render (NOT an effect) — a child (Bigsail) reads it during its own render, which runs before the parent's effects fire. Bigsail consumes it to play the restore-loading sequence instead of flashing empty.",
        filePath: "frontend/src/shell/SessionContext.tsx",
      },
    ],
    flow: [
      { from: "tables", to: "jsonb-columns", label: "on sessions" },
      { from: "jsonb-columns", to: "merge-on-write", label: "save" },
      { from: "jsonb-columns", to: "schema-version", label: "load guard" },
      { from: "tables", to: "rls", label: "access control" },
    ],
  },

  // ───────────────────────── DEPLOY & OPS ─────────────────────────
  deploy: {
    parts: [
      {
        id: "fly-config",
        label: "fly.toml (backend)",
        kind: "config",
        detail:
          "app aether-ab-api, region sjc, internal PORT 8080, force_https, auto_stop=stop + auto_start=true, health check GET /api/health (30s/5s/10s grace). Secrets (Supabase service-role, provider keys, Unsplash) live in Fly secrets, never in code.",
        filePath: "backend/fly.toml",
      },
      {
        id: "min-machines",
        label: "min_machines_running=1",
        kind: "guard",
        detail:
          "With min=0, Fly scaled to zero and cold-started mid-request, returning a 502 from the Fly proxy BEFORE the app ran (misdiagnosed as 'payload too large'). min=1 keeps one machine warm and closes the window.",
        filePath: "backend/fly.toml",
      },
      {
        id: "smoke-test",
        label: "deploy via bun run deploy",
        kind: "guard",
        detail:
          "`bun run deploy` runs a smoke test that boots the app in the prod image and asserts the health route BEFORE promoting — catching misconfigs. A bare `fly deploy` skips that. To recover a down prod, redeploy the last-good image.",
        filePath: "backend/smoke.test.ts",
      },
      {
        id: "vercel-frontend",
        label: "Vercel (frontend)",
        kind: "config",
        detail:
          "Frontend deploys to Vercel (project 'aether'), auto-deploys on push to main, root dir frontend/. The backend is separate on Fly and does NOT auto-deploy. Deploy --prod from the REPO ROOT, not frontend/.",
        filePath: "frontend/",
      },
      {
        id: "vercel-dupe",
        label: "Vercel duplicate-project trap",
        kind: "guard",
        detail:
          "The live site once froze on an old bundle because a DUPLICATE 'frontend' Vercel project (root '.', doing no-op 2s builds) hijacked deploys from the real 'aether' project. Fix: delete the dupe and deploy --prod from the repo root.",
        filePath: "frontend/",
      },
      {
        id: "ci-noise",
        label: "CI smoke-502 (noise, not a break)",
        kind: "config",
        detail:
          "Only smoke.spec.ts goes red in CI — the Playwright preview proxy leaks /api calls to a dead backend, throwing 502 console errors. Playwright does NOT gate the Vercel deploy, so it's noise, not a real failure.",
        filePath: "frontend/e2e/smoke.spec.ts",
      },
    ],
    flow: [
      { from: "fly-config", to: "min-machines", label: "keep warm" },
      { from: "fly-config", to: "smoke-test", label: "gate deploy" },
      { from: "vercel-frontend", to: "vercel-dupe", label: "watch out" },
    ],
  },
};

/** Stations that currently have authored mechanics. */
export function hasMechanics(id: StationId): boolean {
  return MECHANICS[id] != null;
}
