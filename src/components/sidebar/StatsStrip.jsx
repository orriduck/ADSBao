"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function StatsStrip({ metar = null, aircraftCount = 0 }) {
  const { t } = useI18n();
  const wind = formatWind(metar);
  const vis = formatVis(metar);
  const rule = metar?.flightCategory?.toUpperCase() || "—";
  const ruleColor = ruleAccent(rule);

  return (
    <div className="grid grid-cols-3 border-y border-[var(--atc-line)]">
      <Stat label={t("metrics.wind")} value={wind.value} unit={wind.unit} />
      <Stat label={t("metrics.visibility")} value={vis.value} unit={vis.unit} divided />
      <Stat
        label={t("metrics.rule")}
        value={rule}
        unit={`${aircraftCount} ADS-B`}
        valueColor={ruleColor}
        divided
      />
    </div>
  );
}

function Stat({ label, value, unit, divided = false, valueColor }) {
  return (
    <div
      className={`px-5 py-4 ${
        divided ? "border-l border-[var(--atc-line)]" : ""
      }`}
    >
      <div className="font-mono text-[9px] uppercase text-atc-faint">
        {label}
      </div>
      <div
        className="mt-2 font-mono text-[16px] font-semibold leading-none text-atc-text"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {unit ? (
        <div className="mt-1.5 font-mono text-[9px] uppercase text-atc-faint">
          {unit}
        </div>
      ) : null}
    </div>
  );
}

function formatWind(metar) {
  if (!metar) return { value: "—", unit: "kt" };
  const dir = metar.rawWvrb
    ? "VRB"
    : metar.rawWdir != null
      ? String(metar.rawWdir).padStart(3, "0")
      : null;
  const spd = metar.rawWspd != null ? String(metar.rawWspd) : null;
  if (!dir && !spd) return { value: "—", unit: "kt" };
  return { value: `${dir ?? "---"}/${spd ?? "--"}`, unit: "kt" };
}

function formatVis(metar) {
  if (!metar) return { value: "—", unit: "" };
  const v = metar.rawVisib;
  if (v == null || !Number.isFinite(Number(v))) return { value: "—", unit: "" };
  return { value: String(v), unit: "SM" };
}

function ruleAccent(rule) {
  switch (rule) {
    case "VFR":
      return "var(--aircraft-arrival)";
    case "MVFR":
      return "var(--atc-orange)";
    case "IFR":
    case "LIFR":
      return "var(--atc-red)";
    default:
      return undefined;
  }
}
