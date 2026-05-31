"use client";

import NumberFlow from "@number-flow/react";
import { RadioTower } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { toFiniteNumber } from "@/utils/math";
import {
  formatNavaidFrequency,
  formatNavaidVariation,
} from "./navaidPreviewFormat";

type NavaidPreviewMetadataCardProps = {
  navaid?: Record<string, any> | null;
};

export default function NavaidPreviewMetadataCard({
  navaid,
}: NavaidPreviewMetadataCardProps) {
  const { t } = useI18n();
  const ident = String(navaid?.ident || "").trim().toUpperCase() || "—";
  const type = String(navaid?.type || "").trim().toUpperCase();
  const name = String(navaid?.name || ident).trim();
  const distance = toFiniteNumber(navaid?.distanceNm);
  const elevation = toFiniteNumber(navaid?.elevationFt);
  const frequency = formatNavaidFrequency(navaid?.frequencyKhz);
  const dmeFrequency = formatNavaidFrequency(navaid?.dme?.frequencyKhz);
  const dmeChannel = String(navaid?.dme?.channel || "").trim();
  const usage = String(navaid?.usageType || "").trim();
  const power = String(navaid?.power || "").trim();
  const associatedAirport = String(navaid?.associatedAirport || "").trim().toUpperCase();
  const variation =
    formatNavaidVariation(navaid?.magneticVariationDeg) ||
    formatNavaidVariation(navaid?.slavedVariationDeg);

  const detailRows = [
    { label: t("metrics.frequency"), value: frequency },
    {
      label: t("metrics.dme"),
      value: [dmeChannel, dmeFrequency].filter(Boolean).join(" · "),
    },
    { label: t("metrics.usage"), value: usage },
    { label: t("metrics.power"), value: power },
    { label: t("metrics.associated"), value: associatedAirport },
    { label: t("metrics.variation"), value: variation },
  ].filter((row) => row.value);

  return (
    <div className="aircraft-preview-metadata-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="endf-label">{t("preview.navaidPreview")}</span>
          <div className="mt-1 flex min-w-0 items-baseline gap-2">
            <span
              className="notranslate airport-sidebar-display-mono airport-sidebar-display-mono--hero text-[28px] font-extrabold leading-none text-atc-text"
              translate="no"
            >
              {ident}
            </span>
          </div>
          <dl className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3">
            {name ? (
              <div className="min-w-0">
                <dt className="font-[var(--font-mono)] text-[7px] font-semibold uppercase leading-none tracking-normal text-atc-faint">
                  {t("preview.navaidName")}
                </dt>
                <dd className="mt-1 truncate text-[15px] font-semibold leading-tight text-atc-text">
                  {name}
                </dd>
              </div>
            ) : null}
            {type ? (
              <div className="min-w-[42px] text-right">
                <dt className="font-[var(--font-mono)] text-[7px] font-semibold uppercase leading-none tracking-normal text-atc-faint">
                  {t("preview.navaidType")}
                </dt>
                <dd
                  className="notranslate mt-1 font-[var(--font-mono)] text-[12px] font-bold uppercase leading-tight tracking-normal text-atc-dim"
                  translate="no"
                >
                  {type}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <RadioTower
          aria-hidden="true"
          className="mt-1 size-5 flex-none text-atc-dim"
          strokeWidth={1.8}
        />
      </div>

      <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
        <dt className="text-atc-faint uppercase tracking-[0.12em]">
          {t("metrics.distance")}
        </dt>
        <dd className="text-right text-atc-text">
          {distance == null ? (
            "—"
          ) : (
            <>
              <NumberFlow
                value={distance}
                format={{
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                }}
              />
              <span className="notranslate ml-1 text-atc-dim" translate="no">
                NM
              </span>
            </>
          )}
        </dd>
        <dt className="text-atc-faint uppercase tracking-[0.12em]">
          {t("metrics.elevation")}
        </dt>
        <dd className="text-right text-atc-text">
          {elevation == null ? (
            "—"
          ) : (
            <>
              <NumberFlow value={Math.round(elevation)} />
              <span className="notranslate ml-1 text-atc-dim" translate="no">
                FT
              </span>
            </>
          )}
        </dd>
      </dl>

      {detailRows.length ? (
        <>
          <div className="aircraft-preview-card__divider aircraft-preview-card__divider--soft" />
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-[10px]">
            {detailRows.map((row) => (
              <div className="contents" key={row.label}>
                <dt className="text-atc-faint uppercase tracking-[0.1em]">
                  {row.label}
                </dt>
                <dd
                  className="notranslate min-w-0 truncate text-right font-semibold text-atc-text"
                  translate="no"
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </div>
  );
}
