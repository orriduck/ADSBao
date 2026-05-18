"use client";

import NumberFlow from "@number-flow/react";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";
import PanelHeading from "./PanelHeading.jsx";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function TrafficPanel({
  aircraft = [],
  trafficCounts = { departure: 0, arrival: 0, unknown: 0 },
}) {
  const { t } = useI18n();

  return (
    <section className="glass-panel traffic-panel">
      <PanelHeading
        kicker={t("panels.trafficKicker")}
        title={t("panels.nearbyAircraft")}
      />

      <div className="traffic-counts">
        <Metric label={t("panels.total")} value={aircraft.length} color="var(--atc-text)" />
        <Metric
          label={t("panels.departures")}
          value={trafficCounts.departure}
          color={AIRCRAFT_COLORS.departure}
        />
        <Metric
          label={t("panels.arrivals")}
          value={trafficCounts.arrival}
          color={AIRCRAFT_COLORS.arrival}
        />
        <Metric
          label={t("panels.unknown")}
          value={trafficCounts.unknown}
          color="var(--traffic-level-color)"
        />
      </div>
    </section>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <span>{label}</span>
      <strong style={{ color }}>
        <NumberFlow value={value} />
      </strong>
    </div>
  );
}
