/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ComponentProps, ReactElement } from "react";
import NumberFlow from "@number-flow/react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { toFiniteNumber } from "@/utils/math";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { resolveAircraftDisplayModel } from "@/features/aircraft/aircraftTypeDisplayModel";
import { formatAltitude } from "@/utils/units";
import {
  MobilePreviewContent,
  MobilePreviewDetailRow,
  MobilePreviewIdentity,
  MobilePreviewMetaChip,
  MobilePreviewMetaChips,
  MobilePreviewRuleRow,
} from "./MobilePreviewCard";
import type { AsyncStatusState } from "@/hooks/useAsyncStatus";

type NumberFlowFormat = ComponentProps<typeof NumberFlow>["format"];

type AircraftPreviewMobileCardAircraft = {
  callsign?: string | null;
  icao24?: string | null;
  type?: string | null;
  desc?: string | null;
  category?: string | null;
  flightRouteLabel?: string | null;
  flightRoute?: unknown;
  velocity?: unknown;
  altitude?: unknown;
  baroRate?: unknown;
  onGround?: boolean | null;
};

type AircraftPreviewMobileCardProps = {
  aircraft?: AircraftPreviewMobileCardAircraft | null;
  traceStatusState?: AsyncStatusState | null;
};

type AirlineLogoProps = {
  src?: string | null;
};

type StatProps = {
  value?: number;
  unit?: string;
  plain?: string;
  prefix?: string;
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
      className="h-3.5 w-[22px] flex-none rounded-[2px] bg-[var(--aviation-logo-plate)] object-contain px-[2px] py-[1px]"
    />
  );
}

export default function AircraftPreviewMobileCard({
  aircraft,
  traceStatusState = null,
}: AircraftPreviewMobileCardProps) {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const typeDisplay = resolveAircraftDisplayModel(aircraft || {});
  const secondary =
    typeDisplay.displayName === "N/A"
      ? null
      : (
          <span className="inline-flex min-w-0 max-w-full items-center justify-end gap-1.5">
            <span className="min-w-0 truncate">{typeDisplay.displayName}</span>
            {typeDisplay.category ? (
              <span className="flex-none rounded-[3px] border border-atc-line px-1 py-[1px] text-[9px] font-semibold leading-none text-atc-dim">
                {typeDisplay.category}
              </span>
            ) : null}
          </span>
        );
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
    const altDisplay =
      altitude == null
        ? null
        : formatAltitude(altitude, units.altitude, { kind: "cruise" });
    stats.push(
      onGround ? (
        <Stat key="alt" plain={t("aircraft.gnd")} />
      ) : (
        <Stat
          key="alt"
          value={altDisplay?.value ?? 0}
          unit={altDisplay?.unit ?? "ft"}
          prefix={altDisplay?.prefix}
        />
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
        primary={
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
            <span className="min-w-0 truncate">{callsign}</span>
            <TraceStatusPulse
              state={traceStatusState}
              labels={{
                pending: t("preview.loadingTrace"),
                success: t("preview.loadedTrace"),
                error: t("preview.traceLoadError"),
              }}
            />
          </span>
        }
        secondary={secondary}
        secondaryClassName="max-w-[min(47vw,176px)] text-[13px] font-extrabold text-atc-text"
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

function TraceStatusPulse({
  state,
  labels,
}: {
  state: AsyncStatusState | null;
  labels: { pending: string; success: string; error: string };
}) {
  if (!state || state.phase === "idle") return null;

  const tone = state.hasError
    ? "error"
    : state.phase === "pending"
      ? "pending"
      : "success";
  const label =
    tone === "pending"
      ? labels.pending
      : tone === "error"
        ? labels.error
        : labels.success;

  return (
    <span
      className={cn(
        "relative inline-flex size-[9px] flex-none rounded-full",
        "before:absolute before:inset-[-4px] before:rounded-full before:opacity-45",
        "before:animate-ping motion-reduce:before:animate-none",
        tone === "pending" &&
          "bg-[var(--primary-bright)] before:bg-[var(--primary-bright)]",
        tone === "success" &&
          "bg-[var(--atc-mint)] before:bg-[var(--atc-mint)]",
        tone === "error" &&
          "bg-[var(--atc-red)] before:bg-[var(--atc-red)]",
      )}
      aria-label={label}
      role="status"
      title={label}
    />
  );
}

function Stat({ value = 0, unit, plain, prefix, format }: StatProps) {
  return (
    <>
      {plain != null ? (
        <span className="tabular-nums">{plain}</span>
      ) : (
        <>
          {prefix ? (
            <span className="notranslate text-atc-dim" translate="no">
              {prefix}
            </span>
          ) : null}
          <NumberFlow
            value={value}
            format={format}
            className="tabular-nums"
          />
        </>
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
