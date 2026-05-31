"use client";

import NumberFlow from "@number-flow/react";
import { toFiniteNumber } from "@/utils/math";
import { formatNavaidFrequency } from "./navaidPreviewFormat";

type NavaidPreviewMobileCardProps = {
  navaid?: Record<string, any> | null;
};

export default function NavaidPreviewMobileCard({
  navaid,
}: NavaidPreviewMobileCardProps) {
  const ident = String(navaid?.ident || "").trim().toUpperCase() || "—";
  const type = String(navaid?.type || "").trim().toUpperCase();
  const name = String(navaid?.name || ident).trim();
  const distance = toFiniteNumber(navaid?.distanceNm);
  const frequency = formatNavaidFrequency(navaid?.frequencyKhz);
  const dmeChannel = String(navaid?.dme?.channel || "").trim();
  const hasStats = Boolean(type || distance != null || frequency || dmeChannel);

  return (
    <div className="relative z-[2] box-border flex w-full items-baseline justify-between gap-[12px] px-[14px] pb-[8px] pt-[12px]">
      <div className="navaid-preview-mobile-card__summary flex min-w-0 max-w-full items-baseline gap-[8px] whitespace-nowrap">
        <span
          translate="no"
          className="notranslate flex-none font-[var(--font-display)] text-[19px] font-extrabold leading-[0.9] tracking-normal text-atc-text"
        >
          {ident}
        </span>
        {name ? (
          <span
            translate="no"
            className="notranslate min-w-0 overflow-hidden text-ellipsis font-[var(--font-mono)] text-[11px] font-semibold leading-none tracking-normal text-atc-dim"
          >
            {name}
          </span>
        ) : null}
      </div>
      {hasStats ? (
        <div className="navaid-preview-mobile-card__stats flex flex-none items-baseline justify-end overflow-visible whitespace-nowrap">
          {type ? <Stat plain={type} /> : null}
          {distance != null ? (
            <>
              {type ? <Separator /> : null}
              <Stat
                value={distance}
                unit="NM"
                format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
              />
            </>
          ) : null}
          {frequency ? (
            <>
              {type || distance != null ? <Separator /> : null}
              <Stat plain={frequency} />
            </>
          ) : null}
          {dmeChannel ? (
            <>
              {type || distance != null || frequency ? <Separator /> : null}
              <Stat plain={dmeChannel} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Separator() {
  return (
    <span
      aria-hidden="true"
      className="mx-[5px] font-[var(--font-mono)] text-[10px] text-atc-faint"
    >
      ·
    </span>
  );
}

function Stat({
  value = 0,
  unit = "",
  plain = "",
  format,
}: Record<string, any>) {
  if (plain) {
    return (
      <span className="notranslate font-[var(--font-mono)] text-[10px] font-medium tabular-nums text-atc-dim">
        {plain}
      </span>
    );
  }

  return (
    <span className="flex items-baseline gap-[2px]">
      <NumberFlow
        value={value}
        format={format}
        className="font-[var(--font-mono)] text-[10px] font-medium tabular-nums text-atc-dim"
      />
      <span
        translate="no"
        className="notranslate font-[var(--font-mono)] text-[8px] font-medium uppercase text-atc-faint"
      >
        {unit}
      </span>
    </span>
  );
}
