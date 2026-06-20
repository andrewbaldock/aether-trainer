import type { Node, Edge } from "@xyflow/react";
import { STATIONS, STATION_FLOW, type StationId } from "../data/stations";
import { CARDS_BY_STATION, type Card } from "../data/cards";

// Build React Flow nodes + edges from the static station/card data.
// Zones are parent (group) nodes; each card is a child "part" node laid out
// in a grid inside its zone. Pure — no React, no DOM — so it's unit-testable.

export type ZoneNodeData = {
  kind: "zone";
  stationId: StationId;
  name: string;
  tagline: string;
  color: string;
};

export type PartNodeData = {
  kind: "part";
  card: Card;
  color: string;
};

export type MachineNode = Node<ZoneNodeData | PartNodeData>;

const PART_W = 150;
const PART_H = 54;
const PART_GAP_X = 14;
const PART_GAP_Y = 14;
const ZONE_PAD_X = 18;
const ZONE_HEADER_H = 64;

/** How many part columns fit in a zone of the given inner width. */
function colsFor(innerWidth: number): number {
  return Math.max(1, Math.floor((innerWidth + PART_GAP_X) / (PART_W + PART_GAP_X)));
}

export function buildNodes(): MachineNode[] {
  const nodes: MachineNode[] = [];

  for (const s of STATIONS) {
    const cards = CARDS_BY_STATION[s.id] ?? [];
    const innerWidth = s.size.w - ZONE_PAD_X * 2;
    const cols = colsFor(innerWidth);

    // Grow the zone height to fit all its parts.
    const rows = Math.ceil(cards.length / cols);
    const neededH =
      ZONE_HEADER_H + rows * PART_H + (rows - 1) * PART_GAP_Y + ZONE_PAD_X;
    const height = Math.max(s.size.h, neededH);

    nodes.push({
      id: `zone:${s.id}`,
      type: "zone",
      position: { x: s.pos.x, y: s.pos.y },
      width: s.size.w,
      height,
      data: {
        kind: "zone",
        stationId: s.id,
        name: s.name,
        tagline: s.tagline,
        color: s.color,
      },
      // Zones are draggable=false; they're the backdrop.
      draggable: false,
      selectable: false,
    });

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodes.push({
        id: `part:${card.id}`,
        type: "part",
        parentId: `zone:${s.id}`,
        extent: "parent",
        position: {
          x: ZONE_PAD_X + col * (PART_W + PART_GAP_X),
          y: ZONE_HEADER_H + row * (PART_H + PART_GAP_Y),
        },
        width: PART_W,
        height: PART_H,
        data: { kind: "part", card, color: s.color },
        draggable: false,
      });
    });
  }

  return nodes;
}

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

export const PART_DIMS = { PART_W, PART_H, ZONE_HEADER_H };
