"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n.js";

export default function AboutMetaGrid({ items }) {
  const { t } = useI18n();

  return (
    <div className="flex-none grid grid-cols-2 gap-px mx-6 overflow-hidden border border-[var(--atc-line)] bg-[var(--atc-line)]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col gap-0.5 bg-atc-bg px-3 py-2.5"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-atc-faint">
            {item.labelKey ? t(item.labelKey) : item.label}
          </span>
          <span className="truncate text-[12px] font-semibold text-atc-text">
            {item.valueKey ? t(item.valueKey) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
