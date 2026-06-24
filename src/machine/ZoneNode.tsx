import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ZoneNodeData } from "./layout";

type ZoneNode = Node<ZoneNodeData>;

function ZoneNodeImpl({ data }: NodeProps<ZoneNode>) {
  const f = data.fluency;
  const mastered = data.mastered;
  const lit = f > 0.02;

  return (
    <div
      className="rounded-2xl border-2 transition-colors duration-500"
      style={{
        width: "100%",
        height: "100%",
        background: lit
          ? `color-mix(in oklab, ${data.color} ${6 + f * 10}%, var(--color-shop-900))`
          : "var(--color-shop-900)",
        borderColor: lit
          ? `color-mix(in oklab, ${data.color} ${30 + f * 50}%, var(--color-shop-700))`
          : "var(--color-shop-700)",
        boxShadow: lit
          ? `0 0 ${10 + f * 40}px color-mix(in oklab, ${data.color} ${20 + f * 50}%, transparent)`
          : "none",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h3
            className="text-[15px] font-bold tracking-tight"
            style={{ color: lit ? data.color : "#8a93a6" }}
          >
            {data.name}
          </h3>
          <span className="text-[11px] font-mono text-shop-400">
            {mastered}✦
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-tight text-shop-400">
          {data.tagline}
        </p>
        {/* Fluency meter */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-shop-800">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.round(f * 100)}%`,
              background: data.color,
            }}
          />
        </div>

        {/* "What's inside" index — shown in every mode so a station's contents
            are legible at a glance (key for Diagnose). */}
        {data.contents.length > 0 && (
          <div className="mt-2.5">
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-shop-400">
              Inside ({data.contents.length})
            </div>
            <ul className="mt-1 flex flex-wrap items-start gap-1.5">
              {data.contents.map((c) => (
                <li key={c.label} className="flex">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-tight text-shop-100"
                    style={{
                      borderColor: `color-mix(in oklab, ${c.color} 55%, transparent)`,
                      background: `color-mix(in oklab, ${c.color} 14%, transparent)`,
                    }}
                  >
                    <span
                      className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span>{c.label}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export const ZoneNode = memo(ZoneNodeImpl);
