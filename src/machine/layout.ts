import type { Node, Edge } from "@xyflow/react";
import { STATIONS, STATION_FLOW, type StationId } from "../data/stations";
import { CARDS_BY_STATION, type Card } from "../data/cards";
import { MECHANICS, type Mechanism } from "../data/mechanics";
import { MECH_KIND_META } from "./mechKinds";

/** One line in a zone's "what's inside" header index. */
export type ZoneContent = { label: string; color: string };

/** The contents index for a station — its mechanism parts, with kind colors. */
function contentsFor(stationId: StationId): ZoneContent[] {
  return (MECHANICS[stationId]?.parts ?? []).map((p) => ({
    label: p.label,
    color: MECH_KIND_META[p.kind].color,
  }));
}

// Build React Flow nodes + edges from the static station data.
// Zones are parent (group) nodes. What sits INSIDE each zone depends on mode:
//   - "parts"     → one flashcard part node per card (Recall mode)
//   - "mechanics" → the station's internal boxes-and-arrows plumbing (Diagnose/Explain)
// Pure — no React, no DOM — so it's unit-testable.

export type InnerMode = "parts" | "mechanics";

export type ZoneNodeData = {
  kind: "zone";
  stationId: StationId;
  name: string;
  tagline: string;
  color: string;
  /** Progress, folded in by Machine. Nodes render from this — they never read useProgress. */
  fluency: number;
  mastered: number;
  /** "What's inside" index, shown in the header across all modes. */
  contents: ZoneContent[];
  /** Pixel height reserved for the header (name + tagline + meter + contents). */
  headerH: number;
};

export type PartNodeData = {
  kind: "part";
  card: Card;
  color: string;
  /** Leitner box for this card, folded in by Machine. */
  box: number;
};

export type MechNodeData = {
  kind: "mech";
  mech: Mechanism;
  stationId: StationId;
  color: string;
  /** Whether the details panel is open (folded in by Machine). */
  expanded: boolean;
  /** Toggle the details panel (injected by Machine). */
  onToggle?: () => void;
};

/** A labeled background band (a runtime column / ops region) drawn behind zones. */
export type BandNodeData = {
  kind: "band";
  label: string;
  sublabel: string;
  color: string;
};

export type MachineNode = Node<
  ZoneNodeData | PartNodeData | MechNodeData | BandNodeData
>;

const PART_W = 150;
const PART_H = 54;
const PART_GAP_X = 14;
const PART_GAP_Y = 14;
const ZONE_PAD_X = 18;

// ── Runtime columns ────────────────────────────────────────────────────────
// Stations live in the column where their code actually runs. Two straddlers
// cross the seam: `contract` (the shared wire) sits over the FE↔BE boundary,
// and `deploy` spans the bottom of both (it hosts both halves).
const FRONTEND_COL: StationId[] = ["frontend", "chat-pipe", "widgets", "bigsail"];
const BACKEND_COL: StationId[] = [
  "backend",
  "planner",
  "agent-loop",
  "providers",
  "tools",
  "sse",
  "persistence",
];
// Bands are WIDE: sections masonry-pack into several section-columns each, so
// the diagram fills horizontal space instead of running tall (portrait fits-to-
// view tiny). Frontend has 4 sections (2 cols); backend has 7 (3 cols).
const SECTION_W = 520; // a single (column) section's width
const FE_SECTION_COLS = 2;
const BE_SECTION_COLS = 3;
const SEC_GAP = 40; // gap between packed sections
const COL_GAP = 110; // gap between the two bands
const BAND_LABEL_H = 52; // clear strip at the top of a band for its title
const CANVAS_PAD = 56;
const BAND_PAD = 26; // how far a band extends past its sections
const STRADDLE_GAP = 64; // gap above/below the straddler sections

const FE_INNER_W = FE_SECTION_COLS * SECTION_W + (FE_SECTION_COLS - 1) * SEC_GAP;
const BE_INNER_W = BE_SECTION_COLS * SECTION_W + (BE_SECTION_COLS - 1) * SEC_GAP;
const FE_BAND_W = FE_INNER_W + BAND_PAD * 2;
const BE_BAND_W = BE_INNER_W + BAND_PAD * 2;

const FE_BAND_X = CANVAS_PAD;
const BE_BAND_X = FE_BAND_X + FE_BAND_W + COL_GAP;
const FE_SEC_X = FE_BAND_X + BAND_PAD; // first FE section column x
const BE_SEC_X = BE_BAND_X + BAND_PAD; // first BE section column x

// Straddlers span both bands (short + wide).
const STRADDLE_X = FE_BAND_X + BAND_PAD;
const STRADDLE_W = BE_BAND_X + BE_BAND_W - BAND_PAD - STRADDLE_X;

// Header = name + tagline + fluency meter, then the "what's inside" index —
// lozenges that wrap INLINE (so the header stays short).
const BASE_HEADER_H = 64;
const CONTENTS_TITLE_H = 18; // the "INSIDE (n)" label row
const CONTENTS_CHIP_H = 24; // height of one wrapped row of chips
const CONTENTS_GAP = 6; // gap between chips
const CONTENTS_PAD = 14; // bottom padding under the list

/** Estimate how many wrapped rows the inline contents chips take. */
function contentsRows(contents: ZoneContent[], innerWidth: number): number {
  const avail = innerWidth - 8;
  let rowW = 0;
  let rows = 1;
  for (const c of contents) {
    const chipW = c.label.length * 6.6 + 30; // dot + padding + border
    if (rowW > 0 && rowW + CONTENTS_GAP + chipW > avail) {
      rows += 1;
      rowW = chipW;
    } else {
      rowW += (rowW > 0 ? CONTENTS_GAP : 0) + chipW;
    }
  }
  return rows;
}

/** Pixel height reserved for a zone's header, including its contents index. */
function headerHeightFor(contents: ZoneContent[], innerWidth: number): number {
  if (contents.length === 0) return BASE_HEADER_H;
  const rows = contentsRows(contents, innerWidth);
  return BASE_HEADER_H + CONTENTS_TITLE_H + rows * CONTENTS_CHIP_H + CONTENTS_PAD;
}

// Mechanics boxes pack into a GRID inside each section (using the section's
// width), so a section stays short and wide instead of one tall column.
const MECH_H = 60; // minimum collapsed height
const MECH_COL_GAP = 16;
const MECH_ROW_GAP = 18;
const MECH_MIN_W = 230; // a box never narrower than this → caps the column count
const MECH_LINE_H = 18; // approx px per wrapped line of detail text
const MECH_DETAIL_PAD = 34; // top divider + bottom padding of the open panel
const MECH_LABEL_LH = 17; // px per wrapped line of the label (it never truncates)
const MECH_ROW2_H = 27; // the kind-tag + filepath + toggle row (incl. row gap)
const MECH_VPAD = 16; // header top + bottom padding

/** Estimated wrapped label line count (labels wrap, never truncate). */
function mechLabelLines(label: string, boxWidth: number): number {
  const labelW = boxWidth - 34 /* badge */ - 22 /* gaps + pad */;
  const charsPerLine = Math.max(8, Math.floor(labelW / 7.2));
  return Math.min(3, Math.max(1, Math.ceil(label.length / charsPerLine)));
}

/** Number of box-columns that fit in a section of the given inner width. */
function mechColsFor(innerWidth: number): number {
  return Math.max(
    1,
    Math.min(4, Math.floor((innerWidth + MECH_COL_GAP) / (MECH_MIN_W + MECH_COL_GAP))),
  );
}

/** Approx extra height the open details panel adds, from the detail length. */
function detailExtraHeight(detail: string, boxWidth: number): number {
  const charsPerLine = Math.max(20, Math.floor((boxWidth - 24) / 6.6));
  const lines = Math.max(1, Math.ceil(detail.length / charsPerLine));
  return lines * MECH_LINE_H + MECH_DETAIL_PAD;
}

/** Collapsed height of a box — grows with its wrapped label. */
function mechCollapsedHeight(mech: Mechanism, boxWidth: number): number {
  const h = MECH_VPAD + mechLabelLines(mech.label, boxWidth) * MECH_LABEL_LH + MECH_ROW2_H;
  return Math.max(MECH_H, h);
}

/** Height of a single mech box given whether it's expanded. */
function mechBoxHeight(mech: Mechanism, expanded: boolean, boxWidth: number): number {
  const base = mechCollapsedHeight(mech, boxWidth);
  return expanded ? base + detailExtraHeight(mech.detail, boxWidth) : base;
}

/** Lay mechanism boxes into a grid; returns per-box rects + the column bottom. */
function layoutMechGrid(
  boxes: Mechanism[],
  stationId: StationId,
  expanded: ReadonlySet<string>,
  innerWidth: number,
  headerH: number,
): { layout: { x: number; y: number; w: number; h: number }[]; bottom: number } {
  const cols = mechColsFor(innerWidth);
  const boxW = (innerWidth - (cols - 1) * MECH_COL_GAP) / cols;
  const layout: { x: number; y: number; w: number; h: number }[] = [];
  let y = headerH;
  for (let i = 0; i < boxes.length; i += cols) {
    const row = boxes.slice(i, i + cols);
    const heights = row.map((m) =>
      mechBoxHeight(m, expanded.has(`mech:${stationId}:${m.id}`), boxW),
    );
    const rowH = Math.max(...heights);
    row.forEach((_, j) => {
      layout.push({
        x: ZONE_PAD_X + j * (boxW + MECH_COL_GAP),
        y,
        w: boxW,
        h: heights[j],
      });
    });
    y += rowH + MECH_ROW_GAP;
  }
  const bottom = (boxes.length ? y - MECH_ROW_GAP : headerH) + ZONE_PAD_X;
  return { layout, bottom };
}

/** How many part columns fit in a zone of the given inner width. */
function colsFor(innerWidth: number): number {
  return Math.max(1, Math.floor((innerWidth + PART_GAP_X) / (PART_W + PART_GAP_X)));
}

/** Height a zone needs to fit its flashcard grid below its header. */
function partsHeight(
  cardCount: number,
  innerWidth: number,
  headerH: number,
): number {
  const cols = colsFor(innerWidth);
  const rows = Math.ceil(cardCount / cols);
  return headerH + rows * PART_H + Math.max(0, rows - 1) * PART_GAP_Y + ZONE_PAD_X;
}

/** Everything needed to size + fill one station, before it's positioned. */
type Computed = {
  width: number;
  innerWidth: number;
  height: number;
  headerH: number;
  contents: ZoneContent[];
  cards: Card[];
  mechBoxes: Mechanism[];
  mechLayout: { x: number; y: number; w: number; h: number }[];
};

function widthFor(id: StationId): number {
  if (id === "deploy" || id === "contract") return STRADDLE_W;
  return SECTION_W;
}

/** Compute a station's intrinsic size + inner layout (position-independent). */
function computeStation(
  s: (typeof STATIONS)[number],
  inner: InnerMode,
  expanded: ReadonlySet<string>,
): Computed {
  const width = widthFor(s.id);
  const innerWidth = width - ZONE_PAD_X * 2;
  const cards = CARDS_BY_STATION[s.id] ?? [];
  // The "Inside" lozenge index only shows in Recall (parts) mode — in mechanics
  // mode the boxes themselves are the contents, so we hide it and reclaim the space.
  const contents = inner === "parts" ? contentsFor(s.id) : [];
  const headerH = headerHeightFor(contents, innerWidth);

  const mechBoxes = MECHANICS[s.id]?.parts ?? [];
  let mechLayout: { x: number; y: number; w: number; h: number }[] = [];
  let mechBottom = headerH;
  if (inner === "mechanics" && mechBoxes.length > 0) {
    const grid = layoutMechGrid(mechBoxes, s.id, expanded, innerWidth, headerH);
    mechLayout = grid.layout;
    mechBottom = grid.bottom;
  }

  const neededH =
    inner === "mechanics"
      ? mechBottom
      : partsHeight(cards.length, innerWidth, headerH);
  // Straddlers are short + wide; only column sections honour the base min height.
  const minH = s.id === "contract" || s.id === "deploy" ? 0 : s.size.h;
  const height = Math.max(minH, neededH);
  return { width, innerWidth, height, headerH, contents, cards, mechBoxes, mechLayout };
}

export function buildNodes(
  inner: InnerMode = "parts",
  expanded: ReadonlySet<string> = new Set(),
): MachineNode[] {
  const nodes: MachineNode[] = [];

  // 1) Size every station, then position by column (dynamic — so growing zones
  //    never overlap their neighbour below).
  const computed = new Map<StationId, Computed>();
  for (const s of STATIONS) computed.set(s.id, computeStation(s, inner, expanded));

  const pos = new Map<StationId, { x: number; y: number }>();

  // Top straddler: the contract, spanning both bands (short + wide). It starts
  // below a label strip so it never covers the band titles.
  const topY = CANVAS_PAD + BAND_LABEL_H;
  pos.set("contract", { x: STRADDLE_X, y: topY });
  const colTop = topY + computed.get("contract")!.height + STRADDLE_GAP;

  // Each band masonry-packs its sections: place each in the shortest column.
  function packColumn(
    ids: StationId[],
    secX0: number,
    cols: number,
  ): number {
    const colH = new Array(cols).fill(colTop);
    for (const id of ids) {
      let j = 0;
      for (let k = 1; k < cols; k++) if (colH[k] < colH[j]) j = k;
      pos.set(id, { x: secX0 + j * (SECTION_W + SEC_GAP), y: colH[j] });
      colH[j] += computed.get(id)!.height + SEC_GAP;
    }
    return Math.max(...colH) - SEC_GAP; // band's content bottom
  }
  const feBottom = packColumn(FRONTEND_COL, FE_SEC_X, FE_SECTION_COLS);
  const beBottom = packColumn(BACKEND_COL, BE_SEC_X, BE_SECTION_COLS);
  const colBottom = Math.max(feBottom, beBottom);

  // Bottom straddler: deploy, spanning both bands.
  const deployY = colBottom + STRADDLE_GAP;
  pos.set("deploy", { x: STRADDLE_X, y: deployY });
  const canvasBottom = deployY + computed.get("deploy")!.height;

  // 2) Background bands (pushed FIRST so they render behind the zones). The two
  //    runtime bands run full height; the contract (top) and deploy (bottom)
  //    sections straddle both, showing they cross runtimes.
  // Bands start near the canvas top; the strip above `topY` holds their titles.
  const bandTop = CANVAS_PAD - BAND_PAD;
  const bandH = canvasBottom + BAND_PAD - bandTop;
  nodes.push(
    band("band:frontend", FE_BAND_X, bandTop, FE_BAND_W, bandH, {
      kind: "band",
      label: "Frontend",
      sublabel: "browser",
      color: "#5fb0e0",
    }),
    band("band:backend", BE_BAND_X, bandTop, BE_BAND_W, bandH, {
      kind: "band",
      label: "Backend",
      sublabel: "server",
      color: "#d8a657",
    }),
    band(
      "band:deploy",
      STRADDLE_X - BAND_PAD,
      deployY - BAND_PAD,
      STRADDLE_W + BAND_PAD * 2,
      computed.get("deploy")!.height + BAND_PAD * 2,
      { kind: "band", label: "Deploy & Ops", sublabel: "spans both runtimes", color: "#b5562f" },
    ),
  );

  // 3) Zones + their inner content.
  for (const s of STATIONS) {
    const c = computed.get(s.id)!;
    const p = pos.get(s.id)!;

    nodes.push({
      id: `zone:${s.id}`,
      type: "zone",
      position: { x: p.x, y: p.y },
      width: c.width,
      height: c.height,
      data: {
        kind: "zone",
        stationId: s.id,
        name: s.name,
        tagline: s.tagline,
        color: s.color,
        fluency: 0,
        mastered: 0,
        contents: c.contents,
        headerH: c.headerH,
      },
      draggable: false,
      selectable: false,
    });

    if (inner === "mechanics") {
      c.mechBoxes.forEach((mech, i) => {
        const { x, y, w, h } = c.mechLayout[i];
        const id = `mech:${s.id}:${mech.id}`;
        nodes.push({
          id,
          type: "mech",
          parentId: `zone:${s.id}`,
          extent: "parent",
          position: { x, y },
          width: w,
          height: h,
          data: {
            kind: "mech",
            mech,
            stationId: s.id,
            color: s.color,
            expanded: expanded.has(id),
          },
          draggable: false,
          selectable: false,
        });
      });
    } else {
      const cols = colsFor(c.innerWidth);
      c.cards.forEach((card, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        nodes.push({
          id: `part:${card.id}`,
          type: "part",
          parentId: `zone:${s.id}`,
          extent: "parent",
          position: {
            x: ZONE_PAD_X + col * (PART_W + PART_GAP_X),
            y: c.headerH + row * (PART_H + PART_GAP_Y),
          },
          width: PART_W,
          height: PART_H,
          data: { kind: "part", card, color: s.color, box: 0 },
          draggable: false,
        });
      });
    }
  }

  return nodes;
}

/** Build a non-interactive background band node. */
function band(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  data: BandNodeData,
): MachineNode {
  return {
    id,
    type: "band",
    position: { x, y },
    width,
    height,
    data,
    draggable: false,
    selectable: false,
    zIndex: -1,
  };
}

/** Zone-to-zone pipes (the data-flow between stations). */
export function buildEdges(): Edge[] {
  return STATION_FLOW.map(({ from, to }) => ({
    id: `pipe:${from}->${to}`,
    source: `zone:${from}`,
    target: `zone:${to}`,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#2b3346", strokeWidth: 6 },
  }));
}

/** Intra-zone arrows between mechanism boxes (Diagnose/Explain mode only). */
export function buildMechanicsEdges(): Edge[] {
  const edges: Edge[] = [];
  for (const s of STATIONS) {
    const m = MECHANICS[s.id];
    if (!m) continue;
    const ids = new Set(m.parts.map((p) => p.id));
    for (const e of m.flow) {
      // Skip edges that reference a box that doesn't exist (authoring guard).
      if (!ids.has(e.from) || !ids.has(e.to)) continue;
      edges.push({
        id: `mech:${s.id}:${e.from}->${e.to}`,
        source: `mech:${s.id}:${e.from}`,
        target: `mech:${s.id}:${e.to}`,
        type: "smoothstep",
        label: e.label,
        labelStyle: { fill: "#c2cad9", fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: "#0b0e14", fillOpacity: 0.85 },
        labelBgPadding: [4, 2],
        style: { stroke: s.color, strokeWidth: 2, opacity: 0.7 },
      });
    }
  }
  return edges;
}

export const PART_DIMS = { PART_W, PART_H, BASE_HEADER_H };
export const MECH_DIMS = { MECH_H, MECH_ROW_GAP, MECH_COL_GAP, BASE_HEADER_H };
export { headerHeightFor };
