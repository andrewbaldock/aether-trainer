import { memo, type MouseEvent } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { MechNodeData } from "./layout";
import { MECH_KIND_META, type BadgeShape } from "./mechKinds";

type MechNode = Node<MechNodeData>;

const SHAPE_CLASS: Record<BadgeShape, string> = {
  pill: "w-[30px] h-[22px] rounded-full",
  circle: "w-[22px] h-[22px] rounded-full",
  square: "w-[22px] h-[22px] rounded-[5px]",
  diamond: "w-[20px] h-[20px] rounded-[4px] rotate-45",
};

/** Colored, shaped icon badge — the per-kind visual differentiator. */
function KindBadge({ kind }: { kind: MechNodeData["mech"]["kind"] }) {
  const meta = MECH_KIND_META[kind];
  const isDiamond = meta.shape === "diamond";
  return (
    <div
      className={`mt-px flex shrink-0 items-center justify-center border ${SHAPE_CLASS[meta.shape]}`}
      style={{
        borderColor: meta.color,
        background: `color-mix(in oklab, ${meta.color} 22%, transparent)`,
      }}
      title={meta.label}
    >
      <span
        className="text-[12px] font-bold leading-none"
        style={{ color: meta.color, transform: isDiamond ? "rotate(-45deg)" : undefined }}
      >
        {meta.icon}
      </span>
    </div>
  );
}

/**
 * One internal-mechanics box. The label WRAPS (never truncates) so it's always
 * readable; a show/hide toggle grows the box to reveal the full explanation
 * inline (the column below reflows — heights from layout.ts).
 */
function MechanismNodeImpl({ data }: NodeProps<MechNode>) {
  const { mech, expanded, onToggle } = data;
  const meta = MECH_KIND_META[mech.kind];

  function handleToggle(e: MouseEvent) {
    // Don't let the click bubble to the node (which answers the station in Diagnose).
    e.stopPropagation();
    onToggle?.();
  }

  return (
    <div className="relative h-full w-full">
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: 0 }} />

      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-lg border-l-4 border-y border-r transition-colors duration-200"
        style={{
          background: `color-mix(in oklab, ${meta.color} ${expanded ? 12 : 7}%, var(--color-shop-850))`,
          borderColor: `color-mix(in oklab, ${meta.color} ${expanded ? 70 : 50}%, var(--color-shop-700))`,
          borderLeftColor: meta.color,
        }}
      >
        <div className="flex flex-col gap-1 px-3 py-2">
          {/* Badge + wrapping label */}
          <div className="flex items-start gap-2.5">
            <KindBadge kind={mech.kind} />
            <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[17px] text-shop-100 [overflow-wrap:anywhere]">
              {mech.label}
            </span>
          </div>
          {/* Kind tag + filepath + toggle */}
          <div className="flex items-center gap-1.5">
            <span
              className="shrink-0 text-[9px] font-bold uppercase tracking-wider"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            {mech.filePath && (
              <span
                className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-shop-400"
                title={mech.filePath}
              >
                · {mech.filePath}
              </span>
            )}
            <button
              type="button"
              onClick={handleToggle}
              className="ml-auto shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors"
              style={{
                borderColor: `color-mix(in oklab, ${meta.color} 50%, transparent)`,
                color: meta.color,
                background: "color-mix(in oklab, white 4%, transparent)",
              }}
              aria-expanded={expanded}
            >
              {expanded ? "Hide ▴" : "Details ▾"}
            </button>
          </div>
        </div>

        {/* Details panel — only when open */}
        {expanded && (
          <div className="border-t border-shop-700 px-3 py-2">
            <p className="text-[11.5px] leading-relaxed text-shop-200">
              {mech.detail}
            </p>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: 0 }} />
    </div>
  );
}

export const MechanismNode = memo(MechanismNodeImpl);
