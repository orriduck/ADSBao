import { toFiniteNumber } from "@/utils/math";

const OPENAIP_NAVAID_TYPE_LABELS: Record<number, string> = {
  0: "DME",
  1: "TACAN",
  2: "NDB",
  3: "VOR",
  4: "VOR-DME",
  5: "VORTAC",
  6: "DVOR",
  7: "DVOR-DME",
  8: "DVORTAC",
};

export const formatNavaidType = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/^\d+$/.test(raw)) {
    return OPENAIP_NAVAID_TYPE_LABELS[Number(raw)] || "";
  }

  return raw.toUpperCase();
};

export const formatNavaidFrequency = (frequencyKhz: unknown) => {
  const value = toFiniteNumber(frequencyKhz);
  if (value == null) return "";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2).replace(/0$/, "").replace(/\.0$/, "")} MHz`;
  }
  return `${Math.round(value)} kHz`;
};

export const formatNavaidVariation = (value: unknown) => {
  const numeric = toFiniteNumber(value);
  if (numeric == null) return "";
  const direction = numeric < 0 ? "W" : "E";
  return `${Math.abs(numeric).toFixed(1).replace(/\.0$/, "")}°${direction}`;
};
