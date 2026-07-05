import type { UnitPreferences } from "@/features/app-shell/unitPreferences/unitPreferencesModel";
import { ROUTE_PROVIDER } from "@/features/aviation/sourceDisplayModel";
import { ARRIVAL, DEPARTURE } from "@/utils/aircraftMovement";
import {
  convertTemperatureFromC,
  formatAltitudeFromMeters,
  formatGroundSpeed,
  temperatureUnitLabel,
  type GroundSpeedUnit,
} from "@/utils/units";

// Pure view-model for the sidebar's joined hero-stats footer. It owns the
// product rules — which cells show, what they read, and how they behave — so
// they can be tested without rendering: here mode swaps departures/arrivals for
// the user's own GPS speed/altitude (the off-airport classification is always
// 0/0, the bug this guards), the movement row only exists on the FlightAware
// route provider, ATC only appears when there are frequencies, etc. The
// component stays dumb: it maps each item to a <StatTile>, resolving the i18n
// label, NumberFlow wrapping, and click handler from these descriptors.

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
  // a number renders through NumberFlow when `display` is "numberFlow".
  value: number | string | null;
  display: "numberFlow" | "text";
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
  routeProvider: string;
  featureFlagsResolved: boolean;
  aircraft: Array<{ movement?: string }>;
  selfSpeedMps: number | null;
  selfAltitudeMeters: number | null;
  // Device-compass heading in degrees, or null when the compass has no signal.
  selfHeadingDeg: number | null;
  groundSpeedUnit: GroundSpeedUnit;
  metar: { rawTemp?: unknown } | null;
  metarLoading: boolean;
  units: UnitPreferences;
  atcCount: number;
  spottingCount: number;
};

export function countAircraftMovements(
  aircraft: Array<{ movement?: string }>,
  routeProvider: string,
): { departureCount: number; arrivalCount: number } {
  if (routeProvider !== ROUTE_PROVIDER.FLIGHTAWARE) {
    return { departureCount: 0, arrivalCount: 0 };
  }
  let departureCount = 0;
  let arrivalCount = 0;
  for (const item of aircraft) {
    if (item?.movement === DEPARTURE) departureCount += 1;
    else if (item?.movement === ARRIVAL) arrivalCount += 1;
  }
  return { departureCount, arrivalCount };
}

function metarTemperature(
  metar: { rawTemp?: unknown } | null,
  unit: UnitPreferences["temperature"],
): { value: number | string; unit: string } {
  const label = temperatureUnitLabel(unit);
  const temp = Number(metar?.rawTemp);
  if (!Number.isFinite(temp)) return { value: "—", unit: label };
  return { value: Math.round(convertTemperatureFromC(temp, unit)), unit: label };
}

export function buildSidebarStats(input: BuildSidebarStatsInput): SidebarStats {
  const {
    nearMe,
    routeProvider,
    featureFlagsResolved,
    aircraft,
    selfSpeedMps,
    selfAltitudeMeters,
    selfHeadingDeg,
    groundSpeedUnit,
    metar,
    metarLoading,
    units,
    atcCount,
    spottingCount,
  } = input;

  const showMovement =
    !nearMe &&
    featureFlagsResolved &&
    routeProvider === ROUTE_PROVIDER.FLIGHTAWARE;

  const movementRow: SidebarStat[] = [];
  if (showMovement) {
    const { departureCount, arrivalCount } = countAircraftMovements(
      aircraft,
      routeProvider,
    );
    movementRow.push({
      id: "departures",
      labelKey: "sidebar.departures",
      value: departureCount,
      display: "numberFlow",
      interaction: { kind: "view", view: "departures" },
    });
    movementRow.push({
      id: "arrivals",
      labelKey: "sidebar.arrivals",
      value: arrivalCount,
      display: "numberFlow",
      interaction: { kind: "view", view: "arrivals" },
    });
  } else if (nearMe) {
    const speed = formatGroundSpeed(selfSpeedMps, groundSpeedUnit);
    const altitude = formatAltitudeFromMeters(selfAltitudeMeters, units.altitude, {
      kind: "ground",
    });
    movementRow.push({
      id: "selfSpeed",
      labelKey: "sidebar.speed",
      value: speed ? speed.value : null,
      display: "numberFlow",
      unit: speed?.unit,
      interaction: { kind: "groundSpeedToggle" },
    });
    movementRow.push({
      id: "selfAltitude",
      labelKey: "sidebar.altitude",
      value: altitude ? altitude.value : null,
      display: "numberFlow",
      unit: altitude?.unit,
      prefix: altitude?.prefix,
      interaction: { kind: "readonly" },
    });
  }

  const temperature = metarLoading
    ? { value: "—" as const, unit: temperatureUnitLabel(units.temperature) }
    : metarTemperature(metar, units.temperature);

  const contextRow: SidebarStat[] = [
    {
      id: "briefing",
      labelKey: "sidebar.weather",
      value: temperature.value,
      display: "text",
      unit: temperature.value === "—" ? undefined : temperature.unit,
      interaction: { kind: "view", view: "briefing" },
    },
  ];
  if (atcCount > 0) {
    contextRow.push({
      id: "atc",
      labelKey: "sidebar.atc",
      value: atcCount,
      display: "numberFlow",
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
  } else {
    contextRow.push({
      id: "spotting",
      labelKey: "sidebar.spotting",
      value: spottingCount,
      display: "numberFlow",
      interaction: { kind: "spotting" },
    });
  }

  return { movementRow, contextRow };
}
