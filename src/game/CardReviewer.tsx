import { useEffect, useState } from "react";
import { CARD_BY_ID } from "../data/cards";
import { STATION_BY_ID } from "../data/stations";
import { useProgress } from "./useProgress";
import { MAX_BOX } from "./srs";
import type { Rating } from "./srs";

const KIND_LABEL = { concept: "Concept", gotcha: "Gotcha", file: "File" } as const;

export function CardReviewer({
  cardIds,
  onClose,
  title,
}: {
  cardIds: string[];
  onClose: () => void;
  title?: string;
}) {
  const { rate, srs } = useProgress();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const cardId = cardIds[i];
  const card = cardId ? CARD_BY_ID[cardId] : undefined;

  // Reset flip when moving to a new card.
  useEffect(() => setFlipped(false), [i]);

  // Keyboard: space/enter flips, 1/2/3 rate, esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onClose();
      if (!card) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === "1" || e.key === "2" || e.key === "3")) {
        const map: Record<string, Rating> = { "1": "missed", "2": "fuzzy", "3": "got" };
        handleRate(map[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, flipped, i]);

  if (!card) {
    return (
      <Backdrop onClose={onClose}>
        <div className="w-[min(560px,92vw)] rounded-2xl border border-shop-700 bg-shop-850 p-8 text-center">
          <p className="text-lg font-semibold text-glow-400">Deck complete ✦</p>
          <p className="mt-2 text-sm text-shop-600">
            Nothing left in this queue right now.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-lg border border-shop-700 px-4 py-2 text-sm hover:border-brass-500"
          >
            Back to the machine
          </button>
        </div>
      </Backdrop>
    );
  }

  const station = STATION_BY_ID[card.stationId];
  const box = srs[card.id]?.box ?? 0;

  function handleRate(rating: Rating) {
    rate(card!.id, rating);
    setI((n) => n + 1);
  }

  return (
    <Backdrop onClose={onClose}>
      <div
        className="flex w-[min(640px,94vw)] flex-col rounded-2xl border-2 bg-shop-850 shadow-2xl"
        style={{ borderColor: station.color }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-shop-700 px-5 py-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold"
              style={{ background: `${station.color}22`, color: station.color }}
            >
              {station.name}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                card.kind === "gotcha"
                  ? "bg-gold-400/15 text-gold-400"
                  : "bg-shop-800 text-shop-600"
              }`}
            >
              {KIND_LABEL[card.kind]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-shop-600">
              {title ? `${title} · ` : ""}
              {i + 1}/{cardIds.length}
            </span>
            <button
              onClick={onClose}
              className="text-shop-600 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* card body */}
        <button
          className="min-h-[220px] cursor-pointer px-7 py-8 text-left"
          onClick={() => setFlipped((f) => !f)}
        >
          {!flipped ? (
            <>
              <p className="text-[11px] uppercase tracking-widest text-shop-600">
                Prompt
              </p>
              <p className="mt-3 text-xl font-semibold leading-snug text-white">
                {card.front}
              </p>
              <p className="mt-6 text-xs text-shop-600">
                Click or press Space to reveal
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-widest text-glow-500">
                Answer
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-[#cfd6e4]">
                {card.back}
              </p>
              {card.filePath && (
                <p className="mt-4 font-mono text-[11px] text-brass-400">
                  {card.filePath}
                </p>
              )}
            </>
          )}
        </button>

        {/* footer / rating */}
        <div className="border-t border-shop-700 px-5 py-3">
          {!flipped ? (
            <div className="flex items-center justify-between">
              <MasteryPips box={box} />
              <button
                onClick={() => setFlipped(true)}
                className="rounded-lg border border-shop-700 px-4 py-1.5 text-sm hover:border-brass-500"
              >
                Reveal answer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <RateBtn label="Missed" hint="1" color="#e06f6f" onClick={() => handleRate("missed")} />
              <RateBtn label="Fuzzy" hint="2" color="#e0a14f" onClick={() => handleRate("fuzzy")} />
              <RateBtn label="Got it" hint="3" color="#5fe3a1" onClick={() => handleRate("got")} />
            </div>
          )}
        </div>
      </div>
    </Backdrop>
  );
}

function RateBtn({
  label,
  hint,
  color,
  onClick,
}: {
  label: string;
  hint: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border py-2.5 text-sm font-semibold transition-colors"
      style={{ borderColor: `${color}55`, color }}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${color}18`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label} <span className="ml-1 text-[10px] opacity-60">{hint}</span>
    </button>
  );
}

function MasteryPips({ box }: { box: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-shop-600">Mastery</span>
      <div className="flex gap-1">
        {Array.from({ length: MAX_BOX }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full"
            style={{ background: i < box ? "#5fe3a1" : "#2b3346" }}
          />
        ))}
      </div>
    </div>
  );
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {children}
    </div>
  );
}
