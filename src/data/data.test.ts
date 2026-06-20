import { describe, it, expect } from "vitest";
import { STATIONS, STATION_IDS, STATION_FLOW } from "./stations";
import { CARDS, CARDS_BY_STATION, GOTCHA_CARDS } from "./cards";
import { SYMPTOMS } from "./diagnose";
import { EXPLAIN_PROMPTS } from "./explain";

const STATION_SET = new Set<string>(STATION_IDS);

describe("stations", () => {
  it("has exactly 13 zones with unique ids", () => {
    expect(STATIONS).toHaveLength(13);
    expect(new Set(STATION_IDS).size).toBe(13);
  });

  it("flow edges only reference real stations", () => {
    for (const { from, to } of STATION_FLOW) {
      expect(STATION_SET.has(from)).toBe(true);
      expect(STATION_SET.has(to)).toBe(true);
    }
  });
});

describe("cards", () => {
  it("has unique ids", () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every card points at a real station", () => {
    for (const c of CARDS) {
      expect(STATION_SET.has(c.stationId)).toBe(true);
    }
  });

  it("every card has non-empty front and back", () => {
    for (const c of CARDS) {
      expect(c.front.trim().length).toBeGreaterThan(0);
      expect(c.back.trim().length).toBeGreaterThan(0);
    }
  });

  it("every station has at least 3 cards", () => {
    for (const id of STATION_IDS) {
      expect((CARDS_BY_STATION[id] ?? []).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("has a substantial deck (the ~100-card requirement)", () => {
    expect(CARDS.length).toBeGreaterThanOrEqual(80);
  });

  it("has a healthy set of gotcha cards", () => {
    expect(GOTCHA_CARDS.length).toBeGreaterThanOrEqual(20);
  });
});

describe("diagnose", () => {
  it("has unique ids and real station answers", () => {
    const ids = SYMPTOMS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SYMPTOMS) {
      expect(STATION_SET.has(s.answer)).toBe(true);
    }
  });

  it("every symptom cardId (if set) resolves to a real card", () => {
    const cardIds = new Set(CARDS.map((c) => c.id));
    for (const s of SYMPTOMS) {
      if (s.cardId) expect(cardIds.has(s.cardId)).toBe(true);
    }
  });
});

describe("explain", () => {
  it("has unique ids and mustHit references real stations", () => {
    const ids = EXPLAIN_PROMPTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of EXPLAIN_PROMPTS) {
      expect(p.mustHit.length).toBeGreaterThan(0);
      for (const sid of p.mustHit) expect(STATION_SET.has(sid)).toBe(true);
    }
  });

  it("every prompt has a rubric", () => {
    for (const p of EXPLAIN_PROMPTS) {
      expect(p.rubric.length).toBeGreaterThan(0);
    }
  });
});
