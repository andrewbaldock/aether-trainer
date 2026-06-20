// Leitner spaced-repetition logic — pure functions, no React, no storage.
// 5 boxes (0..4). Higher box = longer interval = closer to "mastered".
// A card is considered MASTERED when it reaches the top box.

export type Rating = "got" | "fuzzy" | "missed";

export type CardState = {
  /** Leitner box, 0 (new/just-missed) .. 4 (mastered). */
  box: number;
  /** Epoch ms when this card is next due for review. */
  due: number;
  /** Total times reviewed. */
  reps: number;
  /** Last rating given. */
  last?: Rating;
};

export type SrsMap = Record<string, CardState>;

export const MAX_BOX = 4;

// Interval per box in milliseconds. Box 0 resurfaces within the same session.
const DAY = 24 * 60 * 60 * 1000;
export const BOX_INTERVALS_MS = [
  0, // box 0: due immediately (same session)
  1 * DAY, // box 1
  3 * DAY, // box 2
  7 * DAY, // box 3
  16 * DAY, // box 4 (mastered, still resurfaces eventually)
] as const;

export function newCardState(now: number): CardState {
  return { box: 0, due: now, reps: 0 };
}

/** Apply a rating to a card, returning the next state. Pure. */
export function rate(
  prev: CardState | undefined,
  rating: Rating,
  now: number,
): CardState {
  const base = prev ?? newCardState(now);
  let box = base.box;
  if (rating === "got") box = Math.min(MAX_BOX, box + 1);
  else if (rating === "fuzzy") box = Math.max(0, box); // hold position
  else box = 0; // missed -> back to box 0

  const interval = BOX_INTERVALS_MS[box] ?? 0;
  return {
    box,
    due: now + interval,
    reps: base.reps + 1,
    last: rating,
  };
}

export function isMastered(state: CardState | undefined): boolean {
  return !!state && state.box >= MAX_BOX;
}

export function isDue(state: CardState | undefined, now: number): boolean {
  // An unseen card (no state) is always due.
  if (!state) return true;
  return state.due <= now;
}

/** Cards due now, given all candidate ids and the srs map. */
export function dueCards(allIds: string[], srs: SrsMap, now: number): string[] {
  return allIds.filter((id) => isDue(srs[id], now));
}

/** Count of mastered cards among the given ids. */
export function masteredCount(ids: string[], srs: SrsMap): number {
  return ids.reduce((n, id) => (isMastered(srs[id]) ? n + 1 : n), 0);
}

/**
 * Station fluency in [0,1]: weighted by box level so partial progress shows.
 * Each card contributes box/MAX_BOX; an empty station is 0.
 */
export function stationFluency(ids: string[], srs: SrsMap): number {
  if (ids.length === 0) return 0;
  const sum = ids.reduce((acc, id) => acc + (srs[id]?.box ?? 0) / MAX_BOX, 0);
  return sum / ids.length;
}

/** Overall readiness in [0,1] = mastered / total. */
export function readiness(ids: string[], srs: SrsMap): number {
  if (ids.length === 0) return 0;
  return masteredCount(ids, srs) / ids.length;
}
