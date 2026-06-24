import { useEffect, useMemo, useRef, useState } from "react";
import { Machine } from "../machine/Machine";
import { EXPLAIN_PROMPTS, type ExplainPrompt } from "../data/explain";
import { STATION_BY_ID, type StationId } from "../data/stations";
import { detectStations } from "../data/stationAliases";
import { aiGrade, type GradeResult } from "../ai/grade";
import { load, save, STORAGE_KEYS } from "../lib/storage";

export function Explain() {
  const [prompt, setPrompt] = useState<ExplainPrompt>(() => EXPLAIN_PROMPTS[0]);
  const [answer, setAnswer] = useState("");
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [graded, setGraded] = useState(false);
  const [aiGrading, setAiGrading] = useState(false);
  const [aiResult, setAiResult] = useState<GradeResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() =>
    load<string>(STORAGE_KEYS.apiKey, ""),
  );
  const timerRef = useRef<number | null>(null);

  // Timer
  useEffect(() => {
    if (started && !graded) {
      timerRef.current = window.setInterval(
        () => setElapsed((e) => e + 1),
        1000,
      );
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }
  }, [started, graded]);

  const named = useMemo(() => detectStations(answer), [answer]);
  const namedSet = useMemo(() => new Set(named), [named]);

  const hitMust = prompt.mustHit.filter((s) => namedSet.has(s));
  const missedMust = prompt.mustHit.filter((s) => !namedSet.has(s));
  const selfScore = prompt.mustHit.length
    ? Math.round((hitMust.length / prompt.mustHit.length) * 100)
    : 0;

  function reset(next: ExplainPrompt) {
    setPrompt(next);
    setAnswer("");
    setStarted(false);
    setElapsed(0);
    setGraded(false);
    setAiResult(null);
    setAiError(null);
  }

  function nextPrompt() {
    const idx = EXPLAIN_PROMPTS.indexOf(prompt);
    reset(EXPLAIN_PROMPTS[(idx + 1) % EXPLAIN_PROMPTS.length]);
  }

  async function runAiGrade() {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    setAiGrading(true);
    setAiError(null);
    try {
      const result = await aiGrade(prompt, answer, apiKey);
      setAiResult(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiGrading(false);
    }
  }

  return (
    <>
      <Machine inner="mechanics" highlight={named} animateFlow focus={graded ? prompt.mustHit : undefined} />

      {/* Prompt + answer panel */}
      <div className="absolute right-4 top-4 z-10 flex max-h-[calc(100%-2rem)] w-[min(440px,92vw)] flex-col rounded-2xl border border-shop-700 bg-shop-900/95 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-shop-700 px-4 py-2.5">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-glow-400">
            🎤 Explain {prompt.boss && <span className="text-gold-400">· BOSS</span>}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-shop-100">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </span>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="text-shop-400 hover:text-white"
              title="Claude API key for AI grading"
            >
              ⚙
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <p className="text-[15px] font-semibold leading-snug text-white">
            {prompt.prompt}
          </p>

          {showSettings && (
            <div className="mt-3 rounded-lg border border-shop-700 bg-shop-850 p-3">
              <label className="text-[11px] font-semibold text-shop-100">
                Claude API key (stored locally, never committed)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="mt-1 w-full rounded border border-shop-700 bg-shop-900 px-2 py-1 text-xs text-white outline-none focus:border-brass-500"
              />
              <button
                onClick={() => {
                  save(STORAGE_KEYS.apiKey, apiKey);
                  setShowSettings(false);
                }}
                className="mt-2 rounded bg-brass-500 px-3 py-1 text-xs font-semibold text-shop-950"
              >
                Save key
              </button>
              <p className="mt-1.5 text-[10px] text-shop-400">
                Used only for the optional AI-grade. Self-grade works offline with no key.
              </p>
            </div>
          )}

          {!started ? (
            <button
              onClick={() => setStarted(true)}
              className="mt-3 w-full rounded-lg bg-glow-500 py-2 text-sm font-bold text-shop-950 hover:bg-glow-400"
            >
              Start — the clock runs
            </button>
          ) : (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Talk it through — name each station as you walk the path. The machine lights up as you go."
                rows={7}
                className="mt-3 w-full resize-none rounded-lg border border-shop-700 bg-shop-850 px-3 py-2 text-[13px] leading-relaxed text-white outline-none focus:border-glow-500"
              />
              <p className="mt-1.5 text-[11px] text-shop-400">
                Stations lit: <span className="text-steam-300">{named.length}</span> ·
                must-hit covered:{" "}
                <span className="text-glow-400">
                  {hitMust.length}/{prompt.mustHit.length}
                </span>
              </p>

              {!graded ? (
                <button
                  onClick={() => setGraded(true)}
                  className="mt-3 w-full rounded-lg bg-brass-500 py-2 text-sm font-bold text-shop-950 hover:bg-brass-400"
                >
                  Stop & self-grade
                </button>
              ) : (
                <Results
                  selfScore={selfScore}
                  hitMust={hitMust}
                  missedMust={missedMust}
                  rubric={prompt.rubric}
                  aiResult={aiResult}
                  aiError={aiError}
                  aiGrading={aiGrading}
                  onAiGrade={runAiGrade}
                  onNext={nextPrompt}
                />
              )}
            </>
          )}

          {/* prompt switcher */}
          <div className="mt-4 border-t border-shop-700 pt-3">
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-shop-400">
              Pick a prompt
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXPLAIN_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => reset(p)}
                  className={`rounded-md px-2 py-1 text-[11px] ${
                    p.id === prompt.id
                      ? "bg-glow-500 text-shop-950"
                      : "bg-shop-800 text-shop-100 hover:bg-shop-700"
                  }`}
                >
                  {p.boss ? "★ " : ""}
                  {shortTitle(p.prompt)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Results({
  selfScore,
  hitMust,
  missedMust,
  rubric,
  aiResult,
  aiError,
  aiGrading,
  onAiGrade,
  onNext,
}: {
  selfScore: number;
  hitMust: StationId[];
  missedMust: StationId[];
  rubric: string[];
  aiResult: GradeResult | null;
  aiError: string | null;
  aiGrading: boolean;
  onAiGrade: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-shop-700 bg-shop-850 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-white">Self-grade</span>
        <span
          className="font-mono text-2xl font-black"
          style={{ color: selfScore >= 70 ? "#5fe3a1" : "#e0a14f" }}
        >
          {selfScore}%
        </span>
      </div>
      <p className="mt-1 text-[11px] text-shop-400">
        Coverage of must-hit stations. (You judge the depth.)
      </p>

      {missedMust.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold text-rust-500">You missed:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {missedMust.map((s) => (
              <span
                key={s}
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  background: `${STATION_BY_ID[s].color}22`,
                  color: STATION_BY_ID[s].color,
                }}
              >
                {STATION_BY_ID[s].name}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-steam-300">
          Model-answer checklist ({hitMust.length}/{hitMust.length + missedMust.length} stations)
        </summary>
        <ul className="mt-1.5 space-y-1">
          {rubric.map((r, i) => (
            <li key={i} className="text-[11px] leading-snug text-[#cfd6e4]">
              • {r}
            </li>
          ))}
        </ul>
      </details>

      {/* AI grade */}
      <div className="mt-3 border-t border-shop-700 pt-2.5">
        {!aiResult ? (
          <button
            onClick={onAiGrade}
            disabled={aiGrading}
            className="w-full rounded-lg border border-glow-500/50 py-1.5 text-xs font-semibold text-glow-400 hover:bg-glow-500/10 disabled:opacity-50"
          >
            {aiGrading ? "Claude is grading…" : "✦ Grade with Claude (optional)"}
          </button>
        ) : (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-glow-400">Claude's grade</span>
              <span className="font-mono text-xl font-black text-glow-400">
                {aiResult.score}%
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#cfd6e4]">
              {aiResult.feedback}
            </p>
            {aiResult.missed.length > 0 && (
              <p className="mt-1.5 text-[11px] text-rust-500">
                Missed: {aiResult.missed.join("; ")}
              </p>
            )}
          </div>
        )}
        {aiError && (
          <p className="mt-1.5 text-[11px] text-rust-500">⚠ {aiError}</p>
        )}
      </div>

      <button
        onClick={onNext}
        className="mt-3 w-full rounded-lg bg-brass-500 py-2 text-sm font-bold text-shop-950 hover:bg-brass-400"
      >
        Next prompt →
      </button>
    </div>
  );
}

function shortTitle(p: string): string {
  return p.split(/\s+/).slice(0, 4).join(" ") + "…";
}
