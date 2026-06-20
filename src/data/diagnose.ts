import type { StationId } from "./stations";

// DIAGNOSE deck: a symptom appears, the player clicks the STATION responsible.
// Each symptom is drawn from a real Aether gotcha. `answer` is the station that
// owns the fix; `explanation` is shown after answering (right or wrong).

export type Symptom = {
  id: string;
  symptom: string;
  answer: StationId;
  explanation: string;
  /** Optional related card to study after. */
  cardId?: string;
};

export const SYMPTOMS: Symptom[] = [
  {
    id: "sym-no-skeletons",
    symptom:
      "On the first question of a brand-new conversation, the Bigsail canvas shows no gathering animation and no skeletons — it just sits empty until widgets pop in.",
    answer: "chat-pipe",
    explanation:
      "useAgentBusy must subscribe with { replay: true }. A consumer that mounts mid-turn (Bigsail) otherwise lands busy=false and never plays the loading anim.",
    cardId: "cp-use-agent-busy",
  },
  {
    id: "sym-gemini-early-exit",
    symptom:
      "When the conversation model is Gemini, turns that should call render tools exit early as if the model just said 'stop' — no widgets appear.",
    answer: "providers",
    explanation:
      "Gemini's OpenAI-compat layer mislabels streamed tool_calls as finish_reason 'stop'. The loop must key on tool-call EVENT presence, not finish_reason.",
    cardId: "pr-gemini-finish-reason",
  },
  {
    id: "sym-capability-sliver",
    symptom:
      "The capability column resizes to a tiny sliver — passing the saved size to the panel doesn't restore the right width.",
    answer: "frontend",
    explanation:
      "react-resizable-panels v4 reads bare numbers as PIXELS, not percent. Pass '32%' strings, not 32.",
    cardId: "fe-rrp-units",
  },
  {
    id: "sym-502-coldstart",
    symptom:
      "After the app sits idle, the very next chat turn returns a 502 from the proxy before the app even responds.",
    answer: "deploy",
    explanation:
      "Fly scale-to-zero (min_machines_running=0) cold-started mid-request. Set min_machines_running=1 to keep one machine warm.",
    cardId: "dp-min-machines",
  },
  {
    id: "sym-stale-stream-bleed",
    symptom:
      "You switch conversations mid-stream and the previous turn's tokens start appearing in the new conversation's assistant message.",
    answer: "chat-pipe",
    explanation:
      "The epoch guard prevents this: each turn bumps epochRef and updateAssistant no-ops if the epoch is stale. A bleed means the guard isn't being checked.",
    cardId: "cp-epoch-guard",
  },
  {
    id: "sym-widget-wiped",
    symptom:
      "A widget rebuild fails halfway, and afterward the saved widget data for that capability is gone entirely.",
    answer: "persistence",
    explanation:
      "mergeWidgetSnapshot must keep the stored array when the incoming field is null/absent (unless reset=true). Replace-on-write would null the field on a clears-then-fails timing bug.",
    cardId: "ps-merge-on-write",
  },
  {
    id: "sym-load-discards",
    symptom:
      "After bumping a widget's schema, every saved session loads empty and throws a 'stale data discarded' toast — even though the shape is fine.",
    answer: "persistence",
    explanation:
      "schemaVersion mismatch must NOT discard — the shape guard is the only gate. A mismatch should heal (re-save), not wipe. Likely the version is gating discard.",
    cardId: "ps-schema-version",
  },
  {
    id: "sym-rls-empty",
    symptom:
      "Right after enabling RLS, the live app suddenly shows zero sessions for everyone, as if the database emptied.",
    answer: "persistence",
    explanation:
      "sessions/messages have no anon policy. The backend must use the service-role key, and RLS must be enabled only AFTER it does — otherwise the anon connection sees nothing.",
    cardId: "ps-rls",
  },
  {
    id: "sym-truncated-widget",
    symptom:
      "A big table widget gets cut off mid-stream by max_tokens, and instead of showing the rows it managed to produce, the whole turn errors out.",
    answer: "agent-loop",
    explanation:
      "The loop should salvage: closeTruncatedJson + parseBestEffort on streamable tools, emitting a final partial if any salvages to valid non-degenerate JSON.",
    cardId: "al-max-tokens-salvage",
  },
  {
    id: "sym-duplicate-widget",
    symptom:
      "Asking a follow-up that re-renders the same table produces TWO identical tables side by side instead of updating the one.",
    answer: "widgets",
    explanation:
      "useStreamingEntries title-merge: a fresh slot whose title matches an existing entry should retarget onto it, not append a sibling.",
    cardId: "wf-title-merge",
  },
  {
    id: "sym-cards-yanked",
    symptom:
      "While you're dragging/resizing a Bigsail card, the whole grid suddenly re-packs and yanks your card to a new spot.",
    answer: "bigsail",
    explanation:
      "The System 1 packing template is re-running in user mode. It must run ONLY on the first build; after that, System 2 (vanilla gravity) honors saved positions verbatim.",
    cardId: "bs-two-systems",
  },
  {
    id: "sym-radix-styles-gone",
    symptom:
      "A Radix dropdown's open-state styling silently stops working after a Tailwind class 'cleanup' — no error, just no styles.",
    answer: "frontend",
    explanation:
      "The data-[state=open] bracket form was rewritten to data-state-open, which matches nothing. Keep the bracket form and verify in built CSS.",
    cardId: "fe-tailwind-data-variant",
  },
  {
    id: "sym-clarify-not-planned",
    symptom:
      "After the planner asks a clarifying question, your short one-word answer comes back as a plain text reply with no widgets — the composition never happens.",
    answer: "planner",
    explanation:
      "A clarified=true turn must bypass the mightNeedPlan length gate and always plan; otherwise the short answer is too brief to trip the gate.",
    cardId: "pl-clarified-forces",
  },
  {
    id: "sym-restore-empty",
    symptom:
      "Opening a deep link directly to /c/:id loads the conversation but Bigsail doesn't play its restore-loading sequence — it flashes empty.",
    answer: "persistence",
    explanation:
      "consumeColdUrlLoad must be set synchronously in the provider's render, not an effect, or the child's render-time read loses the race.",
    cardId: "ps-cold-url-load",
  },
  {
    id: "sym-no-icon",
    symptom:
      "The model picks a perfectly reasonable icon name for a graph entity, but the node renders with no icon at all and no error in the console.",
    answer: "tools",
    explanation:
      "Icon names not in lucide-react are silently discarded by the frontend. That's why the model picks from a curated ICON_VOCABULARY enum.",
    cardId: "tl-icon-vocab",
  },
  {
    id: "sym-frozen-bundle",
    symptom:
      "You push to main and the production site keeps serving an old bundle — your changes never appear, even though the build 'succeeded' in seconds.",
    answer: "deploy",
    explanation:
      "A duplicate Vercel 'frontend' project (root-dir '.') was hijacking deploys with no-op builds. Delete the dupe; deploy from repo root with root-dir frontend/.",
    cardId: "dp-vercel-dupe-trap",
  },
  {
    id: "sym-done-parse-error",
    symptom:
      "The SSE reader throws a JSON parse error at the very end of every stream.",
    answer: "sse",
    explanation:
      "The terminator is the RAW string `data: [DONE]`, not JSON. The reader must check for [DONE] before calling JSON.parse.",
    cardId: "ss-done-sentinel",
  },
  {
    id: "sym-unsplash-stops",
    symptom:
      "Deep into one long conversation, image searches stop returning the glossy stock photos and only show Wikimedia results.",
    answer: "tools",
    explanation:
      "Unsplash is capped at 6 searches per conversation (image_data.unsplashSearches). Past the cap it silently falls back to Wikimedia-only.",
    cardId: "tl-unsplash-cap",
  },
  {
    id: "sym-blank-reprompt",
    symptom:
      "A card's back-face 'recreation prompt' box is blank on a reloaded session, so regenerate has nothing to seed from.",
    answer: "widgets",
    explanation:
      "Recreation prompts live in spec.summary/blurb. On load, missing ones are backfilled via POST /sessions/:id/repair-prompts (Haiku), then re-applied.",
    cardId: "wf-parsers",
  },
  {
    id: "sym-empty-message-fail",
    symptom:
      "An attachments-only turn (image, no text) is saved, but reloading the conversation throws a validation error on that message.",
    answer: "persistence",
    explanation:
      "saveMessage rejects empty content; the assistant route must supply a fallback string so the reloaded turn passes the /api/chat validator.",
    cardId: "ps-no-empty-message",
  },
];

export const SYMPTOM_BY_ID: Record<string, Symptom> = Object.fromEntries(
  SYMPTOMS.map((s) => [s.id, s]),
);
