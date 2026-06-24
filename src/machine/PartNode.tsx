import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import type { PartNodeData } from "./layout";
import { MAX_BOX } from "../game/srs";

type PartNode = Node<PartNodeData>;

const KIND_GLYPH: Record<PartNodeData["card"]["kind"], string> = {
  concept: "◍",
  gotcha: "⚠",
  file: "▤",
};

function PartNodeImpl({ data }: NodeProps<PartNode>) {
  const card = data.card;
  const box = data.box;
  const ratio = box / MAX_BOX;
  const lit = box > 0;
  const isGotcha = card.kind === "gotcha";
  const accent = isGotcha ? "#f2c94c" : data.color;

  return (
    <div
      className="group h-full w-full cursor-pointer rounded-lg border px-2 py-1.5 transition-all duration-300"
      style={{
        background: lit
          ? `color-mix(in oklab, ${accent} ${8 + ratio * 16}%, var(--color-shop-850))`
          : "var(--color-shop-850)",
        borderColor: lit
          ? `color-mix(in oklab, ${accent} ${40 + ratio * 50}%, var(--color-shop-700))`
          : isGotcha
            ? "color-mix(in oklab, #f2c94c 25%, var(--color-shop-700))"
            : "var(--color-shop-700)",
        boxShadow:
          box >= MAX_BOX
            ? `0 0 14px color-mix(in oklab, ${accent} 60%, transparent)`
            : "none",
      }}
      title={card.front}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-px text-[11px] leading-none"
          style={{ color: lit ? accent : "#5a6377" }}
        >
          {KIND_GLYPH[card.kind]}
        </span>
        <span
          className="line-clamp-2 text-[10.5px] font-medium leading-tight"
          style={{ color: lit ? "#dce3ef" : "#7a8493" }}
        >
          {partLabel(card.front)}
        </span>
      </div>
      {/* Mastery pips */}
      <div className="mt-1 flex gap-0.5">
        {Array.from({ length: MAX_BOX }).map((_, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{
              background:
                i < box ? accent : "color-mix(in oklab, white 6%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Compress a long question into a short part label (first ~6 words). */
function partLabel(front: string): string {
  const cleaned = front.replace(/^GOTCHA:\s*/i, "").replace(/\?$/, "");
  const words = cleaned.split(/\s+/).slice(0, 7).join(" ");
  return words.length < cleaned.length ? `${words}…` : words;
}

export const PartNode = memo(PartNodeImpl);
