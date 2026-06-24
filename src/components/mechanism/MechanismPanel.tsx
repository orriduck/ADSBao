import { Fragment, useState } from "react";
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
    <div className="flex flex-none flex-col pb-4">
      <div className="dither-section-header flex-none px-5 pb-2 pt-4">
        <div className="atc-section-head">
          <span className="atc-kicker">{t("mechanism.sidebarLabel")}</span>
          <span className="atc-section-head__count">
            {t("mechanism.count", { count: MECHANISM_ITEMS.length })}
          </span>
        </div>
        <p className="mt-1 max-w-[36ch] text-[10px] leading-relaxed text-atc-dim">
          {t("mechanism.description")}
        </p>
      </div>

      <ol className="dither-list dither-list-flow mx-5 flex flex-col gap-0.5">
        {MECHANISM_ITEMS.map((item, index) => {
          const expanded = item.id === expandedId;
          const panelId = `mechanism-${item.id}`;
          const previousGroupKey =
            index > 0 ? MECHANISM_ITEMS[index - 1]?.groupKey : "";
          const showGroup = item.groupKey !== previousGroupKey;
          const flowLabels =
            "flowKeys" in item ? item.flowKeys.map((key) => t(key)) : [];

          return (
            <Fragment key={item.id}>
              {showGroup ? (
                <li className="px-2 pb-1 pt-3 first:pt-0">
                  <span className="font-mono text-[8px] font-black uppercase leading-none tracking-normal text-atc-faint">
                    {t(item.groupKey)}
                  </span>
                </li>
              ) : null}
              <li key={item.id}>
                <TextPillListItem
                  as="button"
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
                    <div className="px-2 pb-2 pt-2">
                      <p className="text-[10px] leading-relaxed text-atc-dim">
                        {t(item.bodyKey)}
                      </p>
                      <MechanismFlow labels={flowLabels} />
                      <div className="mt-2 grid gap-1 pl-0.5">
                        {item.detailKeys.map((key) => (
                          <p
                            key={key}
                            className="text-[10px] leading-relaxed text-atc-dim"
                          >
                            {t(key)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

function MechanismFlow({
  labels,
}: {
  labels: string[];
}) {
  if (!labels.length) return null;

  return (
    <ol className="mt-2 flex flex-wrap gap-1">
      {labels.map((label, index) => (
        <li
          key={`${label}-${index}`}
          className="inline-grid max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1 rounded-[6px] bg-[color-mix(in_oklab,var(--atc-text)_7%,transparent)] px-1.5 py-1"
        >
          <span className="font-mono text-[7.5px] font-black leading-none text-atc-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 truncate text-[9px] font-semibold leading-none text-atc-dim">
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
