"use client";

import { useState } from "react";
import { TextPillListItem } from "@/components/ui/TextPillListItem";
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
    <div className="flex-1 overflow-y-auto pb-6">
        <div className="dither-section-header flex-none px-6 pt-6 pb-3">
          <div className="endf-section-head">
            <span className="endf-label">{t("mechanism.sidebarLabel")}</span>
            <span className="endf-section-head__count">
              {t("mechanism.count", { count: MECHANISM_ITEMS.length })}
            </span>
          </div>
        </div>

        <ol className="dither-list flex flex-col gap-1 px-6">
          {MECHANISM_ITEMS.map((item, index) => {
            const expanded = item.id === expandedId;
            const panelId = `mechanism-${item.id}`;

            return (
              <li key={item.id}>
                <TextPillListItem
                  as="button"
                  active={expanded}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  pill={String(index + 1).padStart(2, "0")}
                  title={t(item.titleKey)}
                  subtitle={t(item.signalKey)}
                />

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
                    <div className="px-3.5 pb-3 pt-3">
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
  );
}
