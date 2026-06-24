import { describe, it, expect } from "vitest";
import { NARRATIVES, flattenSteps } from "./narratives";
import { MECHANICS } from "./mechanics";
import { STATION_IDS, type StationId } from "./stations";

const stationSet = new Set<string>(STATION_IDS);

function boxExists(ref: string): boolean {
  const [station, box] = ref.split(":");
  if (!stationSet.has(station)) return false;
  const m = MECHANICS[station as StationId];
  return !!m?.parts.some((p) => p.id === box);
}

describe("Watch coverage", () => {
  it("every diagram box appears in at least one Watch step", () => {
    const referenced = new Set<string>();
    for (const n of NARRATIVES) {
      for (const f of flattenSteps(n.steps)) {
        for (const ref of f.node.lit.mech ?? []) referenced.add(ref);
      }
    }
    const missing: string[] = [];
    for (const [station, m] of Object.entries(MECHANICS)) {
      for (const p of m!.parts) {
        if (!referenced.has(`${station}:${p.id}`)) missing.push(`${station}:${p.id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("NARRATIVES integrity", () => {
  for (const n of NARRATIVES) {
    describe(n.id, () => {
      const flat = flattenSteps(n.steps);

      it("flattens to a non-empty linear sequence", () => {
        expect(flat.length).toBeGreaterThan(0);
      });

      it("has unique step ids", () => {
        const ids = flat.map((f) => f.node.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("lights only mechanism boxes that exist on the diagram", () => {
        for (const f of flat) {
          for (const ref of f.node.lit.mech ?? []) {
            expect(boxExists(ref), `${f.node.id} → ${ref}`).toBe(true);
          }
        }
      });

      it("references only valid stations and edges", () => {
        for (const f of flat) {
          for (const s of f.node.lit.stations ?? []) {
            expect(stationSet.has(s)).toBe(true);
          }
          for (const [a, b] of f.node.lit.edges ?? []) {
            expect(stationSet.has(a), `edge from ${a}`).toBe(true);
            expect(stationSet.has(b), `edge to ${b}`).toBe(true);
          }
        }
      });

      it("every step lights at least one box", () => {
        for (const f of flat) {
          expect((f.node.lit.mech ?? []).length, f.node.id).toBeGreaterThan(0);
        }
      });
    });
  }
});
