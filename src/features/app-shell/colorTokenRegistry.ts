export type ColorTokenGroupId =
  | "surface"
  | "text"
  | "border"
  | "interaction"
  | "aviation"
  | "airspace"
  | "navaidRadio";

type ColorToken = {
  name: string;
  cssVar: string;
  purpose: string;
};

type ColorTokenGroup = {
  id: ColorTokenGroupId;
  label: string;
  tokens: ColorToken[];
};

export const COLOR_TOKEN_GROUPS: ColorTokenGroup[] = [
  {
    id: "surface",
    label: "Surface",
    tokens: [
      { name: "appBackground", cssVar: "--atc-surface-app", purpose: "Page and map canvas background." },
      { name: "elevatedPanel", cssVar: "--atc-surface-panel", purpose: "Sidebar and elevated panel surface." },
      { name: "cardBackground", cssVar: "--atc-surface-card", purpose: "Default card and popover surface." },
      { name: "translucentScrim", cssVar: "--atc-surface-scrim", purpose: "Soft overlay/scrim wash." },
      { name: "mapGlassSurface", cssVar: "--atc-surface-map-glass", purpose: "Glass controls above the airport map." },
    ],
  },
  {
    id: "text",
    label: "Text",
    tokens: [
      { name: "primary", cssVar: "--atc-text-primary", purpose: "Main copy and telemetry text." },
      { name: "secondary", cssVar: "--atc-text-secondary", purpose: "Secondary labels and metadata." },
      { name: "muted", cssVar: "--atc-text-muted", purpose: "Low-emphasis text." },
      { name: "inverse", cssVar: "--atc-text-inverse", purpose: "Text on selected/active surfaces." },
      { name: "disabled", cssVar: "--atc-text-disabled", purpose: "Unavailable controls and stale text." },
    ],
  },
  {
    id: "border",
    label: "Border",
    tokens: [
      { name: "default", cssVar: "--atc-border-default", purpose: "Default dividers and card borders." },
      { name: "subtle", cssVar: "--atc-border-subtle", purpose: "Quiet dividers in dense UI." },
      { name: "active", cssVar: "--atc-border-active", purpose: "Selected/active outlines." },
      { name: "focusRing", cssVar: "--atc-focus-ring", purpose: "Keyboard focus ring." },
    ],
  },
  {
    id: "interaction",
    label: "Interaction",
    tokens: [
      { name: "primaryAccent", cssVar: "--atc-interaction-primary-accent", purpose: "Primary actions and key signals." },
      { name: "accentHover", cssVar: "--atc-interaction-accent-hover", purpose: "Hover state on controls." },
      { name: "selectedState", cssVar: "--atc-interaction-selected", purpose: "Selected cards and active choices." },
      { name: "activeModeState", cssVar: "--atc-interaction-active-mode", purpose: "Mode controls and map tools." },
      { name: "warningAttention", cssVar: "--atc-interaction-warning", purpose: "Warnings and attention states." },
      { name: "danger", cssVar: "--atc-interaction-danger", purpose: "Destructive or blocked state." },
    ],
  },
  {
    id: "aviation",
    label: "Aviation",
    tokens: [
      { name: "aircraftLivePosition", cssVar: "--aviation-aircraft-live-position", purpose: "Live aircraft markers." },
      { name: "aircraftFallbackPosition", cssVar: "--aviation-aircraft-fallback-position", purpose: "Inferred/fallback aircraft markers." },
      { name: "aircraftGroundPosition", cssVar: "--aviation-aircraft-ground-position", purpose: "Ground aircraft markers." },
      { name: "traceLine", cssVar: "--aviation-trace-line", purpose: "Selected aircraft trace line." },
      { name: "staleTraceLine", cssVar: "--aviation-trace-stale-line", purpose: "Older or stale trace segments." },
      { name: "routeHintLine", cssVar: "--aviation-route-hint-line", purpose: "Flight route hints and inferred route lines." },
      { name: "waypointTracePoint", cssVar: "--aviation-trace-point", purpose: "Trace points and route waypoints." },
    ],
  },
  {
    id: "airspace",
    label: "Airspace",
    tokens: [
      { name: "controlledFill", cssVar: "--airspace-controlled-fill", purpose: "Controlled airspace fill." },
      { name: "restrictedWarningFill", cssVar: "--airspace-restricted-warning-fill", purpose: "Restricted/warning airspace fill." },
      { name: "border", cssVar: "--airspace-border", purpose: "General airspace borders." },
      { name: "labelText", cssVar: "--airspace-label-text", purpose: "Airspace boundary labels." },
      { name: "altitudeFilteredState", cssVar: "--airspace-altitude-filtered-state", purpose: "Airspace filtered by altitude context." },
    ],
  },
  {
    id: "navaidRadio",
    label: "Navaid And Radio",
    tokens: [
      { name: "navaidMarker", cssVar: "--navaid-marker", purpose: "Navaid map marker signal." },
      { name: "navaidLabel", cssVar: "--navaid-label-text", purpose: "Navaid label text." },
      { name: "frequencyBadge", cssVar: "--navaid-frequency-badge", purpose: "ATC/frequency badges." },
      { name: "sourceBadge", cssVar: "--navaid-source-badge", purpose: "Provider/source badges." },
    ],
  },
];

export const IMMERSIVE_READY_COLOR_TOKENS = [
  { name: "skyDayBase", cssVar: "--immersive-sky-day-base" },
  { name: "skySunsetBase", cssVar: "--immersive-sky-sunset-base" },
  { name: "skyNightBase", cssVar: "--immersive-sky-night-base" },
  { name: "weatherClearAccent", cssVar: "--immersive-weather-clear-accent" },
  { name: "weatherCloudyAccent", cssVar: "--immersive-weather-cloudy-accent" },
  { name: "weatherStormAccent", cssVar: "--immersive-weather-storm-accent" },
  { name: "atmosphereGlow", cssVar: "--immersive-atmosphere-glow" },
] as const;

export function resolveColorTokenVar(groupId: ColorTokenGroupId, tokenName: string) {
  const group = COLOR_TOKEN_GROUPS.find((item) => item.id === groupId);
  const token = group?.tokens.find((item) => item.name === tokenName);
  if (!token) return "";
  return `var(${token.cssVar})`;
}
