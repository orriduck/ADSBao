/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { toFiniteNumber } from "@/utils/math.js";
import { getFlightRouteAirlineIconUrl } from "@/utils/flightRouteDisplay.js";
import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

// Same self-hiding-on-error pattern as the list row's logo. Keeps the
// mobile card tidy when an airline isn't covered by the icon CDN.
function AirlineLogo({ src }) {
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

export default function AircraftPreviewMobileCard({ aircraft }) {
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

  // Stat row separator dot. Kept as a tiny render-prop so the comma /
  // dot rhythm is consistent across kt · ft · fpm without hand-placing
  // every conditional.
  const stats = [];
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
    <div className="relative z-[2] box-border flex w-full flex-col items-stretch gap-[6px] px-[14px] pt-[12px] pb-[8px]">
      <div className="grid w-full max-w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-[10px] whitespace-nowrap">
        <span
          translate="no"
          className="notranslate min-w-0 overflow-hidden text-ellipsis font-[var(--font-display)] text-[19px] font-extrabold leading-[0.9] tracking-normal text-atc-text"
        >
          {callsign}
        </span>
        {type && (
          <span
            translate="no"
            className="notranslate justify-self-end text-right font-[var(--font-display)] text-[19px] font-extrabold leading-[0.9] tracking-normal text-atc-text"
          >
            {type}
          </span>
        )}
      </div>
      {(route || hasStats) && (
        <div className="grid w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_max-content] items-center gap-2">
          {route ? (
            <div
              translate="no"
              className="notranslate flex min-w-0 max-w-full items-center gap-2 whitespace-nowrap font-[var(--font-mono)] text-[10px] font-semibold leading-none tracking-[0.02em] text-atc-dim"
            >
              <AirlineLogo src={airlineIconUrl} />
              <span className="overflow-hidden text-ellipsis text-atc-text">
                {route}
              </span>
            </div>
          ) : (
            <span aria-hidden="true" />
          )}
          {hasStats && (
            <div className="flex min-w-0 max-w-full items-center justify-end overflow-visible whitespace-nowrap">
              {stats.map((stat, i) => (
                <span key={stat.key || i} className="flex items-baseline">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="mx-[5px] font-[var(--font-mono)] text-[10px] text-atc-faint"
                    >
                      ·
                    </span>
                  )}
                  {stat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single stat token — either a numeric NumberFlow + unit pair, or a
// plain text token like "GND". Used by the parent's stats[] list so the
// kt / ft / fpm rhythm renders the same way every time.
function Stat({ value, unit, plain, format }) {
  return (
    <span className="flex items-baseline gap-[2px]">
      {plain != null ? (
        <span className="font-[var(--font-mono)] text-[10px] font-medium tabular-nums text-atc-dim">
          {plain}
        </span>
      ) : (
        <NumberFlow
          value={value}
          format={format}
          className="font-[var(--font-mono)] text-[10px] font-medium tabular-nums text-atc-dim"
        />
      )}
      {unit && (
        <span
          translate="no"
          className="notranslate font-[var(--font-mono)] text-[8px] font-medium lowercase text-atc-faint"
        >
          {unit}
        </span>
      )}
    </span>
  );
}
