import type { StationId } from "./stations";

// WATCH narratives — guided, narrated walk-throughs of a real Aether turn.
// Each step lights up the exact mechanism boxes + wires it involves on the
// diagram, with explanation text. The steps form a TREE (branches for
// conditional / error / self-correction paths) that flattens, pre-order, into a
// linear next/prev slideshow.
//
// Between the narratives, EVERY mechanism box on the diagram is covered by at
// least one step (see narratives.test.ts). `lit.mech` entries are
// "station:boxId" matching data/mechanics.ts; `lit.edges` are [from, to] pairs.

export type StepBranch = "main" | "alt" | "error" | "repair";

export type LitSpec = {
  /** Mechanism boxes to light, as "station:boxId". */
  mech?: string[];
  /** Extra zones to light (boxes' own stations are lit automatically). */
  stations?: StationId[];
  /** Wires (pipes) to light, as [from, to] station pairs. */
  edges?: [StationId, StationId][];
};

export type StepNode = {
  id: string;
  title: string;
  /** What's happening, in plain language. */
  narration: string;
  lit: LitSpec;
  /** Visual/semantic flavour of this node in the tree. */
  branch?: StepBranch;
  children?: StepNode[];
};

export type Narrative = {
  id: string;
  title: string;
  blurb: string;
  steps: StepNode[];
};

export const NARRATIVES: Narrative[] = [
  // ───────────────────────── HAPPY PATH ─────────────────────────
  {
    id: "happy-path",
    title: "A question becomes a dashboard",
    blurb: "One fully successful turn: you ask, tools fire, Bigsail fills in.",
    steps: [
      {
        id: "ask",
        title: "You ask a question",
        branch: "main",
        narration:
          "You type a question in the chat composer and hit enter. This kicks off one full turn — follow it left to right across the machine.",
        lit: { mech: ["frontend:shell", "frontend:providers"], edges: [["frontend", "chat-pipe"]] },
        children: [
          {
            id: "ask-composer",
            title: "The composer",
            branch: "main",
            narration:
              "The Shell's chat column owns the input box. Submitting hands your text to the chat pipe.",
            lit: { mech: ["frontend:shell"] },
          },
          {
            id: "ask-bootstrap",
            title: "Under it all: the data layer",
            branch: "main",
            narration:
              "main.tsx wraps the whole app in the React Query provider — every non-streaming /api call (sessions, models, health) flows through that one client.",
            lit: { mech: ["frontend:main"] },
          },
          {
            id: "ask-providers",
            title: "Providers already mounted",
            branch: "main",
            narration:
              "Every widget state provider sits at the app root from the start, so no SSE payload can arrive before a listener exists — even for a tab you haven't opened.",
            lit: { mech: ["frontend:providers"] },
          },
          {
            id: "ask-url",
            title: "The URL is the source of truth",
            branch: "main",
            narration:
              "useRoute makes the URL drive which capability tab is active; viewPath/viewSlug are the one canonical path builders, so links never drift.",
            lit: { mech: ["frontend:route"] },
          },
          {
            id: "ask-resize",
            title: "↳ If you drag the capability panel",
            branch: "alt",
            narration:
              "react-resizable-panels v4 reads bare numbers as PIXELS — always pass '32%' strings. A bare number opens the panel to an invisible 32px sliver.",
            lit: { mech: ["frontend:rrp-units"] },
          },
          {
            id: "ask-radix",
            title: "↳ If a Radix dropdown loses styling",
            branch: "alt",
            narration:
              "Keep the bracket form data-[state=open]:… — a 'cleanup' to data-state-open matches nothing and silently kills the open-state styling.",
            lit: { mech: ["frontend:tailwind"] },
          },
          {
            id: "ask-welcome",
            title: "↳ If it's your very first visit",
            branch: "alt",
            narration:
              "FirstArrivalWelcome auto-opens — but on DESKTOP only, and on mobile it skips without setting the seen-flag so a later desktop visit still gets it.",
            lit: { mech: ["frontend:first-arrival"] },
          },
        ],
      },
      {
        id: "use-chat",
        title: "useChat opens the stream",
        branch: "main",
        narration: "The chat pipe talks to the backend and reads the streamed reply.",
        lit: { mech: ["chat-pipe:use-chat"], edges: [["chat-pipe", "contract"]] },
        children: [
          {
            id: "uc-post",
            title: "POST /api/chat + SSE reader",
            branch: "main",
            narration:
              "useChat POSTs the FULL conversation to /api/chat and opens an SSE reader for the streamed response.",
            lit: { mech: ["chat-pipe:use-chat"] },
          },
          {
            id: "uc-queue",
            title: "Queue, abort, fresh refs",
            branch: "main",
            narration:
              "Type again mid-stream and it queues; Stop aborts and drains. Callbacks read state via refs so they never go stale. It retries a cold-start 5xx once — but never mid-stream.",
            lit: { mech: ["chat-pipe:queue"] },
          },
          {
            id: "uc-session",
            title: "Shared transcript (SessionContext)",
            branch: "main",
            narration:
              "Message state is lifted into SessionContext so the chat panel and the sidebar read the same transcript; it also owns creating sessions.",
            lit: { mech: ["chat-pipe:session"] },
          },
          {
            id: "uc-epoch",
            title: "↳ If you switch conversations mid-stream",
            branch: "alt",
            narration:
              "Each turn bumps epochRef; updateAssistant no-ops on a stale epoch. That's what stops a previous turn's tokens from bleeding into the new conversation.",
            lit: { mech: ["chat-pipe:epoch"] },
          },
        ],
      },
      {
        id: "wire",
        title: "Across the wire (the contract)",
        branch: "main",
        narration: "Request and response cross the FE↔BE seam using shapes defined exactly once.",
        lit: { mech: ["contract:single-source"], edges: [["contract", "backend"]] },
        children: [
          {
            id: "wire-union",
            title: "The typed SseEvent union",
            branch: "main",
            narration:
              "Every event coming back is a member of one typed union, imported by both packages — a drift on either side is a compile error.",
            lit: { mech: ["contract:sse-union"] },
          },
          {
            id: "wire-specs",
            title: "Render-spec shapes",
            branch: "main",
            narration:
              "The Table/Chart/Timeline/Images spec shapes live here too — the exact JSON the render tools will emit.",
            lit: { mech: ["contract:widget-specs"] },
          },
          {
            id: "wire-plan",
            title: "The composition plan shape",
            branch: "main",
            narration:
              "The planner's output is a CompositionPlan: abstract intents + relationships, deliberately with NO coordinates — it says what to compose, never where.",
            lit: { mech: ["contract:composition-plan"] },
          },
          {
            id: "wire-graph",
            title: "↳ If graph mode is on: GraphPayload",
            branch: "alt",
            narration:
              "Knowledge-graph turns use GraphPayload — additive-merge entities + relationships, never reset.",
            lit: { mech: ["contract:graph-payload"] },
          },
        ],
      },
      {
        id: "backend",
        title: "The backend receives the turn",
        branch: "main",
        narration: "POST /api/chat is the streaming entry point. It sets up the turn, then runs the planner and the loop.",
        lit: { mech: ["backend:chat-route"], edges: [["backend", "planner"]] },
        children: [
          {
            id: "be-own",
            title: "Ownership check",
            branch: "main",
            narration:
              "If the turn will persist, ownership is checked from the X-User-Id header — reads are open, writes are gated.",
            lit: { mech: ["backend:ownership"] },
          },
          {
            id: "be-client",
            title: "Resolve model + build client",
            branch: "main",
            narration:
              "The MODELS allowlist (default Sonnet) is the menu; resolveModel validates the choice and routes to its provider; the Claude client is built lazily with a cached system prompt.",
            lit: { mech: ["providers:allowlist", "providers:resolve", "providers:claude-client"] },
          },
          {
            id: "be-other",
            title: "↳ If you picked Gemini / DeepSeek / Mistral",
            branch: "alt",
            narration:
              "Those three share one OpenAI-compatible client. Gemini even mislabels tool calls with finish_reason 'stop' — Aether keys on tool-call EVENTS, not finish_reason, so it's immune.",
            lit: { mech: ["providers:openai-compat", "providers:gemini"] },
          },
          {
            id: "be-health",
            title: "↳ If a provider is down",
            branch: "alt",
            narration:
              "A cached 1-token health probe filters the model picker. If Claude itself is down, the full picker is shown (degrade, not break).",
            lit: { mech: ["providers:health"] },
          },
        ],
      },
      {
        id: "planner",
        title: "The Planner pre-pass (Haiku)",
        branch: "main",
        narration: "Before the main model runs, a cheap Haiku pass decides how to shape the turn.",
        lit: { mech: ["planner:model"], edges: [["planner", "agent-loop"]] },
        children: [
          {
            id: "pl-gates",
            title: "Cheap gates",
            branch: "main",
            narration:
              "mightNeedPlan / mightClarify pre-filter the turn so the planner call is only spent when it's worth it.",
            lit: { mech: ["planner:gates"] },
          },
          {
            id: "pl-context",
            title: "Sees the last 6 messages",
            branch: "main",
            narration:
              "Given only the latest message the planner misjudges, so it's fed the 6 trailing messages plus the latest.",
            lit: { mech: ["planner:context"] },
          },
          {
            id: "pl-plan",
            title: "Returns a composition plan",
            branch: "main",
            narration:
              "Here it returns { kind: 'plan' }, emitted over the SSE `plan` event for Bigsail to read.",
            lit: { mech: ["planner:plan-turn"] },
          },
          {
            id: "pl-clarify",
            title: "↳ If ambiguous: clarify, then plan",
            branch: "alt",
            narration:
              "Too thin? The planner emits a clarify question and STOPS — no loop this turn. Your next reply returns clarified=true, which bypasses the length gate and always plans.",
            lit: { mech: ["planner:gates", "planner:clarified"] },
          },
        ],
      },
      {
        id: "loop",
        title: "The Agent Loop begins",
        branch: "main",
        narration: "runAgentLoop drives the conversation model. It's hand-rolled and provider-agnostic.",
        lit: { mech: ["agent-loop:premise"], edges: [["agent-loop", "providers"]] },
        children: [
          {
            id: "loop-normalize",
            title: "WireAdapter → LoopEvents",
            branch: "main",
            narration:
              "A thin WireAdapter normalizes the provider's stream into a small LoopEvent union (text · tool_start/delta · usage · stop). The loop never names a provider.",
            lit: { mech: ["agent-loop:wire-adapter", "agent-loop:loop-event"] },
          },
          {
            id: "loop-iter",
            title: "Iterate (cap 6)",
            branch: "main",
            narration:
              "It loops until the model stops calling tools, up to 6 iterations; the final iteration strips tools to force a text answer so a turn always terminates.",
            lit: { mech: ["agent-loop:iteration"] },
          },
          {
            id: "loop-cache",
            title: "Prompt caching",
            branch: "main",
            narration:
              "On iterations 2+, the conversation prefix is read from Claude's ephemeral cache instead of being re-billed at full rate.",
            lit: { mech: ["providers:claude-client"] },
          },
        ],
      },
      {
        id: "tool",
        title: "The model calls a render tool",
        branch: "main",
        narration: "The model decides the best answer is a table and calls render_table.",
        lit: { mech: ["tools:render-passthrough"], edges: [["agent-loop", "tools"]] },
        children: [
          {
            id: "tool-pass",
            title: "Render tools are pass-throughs",
            branch: "main",
            narration:
              "render_table does no work — it returns JSON.stringify(input). So the tool's result IS the model's spec, which IS the widget.",
            lit: { mech: ["tools:render-passthrough"] },
          },
          {
            id: "tool-stream",
            title: "It's in the streamable set",
            branch: "main",
            narration:
              "Because render tools are streamable, their input JSON is forwarded as it arrives — the basis for progressive paint.",
            lit: { mech: ["tools:streamable-set"] },
          },
          {
            id: "tool-data",
            title: "↳ If it needs real data first",
            branch: "alt",
            narration:
              "The model can call data tools (wikidata, world_bank, wikipedia, openalex). Those aren't streamable — their result comes from a fetch, not the model's text.",
            lit: { mech: ["tools:data-tools"] },
          },
          {
            id: "tool-graph",
            title: "↳ If it builds a knowledge graph",
            branch: "alt",
            narration:
              "build_knowledge_graph (graph mode only) merges entities additively; each entity's icon must come from the curated ICON_VOCABULARY or the frontend silently drops it.",
            lit: { mech: ["tools:graph-tool", "tools:icons"] },
          },
          {
            id: "tool-images",
            title: "↳ If the answer is images",
            branch: "alt",
            narration:
              "search_images merges Wikimedia + Unsplash, but Unsplash is capped at 6 searches per conversation, then silently falls back to Wikimedia-only.",
            lit: { mech: ["tools:images"] },
          },
        ],
      },
      {
        id: "stream",
        title: "Progressive paint over SSE",
        branch: "main",
        narration: "The streaming spec heads back to the browser as typed events.",
        lit: { mech: ["sse:partial"], edges: [["tools", "sse"]] },
        children: [
          {
            id: "sse-emit",
            title: "Typed emitter",
            branch: "main",
            narration:
              "createSseEmitter writes one typed `data:` line per event — a typo in an event name is a compile error.",
            lit: { mech: ["sse:emitter"] },
          },
          {
            id: "sse-union2",
            title: "The event vocabulary",
            branch: "main",
            narration:
              "text · tool_start · tool_partial · tool_result · status · loop_start · plan · clarify · persisted · warning · error — the union both sides share.",
            lit: { mech: ["sse:union"] },
          },
          {
            id: "sse-frame",
            title: "Line framing",
            branch: "main",
            narration:
              "One event per line; the reader buffers a partial trailing line so an event split across chunks still parses.",
            lit: { mech: ["sse:framing"] },
          },
          {
            id: "sse-partial",
            title: "tool_partial throttle",
            branch: "main",
            narration:
              "The growing tool-input JSON streams as tool_partial events, throttled to ~one frame per 120 ms.",
            lit: { mech: ["sse:partial"] },
          },
        ],
      },
      {
        id: "widgets",
        title: "Widgets receive the spec",
        branch: "main",
        narration: "The frontend routes events into the widget layer.",
        lit: { mech: ["widgets:streaming-entries"], edges: [["sse", "widgets"]] },
        children: [
          {
            id: "w-parse",
            title: "parseSseChunk routes events",
            branch: "main",
            narration:
              "It checks the raw [DONE] before JSON.parse, then dispatches each typed event to the right handler.",
            lit: { mech: ["chat-pipe:parse"] },
          },
          {
            id: "w-registry",
            title: "Renderer registry",
            branch: "main",
            narration:
              "Each widget registered a renderer at import time, keyed by type. The column hands a descriptor to the matching renderer; the shell never knows what's inside.",
            lit: { mech: ["widgets:registry"] },
          },
          {
            id: "w-catalog",
            title: "Capability catalog",
            branch: "main",
            narration:
              "The fixed chip set — Tiles, Knowledge Graph, Table, Chart, Timeline, Images — lives in the catalog; every capability is always present.",
            lit: { mech: ["widgets:catalog"] },
          },
          {
            id: "w-upsert",
            title: "Upsert in place",
            branch: "main",
            narration:
              "useStreamingEntries upserts one streaming entry in place as partials arrive and finalizes it on tool_result.",
            lit: { mech: ["widgets:streaming-entries"] },
          },
          {
            id: "w-dedup",
            title: "title-merge de-dup",
            branch: "main",
            narration:
              "If a fresh slot's title matches an existing entry, it retargets onto it instead of appending a duplicate.",
            lit: { mech: ["widgets:title-merge"] },
          },
          {
            id: "w-parsers",
            title: "↳ If a spec comes back malformed",
            branch: "alt",
            narration:
              "Defensive parsers (parseTableSpec etc.) return null on bad data so a widget can't crash; recreation prompts are backfilled via /repair-prompts on load.",
            lit: { mech: ["widgets:parsers"] },
          },
          {
            id: "w-unseen",
            title: "Unseen chip glow",
            branch: "main",
            narration:
              "The capability store flags the tab unseen, so its chip glows until you open it.",
            lit: { mech: ["widgets:capability-provider"] },
          },
        ],
      },
      {
        id: "bigsail",
        title: "Bigsail assembles the canvas",
        branch: "main",
        narration: "Home base — the Tiles canvas — mirrors every spec as a draggable card.",
        lit: { mech: ["bigsail:widget-root"], edges: [["widgets", "bigsail"]] },
        children: [
          {
            id: "bs-plan",
            title: "It already had the plan",
            branch: "main",
            narration:
              "BigsailPlanProvider stored the composition plan at root, so Bigsail knew how many cards to expect before any data landed.",
            lit: { mech: ["bigsail:plan-provider"] },
          },
          {
            id: "bs-busy",
            title: "The busy bus (replay:true)",
            branch: "main",
            narration:
              "Bigsail mounts mid-turn, so it subscribes to useAgentBusy with { replay: true } — otherwise it lands busy=false and never plays the gathering animation.",
            lit: { mech: ["chat-pipe:busy"] },
          },
          {
            id: "bs-load",
            title: "Skeletons → real, in place",
            branch: "main",
            narration:
              "Skeletons appeared in real grid slots; each is now replaced in place by its live widget. Every planned card executes.",
            lit: { mech: ["bigsail:loading-contract"] },
          },
          {
            id: "bs-dom",
            title: "GridStack owns the DOM",
            branch: "main",
            narration:
              "GridStack owns grid-item positions imperatively; React only portals content into its nodes.",
            lit: { mech: ["bigsail:gridstack-ownership"] },
          },
          {
            id: "bs-twosys",
            title: "↳ If you'd saved a layout",
            branch: "alt",
            narration:
              "The streaming template packs cards ONLY on the first build. After that, vanilla gravity honors your saved positions verbatim — the template never re-runs and yanks cards.",
            lit: { mech: ["bigsail:two-systems"] },
          },
        ],
      },
      {
        id: "persist",
        title: "[DONE] and persist",
        branch: "main",
        narration: "The stream ends and the turn is saved.",
        lit: { mech: ["persistence:tables"], edges: [["bigsail", "persistence"]] },
        children: [
          {
            id: "p-done",
            title: "The [DONE] sentinel",
            branch: "main",
            narration:
              "A raw `data: [DONE]` (not JSON) is sent AFTER the persisted events and ends the client's read loop.",
            lit: { mech: ["sse:done"] },
          },
          {
            id: "p-save",
            title: "Save messages",
            branch: "main",
            narration:
              "The user + assistant messages are written to Supabase; the session auto-titles from the first message.",
            lit: { mech: ["persistence:tables"] },
          },
          {
            id: "p-jsonb",
            title: "Who owns each jsonb column",
            branch: "main",
            narration:
              "graph_data / widget_data / ui_state are frontend-owned; image_data is backend-owned (the Unsplash counter), kept separate to avoid a read-then-write race.",
            lit: { mech: ["persistence:jsonb-columns"] },
          },
          {
            id: "p-merge",
            title: "Merge-on-write",
            branch: "main",
            narration:
              "The widget snapshot merges — an absent field keeps the stored value, so a mid-stream blip can't wipe your work.",
            lit: { mech: ["persistence:merge-on-write"] },
          },
          {
            id: "p-version",
            title: "schemaVersion stamp",
            branch: "main",
            narration:
              "Each persisted blob carries a per-tool schemaVersion; on load, a shape guard heals stale stamps rather than wiping data.",
            lit: { mech: ["persistence:schema-version"] },
          },
          {
            id: "p-bridge",
            title: "WidgetPersistenceBridge",
            branch: "main",
            narration:
              "On the frontend it loads/saves the widget_data column and self-heals — an empty field persists lastGood instead of null.",
            lit: { mech: ["persistence:widget-bridge"] },
          },
        ],
      },
      {
        id: "done",
        title: "Answer delivered",
        branch: "main",
        narration: "Your question is now a live dashboard — one full, successful turn end to end.",
        lit: { mech: ["bigsail:card-back"] },
        children: [
          {
            id: "done-flip",
            title: "Flip + regenerate",
            branch: "main",
            narration:
              "Flip any card to see its JSON spec and an editable recreation prompt; Regenerate rebuilds that card in place.",
            lit: { mech: ["bigsail:card-back"] },
          },
        ],
      },
    ],
  },

  // ───────────────────────── SELF-REPAIR ─────────────────────────
  {
    id: "self-repair",
    title: "When the JSON breaks, it heals",
    blurb: "A turn that hits a truncated tool spec and an empty result — and recovers from both.",
    steps: [
      {
        id: "ask-big",
        title: "A huge 'compare everything' question",
        branch: "main",
        narration:
          "You ask for a sprawling comparison — this turn is going to push the model's output budget.",
        lit: { mech: ["frontend:shell"], edges: [["frontend", "chat-pipe"]] },
        children: [
          {
            id: "sr-plan",
            title: "Planner plans several widgets",
            branch: "main",
            narration: "The Haiku planner sizes it up and returns a plan with multiple wide widgets.",
            lit: { mech: ["planner:model", "planner:gates"] },
          },
        ],
      },
      {
        id: "loop-big",
        title: "The loop streams a giant table",
        branch: "main",
        narration: "The agent loop runs the model, which starts emitting a render_table with hundreds of rows.",
        lit: { mech: ["agent-loop:premise"], edges: [["agent-loop", "tools"]] },
        children: [
          {
            id: "sr-stream",
            title: "Streaming the spec",
            branch: "main",
            narration: "The big render_table input streams as tool_partial events, painting as it goes.",
            lit: { mech: ["agent-loop:loop-event", "providers:claude-client"] },
          },
        ],
      },
      {
        id: "cutoff",
        title: "max_tokens cuts it off",
        branch: "error",
        narration:
          "Mid-spec, the model hits its output budget. The tool-input JSON is now truncated and unparseable — naively the whole turn would throw.",
        lit: { mech: ["agent-loop:iteration", "agent-loop:salvage"] },
        children: [
          {
            id: "sr-salvage",
            title: "↳ bestEffort salvage",
            branch: "repair",
            narration:
              "closeTruncatedJson rewinds to the last clean element and rebalances the open brackets; parseBestEffort turns it into valid JSON.",
            lit: { mech: ["agent-loop:salvage", "sse:salvage"] },
          },
          {
            id: "sr-emit",
            title: "↳ Final partial + soft status",
            branch: "repair",
            narration:
              "The loop emits the salvaged spec as a final tool_partial with a soft status — 'that ran long, showing what came through' — instead of a hard error.",
            lit: { mech: ["sse:partial"], edges: [["agent-loop", "sse"]] },
          },
          {
            id: "sr-paint",
            title: "↳ The widget paints what survived",
            branch: "repair",
            narration:
              "The table renders the rows that made it through. The system prompt asks for the most important rows first, so you lose the tail — not the headline.",
            lit: { mech: ["widgets:streaming-entries", "bigsail:widget-root"], edges: [["sse", "widgets"]] },
          },
        ],
      },
      {
        id: "empty-tool",
        title: "A second tool returns empty",
        branch: "error",
        narration:
          "On another tool call in the same turn, the result comes back degenerate — empty rows. Left alone, you'd get a blank widget.",
        lit: { mech: ["tools:degeneracy"] },
        children: [
          {
            id: "sr-correct",
            title: "↳ correctionDirective appended",
            branch: "repair",
            narration:
              "A directive is appended — 'broaden the search, switch capability, or say there's nothing to show' — and fed back to the model.",
            lit: { mech: ["tools:degeneracy"] },
          },
          {
            id: "sr-retry",
            title: "↳ Retry once (MAX_CORRECTIONS=1)",
            branch: "repair",
            narration:
              "The loop retries just that tool once. This time it returns real data, and the turn continues.",
            lit: { mech: ["agent-loop:iteration"] },
          },
        ],
      },
      {
        id: "still-ok",
        title: "The turn still finishes cleanly",
        branch: "main",
        narration:
          "Despite a truncation and an empty result, the canvas fills and persists — every failure had a graceful degrade.",
        lit: { mech: ["bigsail:widget-root"], edges: [["bigsail", "persistence"]] },
        children: [
          {
            id: "sr-fill",
            title: "Canvas fills anyway",
            branch: "main",
            narration:
              "Bigsail replaces skeletons with whatever each card managed to produce — nothing is left spinning.",
            lit: { mech: ["bigsail:loading-contract"] },
          },
          {
            id: "sr-persist",
            title: "Persisted with merge-on-write",
            branch: "main",
            narration:
              "The salvaged + corrected widgets persist; merge-on-write keeps any prior data the turn didn't touch.",
            lit: { mech: ["persistence:merge-on-write"] },
          },
        ],
      },
    ],
  },

  // ───────────────────── WHERE IT LIVES & SHIPS ─────────────────────
  {
    id: "infra",
    title: "Where it lives & how it ships",
    blurb: "The other half: hosting, deploy gotchas, and loading a saved conversation.",
    steps: [
      {
        id: "two-homes",
        title: "Two homes, two runtimes",
        branch: "main",
        narration:
          "The single most important architectural fact: the two halves run in two different places.",
        lit: { mech: ["deploy:vercel-frontend", "deploy:fly-config"] },
        children: [
          {
            id: "inf-vercel",
            title: "Frontend → Vercel",
            branch: "main",
            narration:
              "The static React build is served at Vercel's edge and auto-deploys on every push to main. Deploy --prod from the REPO ROOT, not frontend/.",
            lit: { mech: ["deploy:vercel-frontend"] },
          },
          {
            id: "inf-fly",
            title: "Backend → Fly",
            branch: "main",
            narration:
              "The Hono server runs on Bun on Fly (region sjc), behind /api. It holds all the secrets — that's the whole reason the backend exists.",
            lit: { mech: ["deploy:fly-config"] },
          },
        ],
      },
      {
        id: "keep-up",
        title: "Keeping it healthy",
        branch: "main",
        narration: "A few ops gotchas that each cost real debugging time once.",
        lit: { mech: ["deploy:min-machines"] },
        children: [
          {
            id: "inf-coldstart",
            title: "↳ If it scaled to zero (the 502)",
            branch: "error",
            narration:
              "min_machines_running=0 let Fly cold-start mid-request and return a 502 from the proxy before the app ran. Setting it to 1 keeps one machine warm and closes the window.",
            lit: { mech: ["deploy:min-machines"] },
          },
          {
            id: "inf-smoke",
            title: "Ship behind a smoke test",
            branch: "main",
            narration:
              "`bun run deploy` boots the app in the prod image and asserts the health route BEFORE promoting — a bare `fly deploy` skips that.",
            lit: { mech: ["deploy:smoke-test"] },
          },
          {
            id: "inf-dupe",
            title: "↳ If a duplicate Vercel project exists",
            branch: "alt",
            narration:
              "A stray second 'frontend' project (root '.') once hijacked deploys with no-op builds, freezing the site on an old bundle. Delete the dupe.",
            lit: { mech: ["deploy:vercel-dupe"] },
          },
          {
            id: "inf-ci",
            title: "↳ If CI's smoke spec is red",
            branch: "alt",
            narration:
              "smoke.spec.ts throws 502s because the preview proxy hits a dead backend. Playwright doesn't gate the deploy — it's noise, not a break.",
            lit: { mech: ["deploy:ci-noise"] },
          },
        ],
      },
      {
        id: "load-saved",
        title: "Opening a saved conversation",
        branch: "main",
        narration: "Not every interaction is a chat turn — loading the sidebar and a past session is its own path.",
        lit: { mech: ["backend:sessions-routes"], edges: [["persistence", "backend"]] },
        children: [
          {
            id: "inf-list",
            title: "List + open sessions",
            branch: "main",
            narration:
              "The sidebar lists a user's sessions (GET /api/sessions?userId); clicking one loads its row. Create / patch / delete / fork live here too.",
            lit: { mech: ["backend:sessions-routes"] },
          },
          {
            id: "inf-sub",
            title: "Load the sub-resources",
            branch: "main",
            narration:
              "Messages, graph and widgets each load from their own per-session sub-resource endpoint.",
            lit: { mech: ["backend:subresources"] },
          },
          {
            id: "inf-etag",
            title: "Cheap re-reads (ETag/304)",
            branch: "main",
            narration:
              "Read endpoints emit an ETag; re-opening an unchanged session returns 304 Not Modified with no body.",
            lit: { mech: ["backend:etag"] },
          },
          {
            id: "inf-cold",
            title: "↳ If you deep-link straight to /c/:id",
            branch: "alt",
            narration:
              "consumeColdUrlLoad is set synchronously in render (not an effect) so Bigsail, reading it during its own render, replays the restore-loading sequence instead of flashing empty.",
            lit: { mech: ["persistence:cold-url-load"] },
          },
          {
            id: "inf-bridge",
            title: "Rehydrate the widgets",
            branch: "main",
            narration:
              "WidgetPersistenceBridge GETs the snapshot and applies each field defensively, retrying once on a cold start.",
            lit: { mech: ["persistence:widget-bridge"] },
          },
        ],
      },
      {
        id: "storage",
        title: "Storage & security",
        branch: "main",
        narration: "How the rows are laid out and locked down.",
        lit: { mech: ["persistence:jsonb-columns"] },
        children: [
          {
            id: "inf-jsonb",
            title: "jsonb column ownership",
            branch: "main",
            narration:
              "Sessions store graph/widget/ui state as jsonb the backend round-trips opaquely; image_data is the one column the backend writes itself.",
            lit: { mech: ["persistence:jsonb-columns"] },
          },
          {
            id: "inf-rls",
            title: "RLS lockdown",
            branch: "main",
            narration:
              "sessions/messages have RLS on with no anon policy — the backend MUST use the service-role key, and RLS was enabled only AFTER it did, or the live app would have seen zero rows.",
            lit: { mech: ["persistence:rls"] },
          },
        ],
      },
    ],
  },
];

export type FlatStep = {
  node: StepNode;
  depth: number;
  /** Ancestor node ids (for collapse logic). */
  path: string[];
};

/** Pre-order flatten of a narrative's step tree into a linear sequence. */
export function flattenSteps(steps: StepNode[]): FlatStep[] {
  const out: FlatStep[] = [];
  const walk = (arr: StepNode[], depth: number, path: string[]) => {
    for (const n of arr) {
      out.push({ node: n, depth, path });
      if (n.children?.length) walk(n.children, depth + 1, [...path, n.id]);
    }
  };
  walk(steps, 0, []);
  return out;
}
