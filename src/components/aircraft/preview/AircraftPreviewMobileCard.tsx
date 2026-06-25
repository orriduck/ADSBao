import { cn } from "@/lib/utils";
import { toFiniteNumber } from "@/utils/math";
import { getFlightRouteEndpoints } from "@/utils/flightRouteDisplay";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { getAircraftPreviewTypeDisplay } from "@/features/aircraft/preview/aircraftPreviewTypeModel";
import { formatAltitude } from "@/utils/units";
import { useMobilePreviewExpanded } from "./MobilePreviewCard";
import type { AsyncStatusState } from "@/hooks/useAsyncStatus";

type AircraftPreviewMobileCardProps = {
  aircraft?: Record<string, any> | null;
  photo?: { src?: string | null } | null;
  traceStatusState?: AsyncStatusState | null;
};

// Collapsed mobile card: [thumb][callsign + type · route] over a single
// telemetry line; the action row (Track + camera + suggest) sits below in the
// shared actions slot. The thumbnail hides when expanded so the larger photo
// revealed there isn't a second copy. V/S is the one accent in the line.
export default function AircraftPreviewMobileCard({
  aircraft,
  photo,
  traceStatusState = null,
}: AircraftPreviewMobileCardProps) {
  const { t } = useI18n();
  const expanded = useMobilePreviewExpanded();
  const { preferences: units } = useUnitPreferences();
  const callsign =
    (aircraft?.callsign || "").trim() || aircraft?.icao24?.toUpperCase() || "—";
  const typeDisplay = getAircraftPreviewTypeDisplay(aircraft);
  const typeLabel = [typeDisplay.primary, typeDisplay.category]
    .filter(Boolean)
    .join(" / ");
  const { origin, destination } = getFlightRouteEndpoints(aircraft?.flightRoute);

  const speed = toFiniteNumber(aircraft?.velocity);
  const altitude = toFiniteNumber(aircraft?.altitude);
  const vs = toFiniteNumber(aircraft?.baroRate);
  const onGround = Boolean(aircraft?.onGround);
  const altDisplay =
    altitude == null
      ? null
      : formatAltitude(altitude, units.altitude, { kind: "cruise" });
  const vsArrow = vs == null || vs === 0 ? "" : vs > 0 ? "↑" : "↓";

  return (
    <div className="flex flex-col gap-[7px] px-[12px] pb-[6px] pt-[10px] [[data-density=compact]_&]:px-[10px]">
      <div className="flex items-center gap-2.5">
        {/* Hidden when expanded — the larger photo shows in the reveal, so the
            thumbnail isn't a second copy. */}
        {expanded ? null : photo?.src ? (
          <img
            src={photo.src}
            alt=""
            draggable="false"
            className="size-[42px] flex-none rounded-[11px] object-cover"
          />
        ) : (
          <span className="size-[42px] flex-none rounded-[11px] bg-[color-mix(in_oklab,var(--atc-text)_9%,transparent)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className="notranslate inline-flex min-w-0 items-center gap-1.5 truncate font-mono text-[19px] leading-none text-atc-text"
              translate="no"
              title={callsign}
            >
              {callsign}
              <TraceStatusDot
                state={traceStatusState}
                labels={{
                  pending: t("preview.loadingTrace"),
                  success: t("preview.loadedTrace"),
                  error: t("preview.traceLoadError"),
                }}
              />
            </span>
            {typeLabel ? (
              <span
                className="notranslate flex-none whitespace-nowrap font-mono text-[12px] tracking-[0.04em] text-atc-dim"
                translate="no"
              >
                {typeLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-atc-dim">
            {origin && destination ? (
              <span className="notranslate inline-flex items-center gap-1.5" translate="no">
                {origin}
                <span aria-hidden="true" className="text-[var(--atc-signal-accent)]">
                  →
                </span>
                {destination}
              </span>
            ) : (
              <span className="italic text-atc-faint">{t("aircraft.noRoute")}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-[7px] gap-y-1 border-t border-atc-line pt-[7px] font-mono text-[13px] tabular-nums text-atc-text">
        <Metric value={speed != null ? Math.round(speed).toLocaleString() : "—"} unit="kt" />
        <Separator />
        {onGround ? (
          <span className="tabular-nums">{t("aircraft.gnd")}</span>
        ) : (
          <Metric
            prefix={altDisplay?.prefix}
            value={altDisplay ? altDisplay.value.toLocaleString() : "—"}
            unit={altDisplay?.unit ?? "ft"}
          />
        )}
        {vs != null ? (
          <>
            <Separator />
            <span className="inline-flex items-baseline gap-[3px] tabular-nums text-[var(--atc-signal-accent)]">
              {vsArrow ? <span aria-hidden="true">{vsArrow}</span> : null}
              {Math.abs(Math.round(vs)).toLocaleString()}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-atc-faint">
      ·
    </span>
  );
}

function Metric({
  value,
  unit,
  prefix,
}: {
  value: string;
  unit?: string;
  prefix?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-[2px] tabular-nums">
      {prefix ? (
        <span className="notranslate text-atc-dim" translate="no">
          {prefix}
        </span>
      ) : null}
      {value}
      {unit ? (
        <span translate="no" className="notranslate text-[9px] text-atc-faint">
          {unit}
        </span>
      ) : null}
    </span>
  );
}

function TraceStatusDot({
  state,
  labels,
}: {
  state: AsyncStatusState | null;
  labels: { pending: string; success: string; error: string };
}) {
  if (!state || state.phase === "idle") return null;

  const isErrorStatus = state.statusCode != null && state.statusCode >= 400;
  const tone =
    state.hasError || isErrorStatus
      ? "error"
      : state.phase === "pending"
        ? "loading"
        : "success";
  const label =
    tone === "loading"
      ? labels.pending
      : tone === "error"
        ? labels.error
        : labels.success;

  return (
    <span
      className={cn(
        "mobile-trace-status-dot",
        tone === "loading" && "mobile-trace-status-dot--loading",
        tone === "success" && "mobile-trace-status-dot--success",
        tone === "error" && "mobile-trace-status-dot--error",
        state.phase === "fading" && "mobile-trace-status-dot--fading",
      )}
      data-status={tone}
      aria-label={label}
      role="status"
      title={label}
    />
  );
}
