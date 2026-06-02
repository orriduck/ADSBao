"use client";

import { useState } from "react";
import DitherPageShell from "@/components/app-shell/DitherPageShell";
import { MECHANISM_ITEMS } from "@/config/mechanism";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

type MechanismItemId = (typeof MECHANISM_ITEMS)[number]["id"];

export default function MechanismPanel() {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<MechanismItemId | null>(
    MECHANISM_ITEMS[0]?.id ?? null,
  );

  return (
    <DitherPageShell title={t("app.mechanismTitle")} description="">
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="dither-section-header flex-none px-6 pt-6 pb-3">
          <div className="endf-section-head">
            <span className="endf-label">{t("mechanism.sidebarLabel")}</span>
            <span className="endf-section-head__count">
              {t("mechanism.count", { count: MECHANISM_ITEMS.length })}
            </span>
          </div>
        </div>

        <ol className="dither-list px-6 divide-y divide-[var(--atc-line)]">
          {MECHANISM_ITEMS.map((item, index) => {
            const expanded = item.id === expandedId;
            const panelId = `mechanism-${item.id}`;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className={cn(
                    "about-data-source-row group endf-underline -mx-6 grid w-[calc(100%+3rem)] grid-cols-[max-content_minmax(0,1fr)] items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--atc-elev)_55%,transparent)] md:w-[calc(100%+38px)]",
                    expanded &&
                      "bg-[color-mix(in_oklab,var(--atc-elev)_72%,transparent)]",
                  )}
                >
                  <span className="endf-tab endf-tab--code whitespace-nowrap">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </span>
                  <span className="min-w-0">
                    <strong className="block whitespace-normal break-words text-[13px] font-semibold leading-snug text-atc-text">
                      {t(item.titleKey)}
                    </strong>
                    <small className="mt-0.5 block whitespace-normal break-words text-[11.5px] leading-snug text-atc-dim">
                      {t(item.signalKey)}
                    </small>
                  </span>
                </button>

                <div
                  id={panelId}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none",
                    expanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="px-6 pb-4 pt-1">
                      <p className="text-[11.5px] leading-relaxed text-atc-dim">
                        {t(item.bodyKey)}
                      </p>
                      <div className="mt-3 grid gap-2 border-l border-[var(--atc-line)] pl-3">
                        {item.detailKeys.map((key) => (
                          <p
                            key={key}
                            className="text-[11.5px] leading-relaxed text-atc-dim"
                          >
                            {t(key)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </DitherPageShell>
  );
}
