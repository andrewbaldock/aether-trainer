// Tiny typed localStorage wrapper. All trainer state is namespaced under "at:".

const PREFIX = "at:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota or unavailable — non-fatal for a study app.
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  srs: "srs",
  apiKey: "apiKey",
  explainLog: "explainLog",
  diagnoseStats: "diagnoseStats",
} as const;
