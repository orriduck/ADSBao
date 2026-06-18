import { useEffect, useState } from "react";
import { useMapInstance } from "./MapContext";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { useUnitPreferences } from "@/features/app-shell/unitPreferences/UnitPreferencesProvider";
import { convertDistanceFromNm, distanceUnitLabel } from "@/utils/units";

const METERS_PER_NM = 1852;

const DESKTOP_TARGET_PX = 110;
const DESKTOP_NM_STEPS = [1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];

const MOBILE_BAR_TARGET = 70;
const MOBILE_MAX_NM = 5;
const MOBILE_NM_STEPS = [0.5, 1, 2, 3, 4, 5];

export default function MapRangeLegend() {
  const { t } = useI18n();
  const { preferences: units } = useUnitPreferences();
  const map = useMapInstance();
  const [scale, setScale] = useState<{
    desktopNm: number; desktopPx: number;
    mobileNm: number; mobilePx: number;
  } | null>(null);

  useEffect(() => {
    if (!map || !map.getContainer?.() || typeof map.getSize !== "function") return;

    const update = () => {
      let meters = 0;
      try {
        const size = map.getSize();
        if (!size?.x || !size?.y) return;
        const midY = size.y / 2;
        const left = map.containerPointToLatLng([0, midY]);
        const right = map.containerPointToLatLng([DESKTOP_TARGET_PX, midY]);
        meters = map.distance(left, right);
      } catch {
        return;
      }
      if (!Number.isFinite(meters) || meters <= 0) return;
      const nmPerPx = meters / METERS_PER_NM / DESKTOP_TARGET_PX;

      let dNm = DESKTOP_NM_STEPS[0];
      for (const c of DESKTOP_NM_STEPS) { if (c <= nmPerPx * DESKTOP_TARGET_PX) dNm = c; else break; }

      const mobileMax = Math.min(nmPerPx * MOBILE_BAR_TARGET, MOBILE_MAX_NM);
      let mNm = MOBILE_NM_STEPS[0];
      for (const c of MOBILE_NM_STEPS) { if (c <= mobileMax) mNm = c; else break; }

      setScale({ desktopNm: dNm, desktopPx: dNm / nmPerPx, mobileNm: mNm, mobilePx: mNm / nmPerPx });
    };

    const frame = window.requestAnimationFrame(update);
    map.on("zoomend", update);
    map.on("moveend", update);
    map.on("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      map.off("zoomend", update);
      map.off("moveend", update);
      map.off("resize", update);
    };
  }, [map]);

  if (!scale) return null;

  const unit = distanceUnitLabel(units.distance);
  const desktopDist = Math.round(convertDistanceFromNm(scale.desktopNm, units.distance));
  const mobileRaw = convertDistanceFromNm(scale.mobileNm, units.distance);
  const mobileDist = Number.isInteger(mobileRaw) ? mobileRaw : +mobileRaw.toFixed(1);
  const barH = Math.max(scale.mobilePx, 16);

  return (
    <>
      {/* Desktop: horizontal bar */}
      <div
        role="note"
        aria-label={t("map.distanceAria", { distance: desktopDist })}
        className="pointer-events-none absolute bottom-3 left-3 z-map-legend hidden items-center gap-2 rounded-[8px] border border-[var(--atc-border-default)] bg-[var(--atc-surface-preview-card)] px-2.5 py-1.5 font-mono text-[var(--map-range-text)] shadow-[var(--app-panel-shadow)] backdrop-blur-md md:flex"
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--map-range-label)]">
          {t("map.distanceLabel")}
        </span>
        <div style={{ width: `${scale.desktopPx}px` }} className="relative h-[10px]">
          <span aria-hidden="true" className="absolute left-0 right-0 top-1/2 h-px bg-current opacity-70" />
          <span aria-hidden="true" className="absolute left-0 top-0 h-full w-px bg-current" />
          <span aria-hidden="true" className="absolute right-0 top-0 h-full w-px bg-current" />
        </div>
        <span className="text-[10px] font-semibold tracking-[0.12em] tabular-nums">
          {desktopDist} <span className="notranslate" translate="no">{unit}</span>
        </span>
      </div>

      {/* Mobile: vertical line + tick, no box */}
      <div
        role="note"
        aria-label={t("map.distanceAria", { distance: mobileDist })}
        style={{ height: `${barH + 20}px` }}
        className="pointer-events-none absolute bottom-[calc(max(12px,env(safe-area-inset-bottom))+54px)] left-4 z-map-legend flex flex-col items-center gap-0.5 md:hidden"
      >
        <span className="text-[9px] font-semibold tabular-nums text-[var(--map-range-text)]">
          {mobileDist}{" "}
          <span className="notranslate text-[7px] font-medium" translate="no">{unit}</span>
        </span>
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="absolute inset-0 w-px bg-[var(--map-range-text)] opacity-80"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 -left-[3px] h-px w-[7px] bg-[var(--map-range-text)] opacity-80"
          />
        </div>
      </div>
    </>
  );
}
