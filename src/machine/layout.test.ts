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

describe("column layout", () => {
  const nodes = buildNodes("mechanics");
  const zonePos = new Map(
    nodes
      .filter((n) => n.data.kind === "zone")
      .map((n) => [
        (n.data as { stationId: string }).stationId,
        { y: n.position.y, x: n.position.x, h: (n.height ?? 0) as number },
      ]),
  );

  it("draws three background bands behind the zones", () => {
    const bands = nodes.filter((n) => n.data.kind === "band");
    expect(bands.map((b) => b.id).sort()).toEqual([
      "band:backend",
      "band:deploy",
      "band:frontend",
    ]);
    for (const b of bands) expect(b.zIndex ?? 0).toBeLessThan(0);
  });

  it("packs sections without any overlapping another", () => {
    const rects = nodes
      .filter((n) => n.data.kind === "zone")
      .map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        w: (n.width ?? 0) as number,
        h: (n.height ?? 0) as number,
      }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap =
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it("places contract above the columns and deploy below them", () => {
    const contract = zonePos.get("contract")!;
    const deploy = zonePos.get("deploy")!;
    const frontendTop = zonePos.get("frontend")!.y;
    const lastBackend = zonePos.get("persistence")!;
    expect(contract.y).toBeLessThan(frontendTop);
    expect(deploy.y).toBeGreaterThanOrEqual(lastBackend.y + lastBackend.h);
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
