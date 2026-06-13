"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
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
        <div className="atc-section-head">
          <span className="atc-kicker">{t("mechanism.sidebarLabel")}</span>
          <span className="atc-section-head__count">
            {t("mechanism.count", { count: MECHANISM_ITEMS.length })}
          </span>
        </div>
        <p className="mt-2 max-w-[36ch] text-[11.5px] leading-relaxed text-atc-dim">
          {t("mechanism.description")}
        </p>
      </div>

      <ol className="dither-list flex flex-col gap-1 px-6">
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
                <li className="px-3.5 pb-1 pt-4 first:pt-0">
                  <span className="font-mono text-[10px] font-black uppercase leading-none tracking-normal text-atc-faint">
                    {t(item.groupKey)}
                  </span>
                </li>
              ) : null}
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
                      <MechanismFlow labels={flowLabels} active={expanded} />
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
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

function MechanismFlow({
  labels,
  active,
}: {
  labels: string[];
  active: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelsKey = labels.join("|");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !active || !labels.length) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        "[data-flow-line]",
        { scaleY: 0, transformOrigin: "top center" },
        { scaleY: 1, duration: 0.22, ease: "power2.out" },
      );
      gsap.fromTo(
        "[data-flow-node]",
        { opacity: 0, x: -8 },
        {
          opacity: 1,
          x: 0,
          duration: 0.24,
          ease: "power2.out",
          stagger: 0.045,
        },
      );
    }, root);

    return () => context.revert();
  }, [active, labels.length, labelsKey]);

  if (!labels.length) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative mt-3 overflow-hidden rounded-[calc(var(--atc-radius-card)-6px)]",
        "border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)]",
        "px-3 py-2.5 shadow-[var(--atc-control-inset-shadow)]",
        "[backdrop-filter:var(--app-frost)] [-webkit-backdrop-filter:var(--app-frost)]",
      )}
    >
      <div
        data-flow-line
        aria-hidden="true"
        className="absolute bottom-4 left-[21px] top-4 w-px bg-[var(--atc-line)]"
      />
      <ol className="relative grid gap-2">
        {labels.map((label, index) => (
          <li
            key={`${label}-${index}`}
            data-flow-node
            className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2"
          >
            <span className="relative z-[1] flex size-[18px] items-center justify-center rounded-full bg-atc-text font-mono text-[9px] font-black leading-none text-atc-bg">
              {index + 1}
            </span>
            <span className="min-w-0 truncate text-[10.5px] font-semibold leading-none text-atc-dim">
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
