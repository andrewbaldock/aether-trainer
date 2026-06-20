// The 13 "zones" of the Aether Machine. Each zone is a region of the contraption
// that visibly contains its individual parts (one drawn node per card).
// Coordinates lay the machine out left-to-right along the real data flow:
//   YOU type -> Frontend -> Chat Pipe -> Contract/SSE -> Backend -> Planner
//   -> Agent Loop -> Providers / Tools -> SSE back -> Widgets -> Bigsail
//   -> Persistence, with Deploy/Ops underneath it all.

export type StationId =
  | "frontend"
  | "chat-pipe"
  | "contract"
  | "backend"
  | "planner"
  | "agent-loop"
  | "providers"
  | "tools"
  | "sse"
  | "widgets"
  | "bigsail"
  | "persistence"
  | "deploy";

export type Station = {
  id: StationId;
  /** Short machine-part name shown on the zone. */
  name: string;
  /** One-line role in the flow. */
  tagline: string;
  /** Accent color for glow / meters (hex). */
  color: string;
  /** Top-left position of the zone in flow coordinates. */
  pos: { x: number; y: number };
  /** Zone box size. */
  size: { w: number; h: number };
};

export const STATIONS: Station[] = [
  {
    id: "frontend",
    name: "Frontend Shell",
    tagline: "Provider tree, layout, URL = source of truth",
    color: "#7fd4e0",
    pos: { x: 0, y: 0 },
    size: { w: 360, h: 360 },
  },
  {
    id: "chat-pipe",
    name: "Chat Pipe",
    tagline: "useChat SSE orchestration, epoch guard, queue",
    color: "#5fb0e0",
    pos: { x: 440, y: 0 },
    size: { w: 360, h: 360 },
  },
  {
    id: "contract",
    name: "The Contract",
    tagline: "shared/contract — the single source of truth wire",
    color: "#b08fe0",
    pos: { x: 880, y: 0 },
    size: { w: 360, h: 300 },
  },
  {
    id: "backend",
    name: "Backend Server",
    tagline: "Hono routes, ETag/304, ownership/RLS",
    color: "#d8a657",
    pos: { x: 1320, y: 0 },
    size: { w: 380, h: 480 },
  },
  {
    id: "planner",
    name: "The Planner",
    tagline: "Haiku pre-pass: plan | clarify | null",
    color: "#e0a14f",
    pos: { x: 1780, y: 0 },
    size: { w: 360, h: 300 },
  },
  {
    id: "agent-loop",
    name: "The Agent Loop",
    tagline: "runAgentLoop, WireAdapter, 6-iteration cap",
    color: "#e08b4f",
    pos: { x: 2220, y: 0 },
    size: { w: 400, h: 420 },
  },
  {
    id: "providers",
    name: "LLM Providers",
    tagline: "Model allowlist, Claude vs OpenAI-compat, caching",
    color: "#e06f6f",
    pos: { x: 2700, y: 0 },
    size: { w: 380, h: 420 },
  },
  {
    id: "tools",
    name: "Tools Bench",
    tagline: "base / data / render / graph / web_search",
    color: "#9ad15f",
    pos: { x: 2220, y: 500 },
    size: { w: 480, h: 360 },
  },
  {
    id: "sse",
    name: "SSE Stream-Back",
    tagline: "Line framing, tool_partial, bestEffort salvage",
    color: "#5fd1b0",
    pos: { x: 1780, y: 500 },
    size: { w: 360, h: 360 },
  },
  {
    id: "widgets",
    name: "Widget Factory",
    tagline: "Registry, 5 widgets, state providers, parsers",
    color: "#5fe3a1",
    pos: { x: 1320, y: 580 },
    size: { w: 380, h: 420 },
  },
  {
    id: "bigsail",
    name: "Bigsail Canvas",
    tagline: "GridStack handoff, loading contract, card flip",
    color: "#2fcf86",
    pos: { x: 880, y: 360 },
    size: { w: 360, h: 460 },
  },
  {
    id: "persistence",
    name: "Persistence",
    tagline: "Supabase jsonb, merge-on-write, schemaVersion",
    color: "#c08a3e",
    pos: { x: 440, y: 440 },
    size: { w: 360, h: 380 },
  },
  {
    id: "deploy",
    name: "Deploy & Ops",
    tagline: "Fly min=1, smoke test, Vercel, CI",
    color: "#b5562f",
    pos: { x: 0, y: 440 },
    size: { w: 360, h: 380 },
  },
];

export const STATION_BY_ID: Record<StationId, Station> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
) as Record<StationId, Station>;

export const STATION_IDS: StationId[] = STATIONS.map((s) => s.id);

/** Pipe connections between zones, in real data-flow order (for animated edges + Explain trace). */
export const STATION_FLOW: Array<{ from: StationId; to: StationId }> = [
  { from: "frontend", to: "chat-pipe" },
  { from: "chat-pipe", to: "contract" },
  { from: "contract", to: "backend" },
  { from: "backend", to: "planner" },
  { from: "planner", to: "agent-loop" },
  { from: "agent-loop", to: "providers" },
  { from: "agent-loop", to: "tools" },
  { from: "tools", to: "sse" },
  { from: "sse", to: "widgets" },
  { from: "widgets", to: "bigsail" },
  { from: "bigsail", to: "persistence" },
  { from: "persistence", to: "deploy" },
];
