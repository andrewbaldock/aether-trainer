import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "@xyflow/react";
import {
  buildNodes,
  buildEdges,
  type MachineNode,
  type InnerMode,
} from "./layout";
import { ZoneNode } from "./ZoneNode";
import { PartNode } from "./PartNode";
import { MechanismNode } from "./MechanismNode";
import { BandNode } from "./BandNode";
import { MECH_KIND_META } from "./mechKinds";
import { STATION_BY_ID, type StationId } from "../data/stations";
import { useProgress } from "../game/useProgress";

const nodeTypes = {
  zone: ZoneNode,
  part: PartNode,
  mech: MechanismNode,
  band: BandNode,
};

export type MachineProps = {
  /** What renders inside each zone: flashcards ("parts", Recall) or internal
   *  plumbing ("mechanics", Diagnose/Explain). Defaults to "parts". */
  inner?: InnerMode;
  /** Click a part (card) — used by Recall to open that card. */
  onPartClick?: (cardId: string) => void;
  /** Click a zone header — used by Recall (open station) / Diagnose (answer). */
  onZoneClick?: (stationId: StationId) => void;
  /** Stations to highlight (Diagnose selection / Explain trace). */
  highlight?: StationId[];
  /** Pipes (by station id pairs) to animate, e.g. the live Explain trace. */
  animateFlow?: boolean;
  /** Dim everything except these stations (focus mode). */
  focus?: StationId[];
  /** Watch "spotlight": light these mechanism boxes (node ids), dim the rest. */
  litMechIds?: string[];
  /** Watch spotlight: zones to light. */
  litStationIds?: StationId[];
  /** Watch spotlight: pipes to light, as [from, to] station pairs. */
  litEdges?: [StationId, StationId][];
  /** Watch: faintly preview the adjacent steps' boxes (~30% brightness). */
  ghostMechIds?: string[];
  ghostStationIds?: StationId[];
  ghostEdges?: [StationId, StationId][];
  fitViewKey?: string;
};

export function Machine({
  inner = "parts",
  onPartClick,
  onZoneClick,
  highlight,
  animateFlow,
  focus,
  litMechIds,
  litStationIds,
  litEdges,
  ghostMechIds,
  ghostStationIds,
  ghostEdges,
}: MachineProps) {
  const { fluency, stationMastered, srs } = useProgress();

  // Which mechanism boxes have their details panel open (by node id).
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const baseNodes = useMemo<MachineNode[]>(
    () => buildNodes(inner, expanded),
    [inner, expanded],
  );
  const baseEdges = useMemo<Edge[]>(() => buildEdges(), []);

  const highlightSet = useMemo(
    () => new Set(highlight ?? []),
    [highlight],
  );
  const focusSet = useMemo(() => new Set(focus ?? []), [focus]);

  // Watch "spotlight" — when active, dim everything not explicitly lit.
  const litMech = useMemo(() => new Set(litMechIds ?? []), [litMechIds]);
  const litStation = useMemo(() => new Set(litStationIds ?? []), [litStationIds]);
  const litEdge = useMemo(
    () => new Set((litEdges ?? []).map(([a, b]) => `${a}->${b}`)),
    [litEdges],
  );
  const ghostMech = useMemo(() => new Set(ghostMechIds ?? []), [ghostMechIds]);
  const ghostStation = useMemo(
    () => new Set(ghostStationIds ?? []),
    [ghostStationIds],
  );
  const ghostEdge = useMemo(
    () => new Set((ghostEdges ?? []).map(([a, b]) => `${a}->${b}`)),
    [ghostEdges],
  );
  const spotlight = litMech.size > 0 || litStation.size > 0;

  const nodes = useMemo<Node[]>(() => {
    return baseNodes.map((n) => {
      // Background bands are static decoration — never dimmed or highlighted.
      if (n.data.kind === "band") return n;
      if (n.data.kind === "part") {
        // Part nodes inherit dimming via their zone; fold in their Leitner box.
        const sid = n.parentId?.replace("zone:", "") as StationId | undefined;
        const dim = focusSet.size > 0 && sid && !focusSet.has(sid);
        return {
          ...n,
          data: { ...n.data, box: srs[n.data.card.id]?.box ?? 0 },
          style: { ...n.style, opacity: dim ? 0.25 : 1 },
        };
      }
      if (n.data.kind === "mech") {
        const data = { ...n.data, onToggle: () => toggleExpanded(n.id) };
        if (spotlight) {
          // Watch: current step glows; adjacent steps preview at ~30%.
          const color = MECH_KIND_META[n.data.mech.kind].color;
          const lit = litMech.has(n.id);
          const ghost = !lit && ghostMech.has(n.id);
          const on = lit || ghost;
          return {
            ...n,
            data,
            style: {
              ...n.style,
              opacity: lit ? 1 : ghost ? 0.3 : 0.06,
              outline: on ? `2px solid ${color}` : undefined,
              outlineOffset: on ? "2px" : undefined,
              borderRadius: 9,
              boxShadow: on
                ? `0 0 24px color-mix(in oklab, ${color} 75%, transparent)`
                : undefined,
              transition: "opacity 300ms ease, box-shadow 300ms ease",
            },
          };
        }
        // Mechanism boxes inherit dimming from their parent zone (focus mode).
        const sid = n.data.stationId;
        const dim = focusSet.size > 0 && !focusSet.has(sid);
        return { ...n, data, style: { ...n.style, opacity: dim ? 0.25 : 1 } };
      }
      const sid = n.data.stationId;
      const zoneData = {
        ...n.data,
        fluency: fluency[sid] ?? 0,
        mastered: stationMastered[sid] ?? 0,
      };
      if (spotlight) {
        const litZone = litStation.has(sid);
        const ghostZone = !litZone && ghostStation.has(sid);
        const on = litZone || ghostZone;
        return {
          ...n,
          data: zoneData,
          style: {
            ...n.style,
            opacity: litZone ? 1 : ghostZone ? 0.4 : 0.18,
            outline: on ? `2px solid ${STATION_BY_ID[sid].color}` : undefined,
            outlineOffset: on ? "2px" : undefined,
            borderRadius: 16,
            transition: "opacity 300ms ease",
          },
        };
      }
      const isHighlighted = highlightSet.has(sid);
      const dim = focusSet.size > 0 && !focusSet.has(sid);
      return {
        ...n,
        data: zoneData,
        style: {
          ...n.style,
          opacity: dim ? 0.3 : 1,
          outline: isHighlighted
            ? `3px solid ${STATION_BY_ID[sid].color}`
            : undefined,
          outlineOffset: isHighlighted ? "3px" : undefined,
          borderRadius: 16,
        },
      };
    });
  }, [
    baseNodes,
    highlightSet,
    focusSet,
    spotlight,
    litMech,
    litStation,
    ghostMech,
    ghostStation,
    fluency,
    stationMastered,
    srs,
    toggleExpanded,
  ]);

  const edges = useMemo<Edge[]>(() => {
    return baseEdges.map((e) => {
      // Intra-zone mechanics arrows keep their own styling — only restyle pipes.
      if (!e.id.startsWith("pipe:")) return e;
      const from = e.source.replace("zone:", "") as StationId;
      const to = e.target.replace("zone:", "") as StationId;
      if (spotlight) {
        // Watch: light this step's wires; preview adjacent steps' at ~30%.
        const lit = litEdge.has(`${from}->${to}`) || litEdge.has(`${to}->${from}`);
        const ghost =
          !lit && (ghostEdge.has(`${from}->${to}`) || ghostEdge.has(`${to}->${from}`));
        return {
          ...e,
          animated: lit,
          style: {
            ...e.style,
            stroke: lit || ghost ? STATION_BY_ID[to].color : "#161c28",
            strokeWidth: lit ? 8 : ghost ? 5 : 4,
            opacity: lit ? 1 : ghost ? 0.3 : 0.5,
          },
        };
      }
      // A pipe "lights" once both ends have some fluency.
      const live = (fluency[from] ?? 0) > 0.02 && (fluency[to] ?? 0) > 0.02;
      const traced =
        highlightSet.has(from) && highlightSet.has(to);
      return {
        ...e,
        animated: animateFlow ? live || traced : false,
        style: {
          ...e.style,
          stroke: traced
            ? STATION_BY_ID[to].color
            : live
              ? "#3a4862"
              : "#222a3a",
          strokeWidth: traced ? 8 : 6,
        },
      };
    });
  }, [baseEdges, fluency, animateFlow, highlightSet, spotlight, litEdge, ghostEdge]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_evt, node) => {
      const data = (node as MachineNode).data;
      if (data.kind === "band") return; // decoration — not clickable
      if (data.kind === "part") onPartClick?.(data.card.id);
      // A zone or mechanism box answers for its station (so Diagnose clicks count).
      else onZoneClick?.(data.stationId);
    },
    [onPartClick, onZoneClick],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.12}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="#1a2030"
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const d = (n as MachineNode).data;
            if (d.kind === "zone") return d.color;
            return "#2b3346";
          }}
          maskColor="rgba(7,9,13,0.7)"
          style={{ background: "#0b0e14", border: "1px solid #1d2433" }}
        />
        <Controls
          showInteractive={false}
          style={{ background: "#0f131c", border: "1px solid #1d2433" }}
        />
      </ReactFlow>
    </div>
  );
}
