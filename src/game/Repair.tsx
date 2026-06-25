import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type OnNodeDrag,
} from "@xyflow/react";
import { STATION_BY_ID, STATION_FLOW, type StationId } from "../data/stations";
import {
  REPAIR_STATIONS,
  SLOT_RECTS,
  CONTRACT_SEAM,
  COLUMN_RECTS,
  ROW_LABELS,
  BOARD_RIGHT,
  PART_W,
  PART_H,
  SNAP_DIST,
  type Rect,
} from "../data/repair";

type Status = "loose" | "wrong" | "correct";

// ── Node payloads ───────────────────────────────────────────────────────────
type PartData = { kind: "part"; station: StationId; status: Status; won: boolean };
type SlotData = { kind: "slot" };
type ColData = { kind: "col"; label: string; color: string; won: boolean };
type SeamData = { kind: "seam" };
type RowData = { kind: "row"; text: string; sub: string; color: string };
type RData = PartData | SlotData | ColData | SeamData | RowData;
type RNode = Node<RData>;

const LIGHT: Record<Status, string> = {
  loose: "#6b7280",
  wrong: "#e0564f",
  correct: "#34d399",
};

// ── Node components (stable module-scope identities) ─────────────────────────
const PartNode = memo(({ data }: NodeProps<Node<PartData>>) => {
  const s = STATION_BY_ID[data.station];
  const correct = data.status === "correct";
  return (
    <div
      className="flex h-full w-full flex-col justify-center rounded-xl border-2 px-3 py-2 shadow-lg transition-colors"
      style={{
        background: "var(--color-shop-850)",
        borderColor: correct
          ? "#34d399"
          : data.status === "wrong"
            ? "color-mix(in oklab, #e0564f 60%, var(--color-shop-700))"
            : "var(--color-shop-600)",
        cursor: "grab",
        boxShadow: correct
          ? "0 0 16px color-mix(in oklab, #34d399 45%, transparent)"
          : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="flex items-center justify-between gap-2">
        <span
          className="truncate text-[14px] font-bold tracking-tight"
          style={{ color: s.color }}
        >
          {s.name}
        </span>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            background: LIGHT[data.status],
            boxShadow: `0 0 7px ${LIGHT[data.status]}`,
          }}
        />
      </div>
      <span className="mt-0.5 truncate text-[10px] leading-tight text-shop-400">
        {s.tagline}
      </span>
    </div>
  );
});

const SlotNode = memo(() => (
  <div className="pointer-events-none h-full w-full rounded-xl border-2 border-dashed border-shop-700/70 bg-shop-900/30" />
));

const ColNode = memo(({ data }: NodeProps<Node<ColData>>) => (
  <div
    className="pointer-events-none h-full w-full rounded-2xl border transition-colors duration-700"
    style={{
      borderColor: `color-mix(in oklab, ${data.color} ${data.won ? 55 : 22}%, transparent)`,
      background: `color-mix(in oklab, ${data.color} ${data.won ? 12 : 5}%, transparent)`,
    }}
  />
));

const VerbLabel = memo(({ data }: NodeProps<Node<ColData>>) => (
  <div
    className="pointer-events-none w-full text-center text-[13px] font-black uppercase tracking-[0.2em]"
    style={{ color: `color-mix(in oklab, ${data.color} 78%, white)` }}
  >
    {data.label}
  </div>
));

// The contract SEAM — a thin rail dividing Frontend (above) from Backend
// (below). The one wire both halves are typed against, so it lives on the
// boundary rather than in any verb column.
const SeamNode = memo(() => (
  <div className="pointer-events-none flex h-full w-full items-center rounded-full border-y-2 border-dashed border-steam-300/40 bg-steam-300/6 px-6">
    <span className="text-[12px] font-black uppercase tracking-[0.22em] text-steam-300">
      The Contract
    </span>
    <span className="ml-2 text-[11px] text-shop-400">
      ↑ frontend · the shared wire both sides are typed against · backend ↓
    </span>
  </div>
));

const RowLabel = memo(({ data }: NodeProps<Node<RowData>>) => (
  <div className="pointer-events-none flex flex-col">
    <span
      className="text-[11px] font-black uppercase tracking-[0.14em]"
      style={{ color: `color-mix(in oklab, ${data.color} 75%, white)` }}
    >
      {data.text}
    </span>
    <span className="text-[9px] text-shop-400">{data.sub}</span>
  </div>
));

const nodeTypes = {
  part: PartNode,
  slot: SlotNode,
  col: ColNode,
  verb: VerbLabel,
  seam: SeamNode,
  row: RowLabel,
};

// ── Scatter: deal the 13 parts into a loosely-jittered grid in the gutter
// right of the board. Shuffled every time, but spaced so a card never covers
// another card's title. ───
function scatter(): Record<StationId, { x: number; y: number }> {
  const x0 = BOARD_RIGHT + 80;
  const y0 = 20;
  const COLS = 3;
  const cellW = PART_W + 44;
  const cellH = PART_H + 30;
  const jitterX = 18; // < (cellW - PART_W)/2, so cards never overlap horizontally
  const jitterY = 11; // < (cellH - PART_H)/2, so titles stay visible

  // Shuffle so the grid order looks random (Fisher–Yates).
  const order = [...REPAIR_STATIONS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out = {} as Record<StationId, { x: number; y: number }>;
  order.forEach((s, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    out[s] = {
      x: x0 + col * cellW + (Math.random() * 2 - 1) * jitterX,
      y: y0 + row * cellH + (Math.random() * 2 - 1) * jitterY,
    };
  });
  return out;
}

function buildStatic(won: boolean): RNode[] {
  const nodes: RNode[] = [];
  // Column strips + verb labels (behind everything).
  for (const c of COLUMN_RECTS) {
    nodes.push({
      id: `col:${c.id}`,
      type: "col",
      position: { x: c.rect.x, y: c.rect.y },
      width: c.rect.w,
      height: c.rect.h,
      data: { kind: "col", label: c.label, color: c.color, won },
      draggable: false,
      selectable: false,
      zIndex: -3,
    });
    nodes.push({
      id: `verb:${c.id}`,
      type: "verb",
      position: { x: c.labelX, y: c.labelY },
      width: c.labelW,
      data: { kind: "col", label: c.label, color: c.color, won },
      draggable: false,
      selectable: false,
      zIndex: -2,
    });
  }
  // Contract seam (the FE/BE divider rail).
  nodes.push({
    id: "seam:contract",
    type: "seam",
    position: { x: CONTRACT_SEAM.x, y: CONTRACT_SEAM.y },
    width: CONTRACT_SEAM.w,
    height: CONTRACT_SEAM.h,
    data: { kind: "seam" },
    draggable: false,
    selectable: false,
    zIndex: -2,
  });
  // FE / BE gutter labels.
  for (const r of ROW_LABELS) {
    nodes.push({
      id: `row:${r.text}`,
      type: "row",
      position: { x: r.x, y: r.y },
      width: r.w,
      data: { kind: "row", text: r.text, sub: r.sub, color: r.color },
      draggable: false,
      selectable: false,
      zIndex: -2,
    });
  }
  // Empty dotted slots.
  for (const s of REPAIR_STATIONS) {
    const r: Rect = SLOT_RECTS[s];
    nodes.push({
      id: `slot:${s}`,
      type: "slot",
      position: { x: r.x, y: r.y },
      width: r.w,
      height: r.h,
      data: { kind: "slot" },
      draggable: false,
      selectable: false,
      zIndex: -1,
    });
  }
  return nodes;
}

function buildParts(
  pos: Record<StationId, { x: number; y: number }>,
): RNode[] {
  return REPAIR_STATIONS.map((s) => ({
    id: `part:${s}`,
    type: "part",
    position: pos[s],
    width: PART_W,
    height: PART_H,
    data: { kind: "part", station: s, status: "loose" as Status, won: false },
    draggable: true,
    zIndex: 10,
  }));
}

function buildAll(pos: Record<StationId, { x: number; y: number }>): RNode[] {
  return [...buildStatic(false), ...buildParts(pos)];
}

// Own ReactFlowProvider so Repair's store is isolated from the App-level one
// the Machine modes share — otherwise their stale nodes (whose `data` has no
// `station`) leak into this flow and crash PartNode.
export function Repair() {
  return (
    <ReactFlowProvider>
      <RepairBoard />
    </ReactFlowProvider>
  );
}

function RepairBoard() {
  const rf = useReactFlow();
  const [scatterKey, setScatterKey] = useState(0);
  const initialPos = useRef(scatter());
  const [nodes, setNodes, onNodesChange] = useNodesState<RNode>(
    buildAll(initialPos.current),
  );

  const correctSet = useMemo(() => {
    const set = new Set<StationId>();
    for (const n of nodes) {
      if (n.type === "part" && (n.data as PartData).status === "correct") {
        set.add((n.data as PartData).station);
      }
    }
    return set;
  }, [nodes]);

  const placed = correctSet.size;
  const won = placed === REPAIR_STATIONS.length;

  // Pipes light (marching ants) only when BOTH ends are correctly slotted.
  const edges = useMemo<Edge[]>(
    () =>
      STATION_FLOW.filter(
        ({ from, to }) => correctSet.has(from) && correctSet.has(to),
      ).map(({ from, to }) => ({
        id: `pipe:${from}->${to}`,
        source: `part:${from}`,
        target: `part:${to}`,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#34d399", strokeWidth: 3 },
      })),
    [correctSet],
  );

  // Tint the columns + band green on a full repair.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.type === "col" || n.type === "verb"
          ? { ...n, data: { ...n.data, won } as ColData }
          : n,
      ),
    );
  }, [won, setNodes]);

  const onNodeDragStop = useCallback<OnNodeDrag<RNode>>(
    (_evt, node) => {
      if (node.type !== "part") return;
      const station = (node.data as PartData).station;
      const slot = SLOT_RECTS[station];
      const cx = node.position.x + PART_W / 2;
      const cy = node.position.y + PART_H / 2;
      const dist = (r: Rect) =>
        Math.hypot(cx - (r.x + r.w / 2), cy - (r.y + r.h / 2));

      const correct = dist(slot) < SNAP_DIST;
      // Did they drop it onto/near SOME slot (just the wrong one)?
      const nearAnySlot =
        correct ||
        REPAIR_STATIONS.some((s) => dist(SLOT_RECTS[s]) < SNAP_DIST);
      const status: Status = correct
        ? "correct"
        : nearAnySlot
          ? "wrong"
          : "loose";

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== node.id) return n;
          // Stay draggable even when correct, so a placed part can be pulled
          // back out of its slot (e.g. to redo one dropped out of sequence).
          return {
            ...n,
            position: correct ? { x: slot.x, y: slot.y } : n.position,
            draggable: true,
            data: { ...(n.data as PartData), status },
          };
        }),
      );
    },
    [setNodes],
  );

  const scramble = useCallback(() => {
    const pos = scatter();
    initialPos.current = pos;
    setNodes(buildAll(pos));
    setScatterKey((k) => k + 1);
  }, [setNodes]);

  // Re-frame the board after a (re)scatter.
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.12, duration: 400 }), 60);
    return () => clearTimeout(t);
  }, [scatterKey, rf]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        fitView
        minZoom={0.12}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#161c28" />
      </ReactFlow>

      {/* Overlay HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto rounded-lg border border-shop-700 bg-shop-900/85 px-3 py-1.5 text-xs text-shop-100 backdrop-blur">
          Repair the machine — drag each station into its dotted slot.{" "}
          <span className="font-mono text-steam-300">{placed}/{REPAIR_STATIONS.length}</span>
        </div>
        <button
          onClick={scramble}
          className="pointer-events-auto rounded-lg border border-shop-700 bg-shop-900/85 px-3 py-1.5 text-xs font-semibold text-shop-100 backdrop-blur transition-colors hover:border-steam-300"
        >
          ⟳ Scramble
        </button>
      </div>

      {won && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse rounded-2xl border-2 border-emerald-400/70 bg-shop-950/80 px-8 py-5 text-center shadow-2xl backdrop-blur">
            <div className="text-2xl font-black tracking-tight text-emerald-400">
              ⚙ Machine repaired
            </div>
            <div className="mt-1 text-sm text-shop-300">
              All 13 stations placed — that's the spine you can whiteboard cold.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
