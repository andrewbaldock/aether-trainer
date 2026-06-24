import { useCallback, useEffect, useMemo, useState } from "react";
import { Machine } from "../machine/Machine";
import {
  NARRATIVES,
  flattenSteps,
  type StepBranch,
} from "../data/narratives";
import { MECHANICS } from "../data/mechanics";
import { STATION_FLOW, type StationId } from "../data/stations";

// "Light up everything" mode — every box, zone and wire on the diagram.
const ALL_MECH_IDS = Object.entries(MECHANICS).flatMap(([s, m]) =>
  (m?.parts ?? []).map((p) => `mech:${s}:${p.id}`),
);
const ALL_STATION_IDS = Object.keys(MECHANICS) as StationId[];
const ALL_EDGES = STATION_FLOW.map(
  (f) => [f.from, f.to] as [StationId, StationId],
);

const BRANCH_META: Record<StepBranch, { color: string; label: string }> = {
  main: { color: "#7fd4e0", label: "Main path" },
  alt: { color: "#b08fe0", label: "Alternate" },
  error: { color: "#e06f6f", label: "Failure" },
  repair: { color: "#5fe3a1", label: "Self-repair" },
};

export function Watch() {
  const [narrIdx, setNarrIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [allLit, setAllLit] = useState(false);

  const narrative = NARRATIVES[narrIdx];
  const flat = useMemo(() => flattenSteps(narrative.steps), [narrative]);
  const current = flat[Math.min(stepIdx, flat.length - 1)];

  // Translate the step's lit spec into Machine spotlight props.
  const { litMechIds, litStationIds, litEdges } = useMemo(() => {
    const lit = current.node.lit;
    const mechIds = (lit.mech ?? []).map((m) => `mech:${m}`);
    const stations = new Set<StationId>(lit.stations ?? []);
    for (const m of lit.mech ?? []) stations.add(m.split(":")[0] as StationId);
    return {
      litMechIds: mechIds,
      litStationIds: [...stations],
      litEdges: lit.edges ?? [],
    };
  }, [current]);

  // Faintly preview the previous and next steps' highlighting (~30%).
  const { ghostMechIds, ghostStationIds, ghostEdges } = useMemo(() => {
    const curMech = new Set(litMechIds);
    const curStation = new Set<string>(litStationIds);
    const mech = new Set<string>();
    const stations = new Set<StationId>();
    const edges: [StationId, StationId][] = [];
    for (const di of [-1, 1]) {
      const nb = flat[stepIdx + di];
      if (!nb) continue;
      for (const m of nb.node.lit.mech ?? []) {
        const id = `mech:${m}`;
        if (!curMech.has(id)) mech.add(id);
        stations.add(m.split(":")[0] as StationId);
      }
      for (const s of nb.node.lit.stations ?? []) stations.add(s);
      for (const e of nb.node.lit.edges ?? []) edges.push(e);
    }
    return {
      ghostMechIds: [...mech],
      ghostStationIds: [...stations].filter((s) => !curStation.has(s)),
      ghostEdges: edges,
    };
  }, [flat, stepIdx, litMechIds, litStationIds]);

  const go = useCallback(
    (delta: number) => {
      setAllLit(false); // navigating always returns to step mode
      setStepIdx((i) => Math.max(0, Math.min(flat.length - 1, i + delta)));
    },
    [flat.length],
  );

  // Keep the current step's ancestors expanded so it's always visible.
  useEffect(() => {
    const path = current.path;
    if (path.length === 0) return;
    setCollapsed((prev) => {
      if (!path.some((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      for (const id of path) next.delete(id);
      return next;
    });
  }, [current]);

  // Arrow-key navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function pickNarrative(i: number) {
    setNarrIdx(i);
    setStepIdx(0);
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const branch = current.node.branch ?? "main";
  const branchMeta = BRANCH_META[branch];

  return (
    <>
      <Machine
        inner="mechanics"
        litMechIds={allLit ? ALL_MECH_IDS : litMechIds}
        litStationIds={allLit ? ALL_STATION_IDS : litStationIds}
        litEdges={allLit ? ALL_EDGES : litEdges}
        ghostMechIds={allLit ? [] : ghostMechIds}
        ghostStationIds={allLit ? [] : ghostStationIds}
        ghostEdges={allLit ? [] : ghostEdges}
      />

      {/* Left: narrative picker + step tree */}
      <div className="pointer-events-none absolute inset-y-4 left-4 z-10 flex w-[330px] max-w-[80vw] flex-col">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-shop-700 bg-shop-900/95 shadow-2xl backdrop-blur">
          <div className="border-b border-shop-700 p-2">
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-shop-400">
                Walkthrough
              </span>
              {/* Step ↔ All-lit toggle */}
              <div className="flex items-center rounded-lg border border-shop-700 bg-shop-850 p-0.5">
                <button
                  onClick={() => setAllLit(false)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    !allLit ? "bg-brass-500 text-shop-950" : "text-shop-300 hover:bg-shop-800"
                  }`}
                >
                  Step
                </button>
                <button
                  onClick={() => setAllLit(true)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    allLit ? "bg-brass-500 text-shop-950" : "text-shop-300 hover:bg-shop-800"
                  }`}
                >
                  All lit
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {NARRATIVES.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => pickNarrative(i)}
                  className={`rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    i === narrIdx ? "bg-shop-800" : "hover:bg-shop-850"
                  }`}
                >
                  <div
                    className="text-[12.5px] font-bold"
                    style={{ color: i === narrIdx ? "#e6eaf2" : "#9aa4b8" }}
                  >
                    {n.title}
                  </div>
                  <div className="text-[10.5px] leading-tight text-shop-400">
                    {n.blurb}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step tree */}
          <ol className="max-h-[46vh] overflow-y-auto p-1.5">
            {flat.map((fs, i) => {
              const hidden = fs.path.some((id) => collapsed.has(id));
              if (hidden) return null;
              const isCurrent = i === stepIdx;
              const meta = BRANCH_META[fs.node.branch ?? "main"];
              const hasKids = !!fs.node.children?.length;
              const isCollapsed = collapsed.has(fs.node.id);
              return (
                <li key={fs.node.id}>
                  <div
                    className={`flex items-center gap-1.5 rounded-md py-1 pr-2 transition-colors ${
                      isCurrent ? "bg-shop-800" : "hover:bg-shop-850"
                    }`}
                    style={{ paddingLeft: 8 + fs.depth * 14 }}
                  >
                    {hasKids ? (
                      <button
                        onClick={() => toggleCollapse(fs.node.id)}
                        className="shrink-0 text-[9px] text-shop-400 hover:text-shop-100"
                        title={isCollapsed ? "Expand" : "Collapse"}
                      >
                        {isCollapsed ? "▶" : "▼"}
                      </button>
                    ) : (
                      <span
                        className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                    )}
                    <button
                      onClick={() => {
                        setAllLit(false);
                        setStepIdx(i);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`block truncate text-[12px] ${
                          isCurrent ? "font-bold text-shop-100" : "text-shop-300"
                        }`}
                      >
                        {fs.node.title}
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Bottom-center: narration + prev/next */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
        <div className="pointer-events-auto w-[min(720px,94vw)] rounded-2xl border border-shop-700 bg-shop-900/95 p-4 shadow-2xl backdrop-blur">
          {allLit ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-bold text-shop-100">
                  Whole machine lit
                </h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-shop-300">
                  Every box, zone and wire is on. Switch to Step mode (or click a
                  step on the left) to walk one turn at a time.
                </p>
              </div>
              <button
                onClick={() => setAllLit(false)}
                className="shrink-0 rounded-lg bg-brass-500 px-4 py-1.5 text-sm font-semibold text-shop-950 transition-colors hover:bg-brass-400"
              >
                Step mode →
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: branchMeta.color,
                    borderColor: `color-mix(in oklab, ${branchMeta.color} 50%, transparent)`,
                    background: `color-mix(in oklab, ${branchMeta.color} 12%, transparent)`,
                  }}
                >
                  {branchMeta.label}
                </span>
                <span className="font-mono text-[11px] text-shop-400">
                  {stepIdx + 1} / {flat.length}
                </span>
              </div>

              <h3 className="mt-2 text-[16px] font-bold text-shop-100">
                {current.node.title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-shop-200">
                {current.node.narration}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => go(-1)}
                  disabled={stepIdx === 0}
                  className="rounded-lg border border-shop-700 px-4 py-1.5 text-sm font-semibold text-shop-100 transition-colors enabled:hover:border-steam-300 disabled:opacity-30"
                >
                  ← Prev
                </button>
                <span className="text-[10.5px] text-shop-400">
                  ← / → to step through
                </span>
                <button
                  onClick={() => go(1)}
                  disabled={stepIdx >= flat.length - 1}
                  className="rounded-lg bg-brass-500 px-4 py-1.5 text-sm font-semibold text-shop-950 transition-colors enabled:hover:bg-brass-400 disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
