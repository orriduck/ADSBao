/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ComponentProps, ReactElement } from "react";
import NumberFlow from "@number-flow/react";
import { Plane } from "lucide-react";
import { toFiniteNumber } from "@/utils/math";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  MobilePreviewContent,
  MobilePreviewDetailRow,
  MobilePreviewIdentity,
  MobilePreviewMetaChip,
  MobilePreviewMetaChips,
  MobilePreviewRuleRow,
} from "./MobilePreviewCard";

type NumberFlowFormat = ComponentProps<typeof NumberFlow>["format"];

type AircraftPreviewMobileCardAircraft = {
  callsign?: string | null;
  icao24?: string | null;
  type?: string | null;
  flightRouteLabel?: string | null;
  flightRoute?: unknown;
  velocity?: unknown;
  altitude?: unknown;
  baroRate?: unknown;
  onGround?: boolean | null;
};

type AircraftPreviewMobileCardProps = {
  aircraft?: AircraftPreviewMobileCardAircraft | null;
};

type AirlineLogoProps = {
  src?: string | null;
};

type StatProps = {
  value?: number;
  unit?: string;
  plain?: string;
  format?: NumberFlowFormat;
};

// Same self-hiding-on-error pattern as the list row's logo. Keeps the
// mobile card tidy when an airline isn't covered by the icon CDN.
function AirlineLogo({ src }: AirlineLogoProps) {
  const [hidden, setHidden] = useState(false);
  if (!src || hidden) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setHidden(true)}
      className="h-3.5 w-[22px] flex-none rounded-[2px] bg-[oklch(96%_0.006_95)] object-contain px-[2px] py-[1px]"
    />
  );
}

export default function AircraftPreviewMobileCard({ aircraft }: AircraftPreviewMobileCardProps) {
  const { t } = useI18n();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const type = (aircraft?.type || "").trim().toUpperCase();
  const route = aircraft?.flightRouteLabel || "";
  const airlineIconUrl = getFlightRouteAirlineIconUrl(aircraft?.flightRoute);

  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const onGround = Boolean(aircraft?.onGround);

  const hasStats = speed != null || altitude != null || vs != null || onGround;

  const stats: ReactElement[] = [];
  if (speed != null) {
    stats.push(
      <Stat key="speed" value={Math.round(speed)} unit="kt" />,
    );
  }
  if (altitude != null || onGround) {
    stats.push(
      onGround ? (
        <Stat key="alt" plain={t("aircraft.gnd")} />
      ) : (
        <Stat key="alt" value={Math.round(altitude)} unit="ft" />
      ),
    );
  }
  if (vs != null) {
    stats.push(
      <Stat
        key="vs"
        value={Math.round(vs)}
        unit="fpm"
        format={{ signDisplay: "exceptZero" }}
      />,
    );
  }

  return (
    <MobilePreviewContent>
      <MobilePreviewIdentity
        icon={Plane}
        label={t("preview.aircraftPreview")}
        primary={callsign}
        secondary={type}
        secondaryClassName="text-[20px] font-extrabold text-atc-text"
      />
      {(route || hasStats) ? (
        <MobilePreviewRuleRow
          left={
            route ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-[6px] align-baseline">
                <AirlineLogo src={airlineIconUrl} />
                <span className="min-w-0 truncate whitespace-nowrap">{route}</span>
              </span>
            ) : null
          }
          right={
            hasStats ? (
              <MobilePreviewMetaChips>
                {stats.map((stat, i) => (
                  <MobilePreviewMetaChip key={stat.key || i}>
                    {stat}
                  </MobilePreviewMetaChip>
                ))}
              </MobilePreviewMetaChips>
            ) : null
          }
        />
      ) : null}
    </MobilePreviewContent>
  );
}

function Stat({ value = 0, unit, plain, format }: StatProps) {
  return (
    <>
      {plain != null ? (
        <span className="tabular-nums">{plain}</span>
      ) : (
        <NumberFlow
          value={value}
          format={format}
          className="tabular-nums"
        />
      )}
      {unit && (
        <span
          translate="no"
          className="notranslate text-[8px] font-medium lowercase text-atc-faint"
        >
          {unit}
        </span>
      )}
    </>
  );
}
