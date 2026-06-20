import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ProgressProvider, useProgress } from "./useProgress";
import { CARDS } from "../data/cards";
import { load, STORAGE_KEYS } from "../lib/storage";
import type { SrsMap } from "./srs";
import type { ReactNode } from "react";

const T0 = 1_000_000_000_000;

function wrapper({ children }: { children: ReactNode }) {
  return <ProgressProvider now={() => T0}>{children}</ProgressProvider>;
}

describe("useProgress", () => {
  it("starts at zero readiness", () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    expect(result.current.readiness).toBe(0);
    expect(result.current.mastered).toBe(0);
    expect(result.current.total).toBe(CARDS.length);
  });

  it("rating a card persists to localStorage", () => {
    const cardId = CARDS[0].id;
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => result.current.rate(cardId, "got"));

    const stored = load<SrsMap>(STORAGE_KEYS.srs, {});
    expect(stored[cardId]?.box).toBe(1);
    expect(result.current.srs[cardId]?.box).toBe(1);
  });

  it("mastering all cards in a station reaches full fluency", () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    const station = CARDS[0].stationId;
    const stationCards = CARDS.filter((c) => c.stationId === station);

    act(() => {
      for (let i = 0; i < 5; i++) {
        for (const c of stationCards) result.current.rate(c.id, "got");
      }
    });

    expect(result.current.fluency[station]).toBeCloseTo(1);
    expect(result.current.stationMastered[station]).toBe(stationCards.length);
  });

  it("reset clears all progress", () => {
    const { result } = renderHook(() => useProgress(), { wrapper });
    act(() => result.current.rate(CARDS[0].id, "got"));
    expect(result.current.mastered >= 0).toBe(true);
    act(() => result.current.reset());
    expect(result.current.srs).toEqual({});
    expect(result.current.readiness).toBe(0);
  });
});
