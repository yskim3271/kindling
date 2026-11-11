import type { ReadingResult } from "@/lib/agent";
import { parsePreferences, type Preferences } from "@/lib/preferences";

/**
 * Kindling has no accounts, so a patron's preferences and the result of their
 * last reading live in this browser's storage. Every call is guarded: storage
 * can be blocked or empty, and the pages must still work without it.
 */
const PREFERENCES = "kindling.preferences.v1";
const READINGS = "kindling.readings.v1";

export function loadPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(PREFERENCES);
    if (!raw) return null;
    const parsed = parsePreferences(JSON.parse(raw));
    return typeof parsed === "string" ? null : parsed;
  } catch {
    return null;
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES, JSON.stringify(preferences));
  } catch {
    // Storage is unavailable; the preferences still apply to this visit.
  }
}

export function saveReadings(readings: ReadingResult[]): void {
  try {
    const fits = Object.fromEntries(readings.map((r) => [r.pitch.id, { fit: r.fit, verdict: r.verdict }]));
    localStorage.setItem(READINGS, JSON.stringify(fits));
  } catch {
    // Nothing depends on this being kept.
  }
}

/** The fit from the patron's last reading, for letters that fit their preferences. */
export function loadFit(pitchId: string): number | null {
  try {
    const raw = localStorage.getItem(READINGS);
    if (!raw) return null;
    const entry = (JSON.parse(raw) as Record<string, { fit?: unknown; verdict?: unknown }>)[pitchId];
    const fits = entry?.verdict === "recommended" || entry?.verdict === "matched";
    return fits && typeof entry.fit === "number" ? entry.fit : null;
  } catch {
    return null;
  }
}
