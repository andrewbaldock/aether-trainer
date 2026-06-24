import { STATIONS, type StationId } from "./stations";

// Detect which stations a piece of text "names", so the machine can trace them
// live. We match station names and a few obvious aliases against the text.
// Pure data + function — importable by the Explain UI, a future search UI, or tests.
const ALIASES: Record<StationId, string[]> = {
  frontend: ["frontend", "provider tree", "app.tsx", "shell", "url"],
  "chat-pipe": ["usechat", "chat pipe", "sse", "epoch", "stream", "queue"],
  contract: ["contract", "wire type", "sseevent", "render spec", "@contract"],
  backend: ["backend", "hono", "route", "endpoint", "etag", "ownership"],
  planner: ["planner", "haiku", "clarify", "plan", "pre-pass", "prepass"],
  "agent-loop": ["agent loop", "runagentloop", "wireadapter", "iteration", "loopevent"],
  providers: ["provider", "model", "claude", "gemini", "deepseek", "mistral", "caching"],
  tools: ["tool", "render_table", "render", "wikidata", "degenerate"],
  sse: ["sse", "tool_partial", "done sentinel", "framing", "besteffort"],
  widgets: ["widget", "registry", "capabilit", "parser", "streamingentries"],
  bigsail: ["bigsail", "gridstack", "skeleton", "card", "tiles", "loading"],
  persistence: ["persist", "supabase", "jsonb", "schemaversion", "merge", "widget_data"],
  deploy: ["deploy", "fly", "vercel", "smoke", "ci", "min_machines"],
};

export function detectStations(text: string): StationId[] {
  const lower = text.toLowerCase();
  // Preserve first-mention order so the trace lights in the order named.
  const firstIndex = new Map<StationId, number>();
  for (const s of STATIONS) {
    let best = Infinity;
    for (const alias of [s.name.toLowerCase(), ...ALIASES[s.id]]) {
      const i = lower.indexOf(alias);
      if (i >= 0 && i < best) best = i;
    }
    if (best < Infinity) firstIndex.set(s.id, best);
  }
  return [...firstIndex.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
}
