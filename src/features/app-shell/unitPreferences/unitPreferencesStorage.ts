"use client";

import {
  DEFAULT_UNIT_PREFERENCES,
  normalizeUnitPreferences,
  type UnitPreferences,
} from "./unitPreferencesModel";

const STORAGE_KEY = "adsbao:unit-preferences:v1";

export function readStoredUnitPreferences(): UnitPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeUnitPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredUnitPreferences(
  preferences: UnitPreferences = DEFAULT_UNIT_PREFERENCES,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizeUnitPreferences(preferences)),
    );
  } catch {
    // localStorage unavailable (private mode / quota) — in-memory still applies.
  }
}
