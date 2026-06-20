import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { load, save, STORAGE_KEYS } from "../lib/storage";
import {
  rate as rateCard,
  readiness as calcReadiness,
  stationFluency as calcFluency,
  masteredCount,
  dueCards,
  type Rating,
  type SrsMap,
} from "./srs";
import { CARDS, CARDS_BY_STATION } from "../data/cards";
import { STATION_IDS, type StationId } from "../data/stations";

const ALL_CARD_IDS = CARDS.map((c) => c.id);

type ProgressValue = {
  srs: SrsMap;
  /** Apply a rating to a card and persist. */
  rate: (cardId: string, rating: Rating) => void;
  /** Overall interview-readiness in [0,1]. */
  readiness: number;
  /** Mastered card count. */
  mastered: number;
  total: number;
  /** Per-station fluency [0,1]. */
  fluency: Record<StationId, number>;
  /** Per-station mastered counts. */
  stationMastered: Record<StationId, number>;
  /** Card ids due for review right now. */
  due: string[];
  /** Reset all progress (for the Reset button). */
  reset: () => void;
};

const ProgressContext = createContext<ProgressValue | null>(null);

// `now` is injectable for tests; defaults to wall clock at call time.
export function ProgressProvider({
  children,
  now = () => Date.now(),
}: {
  children: ReactNode;
  now?: () => number;
}) {
  const [srs, setSrs] = useState<SrsMap>(() =>
    load<SrsMap>(STORAGE_KEYS.srs, {}),
  );

  const rate = useCallback(
    (cardId: string, rating: Rating) => {
      setSrs((prev) => {
        const next: SrsMap = {
          ...prev,
          [cardId]: rateCard(prev[cardId], rating, now()),
        };
        save(STORAGE_KEYS.srs, next);
        return next;
      });
    },
    [now],
  );

  const reset = useCallback(() => {
    setSrs({});
    save(STORAGE_KEYS.srs, {});
  }, []);

  const value = useMemo<ProgressValue>(() => {
    const fluency = {} as Record<StationId, number>;
    const stationMastered = {} as Record<StationId, number>;
    for (const id of STATION_IDS) {
      const ids = (CARDS_BY_STATION[id] ?? []).map((c) => c.id);
      fluency[id] = calcFluency(ids, srs);
      stationMastered[id] = masteredCount(ids, srs);
    }
    return {
      srs,
      rate,
      readiness: calcReadiness(ALL_CARD_IDS, srs),
      mastered: masteredCount(ALL_CARD_IDS, srs),
      total: ALL_CARD_IDS.length,
      fluency,
      stationMastered,
      due: dueCards(ALL_CARD_IDS, srs, now()),
      reset,
    };
  }, [srs, rate, reset, now]);

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
