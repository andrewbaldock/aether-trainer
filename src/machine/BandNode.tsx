import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import type { BandNodeData } from "./layout";

type BandNode = Node<BandNodeData>;

/**
 * A labeled background band — a runtime column (Frontend / Backend) or the ops
 * region (Deploy). Purely decorative: it sits behind the zones and never takes
 * clicks, so a section can straddle two bands to show it crosses runtimes.
 */
function BandNodeImpl({ data }: NodeProps<BandNode>) {
  return (
    <div
      className="pointer-events-none h-full w-full rounded-[28px] border-2 border-dashed"
      style={{
        borderColor: `color-mix(in oklab, ${data.color} 28%, var(--color-shop-800))`,
        background: `color-mix(in oklab, ${data.color} 5%, transparent)`,
      }}
    >
      <div className="flex items-baseline gap-2 px-6 pt-4">
        <span
          className="text-[15px] font-bold uppercase tracking-[0.18em]"
          style={{ color: `color-mix(in oklab, ${data.color} 75%, white)` }}
        >
          {data.label}
        </span>
        <span className="text-[12px] font-medium text-shop-400">
          {data.sublabel}
        </span>
      </div>
    </div>
  );
}

export const BandNode = memo(BandNodeImpl);
