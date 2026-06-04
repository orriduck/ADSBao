import { resolveImmersiveLocalTime } from "./localTimeModel";

type ImmersivePhase =
  | "night"
  | "dawn"
  | "morning"
  | "day"
  | "afternoon"
  | "sunset"
  | "dusk";

export type ImmersiveMapPalette = {
  background: string;
  park: string;
  water: string;
  ice: string;
  landuse: string;
  wood: string;
  building: string;
  buildingOutline: string;
  aeroway: string;
  aerowayLine: string;
  pier: string;
  path: string;
  minorRoad: string;
  majorRoad: string;
  motorway: string;
  motorwayInner: string;
  rail: string;
  boundary: string;
  label: string;
  labelMuted: string;
  labelHalo: string;
  waterLabel: string;
  roadLabel: string;
  roadOpacity: number;
  roadLabelOpacity: number;
  roadShieldOpacity: number;
};

type ImmersiveAtmosphere = {
  top: string;
  horizon: string;
  side: string;
  vignette: string;
  lightCore: string;
  lightWash: string;
  lightHaze: string;
  shadowWash: string;
  opacity: number;
  lightOpacity: number;
  shadowOpacity: number;
  detailOpacity: number;
  filter: string;
  shadow: string;
};

type ImmersiveColorOptions = {
  date?: Date | string | number | null;
  lat?: unknown;
  lon?: unknown;
};

const MINUTES_PER_DAY = 24 * 60;

const DAWN_MAP_PALETTE: ImmersiveMapPalette = Object.freeze({
  background: "#1b244d",
  park: "#263756",
  water: "#253c62",
  ice: "#354d72",
  landuse: "#222d50",
  wood: "#283f58",
  building: "#29365a",
  buildingOutline: "#3e4a6d",
  aeroway: "#2b385d",
  aerowayLine: "#c6ccff",
  pier: "#303f63",
  path: "#303c61",
  minorRoad: "#333e62",
  majorRoad: "#404b70",
  motorway: "#4a547a",
  motorwayInner: "#596285",
  rail: "#485171",
  boundary: "#71698b",
  label: "#edf3ff",
  labelMuted: "#b8c3e5",
  labelHalo: "#151f45",
  waterLabel: "#a9d7ff",
  roadLabel: "#8f9abb",
  roadOpacity: 0.22,
  roadLabelOpacity: 0.38,
  roadShieldOpacity: 0.24,
});

const IMMERSIVE_PHASES: Record<
  ImmersivePhase,
  { mapPalette: ImmersiveMapPalette; atmosphere: ImmersiveAtmosphere }
> = Object.freeze({
  night: {
    mapPalette: {
      background: "#101624",
      park: "#182238",
      water: "#14263a",
      ice: "#24364b",
      landuse: "#151d30",
      wood: "#182b37",
      building: "#1a2233",
      buildingOutline: "#2a3548",
      aeroway: "#1b2538",
      aerowayLine: "#586f98",
      pier: "#202d40",
      path: "#222b3d",
      minorRoad: "#232d40",
      majorRoad: "#2a3549",
      motorway: "#33405a",
      motorwayInner: "#42506b",
      rail: "#3a4558",
      boundary: "#4b4860",
      label: "#8f9db9",
      labelMuted: "#6f7c96",
      labelHalo: "#0a0f1c",
      waterLabel: "#789fbd",
      roadLabel: "#68758d",
      roadOpacity: 0.18,
      roadLabelOpacity: 0.34,
      roadShieldOpacity: 0.22,
    },
    atmosphere: {
      top: "rgb(7 12 26 / 0.72)",
      horizon: "rgb(51 83 128 / 0.34)",
      side: "rgb(112 132 222 / 0.16)",
      vignette: "rgb(0 0 0 / 0.42)",
      lightCore: "rgb(159 186 236 / 0.18)",
      lightWash: "rgb(85 111 181 / 0.14)",
      lightHaze: "rgb(43 67 116 / 0.18)",
      shadowWash: "rgb(0 0 0 / 0.36)",
      opacity: 0.78,
      lightOpacity: 0.52,
      shadowOpacity: 0.72,
      detailOpacity: 0.9,
      filter: "saturate(1.1) contrast(0.95) brightness(0.86)",
      shadow: "0 28px 72px rgb(0 0 0 / 0.46)",
    },
  },
  dawn: {
    mapPalette: DAWN_MAP_PALETTE,
    atmosphere: {
      top: "rgb(10 16 48 / 0.5)",
      horizon: "rgb(255 183 92 / 0.44)",
      side: "rgb(163 178 255 / 0.2)",
      vignette: "rgb(13 18 53 / 0.34)",
      lightCore: "rgb(255 223 142 / 0.5)",
      lightWash: "rgb(255 151 76 / 0.26)",
      lightHaze: "rgb(255 206 134 / 0.22)",
      shadowWash: "rgb(16 23 58 / 0.28)",
      opacity: 0.86,
      lightOpacity: 0.82,
      shadowOpacity: 0.56,
      detailOpacity: 0.86,
      filter: "saturate(1.16) contrast(0.9) brightness(0.98)",
      shadow: "0 28px 70px rgb(24 31 76 / 0.34)",
    },
  },
  morning: {
    mapPalette: {
      background: "#e1e7df",
      park: "#d2ddc2",
      water: "#adcacd",
      ice: "#dfebe8",
      landuse: "#d9e1d0",
      wood: "#c6d6ba",
      building: "#d2d8d0",
      buildingOutline: "#b7c0b8",
      aeroway: "#d9ded7",
      aerowayLine: "#87978d",
      pier: "#d3ddda",
      path: "#c7cec5",
      minorRoad: "#c9d0c9",
      majorRoad: "#bbc5be",
      motorway: "#afbab1",
      motorwayInner: "#a0aca5",
      rail: "#9ba7a0",
      boundary: "#9aa7a0",
      label: "#4d5f5c",
      labelMuted: "#75837d",
      labelHalo: "#edf2ea",
      waterLabel: "#55747a",
      roadLabel: "#79867f",
      roadOpacity: 0.12,
      roadLabelOpacity: 0.28,
      roadShieldOpacity: 0.16,
    },
    atmosphere: {
      top: "rgb(132 191 205 / 0.24)",
      horizon: "rgb(255 213 139 / 0.4)",
      side: "rgb(104 143 150 / 0.18)",
      vignette: "rgb(65 81 71 / 0.24)",
      lightCore: "rgb(255 232 166 / 0.62)",
      lightWash: "rgb(255 180 91 / 0.34)",
      lightHaze: "rgb(185 218 204 / 0.24)",
      shadowWash: "rgb(66 87 84 / 0.22)",
      opacity: 0.82,
      lightOpacity: 0.96,
      shadowOpacity: 0.5,
      detailOpacity: 0.76,
      filter: "saturate(0.92) contrast(0.78) brightness(1.08)",
      shadow: "0 24px 62px rgb(65 86 82 / 0.22)",
    },
  },
  day: {
    mapPalette: {
      background: "#d7e4e8",
      park: "#c9d8c4",
      water: "#a9c5ca",
      ice: "#d8e8ee",
      landuse: "#d2ddcf",
      wood: "#bed0bd",
      building: "#cbd4d1",
      buildingOutline: "#b5c0bd",
      aeroway: "#d4ddda",
      aerowayLine: "#8a9b96",
      pier: "#ccd8d6",
      path: "#c0cbc8",
      minorRoad: "#c2ccc9",
      majorRoad: "#b4c0bc",
      motorway: "#a8b5b0",
      motorwayInner: "#99a7a3",
      rail: "#93a09c",
      boundary: "#9ba6a4",
      label: "#52615f",
      labelMuted: "#788481",
      labelHalo: "#e9f0ed",
      waterLabel: "#57737b",
      roadLabel: "#7a8582",
      roadOpacity: 0.12,
      roadLabelOpacity: 0.28,
      roadShieldOpacity: 0.16,
    },
    atmosphere: {
      top: "rgb(128 190 215 / 0.34)",
      horizon: "rgb(255 224 170 / 0.28)",
      side: "rgb(90 136 154 / 0.14)",
      vignette: "rgb(55 76 78 / 0.22)",
      lightCore: "rgb(255 246 205 / 0.38)",
      lightWash: "rgb(255 222 158 / 0.18)",
      lightHaze: "rgb(153 207 220 / 0.18)",
      shadowWash: "rgb(66 92 96 / 0.16)",
      opacity: 0.78,
      lightOpacity: 0.88,
      shadowOpacity: 0.42,
      detailOpacity: 0.8,
      filter: "saturate(0.88) contrast(0.82) brightness(1.08)",
      shadow: "0 24px 62px rgb(65 86 89 / 0.24)",
    },
  },
  afternoon: {
    mapPalette: {
      background: "#e3dfd2",
      park: "#d6d0b8",
      water: "#aec4c4",
      ice: "#e9e2d2",
      landuse: "#ddd8c7",
      wood: "#cfc8ab",
      building: "#d5d0c1",
      buildingOutline: "#beb4a0",
      aeroway: "#ded6c4",
      aerowayLine: "#8d877b",
      pier: "#d9d2c2",
      path: "#cbc6b6",
      minorRoad: "#d0c9b8",
      majorRoad: "#c2b9a6",
      motorway: "#b8ad96",
      motorwayInner: "#aa9f89",
      rail: "#9f947e",
      boundary: "#9a8977",
      label: "#5a5248",
      labelMuted: "#81786a",
      labelHalo: "#eee8d8",
      waterLabel: "#5b7273",
      roadLabel: "#837867",
      roadOpacity: 0.13,
      roadLabelOpacity: 0.3,
      roadShieldOpacity: 0.18,
    },
    atmosphere: {
      top: "rgb(176 199 202 / 0.2)",
      horizon: "rgb(255 196 126 / 0.34)",
      side: "rgb(204 156 103 / 0.2)",
      vignette: "rgb(85 63 45 / 0.22)",
      lightCore: "rgb(255 226 166 / 0.42)",
      lightWash: "rgb(255 164 88 / 0.26)",
      lightHaze: "rgb(221 192 149 / 0.2)",
      shadowWash: "rgb(87 68 55 / 0.18)",
      opacity: 0.8,
      lightOpacity: 0.86,
      shadowOpacity: 0.5,
      detailOpacity: 0.8,
      filter: "saturate(0.96) contrast(0.84) brightness(1.04)",
      shadow: "0 26px 68px rgb(85 63 45 / 0.24)",
    },
  },
  sunset: {
    mapPalette: {
      background: "#f4e7d2",
      park: "#ded5b9",
      water: "#d4bdad",
      ice: "#f1dec6",
      landuse: "#eadcc8",
      wood: "#d1c6a5",
      building: "#ded0bb",
      buildingOutline: "#c9b89f",
      aeroway: "#ead8c1",
      aerowayLine: "#5f3724",
      pier: "#ead8c1",
      path: "#d7c9b5",
      minorRoad: "#dbcdbb",
      majorRoad: "#cdbca9",
      motorway: "#bda890",
      motorwayInner: "#c9b8a2",
      rail: "#a58f78",
      boundary: "#9a7b66",
      label: "#35251b",
      labelMuted: "#7c6a58",
      labelHalo: "#f6ead8",
      waterLabel: "#6d5142",
      roadLabel: "#94826f",
      roadOpacity: 0.22,
      roadLabelOpacity: 0.38,
      roadShieldOpacity: 0.24,
    },
    atmosphere: {
      top: "rgb(255 194 94 / 0.22)",
      horizon: "rgb(255 119 46 / 0.48)",
      side: "rgb(255 235 171 / 0.2)",
      vignette: "rgb(94 45 23 / 0.3)",
      lightCore: "rgb(255 206 118 / 0.56)",
      lightWash: "rgb(255 119 58 / 0.32)",
      lightHaze: "rgb(255 198 124 / 0.24)",
      shadowWash: "rgb(109 48 25 / 0.24)",
      opacity: 0.84,
      lightOpacity: 0.88,
      shadowOpacity: 0.54,
      detailOpacity: 0.84,
      filter: "saturate(1.12) contrast(0.88) brightness(1.02)",
      shadow: "0 28px 72px rgb(99 51 24 / 0.26)",
    },
  },
  dusk: {
    mapPalette: {
      background: "#20233a",
      park: "#29334a",
      water: "#29384d",
      ice: "#39485d",
      landuse: "#242b40",
      wood: "#293b47",
      building: "#2a3044",
      buildingOutline: "#41485d",
      aeroway: "#2d3448",
      aerowayLine: "#9f8ab2",
      pier: "#343c50",
      path: "#353b4e",
      minorRoad: "#383f52",
      majorRoad: "#454a60",
      motorway: "#554e68",
      motorwayInner: "#665d76",
      rail: "#5f6272",
      boundary: "#67596c",
      label: "#d7d2e6",
      labelMuted: "#a79fb9",
      labelHalo: "#16192d",
      waterLabel: "#9fc0dc",
      roadLabel: "#948da5",
      roadOpacity: 0.2,
      roadLabelOpacity: 0.36,
      roadShieldOpacity: 0.24,
    },
    atmosphere: {
      top: "rgb(25 24 56 / 0.5)",
      horizon: "rgb(236 112 78 / 0.36)",
      side: "rgb(132 108 202 / 0.22)",
      vignette: "rgb(11 13 29 / 0.34)",
      lightCore: "rgb(244 144 108 / 0.32)",
      lightWash: "rgb(150 104 210 / 0.22)",
      lightHaze: "rgb(111 99 182 / 0.18)",
      shadowWash: "rgb(10 12 31 / 0.32)",
      opacity: 0.84,
      lightOpacity: 0.72,
      shadowOpacity: 0.64,
      detailOpacity: 0.88,
      filter: "saturate(1.16) contrast(0.92) brightness(0.9)",
      shadow: "0 28px 72px rgb(20 19 43 / 0.42)",
    },
  },
});

function normalizeMinutes(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return ((Math.round(numeric) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function resolvePhase(localMinutes: number): ImmersivePhase {
  if (localMinutes >= 1260 || localMinutes < 300) return "night";
  if (localMinutes < 450) return "dawn";
  if (localMinutes < 660) return "morning";
  if (localMinutes < 900) return "day";
  if (localMinutes < 960) return "afternoon";
  if (localMinutes < 1140) return "sunset";
  return "dusk";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

function formatDegrees(value: number) {
  return `${Math.round(value)}deg`;
}

function resolveLightGeometry(localMinutes: number, phase: ImmersivePhase) {
  if (phase === "night") {
    const nightMinutes =
      localMinutes >= 1260 ? localMinutes - 1260 : localMinutes + 180;
    const progress = clamp(nightMinutes / 480, 0, 1);
    return {
      lightAngle: formatDegrees(132 - progress * 48),
      lightX: formatPercent(74 - progress * 48),
      lightY: formatPercent(22 + Math.sin(progress * Math.PI) * 8),
    };
  }

  const daylightProgress = clamp((localMinutes - 300) / 960, 0, 1);
  const arc = Math.sin(daylightProgress * Math.PI);
  return {
    lightAngle: formatDegrees(112 + daylightProgress * 58),
    lightX: formatPercent(16 + daylightProgress * 78),
    lightY: formatPercent(78 - arc * 60),
  };
}

function buildCssProperties(
  atmosphere: ImmersiveAtmosphere,
  localMinutes: number,
  phase: ImmersivePhase,
) {
  const light = resolveLightGeometry(localMinutes, phase);

  return {
    "--immersive-atmosphere-top": atmosphere.top,
    "--immersive-atmosphere-horizon": atmosphere.horizon,
    "--immersive-atmosphere-side": atmosphere.side,
    "--immersive-atmosphere-vignette": atmosphere.vignette,
    "--immersive-light-angle": light.lightAngle,
    "--immersive-light-x": light.lightX,
    "--immersive-light-y": light.lightY,
    "--immersive-light-core": atmosphere.lightCore,
    "--immersive-light-wash": atmosphere.lightWash,
    "--immersive-light-haze": atmosphere.lightHaze,
    "--immersive-shadow-wash": atmosphere.shadowWash,
    "--immersive-atmosphere-opacity": String(atmosphere.opacity),
    "--immersive-light-opacity": String(atmosphere.lightOpacity),
    "--immersive-shadow-opacity": String(atmosphere.shadowOpacity),
    "--immersive-map-detail-opacity": String(atmosphere.detailOpacity),
    "--immersive-atmosphere-filter": atmosphere.filter,
    "--immersive-map-stage-shadow": atmosphere.shadow,
  };
}

export function resolveImmersiveColorSchemeFromLocalMinutes(localMinutes: unknown) {
  const bucketMinutes = normalizeMinutes(localMinutes);
  const phase = resolvePhase(bucketMinutes);
  const scheme = IMMERSIVE_PHASES[phase];

  return {
    atmosphere: scheme.atmosphere,
    cacheKey: `immersive-local-${bucketMinutes}`,
    cssProperties: buildCssProperties(scheme.atmosphere, bucketMinutes, phase),
    localTime: null,
    mapPalette: scheme.mapPalette,
    phase,
  };
}

export function resolveImmersiveColorScheme(options: ImmersiveColorOptions = {}) {
  const localTime = resolveImmersiveLocalTime(options);
  const scheme = resolveImmersiveColorSchemeFromLocalMinutes(
    localTime.bucketMinutes,
  );

  return {
    ...scheme,
    cacheKey: localTime.cacheKey,
    localTime,
  };
}
