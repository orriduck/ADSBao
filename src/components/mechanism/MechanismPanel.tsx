import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { MECHANISM_ITEMS } from "@/config/mechanism";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

type MechanismItemId = (typeof MECHANISM_ITEMS)[number]["id"];

// Page content sits on the same horizontal inset as the page title.
const INSET = "px-[var(--airport-sidebar-inset,20px)]";
// Detail content aligns under the row title: index rail (34px) + grid gap (10px).
const DETAIL_INDENT = "pl-[44px]";

export default function MechanismPanel() {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<MechanismItemId | null>(
    MECHANISM_ITEMS[0]?.id ?? null,
  );

  return (
    <div className="flex flex-none flex-col pb-4">
      <ol className="flex flex-col gap-1">
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
                <li className={cn("pb-2 pt-[22px] first:pt-1", INSET)}>
                  {/* Upright serif group label + accent tick — same as Explorer. */}
                  <h2
                    className={
                      "flex min-w-0 items-center gap-2 font-serif text-[15px] leading-snug text-atc-dim " +
                      "before:block before:h-[1.5px] before:w-[9px] before:shrink-0 before:rounded-full " +
                      "before:bg-[var(--atc-signal-accent)] before:content-['']"
                    }
                  >
                    {t(item.groupKey)}
                  </h2>
                </li>
              ) : null}
              <li className={INSET}>
                <div
                  data-expanded={expanded ? "true" : undefined}
                  className="rounded-[12px] transition-colors duration-150 data-[expanded=true]:bg-[color-mix(in_oklab,var(--atc-text)_3.5%,transparent)]"
                >
                  <button
                    type="button"
                    data-expanded={expanded ? "true" : "false"}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className={cn(
                      "group grid w-full grid-cols-[34px_minmax(0,1fr)_16px] items-start gap-x-2.5",
                      "rounded-[12px] px-2.5 py-[11px] text-left transition-colors duration-150",
                      !expanded &&
                        "hover:bg-[color-mix(in_oklab,var(--atc-text)_3%,transparent)]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--atc-signal-accent)]",
                    )}
                  >
                    <span className="mt-[1px] font-code text-[13px] leading-[1.3] text-atc-faint group-data-[expanded=true]:text-atc-text">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="text-[15px] leading-[1.25] text-atc-text">
                        {t(item.titleKey)}
                      </span>
                      <span className="text-[11.5px] leading-[1.3] text-[color-mix(in_oklab,var(--atc-text)_46%,transparent)]">
                        {t(item.signalKey)}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="mt-[3px] h-4 w-4 text-atc-faint transition-transform duration-200 group-data-[expanded=true]:rotate-90 group-data-[expanded=true]:text-atc-dim"
                    />
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
                      <div className={cn("pb-3 pr-2.5", DETAIL_INDENT)}>
                        <p className="text-[12px] leading-[1.55] text-[color-mix(in_oklab,var(--atc-text)_55%,transparent)]">
                          {t(item.bodyKey)}
                        </p>
                        <MechanismFlow
                          label={t("mechanism.flowLabel")}
                          steps={flowLabels}
                        />
                        <ol className="mt-3.5 flex flex-col gap-[7px]">
                          {item.detailKeys.map((key, detailIndex) => (
                            <li
                              key={key}
                              className="grid grid-cols-[16px_minmax(0,1fr)] gap-2"
                            >
                              <span className="font-code text-[10px] leading-[1.5] text-atc-faint">
                                {String(detailIndex + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 text-[11.5px] leading-[1.45] text-[color-mix(in_oklab,var(--atc-text)_55%,transparent)]">
                                {t(key)}
                              </span>
                            </li>
                          ))}
                        </ol>
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

// Vertical node pipeline: a 1px connector threads the step dots top-to-bottom;
// only the FINAL node (the produced payload) is the orange signal, the rest
// are neutral. Step labels are mono so the flow reads as a data path.
function MechanismFlow({ label, steps }: { label: string; steps: string[] }) {
  if (!steps.length) return null;

  return (
    <div className="mt-3.5">
      {/* `uppercase` is globally disabled (modernization override), so cap in JS. */}
      <span className="block font-code text-[9px] [letter-spacing:1.4px] text-atc-faint">
        {label.toUpperCase()}
      </span>
      <ol className="relative mt-2 flex flex-col gap-2.5">
        {/* Connector line spans the first dot center to the last. */}
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-[7px] bottom-[7px] w-px bg-[color-mix(in_oklab,var(--atc-text)_18%,transparent)]"
        />
        {steps.map((step, index) => {
          const isFinal = index === steps.length - 1;
          return (
            <li
              key={`${step}-${index}`}
              className="relative flex items-center gap-2.5"
            >
              <span
                className={cn(
                  "z-[1] h-[7px] w-[7px] shrink-0 rounded-full",
                  isFinal
                    ? "bg-[var(--atc-signal-accent)]"
                    : "bg-[color-mix(in_oklab,var(--atc-text)_32%,transparent)]",
                )}
              />
              <span className="min-w-0 truncate font-code text-[11.5px] leading-none text-atc-text">
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
