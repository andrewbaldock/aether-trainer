import { describe, it, expect } from "vitest";
import { buildNodes, buildEdges } from "./layout";
import { CARDS } from "../data/cards";
import { STATIONS, STATION_FLOW } from "../data/stations";

describe("buildNodes", () => {
  const nodes = buildNodes();
  const zones = nodes.filter((n) => n.data.kind === "zone");
  const parts = nodes.filter((n) => n.data.kind === "part");

  it("emits one zone node per station", () => {
    expect(zones).toHaveLength(STATIONS.length);
  });

  it("emits exactly one part node per card", () => {
    expect(parts).toHaveLength(CARDS.length);
    const cardIds = new Set(
      parts.map((p) => (p.data.kind === "part" ? p.data.card.id : "")),
    );
    expect(cardIds.size).toBe(CARDS.length);
  });

  it("parents every part to its zone", () => {
    for (const p of parts) {
      if (p.data.kind !== "part") continue;
      expect(p.parentId).toBe(`zone:${p.data.card.stationId}`);
      expect(p.extent).toBe("parent");
    }
  });

  it("keeps every part inside its zone bounds", () => {
    const zoneById = new Map(zones.map((z) => [z.id, z]));
    for (const p of parts) {
      const z = zoneById.get(p.parentId!);
      expect(z).toBeDefined();
      const zw = (z!.width ?? 0) as number;
      const zh = (z!.height ?? 0) as number;
      expect(p.position.x).toBeGreaterThanOrEqual(0);
      expect(p.position.y).toBeGreaterThanOrEqual(0);
      expect(p.position.x + (p.width ?? 0)).toBeLessThanOrEqual(zw + 1);
      expect(p.position.y + (p.height ?? 0)).toBeLessThanOrEqual(zh + 1);
    }
  });
});

describe("buildEdges", () => {
  it("emits one edge per flow connection, referencing real zone nodes", () => {
    const edges = buildEdges();
    expect(edges).toHaveLength(STATION_FLOW.length);
    const zoneIds = new Set(
      buildNodes()
        .filter((n) => n.data.kind === "zone")
        .map((n) => n.id),
    );
    for (const e of edges) {
      expect(zoneIds.has(e.source)).toBe(true);
      expect(zoneIds.has(e.target)).toBe(true);
    }
  });
});
