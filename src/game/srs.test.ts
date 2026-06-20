import { describe, it, expect } from "vitest";
import {
  rate,
  isMastered,
  isDue,
  dueCards,
  stationFluency,
  readiness,
  newCardState,
  MAX_BOX,
  BOX_INTERVALS_MS,
  type SrsMap,
} from "./srs";

const T0 = 1_000_000_000_000;

describe("rate", () => {
  it("promotes one box on 'got'", () => {
    const s = rate(undefined, "got", T0);
    expect(s.box).toBe(1);
    expect(s.reps).toBe(1);
    expect(s.due).toBe(T0 + BOX_INTERVALS_MS[1]);
  });

  it("holds box on 'fuzzy'", () => {
    let s = rate(undefined, "got", T0); // box 1
    s = rate(s, "got", T0); // box 2
    const held = rate(s, "fuzzy", T0);
    expect(held.box).toBe(2);
  });

  it("resets to box 0 on 'missed' and is due immediately", () => {
    let s = rate(undefined, "got", T0); // box 1
    s = rate(s, "got", T0); // box 2
    const missed = rate(s, "missed", T0);
    expect(missed.box).toBe(0);
    expect(missed.due).toBe(T0); // interval 0
    expect(isDue(missed, T0)).toBe(true);
  });

  it("caps at MAX_BOX", () => {
    let s = newCardState(T0);
    for (let i = 0; i < 10; i++) s = rate(s, "got", T0);
    expect(s.box).toBe(MAX_BOX);
    expect(isMastered(s)).toBe(true);
  });
});

describe("scheduling", () => {
  it("an unseen card is always due", () => {
    expect(isDue(undefined, T0)).toBe(true);
  });

  it("a freshly-promoted card is not due until its interval passes", () => {
    const s = rate(undefined, "got", T0); // box 1, due T0 + 1 day
    expect(isDue(s, T0)).toBe(false);
    expect(isDue(s, T0 + BOX_INTERVALS_MS[1])).toBe(true);
  });

  it("dueCards returns unseen + overdue ids", () => {
    const srs: SrsMap = {
      a: rate(undefined, "got", T0), // not due
      b: rate(undefined, "missed", T0), // due now
    };
    const due = dueCards(["a", "b", "c"], srs, T0);
    expect(due).toContain("b"); // missed
    expect(due).toContain("c"); // unseen
    expect(due).not.toContain("a");
  });
});

describe("aggregates", () => {
  it("stationFluency averages box ratios", () => {
    const srs: SrsMap = {
      a: { box: MAX_BOX, due: T0, reps: 5 }, // 1.0
      b: { box: 0, due: T0, reps: 1 }, // 0.0
    };
    expect(stationFluency(["a", "b"], srs)).toBeCloseTo(0.5);
    expect(stationFluency([], srs)).toBe(0);
  });

  it("readiness = mastered / total", () => {
    const srs: SrsMap = {
      a: { box: MAX_BOX, due: T0, reps: 5 },
      b: { box: 1, due: T0, reps: 1 },
    };
    expect(readiness(["a", "b"], srs)).toBe(0.5);
    expect(readiness(["a", "b", "c", "d"], srs)).toBe(0.25);
  });
});
