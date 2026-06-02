"use client";

import {
  DEFAULT_MAP_SETTINGS,
  normalizeMapSettings,
} from "./mapSettingsModel";

export const MAP_SETTINGS_STORAGE_KEY = "adsbao:airport-map-settings:v1";

export function readStoredMapSettings() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAP_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return normalizeMapSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredMapSettings(settings = DEFAULT_MAP_SETTINGS) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MAP_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeMapSettings(settings)),
    );
  } catch {
    // Browser storage can be unavailable; the current in-memory settings still apply.
  }
}
