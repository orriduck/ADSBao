import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { MOTION, EASE } from "@/animations/gsap";
import { usePrefersReducedMotion } from "@/components/effects/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const rootClassName =
  "flex min-w-0 flex-col items-end justify-center gap-px whitespace-nowrap font-display [font-feature-settings:'tnum'_1] [text-shadow:0_1px_8px_var(--atc-bg)]";

const mapCornerClassName = cn(
  "absolute right-3 top-[calc(100%+6px)] hidden max-w-[calc(100vw-72px)] transform-none",
  "[.airport-map-menu_&]:flex",
  "[.airport-map-kit_&]:right-0.5 [.airport-map-kit_&]:top-[calc(100%+10px)]",
  "md:[.airport-map-kit_&]:top-[calc(100%+8px)]",
  "[.airport-map-menu--mobile_&]:left-1/2 [.airport-map-menu--mobile_&]:right-auto [.airport-map-menu--mobile_&]:top-[calc(100%+7px)]",
  "[.airport-map-menu--mobile_&]:bottom-[calc(100%+7px)] [.airport-map-menu--mobile_&]:top-auto",
  "[.airport-map-menu--mobile_&]:max-w-[min(360px,calc(100vw-16px))] [.airport-map-menu--mobile_&]:-translate-x-1/2",
  "[.airport-map-menu--mobile_&]:items-center [.airport-map-menu--mobile_&]:text-center",
  "[.airport-map-menu--mobile_&]:[filter:drop-shadow(0_7px_11px_color-mix(in_oklab,var(--atc-bg)_72%,transparent))_drop-shadow(0_1px_1px_color-mix(in_oklab,var(--atc-text)_24%,transparent))]",
);

const lineClassName = cn(
  "flex w-full min-w-0 items-center justify-end gap-[7px]",
  "text-[10px] font-semibold leading-none text-atc-dim",
  "[.airport-map-kit_&]:gap-[5px] [.airport-map-kit_&]:text-[8px]",
  "[.airport-map-menu--mobile_&]:justify-center [.airport-map-menu--mobile_&]:gap-1.5",
  "[.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[9px]",
);

const diamondClassName =
  "inline-block size-[7px] flex-none rotate-45 bg-atc-orange [.airport-map-kit_&]:size-[5px] [.airport-map-menu--mobile_&]:size-1.5";

const loadingClassName = cn(
  "min-h-0 max-w-[min(360px,calc(100vw-72px))] overflow-hidden whitespace-normal",
  "text-right font-mono text-[8px] font-semibold uppercase leading-none text-atc-dim",
  "opacity-0 transition-opacity duration-200 ease-out [overflow-wrap:anywhere] will-change-[opacity] motion-reduce:transition-none",
  "[.airport-map-kit_&]:max-w-[min(320px,calc(100vw-72px))] [.airport-map-kit_&]:text-[7px]",
  "[.airport-map-menu--mobile_&]:max-w-[min(360px,calc(100vw-16px))] [.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[7px]",
);

const detailLineClassName = cn(
  "min-h-0 max-w-[min(420px,calc(100vw-72px))] overflow-hidden whitespace-normal",
  "text-right font-mono text-[8px] font-semibold uppercase leading-tight text-atc-dim",
  "[overflow-wrap:anywhere]",
  "[.airport-map-kit_&]:max-w-[min(360px,calc(100vw-72px))] [.airport-map-kit_&]:text-[7px]",
  "[.airport-map-menu--mobile_&]:max-w-[min(360px,calc(100vw-16px))] [.airport-map-menu--mobile_&]:text-center [.airport-map-menu--mobile_&]:text-[7px]",
);

const statusLineShellClassName =
  "flex w-full min-w-0 items-center justify-end overflow-hidden [.airport-map-menu--mobile_&]:justify-center [.airport-map-menu--mobile_&]:text-center";

const STATUS_LINE_EXIT_MS = 190;
const STATUS_LINE_ENTER_MS = MOTION.med * 1000;
const STATUS_LINE_SELECTOR = "[data-status-line-key]";

type StatusLineItem = {
  key: string;
  line: string;
  animationKey: string;
  order: number;
  entering: boolean;
  exiting: boolean;
};

type StatusLineInput =
  | string
  | {
      key?: unknown;
      line?: unknown;
      animationKey?: unknown;
    };

function getStatusLineKey(line: string, index: number) {
  const parts = line.split("·").map((part) => part.trim()).filter(Boolean);
  const callsign = parts[1];
  if (callsign) return `traffic:${callsign}`;
  return `line:${line}:${index}`;
}

function normalizeStatusLineInput(input: StatusLineInput, index: number) {
  const line =
    typeof input === "string"
      ? input
      : String(input?.line || "").trim();
  const key =
    typeof input === "string"
      ? getStatusLineKey(line, index)
      : String(input?.key || getStatusLineKey(line, index));
  const animationKey =
    typeof input === "string"
      ? line
      : String(input?.animationKey || line);

  return { key, line, animationKey };
}

function buildStatusLineItems(lines: StatusLineInput[], entering = false) {
  return lines.map((input, index) => ({
    ...normalizeStatusLineInput(input, index),
    order: index,
    entering,
    exiting: false,
  }));
}

function getStatusLinesSignature(lines: StatusLineInput[]) {
  return lines
    .map((input, index) => {
      const item = normalizeStatusLineInput(input, index);
      return `${item.key}\u0001${item.animationKey}\u0001${item.line}`;
    })
    .join("\u0000");
}

/**
 * Inline span with GSAP fade transition when content changes.
 */
function StatusSpan({
  children,
  className,
  animationKey,
}: {
  children: React.ReactNode;
  className?: string;
  animationKey?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(animationKey ?? children);
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionKey = animationKey ?? children;

  useLayoutEffect(() => {
    if (prevRef.current === motionKey) return;
    prevRef.current = motionKey;
    const el = ref.current;
    if (!el) return;
    gsap.killTweensOf(el);

    if (prefersReducedMotion) {
      gsap.set(el, { clearProps: "opacity,visibility,transform" });
      return undefined;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 2 },
        {
          autoAlpha: 1,
          y: 0,
          clearProps: "opacity,visibility,transform",
          duration: MOTION.fast,
          ease: EASE.out,
          overwrite: "auto",
        },
      );
    }, el);

    return () => context.revert();
  }, [motionKey, prefersReducedMotion]);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

function AnimatedStatusLines({ lines }: { lines: StatusLineInput[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const previousActiveKeysRef = useRef<Set<string>>(new Set());
  const prefersReducedMotion = usePrefersReducedMotion();
  const [items, setItems] = useState<StatusLineItem[]>(() =>
    buildStatusLineItems(lines, true),
  );
  const linesKey = getStatusLinesSignature(lines);

  useEffect(() => {
    const nextItems = buildStatusLineItems(lines);
    if (prefersReducedMotion) {
      setItems(nextItems);
      return undefined;
    }

    const nextKeys = new Set(nextItems.map((item) => item.key));
    setItems((currentItems) => {
      const currentItemByKey = new Map(
        currentItems.map((item) => [item.key, item]),
      );
      const currentActiveKeys = new Set(
        currentItems.filter((item) => !item.exiting).map((item) => item.key),
      );
      const exitingItems = currentItems
        .filter((item) => !item.exiting && !nextKeys.has(item.key))
        .map((item) => ({ ...item, entering: false, exiting: true }));
      const activeItems = nextItems.map((item) => ({
        ...item,
        entering:
          currentItemByKey.get(item.key)?.entering === true ||
          !currentActiveKeys.has(item.key),
      }));

      return [...activeItems, ...exitingItems].sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return Number(a.exiting) - Number(b.exiting);
      });
    });

    return undefined;
  }, [linesKey, prefersReducedMotion]);

  useEffect(() => {
    if (!items.some((item) => item.entering || item.exiting)) return undefined;

    const clearTimer = window.setTimeout(() => {
      setItems((currentItems) =>
        currentItems
          .filter((item) => !item.exiting)
          .map((item) => ({ ...item, entering: false })),
      );
    }, Math.max(STATUS_LINE_ENTER_MS, STATUS_LINE_EXIT_MS) + 40);

    return () => window.clearTimeout(clearTimer);
  }, [items]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(STATUS_LINE_SELECTOR),
    );
    const previousRects = previousRectsRef.current;
    const previousActiveKeys = previousActiveKeysRef.current;
    const nextRects = new Map<string, DOMRect>();
    const nextActiveKeys = new Set(
      items.filter((item) => !item.exiting).map((item) => item.key),
    );

    for (const element of elements) {
      const key = element.dataset.statusLineKey;
      if (key) nextRects.set(key, element.getBoundingClientRect());
    }

    previousRectsRef.current = nextRects;
    previousActiveKeysRef.current = nextActiveKeys;

    if (prefersReducedMotion) {
      gsap.set(elements, { clearProps: "opacity,visibility,transform,willChange" });
      return undefined;
    }

    const context = gsap.context(() => {
      const entering: HTMLElement[] = [];
      const exiting: HTMLElement[] = [];
      const moving: HTMLElement[] = [];
      const deltaByElement = new WeakMap<HTMLElement, { x: number; y: number }>();

      for (const element of elements) {
        const key = element.dataset.statusLineKey;
        if (!key) continue;

        const state = element.dataset.statusLineState;
        if (state === "exiting") {
          exiting.push(element);
          continue;
        }

        if (state === "entering" || !previousActiveKeys.has(key)) {
          entering.push(element);
          continue;
        }

        const previousRect = previousRects.get(key);
        const nextRect = nextRects.get(key);
        if (!previousRect || !nextRect) continue;

        const deltaX = previousRect.left - nextRect.left;
        const deltaY = previousRect.top - nextRect.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) continue;

        moving.push(element);
        deltaByElement.set(element, { x: deltaX, y: deltaY });
      }

      const animatedTargets = [...new Set([...entering, ...exiting, ...moving])];
      if (animatedTargets.length > 0) {
        gsap.killTweensOf(animatedTargets);
      }

      if (moving.length > 0) {
        gsap.set(moving, {
          willChange: "transform",
          x: (_index, target) => deltaByElement.get(target)?.x ?? 0,
          y: (_index, target) => deltaByElement.get(target)?.y ?? 0,
        });
        gsap.to(moving, {
          x: 0,
          y: 0,
          clearProps: "transform,willChange",
          duration: MOTION.med,
          ease: EASE.snap,
          overwrite: true,
        });
      }

      if (entering.length > 0) {
        gsap.fromTo(
          entering,
          { autoAlpha: 0, y: -4, scale: 0.985, willChange: "transform,opacity" },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            clearProps: "opacity,visibility,transform,willChange",
            duration: MOTION.med,
            ease: EASE.out,
            stagger: 0.035,
            overwrite: "auto",
          },
        );
      }

      if (exiting.length > 0) {
        gsap.to(exiting, {
          autoAlpha: 0,
          y: -3,
          duration: STATUS_LINE_EXIT_MS / 1000,
          ease: EASE.out,
          overwrite: true,
        });
      }
    }, container);

    return () => context.revert();
  }, [items, prefersReducedMotion]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="contents">
      {items.map((item) => (
        <span
          key={item.key}
          className={statusLineShellClassName}
          data-status-line-key={item.key}
          data-status-line-state={
            item.exiting ? "exiting" : item.entering ? "entering" : "active"
          }
          aria-hidden={item.exiting}
        >
          <StatusSpan
            className={detailLineClassName}
            animationKey={item.animationKey}
          >
            {item.line}
          </StatusSpan>
        </span>
      ))}
    </div>
  );
}

export default function MapSourceStatusDisplay({
  feedSource = "",
  feedStatus = "live",
  updatedLabel = "",
  loadingStatus = "",
  realtimeStatus = "",
  statusLines = [],
  placement = "mobile-map",
  wakeLockActive = false,
}) {
  const loadingActive = Boolean(loadingStatus);
  const realtimeStatusLabel = String(realtimeStatus || "").trim().toUpperCase();
  const detailLines: StatusLineInput[] = Array.isArray(statusLines)
    ? statusLines
        .map((line, index) => normalizeStatusLineInput(line, index))
        .filter((line) => Boolean(line.line))
    : [];
  const [displayedLoadingStatus, setDisplayedLoadingStatus] = useState(
    loadingStatus,
  );

  useEffect(() => {
    if (loadingStatus) {
      setDisplayedLoadingStatus(loadingStatus);
      return undefined;
    }

    const clearTimer = window.setTimeout(() => {
      setDisplayedLoadingStatus("");
    }, 260);
    return () => window.clearTimeout(clearTimer);
  }, [loadingStatus]);

  if (
    !feedSource &&
    !updatedLabel &&
    !loadingStatus &&
    !displayedLoadingStatus &&
    !realtimeStatusLabel &&
    detailLines.length === 0 &&
    !wakeLockActive
  ) {
    return null;
  }

  const isMapCorner = placement === "map-corner";
  const isInfer = feedStatus === "infer";
  const hasPrimary =
    feedSource ||
    updatedLabel ||
    realtimeStatusLabel ||
    wakeLockActive;

  return (
    <div
      className={cn(
        rootClassName,
        isMapCorner && mapCornerClassName,
      )}
      aria-label="Map data sources"
    >
      {hasPrimary ? (
        <span className={lineClassName}>
          {realtimeStatusLabel ? (
            <>
              <StatusSpan className="inline-flex flex-none items-center gap-1.5 font-mono text-atc-orange">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-atc-orange opacity-80 motion-safe:animate-pulse [.airport-map-kit_&]:size-1"
                />
                <span>{realtimeStatusLabel}</span>
              </StatusSpan>
              {(wakeLockActive || feedSource || updatedLabel) ? (
                <span
                  aria-hidden="true"
                  className={diamondClassName}
                />
              ) : null}
            </>
          ) : null}
          {wakeLockActive ? (
            <>
              <StatusSpan className="flex-none tabular-nums text-atc-orange">
                ☕ Keep awake
              </StatusSpan>
              {(feedSource || updatedLabel) ? (
                <span
                  aria-hidden="true"
                  className={diamondClassName}
                />
              ) : null}
            </>
          ) : null}
          {feedSource ? (
            <StatusSpan
              className={cn("flex-none notranslate", isInfer && "text-atc-faint")}
            >
              {feedSource}
            </StatusSpan>
          ) : null}
          {feedSource && updatedLabel ? (
            <span
              aria-hidden="true"
              className={diamondClassName}
            />
          ) : null}
          {updatedLabel ? (
            <StatusSpan
              className={cn("flex-none tabular-nums", isInfer && "text-atc-faint")}
            >
              {updatedLabel}
            </StatusSpan>
          ) : null}
        </span>
      ) : null}
      {loadingActive || displayedLoadingStatus ? (
        <span
          className={statusLineShellClassName}
          aria-hidden={!loadingActive}
        >
          <span
            className={cn(
              loadingClassName,
              loadingActive && "opacity-100",
            )}
          >
            {displayedLoadingStatus}
          </span>
        </span>
      ) : null}
      <AnimatedStatusLines lines={detailLines} />
    </div>
  );
}
