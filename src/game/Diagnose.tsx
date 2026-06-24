import { useState } from "react";
import { Machine } from "../machine/Machine";
import { SYMPTOMS, type Symptom } from "../data/diagnose";
import { CARD_BY_ID } from "../data/cards";
import { STATION_BY_ID, type StationId } from "../data/stations";

type Result = { correct: boolean; picked: StationId } | null;

/** A fresh random shuffle (Fisher–Yates) — reshuffled on mount and each round. */
function shuffle(): Symptom[] {
  const arr = [...SYMPTOMS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function Diagnose() {
  // Initialised lazily, so the deck is freshly shuffled on every reload/mount.
  const [deck, setDeck] = useState<Symptom[]>(shuffle);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const symptom = deck[idx];

  function pick(stationId: StationId) {
    if (result) return; // already answered
    const correct = stationId === symptom.answer;
    setResult({ correct, picked: stationId });
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
  }

  function next() {
    setResult(null);
    if (idx + 1 >= deck.length) {
      setDeck(shuffle()); // new round → reshuffle
      setIdx(0);
    } else {
      setIdx((i) => i + 1);
    }
  }

  const card = symptom.cardId ? CARD_BY_ID[symptom.cardId] : undefined;
  const highlight: StationId[] = result
    ? [symptom.answer, ...(result.correct ? [] : [result.picked])]
    : [];

  return (
    <>
      <Machine
        inner="mechanics"
        onZoneClick={pick}
        highlight={highlight}
        animateFlow={!!result?.correct}
      />

      {/* Symptom panel */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
        <div className="pointer-events-auto w-[min(720px,94vw)] rounded-2xl border border-shop-700 bg-shop-900/95 p-4 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-rust-500">
              ⚠ Symptom
            </span>
            <span className="font-mono text-[11px] text-shop-400">
              {score.right}/{score.total} correct
            </span>
          </div>
          <p className="mt-2 text-[15px] leading-snug text-white">
            {symptom.symptom}
          </p>
          {!result ? (
            <p className="mt-2 text-xs text-shop-400">
              Click the <span className="text-shop-100">station</span> on the
              machine that owns the fix.
            </p>
          ) : (
            <div
              className="mt-3 rounded-lg border p-3"
              style={{
                borderColor: result.correct ? "#2fcf86" : "#b5562f",
                background: result.correct ? "#2fcf8615" : "#b5562f15",
              }}
            >
              <p
                className="text-sm font-bold"
                style={{ color: result.correct ? "#5fe3a1" : "#e06f6f" }}
              >
                {result.correct
                  ? "✓ Repaired — correct station!"
                  : `✗ That's ${STATION_BY_ID[result.picked].name}. The fix lives in ${STATION_BY_ID[symptom.answer].name}.`}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#cfd6e4]">
                {symptom.explanation}
              </p>
              {card?.filePath && (
                <p className="mt-1.5 font-mono text-[11px] text-brass-400">
                  {card.filePath}
                </p>
              )}
              <button
                onClick={next}
                className="mt-3 rounded-lg bg-brass-500 px-4 py-1.5 text-sm font-semibold text-shop-950 hover:bg-brass-400"
              >
                Next symptom →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
