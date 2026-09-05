import type { UnitPreferences } from "@/features/app-shell/unitPreferences/unitPreferencesModel";
import {
  convertTemperatureFromC,
  formatAltitudeFromMeters,
  formatGroundSpeed,
  temperatureUnitLabel,
  type GroundSpeedUnit,
} from "@/utils/units";

// Pure view-model for the joined airport summary. Fixed airports expose the
// two weather views, ATC, and spotting below the total-flight headline; here
// mode instead keeps the user's own movement readouts. The component only maps
// these descriptors to StatTile, resolving i18n and click handlers there.

type SidebarStatInteraction =
  // A view switch (active when activeView === view); the component wires it to
  // onViewChange.
  | { kind: "view"; view: string }
  // The spotting cell switches view but runs a dedicated open handler.
  | { kind: "spotting" }
  // The here-mode speed cell toggles its km/h ⇄ mph unit.
  | { kind: "groundSpeedToggle" }
  // A static readout (here-mode altitude) — no hover/active affordance.
  | { kind: "readonly" };

export type SidebarStat = {
  id: string;
  labelKey: string;
  // Already-resolved display value. `null` renders as an em dash (no GPS fix);
  // a number renders through AnimatedNumber when `display` is "number".
  value: number | string | null;
  display: "number" | "text";
  unit?: string;
  prefix?: string;
  interaction: SidebarStatInteraction;
};

export type SidebarStats = {
  movementRow: SidebarStat[];
  contextRow: SidebarStat[];
};

export type BuildSidebarStatsInput = {
  nearMe: boolean;
  selfSpeedMps: number | null;
  selfAltitudeMeters: number | null;
  // Device-compass heading in degrees, or null when the compass has no signal.
  selfHeadingDeg: number | null;
  groundSpeedUnit: GroundSpeedUnit;
  metar: { flightCategory?: unknown } | null;
  metarLoading: boolean;
  localTemperatureC: number | null;
  localWeatherLoading: boolean;
  units: UnitPreferences;
  atcCount: number;
  spottingCount: number;
};

function localTemperature(
  temperatureC: number | null,
  unit: UnitPreferences["temperature"],
): { value: number | string; unit: string } {
  const label = temperatureUnitLabel(unit);
  const temp = Number(temperatureC);
  if (!Number.isFinite(temp)) return { value: "—", unit: label };
  return { value: Math.round(convertTemperatureFromC(temp, unit)), unit: label };
}

export function buildSidebarStats(input: BuildSidebarStatsInput): SidebarStats {
  const {
    nearMe,
    selfSpeedMps,
    selfAltitudeMeters,
    selfHeadingDeg,
    groundSpeedUnit,
    metar,
    metarLoading,
    localTemperatureC,
    localWeatherLoading,
    units,
    atcCount,
    spottingCount,
  } = input;

  const movementRow: SidebarStat[] = [];
  if (nearMe) {
    const speed = formatGroundSpeed(selfSpeedMps, groundSpeedUnit);
    const altitude = formatAltitudeFromMeters(selfAltitudeMeters, units.altitude, {
      kind: "ground",
    });
    movementRow.push({
      id: "selfSpeed",
      labelKey: "sidebar.speed",
      value: speed ? speed.value : null,
      display: "number",
      unit: speed?.unit,
      interaction: { kind: "groundSpeedToggle" },
    });
    movementRow.push({
      id: "selfAltitude",
      labelKey: "sidebar.altitude",
      value: altitude ? altitude.value : null,
      display: "number",
      unit: altitude?.unit,
      prefix: altitude?.prefix,
      interaction: { kind: "readonly" },
    });
  }

  const temperature = localWeatherLoading
    ? { value: "—" as const, unit: temperatureUnitLabel(units.temperature) }
    : localTemperature(localTemperatureC, units.temperature);
  const flightRule = String(metar?.flightCategory ?? "").trim();

  const contextRow: SidebarStat[] = nearMe
    ? [
        {
          id: "briefing",
          labelKey: "sidebar.weather",
          value: temperature.value,
          display: "text",
          unit: temperature.value === "—" ? undefined : temperature.unit,
          interaction: { kind: "view", view: "weather" },
        },
      ]
    : [
        {
          id: "weather",
          labelKey: "sidebar.weather",
          value: temperature.value,
          display: "text",
          unit: temperature.value === "—" ? undefined : temperature.unit,
          interaction: { kind: "view", view: "weather" },
        },
        {
          id: "flightRules",
          labelKey: "sidebar.flightRule",
          value: metarLoading ? "—" : flightRule || "—",
          display: "text",
          interaction: { kind: "view", view: "flightRules" },
        },
        {
          id: "atc",
          labelKey: "sidebar.atc",
          value: atcCount,
          display: "number",
          interaction: { kind: "view", view: "atc" },
        },
        {
          id: "spotting",
          labelKey: "sidebar.spotting",
          value: spottingCount,
          display: "number",
          interaction: { kind: "spotting" },
        },
      ];

  if (nearMe && atcCount > 0) {
    contextRow.push({
      id: "atc",
      labelKey: "sidebar.atc",
      value: atcCount,
      display: "number",
      interaction: { kind: "view", view: "atc" },
    });
  }
  if (nearMe) {
    // Here mode has no airport, so there are never candidate spots to count —
    // the cell becomes the user's own compass bearing instead. No signal → em
    // dash (never a bogus 0°). Padded to the app's 3-digit bearing convention.
    const bearing =
      selfHeadingDeg == null || !Number.isFinite(selfHeadingDeg)
        ? null
        : String(((Math.round(selfHeadingDeg) % 360) + 360) % 360).padStart(
            3,
            "0",
          );
    contextRow.push({
      id: "heading",
      labelKey: "sidebar.heading",
      value: bearing,
      display: "text",
      unit: bearing == null ? undefined : "°",
      interaction: { kind: "readonly" },
    });
  }

  return { movementRow, contextRow };
}
