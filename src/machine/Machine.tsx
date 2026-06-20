import { useCallback, useMemo } from "react";
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
import { buildNodes, buildEdges, type MachineNode } from "./layout";
import { ZoneNode } from "./ZoneNode";
import { PartNode } from "./PartNode";
import { STATION_BY_ID, type StationId } from "../data/stations";
import { useProgress } from "../game/useProgress";

const nodeTypes = { zone: ZoneNode, part: PartNode };

export type MachineProps = {
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
  fitViewKey?: string;
};

export function Machine({
  onPartClick,
  onZoneClick,
  highlight,
  animateFlow,
  focus,
}: MachineProps) {
  const { fluency } = useProgress();

  const baseNodes = useMemo<MachineNode[]>(() => buildNodes(), []);
  const baseEdges = useMemo<Edge[]>(() => buildEdges(), []);

  const highlightSet = useMemo(
    () => new Set(highlight ?? []),
    [highlight],
  );
  const focusSet = useMemo(() => new Set(focus ?? []), [focus]);

  const nodes = useMemo<Node[]>(() => {
    return baseNodes.map((n) => {
      if (n.data.kind !== "zone") {
        // Part nodes inherit dimming via their zone; just pass through.
        const sid = n.parentId?.replace("zone:", "") as StationId | undefined;
        const dim = focusSet.size > 0 && sid && !focusSet.has(sid);
        return { ...n, style: { ...n.style, opacity: dim ? 0.25 : 1 } };
      }
      const sid = n.data.stationId;
      const isHighlighted = highlightSet.has(sid);
      const dim = focusSet.size > 0 && !focusSet.has(sid);
      return {
        ...n,
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
  }, [baseNodes, highlightSet, focusSet]);

  const edges = useMemo<Edge[]>(() => {
    return baseEdges.map((e) => {
      const from = e.source.replace("zone:", "") as StationId;
      const to = e.target.replace("zone:", "") as StationId;
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
  }, [baseEdges, fluency, animateFlow, highlightSet]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_evt, node) => {
      const data = (node as MachineNode).data;
      if (data.kind === "part") onPartClick?.(data.card.id);
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
