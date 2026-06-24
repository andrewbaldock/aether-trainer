import { describe, it, expect } from "vitest";
import { buildNodes, buildMechanicsEdges } from "./layout";
import { STATIONS } from "../data/stations";
import { MECHANICS } from "../data/mechanics";

describe("buildNodes('mechanics')", () => {
  const nodes = buildNodes("mechanics");
  const zones = nodes.filter((n) => n.data.kind === "zone");
  const mechs = nodes.filter((n) => n.data.kind === "mech");

  it("emits one zone per station and no flashcard parts", () => {
    expect(zones).toHaveLength(STATIONS.length);
    expect(nodes.some((n) => n.data.kind === "part")).toBe(false);
  });

  it("emits one mech node per authored mechanism box", () => {
    const authored = Object.values(MECHANICS).reduce(
      (sum, m) => sum + (m?.parts.length ?? 0),
      0,
    );
    expect(mechs).toHaveLength(authored);
  });

  it("parents every mech node to its station's zone", () => {
    for (const m of mechs) {
      if (m.data.kind !== "mech") continue;
      expect(m.parentId).toBe(`zone:${m.data.stationId}`);
      expect(m.extent).toBe("parent");
    }
  });

  it("keeps every mech box inside its zone bounds", () => {
    const zoneById = new Map(zones.map((z) => [z.id, z]));
    for (const m of mechs) {
      const z = zoneById.get(m.parentId!);
      expect(z).toBeDefined();
      const zw = (z!.width ?? 0) as number;
      const zh = (z!.height ?? 0) as number;
      expect(m.position.x).toBeGreaterThanOrEqual(0);
      expect(m.position.y).toBeGreaterThanOrEqual(0);
      expect(m.position.x + (m.width ?? 0)).toBeLessThanOrEqual(zw + 1);
      expect(m.position.y + (m.height ?? 0)).toBeLessThanOrEqual(zh + 1);
    }
  });
});

describe("buildNodes('mechanics') expansion", () => {
  const station = Object.keys(MECHANICS)[0];
  const firstBox = MECHANICS[station as keyof typeof MECHANICS]!.parts[0];
  const firstId = `mech:${station}:${firstBox.id}`;

  it("grows the expanded box and its zone", () => {
    const collapsed = buildNodes("mechanics");
    const open = buildNodes("mechanics", new Set([firstId]));

    const byId = (ns: ReturnType<typeof buildNodes>) =>
      new Map(ns.map((n) => [n.id, n]));
    const cMap = byId(collapsed);
    const oMap = byId(open);

    // The expanded box is taller...
    expect((oMap.get(firstId)!.height ?? 0) as number).toBeGreaterThan(
      (cMap.get(firstId)!.height ?? 0) as number,
    );
    // ...and its zone grows to fit (boxes pack in a grid, so the row it lives in
    // gets taller and the whole section grows).
    const zoneId = `zone:${station}`;
    expect((oMap.get(zoneId)!.height ?? 0) as number).toBeGreaterThan(
      (cMap.get(zoneId)!.height ?? 0) as number,
    );
  });

  it("keeps expanded boxes inside the grown zone", () => {
    const open = buildNodes("mechanics", new Set([firstId]));
    const zones = new Map(
      open.filter((n) => n.data.kind === "zone").map((z) => [z.id, z]),
    );
    for (const m of open.filter((n) => n.data.kind === "mech")) {
      const z = zones.get(m.parentId!)!;
      expect(m.position.y + (m.height ?? 0)).toBeLessThanOrEqual(
        ((z.height ?? 0) as number) + 1,
      );
    }
  });
});

describe("buildMechanicsEdges", () => {
  it("references only real mech node ids", () => {
    const mechNodeIds = new Set(
      buildNodes("mechanics")
        .filter((n) => n.data.kind === "mech")
        .map((n) => n.id),
    );
    const edges = buildMechanicsEdges();
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      expect(mechNodeIds.has(e.source)).toBe(true);
      expect(mechNodeIds.has(e.target)).toBe(true);
    }
  });
});
