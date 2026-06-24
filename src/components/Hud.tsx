import { useProgress } from "../game/useProgress";
import { GOTCHA_CARDS } from "../data/cards";
import { isMastered } from "../game/srs";

export type Mode = "recall" | "diagnose" | "explain" | "watch";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "recall", label: "Recall", hint: "Flashcards + spaced repetition" },
  { id: "diagnose", label: "Diagnose", hint: "Symptom → which station?" },
  { id: "explain", label: "Explain", hint: "Interview simulator" },
  { id: "watch", label: "Watch", hint: "Guided walk-through of a live turn" },
];

export function Hud({
  mode,
  onMode,
  onReviewDue,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  onReviewDue: () => void;
}) {
  const { readiness, mastered, total, due, srs } = useProgress();
  const pct = Math.round(readiness * 100);
  const gotchasMastered = GOTCHA_CARDS.filter((c) => isMastered(srs[c.id])).length;

  return (
    <header className="z-10 flex items-center justify-between gap-4 border-b border-shop-700 bg-shop-900/80 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-base font-black tracking-tight">
          <span className="text-brass-400">⚙</span> The Aether Machine
        </span>
        <span className="hidden text-[11px] text-shop-400 sm:inline">
          interview trainer
        </span>
      </div>

      {/* mode switch */}
      <nav className="flex items-center gap-1 rounded-xl border border-shop-700 bg-shop-850 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onMode(m.id)}
            title={m.hint}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              mode === m.id
                ? "bg-brass-500 text-shop-950"
                : "text-shop-100 hover:bg-shop-800"
            }`}
          >
            {m.label}
          </button>
        ))}
      </nav>

      {/* readiness HUD */}
      <div className="flex items-center gap-4">
        <button
          onClick={onReviewDue}
          disabled={due.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-shop-700 px-3 py-1.5 text-xs font-semibold text-steam-300 transition-colors enabled:hover:border-steam-300 disabled:opacity-40"
          title="Review everything due right now (spaced repetition)"
        >
          ⟳ Due <span className="font-mono">{due.length}</span>
        </button>
        <div className="hidden items-center gap-1.5 md:flex" title="Gold gotcha cards mastered">
          <span className="text-gold-400">★</span>
          <span className="font-mono text-xs text-gold-400">
            {gotchasMastered}/{GOTCHA_CARDS.length}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-shop-400">
              Readiness
            </span>
            <span
              className="font-mono text-xl font-black"
              style={{ color: readinessColor(pct) }}
            >
              {pct}%
            </span>
          </div>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-shop-800">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, background: readinessColor(pct) }}
            />
          </div>
          <span className="mt-0.5 text-[10px] text-shop-400">
            {mastered}/{total} parts mastered
          </span>
        </div>
      </div>
    </header>
  );
}

function readinessColor(pct: number): string {
  if (pct >= 80) return "#5fe3a1";
  if (pct >= 50) return "#d8a657";
  if (pct >= 20) return "#e0a14f";
  return "#b5562f";
}
