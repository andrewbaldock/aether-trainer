import { describe, it, expect } from "vitest";
import { MECHANICS, MECH_KINDS } from "./mechanics";
import { MECH_KIND_META } from "../machine/mechKinds";

describe("MECHANICS data integrity", () => {
  const entries = Object.entries(MECHANICS);

  it("has at least one authored station", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [stationId, m] of entries) {
    describe(stationId, () => {
      it("has unique, non-empty box ids and content", () => {
        const ids = new Set<string>();
        for (const p of m!.parts) {
          expect(p.id).toBeTruthy();
          expect(ids.has(p.id)).toBe(false);
          ids.add(p.id);
          expect(p.label.trim().length).toBeGreaterThan(0);
          expect(p.detail.trim().length).toBeGreaterThan(0);
        }
      });

      it("every flow edge references existing boxes", () => {
        const ids = new Set(m!.parts.map((p) => p.id));
        for (const e of m!.flow) {
          expect(ids.has(e.from)).toBe(true);
          expect(ids.has(e.to)).toBe(true);
          expect(e.from).not.toBe(e.to);
        }
      });

      it("every box has a known kind with badge metadata", () => {
        for (const p of m!.parts) {
          expect(MECH_KINDS).toContain(p.kind);
          expect(MECH_KIND_META[p.kind]).toBeDefined();
        }
      });
    });
  }
});

describe("MECH_KIND_META", () => {
  it("defines badge metadata for every kind", () => {
    for (const k of MECH_KINDS) {
      const meta = MECH_KIND_META[k];
      expect(meta).toBeDefined();
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });
});
