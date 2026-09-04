import { useState, type CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
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
    <div className="mechanism-wayfinding flex flex-none flex-col">
      <ol>
        {MECHANISM_ITEMS.map((item, index) => {
          const expanded = item.id === expandedId;
          const panelId = `mechanism-${item.id}`;
          const previousGroupKey = index > 0 ? MECHANISM_ITEMS[index - 1]?.groupKey : "";
          const showGroup = item.groupKey !== previousGroupKey;
          const flowLabels = "flowKeys" in item ? item.flowKeys.map((key) => t(key)) : [];

          return (
            <li
              key={item.id}
              className="mechanism-wayfinding__item"
              data-expanded={expanded ? "true" : undefined}
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpandedId(expanded ? null : item.id)}
                className="mechanism-wayfinding__trigger group"
              >
                <span
                  data-motion-kind="sequence"
                  data-motion-rail="true"
                  className="mechanism-wayfinding__index"
                  aria-hidden="true"
                  style={{
                    "--rail-motion-delay": `${46 + Math.min(index, 7) * 18}ms`,
                  } as CSSProperties}
                >
                  <span className="wayfinding-rail-glyph">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="mechanism-wayfinding__copy">
                  {showGroup ? (
                    <small className="mechanism-wayfinding__group-label">
                      {t(item.groupKey)}
                    </small>
                  ) : null}
                  <strong>{t(item.titleKey)}</strong>
                  <small>{t(item.signalKey)}</small>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="group-aria-expanded:rotate-90"
                />
              </button>

              <div
                id={panelId}
                className={cn(
                  "mechanism-wayfinding__detail-grid grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none",
                  expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mechanism-wayfinding__detail">
                    <p>{t(item.bodyKey)}</p>
                    <MechanismFlow label={t("mechanism.flowLabel")} steps={flowLabels} />
                    <ol className="mechanism-wayfinding__notes">
                      {item.detailKeys.map((key, detailIndex) => (
                        <li key={key}>
                          <span>{String(detailIndex + 1).padStart(2, "0")}</span>
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ol>
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

function MechanismFlow({ label, steps }: { label: string; steps: string[] }) {
  if (!steps.length) return null;

  return (
    <div className="mechanism-wayfinding__flow">
      <span>{label}</span>
      <ol>
        {steps.map((step, index) => (
          <li key={`${step}-${index}`} data-final={index === steps.length - 1 ? "true" : undefined}>
            <i aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
