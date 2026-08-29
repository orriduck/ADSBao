export type ThreeOsmContrastMode = "standard" | "more" | "forced";

export type ThreeOsmAccessibilityPreferences = {
  reducedMotion: boolean;
  contrastMode: ThreeOsmContrastMode;
};

export type ThreeOsmAccessibilityMediaState = {
  reducedMotion: boolean;
  moreContrast: boolean;
  forcedColors: boolean;
};

export type ThreeOsmAccessibilityDebugOverrides = {
  motion: "system" | "reduce" | "no-preference";
  contrast: "system" | ThreeOsmContrastMode;
};

export type ThreeOsmSystemColors = {
  canvas: string;
  canvasText: string;
  highlight: string;
  highlightText: string;
};

export type ThreeOsmVisualPalette = {
  background: number;
  foreground: number;
  inverse: number;
  focalAirport: number;
  aircraft: number;
  aircraftHalo: number;
  selectedAircraft: number;
  focalAircraft: number;
  aircraftSelectionRing: number;
  aircraftStem: number;
  contextMarker: number;
  airportMarker: number;
  selectedContextMarker: number;
  runway: number;
  runwayLightWhite: number;
  runwayLightAmber: number;
  taxiwayLightBlue: number;
  taxiwayLightGreen: number;
  airspace: number;
  selectedAirspace: number;
  userLocation: number;
  tracePrimary: number;
  traceSecondary: number;
  route: number;
  lineOpacity: number;
  mutedLineOpacity: number;
  label: {
    background: string;
    contextBackground: string;
    text: string;
    border: string;
    selectedBackground: string;
    selectedText: string;
    focalBackground: string;
    focalText: string;
    borderWidth: number;
  };
};

export const THREE_OSM_ACCESSIBILITY_DEBUG_DEFAULTS = {
  motion: "system",
  contrast: "system",
} as const satisfies ThreeOsmAccessibilityDebugOverrides;

export function parseThreeOsmAccessibilityDebugOverrides(
  searchParams: URLSearchParams,
): ThreeOsmAccessibilityDebugOverrides {
  const motion = searchParams.get("threeOsmMotion");
  const contrast = searchParams.get("threeOsmContrast");
  return {
    motion:
      motion === "reduce" || motion === "no-preference" ? motion : "system",
    contrast:
      contrast === "standard" || contrast === "more" || contrast === "forced"
        ? contrast
        : "system",
  };
}

export function resolveThreeOsmAccessibilityPreferences({
  media,
  debugEnabled = false,
  debugOverrides = THREE_OSM_ACCESSIBILITY_DEBUG_DEFAULTS,
}: {
  media: ThreeOsmAccessibilityMediaState;
  debugEnabled?: boolean;
  debugOverrides?: ThreeOsmAccessibilityDebugOverrides;
}): ThreeOsmAccessibilityPreferences {
  const reducedMotion =
    debugEnabled && debugOverrides.motion !== "system"
      ? debugOverrides.motion === "reduce"
      : media.reducedMotion;
  const contrastMode =
    debugEnabled && debugOverrides.contrast !== "system"
      ? debugOverrides.contrast
      : media.forcedColors
        ? "forced"
        : media.moreContrast
          ? "more"
          : "standard";
  return { reducedMotion, contrastMode };
}

export function resolveThreeOsmVisualPalette({
  theme,
  contrastMode,
  systemColors = null,
}: {
  theme: string;
  contrastMode: ThreeOsmContrastMode;
  systemColors?: ThreeOsmSystemColors | null;
}): ThreeOsmVisualPalette {
  const light = theme === "light";
  const highContrast = contrastMode !== "standard";
  const foreground = light ? 0x000000 : 0xffffff;
  const inverse = light ? 0xffffff : 0x000000;
  const foregroundCss = light ? "#000000" : "#ffffff";
  const inverseCss = light ? "#ffffff" : "#000000";

  if (contrastMode === "forced" && systemColors) {
    const canvas = cssColorToHexNumber(systemColors.canvas, inverse);
    const canvasText = cssColorToHexNumber(systemColors.canvasText, foreground);
    const highlight = cssColorToHexNumber(systemColors.highlight, canvasText);
    return {
      background: canvas,
      foreground: canvasText,
      inverse: canvas,
      focalAirport: highlight,
      aircraft: canvasText,
      aircraftHalo: canvas,
      selectedAircraft: highlight,
      focalAircraft: highlight,
      aircraftSelectionRing: canvasText,
      aircraftStem: canvasText,
      contextMarker: canvasText,
      airportMarker: canvasText,
      selectedContextMarker: highlight,
      runway: canvasText,
      runwayLightWhite: canvasText,
      runwayLightAmber: canvasText,
      taxiwayLightBlue: canvasText,
      taxiwayLightGreen: canvasText,
      airspace: canvasText,
      selectedAirspace: highlight,
      userLocation: canvasText,
      tracePrimary: canvasText,
      traceSecondary: canvasText,
      route: canvasText,
      lineOpacity: 1,
      mutedLineOpacity: 0.78,
      label: {
        background: systemColors.canvas,
        contextBackground: systemColors.canvas,
        text: systemColors.canvasText,
        border: systemColors.canvasText,
        selectedBackground: systemColors.highlight,
        selectedText: systemColors.highlightText,
        focalBackground: systemColors.highlight,
        focalText: systemColors.highlightText,
        borderWidth: 2,
      },
    };
  }

  if (highContrast) {
    return {
      background: inverse,
      foreground,
      inverse,
      focalAirport: contrastMode === "forced" ? foreground : 0xf5c542,
      aircraft: foreground,
      aircraftHalo: inverse,
      selectedAircraft: foreground,
      focalAircraft: foreground,
      aircraftSelectionRing: foreground,
      aircraftStem: foreground,
      contextMarker: foreground,
      airportMarker: foreground,
      selectedContextMarker: foreground,
      runway: foreground,
      runwayLightWhite: foreground,
      runwayLightAmber: foreground,
      taxiwayLightBlue: foreground,
      taxiwayLightGreen: foreground,
      airspace: foreground,
      selectedAirspace: foreground,
      userLocation: foreground,
      tracePrimary: foreground,
      traceSecondary: foreground,
      route: foreground,
      lineOpacity: 1,
      mutedLineOpacity: 0.78,
      label: {
        background: inverseCss,
        contextBackground: inverseCss,
        text: foregroundCss,
        border: foregroundCss,
        selectedBackground: foregroundCss,
        selectedText: inverseCss,
        focalBackground:
          contrastMode === "forced" ? foregroundCss : "#f5c542",
        focalText: contrastMode === "forced" ? inverseCss : "#101111",
        borderWidth: 2,
      },
    };
  }

  return {
    background: light ? 0xd8d8d5 : 0x101111,
    foreground: light ? 0x1e201f : 0xf0eee7,
    inverse: light ? 0xf7f5ef : 0x20211f,
    focalAirport: 0xf5c542,
    aircraft: light ? 0x1e201f : 0xf0eee7,
    aircraftHalo: light ? 0xf7f5ef : 0x20211f,
    selectedAircraft: light ? 0x414341 : 0xb7bab7,
    focalAircraft: light ? 0xcf6a1e : 0xe8893f,
    aircraftSelectionRing: 0xffffff,
    aircraftStem: light ? 0x4c4e4c : 0xc9c6bc,
    contextMarker: light ? 0x3c3e3c : 0xd2d0ca,
    airportMarker: light ? 0x252725 : 0xe4e1d8,
    selectedContextMarker: light ? 0x414341 : 0xb7bab7,
    runway: light ? 0x1d1e1d : 0xf4f1e8,
    runwayLightWhite: 0xffffff,
    runwayLightAmber: 0xffc23d,
    taxiwayLightBlue: 0x3f86ff,
    taxiwayLightGreen: 0x46ff8c,
    airspace: light ? 0x515451 : 0xc6c9c6,
    selectedAirspace: light ? 0x242624 : 0xf5c542,
    userLocation: light ? 0x414341 : 0xd7d9d7,
    tracePrimary: light ? 0x353735 : 0xd8dad8,
    traceSecondary: light ? 0x686b68 : 0xa5a8a5,
    route: light ? 0x4b4e4b : 0xc4c7c4,
    lineOpacity: 0.72,
    mutedLineOpacity: 0.28,
    label: {
      background: light ? "rgba(255,255,255,.94)" : "rgba(0,0,0,.88)",
      contextBackground: light
        ? "rgba(255,255,255,.86)"
        : "rgba(0,0,0,.74)",
      text: light ? "#111211" : "#f2f0e9",
      border: light ? "rgba(0,0,0,.32)" : "rgba(255,255,255,.35)",
      selectedBackground: light
        ? "rgba(65,67,65,.94)"
        : "rgba(183,186,183,.92)",
      selectedText: light ? "#ffffff" : "#111211",
      focalBackground: "#f5c542",
      focalText: "#101111",
      borderWidth: 1,
    },
  };
}

export function cssColorToHexNumber(value: string, fallback: number) {
  const normalized = value.trim().toLowerCase();
  const hex = normalized.match(/^#([0-9a-f]{6})$/i);
  if (hex) return Number.parseInt(hex[1], 16);
  const rgb = normalized.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/,
  );
  if (!rgb) return fallback;
  const channels = rgb.slice(1, 4).map((channel) =>
    Math.max(0, Math.min(255, Math.round(Number(channel)))),
  );
  return (channels[0] << 16) | (channels[1] << 8) | channels[2];
}
