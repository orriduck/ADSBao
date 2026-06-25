import { Fragment, useState } from "react";
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
        <p className="fs-desc mt-2 max-w-[40ch]">
          {t("mechanism.description")}
        </p>
      </div>

      <ol className="mechanism-list dither-list dither-list-flow flex flex-col gap-0.5">
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
                <li className="mechanism-group-label pb-1 pt-3 first:pt-0">
                  <span>
                    {t(item.groupKey)}
                  </span>
                </li>
              ) : null}
              <li key={item.id}>
                <button
                  type="button"
                  className="mechanism-row"
                  data-expanded={expanded ? "true" : "false"}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                >
                  <span className="mechanism-row__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mechanism-row__body">
                    <span className="mechanism-row__title">
                      {t(item.titleKey)}
                    </span>
                    <span className="mechanism-row__signal">
                      {t(item.signalKey)}
                    </span>
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
                    <div className="mechanism-detail">
                      <p className="mechanism-detail__body">
                        {t(item.bodyKey)}
                      </p>
                      <MechanismFlow labels={flowLabels} />
                      <ol className="mechanism-detail__list">
                        {item.detailKeys.map((key, detailIndex) => (
                          <li
                            key={key}
                            className="mechanism-detail__item"
                          >
                            <span className="mechanism-detail__index">
                              {String(detailIndex + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0">{t(key)}</span>
                          </li>
                        ))}
                      </ol>
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
    <ol className="mechanism-flow">
      {labels.map((label, index) => (
        <li
          key={`${label}-${index}`}
          className="mechanism-flow__item"
        >
          <span className="min-w-0 truncate">
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
