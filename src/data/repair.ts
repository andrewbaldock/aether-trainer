import { STATION_BY_ID, type StationId } from "./stations";

// REPAIR mode geometry + placement.
//
// The board is the CPTRK mental model made physical: five verb COLUMNS
// (Capture · Plan · Think · Render · Keep) crossed by a FRONTEND (top) /
// BACKEND (bottom) split, with THE CONTRACT as a band across the very top —
// the one part that belongs to no single column because every column is typed
// against it. The player drags each of the 13 stations into its dotted slot.

export type ChunkId = "capture" | "plan" | "think" | "render" | "keep";
export type Side = "fe" | "be" | "seam";

export const CHUNKS: { id: ChunkId; label: string; color: string }[] = [
  { id: "capture", label: "Capture", color: "#7fd4e0" },
  { id: "plan", label: "Plan", color: "#b08fe0" },
  { id: "think", label: "Think", color: "#e08b4f" },
  { id: "render", label: "Render", color: "#5fe3a1" },
  { id: "keep", label: "Keep", color: "#c08a3e" },
];
export const CHUNK_ORDER: ChunkId[] = CHUNKS.map((c) => c.id);

export type Placement = {
  station: StationId;
  chunk: ChunkId;
  /** "fe" / "be" rows, or "seam" — the Contract rail dividing them. */
  side: Side;
  /** Vertical position within its grid cell (0 = top). */
  order: number;
};

// Each of the 13 stations → (verb column, FE/BE side, stack order).
// `contract` is the lone seam piece — it lives on the FE↔BE boundary, the wire
// both halves are typed against, so it isn't in any verb column.
export const PLACEMENTS: Placement[] = [
  { station: "contract", chunk: "plan", side: "seam", order: 0 },
  { station: "frontend", chunk: "capture", side: "fe", order: 0 },
  { station: "chat-pipe", chunk: "capture", side: "fe", order: 1 },
  { station: "backend", chunk: "plan", side: "be", order: 0 },
  { station: "planner", chunk: "plan", side: "be", order: 1 },
  { station: "agent-loop", chunk: "think", side: "be", order: 0 },
  { station: "providers", chunk: "think", side: "be", order: 1 },
  { station: "tools", chunk: "think", side: "be", order: 2 },
  { station: "widgets", chunk: "render", side: "fe", order: 0 },
  { station: "bigsail", chunk: "render", side: "fe", order: 1 },
  { station: "sse", chunk: "render", side: "be", order: 0 },
  { station: "persistence", chunk: "keep", side: "be", order: 0 },
  { station: "deploy", chunk: "keep", side: "be", order: 1 },
];

export const PLACEMENT_BY_STATION = Object.fromEntries(
  PLACEMENTS.map((p) => [p.station, p]),
) as Record<StationId, Placement>;

export const REPAIR_STATIONS: StationId[] = PLACEMENTS.map((p) => p.station);

// ── Geometry (flow coordinates) ────────────────────────────────────────────
const PAD_L = 104; // left gutter (holds FE/BE row labels)
const PAD_T = 60;
const COL_W = 256;
const COL_GAP = 28;
const SLOT_W = 220;
const SLOT_H = 66;
const SLOT_GAP_Y = 14;
const SLOT_STEP = SLOT_H + SLOT_GAP_Y;
const VERB_H = 34; // top strip holding the verb-column labels
const VERB_TO_FE = 14;
const SEAM_H = SLOT_H + 30; // the contract rail: a slot with padding above/below
const ROW_TO_SEAM = 16; // gap between a row and the seam
const CELL_TOP = 18;
const CELL_BOT = 20;

const FE_ROWS = 2; // max parts stacked in a frontend cell (Capture / Render)
const BE_ROWS = 3; // max parts stacked in a backend cell (Think)
const FE_ROW_H = CELL_TOP + FE_ROWS * SLOT_H + (FE_ROWS - 1) * SLOT_GAP_Y + CELL_BOT;
const BE_ROW_H = CELL_TOP + BE_ROWS * SLOT_H + (BE_ROWS - 1) * SLOT_GAP_Y + CELL_BOT;

export const BOARD_W = COL_W * 5 + COL_GAP * 4;
// Vertical stack: verb labels → FRONTEND row → THE CONTRACT seam → BACKEND row.
const VERB_Y = PAD_T;
const FE_Y = VERB_Y + VERB_H + VERB_TO_FE;
const SEAM_Y = FE_Y + FE_ROW_H + ROW_TO_SEAM;
const BE_Y = SEAM_Y + SEAM_H + ROW_TO_SEAM;
export const BOARD_BOTTOM = BE_Y + BE_ROW_H;
export const BOARD_RIGHT = PAD_L + BOARD_W;

export const PART_W = SLOT_W;
export const PART_H = SLOT_H;
export const SNAP_DIST = 92;

function colX(chunk: ChunkId): number {
  return PAD_L + CHUNK_ORDER.indexOf(chunk) * (COL_W + COL_GAP);
}

export type Rect = { x: number; y: number; w: number; h: number };

/** The dotted target slot for a station. */
export function slotRect(station: StationId): Rect {
  const p = PLACEMENT_BY_STATION[station];
  if (p.side === "seam") {
    // Centered on the contract rail dividing FE and BE.
    return {
      x: PAD_L + (BOARD_W - SLOT_W) / 2,
      y: SEAM_Y + (SEAM_H - SLOT_H) / 2,
      w: SLOT_W,
      h: SLOT_H,
    };
  }
  const rowY = p.side === "fe" ? FE_Y : BE_Y;
  return {
    x: colX(p.chunk) + (COL_W - SLOT_W) / 2,
    y: rowY + CELL_TOP + p.order * SLOT_STEP,
    w: SLOT_W,
    h: SLOT_H,
  };
}

export const SLOT_RECTS = Object.fromEntries(
  REPAIR_STATIONS.map((s) => [s, slotRect(s)]),
) as Record<StationId, Rect>;

/** The contract seam: a thin rail crossing all columns, between FE and BE. */
export const CONTRACT_SEAM: Rect = {
  x: PAD_L,
  y: SEAM_Y,
  w: BOARD_W,
  h: SEAM_H,
};

/** One tinted vertical strip per verb column, spanning the FE+seam+BE rows. */
export const COLUMN_RECTS = CHUNKS.map((c) => ({
  ...c,
  rect: {
    x: colX(c.id),
    y: FE_Y - 12,
    w: COL_W,
    h: BOARD_BOTTOM - (FE_Y - 12) + 12,
  } as Rect,
  /** Where the verb label floats, in the strip above the FE row. */
  labelX: colX(c.id),
  labelY: VERB_Y,
  labelW: COL_W,
}));

/** FRONTEND / BACKEND labels in the left gutter. */
export const ROW_LABELS = [
  { text: "Frontend", sub: "browser", color: STATION_BY_ID.frontend.color, x: 6, y: FE_Y + 8, w: 90 },
  { text: "Backend", sub: "server", color: STATION_BY_ID.backend.color, x: 6, y: BE_Y + 8, w: 90 },
];
