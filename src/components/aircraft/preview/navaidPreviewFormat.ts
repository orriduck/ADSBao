import { toFiniteNumber } from "@/utils/math";

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
