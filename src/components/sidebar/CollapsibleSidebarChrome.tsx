import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { ChevronDown } from "lucide-react";
import SidebarBrandMark from "./SidebarBrandMark";
import { Toolbar, ToolbarButton } from "@/components/ui/Toolbar";
import { cn } from "@/lib/utils";

type CollapsibleSidebarOptions = {
  collapsed?: boolean;
  collapseEnabled?: boolean;
  onCollapse?: (() => void) | null;
};

type WheelCollapseGesture = {
  startedAtBottom: boolean;
  accumulatedDeltaY: number;
  lastTime: number;
};

const SIDEBAR_COLLAPSE_WHEEL_MIN_DELTA_Y = 8;
const SIDEBAR_COLLAPSE_WHEEL_TRIGGER_DISTANCE_PX = 72;
const SIDEBAR_COLLAPSE_WHEEL_GESTURE_RESET_MS = 340;
const SIDEBAR_COLLAPSE_TOUCH_TRIGGER_DISTANCE_PX = 54;

export function useCollapsibleSidebarPanel<
  Element extends HTMLElement = HTMLDivElement,
>({
  collapsed = false,
  collapseEnabled = false,
  onCollapse = null,
}: CollapsibleSidebarOptions) {
  const shellRef = useRef<Element | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartedAtBottomRef = useRef(false);
  const wheelGestureRef = useRef<WheelCollapseGesture | null>(null);
  const wheelResetTimerRef = useRef<number | null>(null);
  const wasCollapsedRef = useRef(false);
  const brandCompactRef = useRef(false);
  const [brandCompact, setBrandCompactState] = useState(false);
  const canCollapse = Boolean(collapseEnabled && onCollapse);
  const isCollapsed = Boolean(canCollapse && collapsed);

  const setBrandCompact = useCallback((nextCompact: boolean) => {
    if (brandCompactRef.current === nextCompact) return;
    brandCompactRef.current = nextCompact;
    setBrandCompactState(nextCompact);
  }, []);

  const resetWheelGesture = useCallback(() => {
    wheelGestureRef.current = null;
    if (wheelResetTimerRef.current != null) {
      window.clearTimeout(wheelResetTimerRef.current);
      wheelResetTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isCollapsed) setBrandCompact(true);
  }, [isCollapsed, setBrandCompact]);

  useEffect(() => {
    if (wasCollapsedRef.current && !isCollapsed) {
      const frameId = window.requestAnimationFrame(() => {
        shellRef.current?.scrollTo({ top: 0, left: 0 });
        setBrandCompact(false);
      });
      wasCollapsedRef.current = isCollapsed;
      return () => window.cancelAnimationFrame(frameId);
    }

    wasCollapsedRef.current = isCollapsed;
    return undefined;
  }, [isCollapsed, setBrandCompact]);

  const isScrolledToBottom = useCallback(() => {
    const element = shellRef.current;
    if (!element) return false;
    const scrollable = element.scrollHeight > element.clientHeight + 4;
    if (!scrollable) return false;
    return element.scrollTop + element.clientHeight >= element.scrollHeight - 2;
  }, []);

  const requestCollapseFromEnd = useCallback((gestureStartedAtBottom: boolean) => {
    if (
      !gestureStartedAtBottom ||
      !canCollapse ||
      isCollapsed ||
      !isScrolledToBottom()
    ) {
      return false;
    }
    onCollapse?.();
    return true;
  }, [canCollapse, isCollapsed, isScrolledToBottom, onCollapse]);

  const handleScroll = useCallback(() => {
    const element = shellRef.current;
    if (!element || isCollapsed) return;
    setBrandCompact(element.scrollTop > 18);
  }, [isCollapsed, setBrandCompact]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<Element>) => {
      const deltaY = Number(event.deltaY);
      const deltaX = Math.abs(Number(event.deltaX));
      if (!Number.isFinite(deltaY) || !Number.isFinite(deltaX)) return;
      if (deltaY <= SIDEBAR_COLLAPSE_WHEEL_MIN_DELTA_Y) return;
      if (deltaX > Math.abs(deltaY) * 0.8) return;

      const now = event.timeStamp;
      const previousGesture = wheelGestureRef.current;
      const startsNewGesture =
        !previousGesture ||
        now - previousGesture.lastTime >
          SIDEBAR_COLLAPSE_WHEEL_GESTURE_RESET_MS;
      if (startsNewGesture) {
        wheelGestureRef.current = {
          startedAtBottom: isScrolledToBottom(),
          accumulatedDeltaY: 0,
          lastTime: now,
        };
      }

      const gesture = wheelGestureRef.current;
      if (!gesture) return;
      gesture.lastTime = now;
      if (wheelResetTimerRef.current != null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
      wheelResetTimerRef.current = window.setTimeout(() => {
        wheelGestureRef.current = null;
        wheelResetTimerRef.current = null;
      }, SIDEBAR_COLLAPSE_WHEEL_GESTURE_RESET_MS);

      if (!gesture.startedAtBottom || !isScrolledToBottom()) return;

      gesture.accumulatedDeltaY += deltaY;
      if (
        gesture.accumulatedDeltaY <
        SIDEBAR_COLLAPSE_WHEEL_TRIGGER_DISTANCE_PX
      ) {
        return;
      }

      if (requestCollapseFromEnd(true)) {
        event.preventDefault();
        resetWheelGesture();
      }
    },
    [isScrolledToBottom, requestCollapseFromEnd, resetWheelGesture],
  );

  const handleTouchStart = useCallback((event: React.TouchEvent<Element>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    touchStartedAtBottomRef.current = isScrolledToBottom();
  }, [isScrolledToBottom]);

  const handleTouchEnd = useCallback(() => {
    touchStartYRef.current = null;
    touchStartedAtBottomRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<Element>) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY ?? null;
      if (startY == null || currentY == null) return;
      if (startY - currentY <= SIDEBAR_COLLAPSE_TOUCH_TRIGGER_DISTANCE_PX) {
        return;
      }
      if (requestCollapseFromEnd(touchStartedAtBottomRef.current)) {
        touchStartYRef.current = null;
        touchStartedAtBottomRef.current = false;
      }
    },
    [requestCollapseFromEnd],
  );

  useEffect(() => {
    if (!canCollapse || isCollapsed) resetWheelGesture();
  }, [canCollapse, isCollapsed, resetWheelGesture]);

  useEffect(() => resetWheelGesture, [resetWheelGesture]);

  return {
    shellRef,
    brandCompact,
    isCollapsed,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
  };
}

export function SidebarBrandDock({
  compact,
  collapsed,
  expandLabel,
  onExpand,
  showRule = false,
  className,
}: {
  compact: boolean;
  collapsed: boolean;
  expandLabel: string;
  onExpand?: (() => void) | null;
  showRule?: boolean;
  className?: string;
}) {
  if (collapsed) {
    return (
      <Toolbar
        layout="inline"
        reveal={false}
        aria-label={expandLabel}
        className={cn("sidebar-brand-dock static min-w-max items-center", className)}
      >
        <div className="inline-flex h-[var(--atc-toolbar-cell-size)] translate-y-[2px] items-center justify-center px-2 pl-3">
          <SidebarBrandMark compact />
        </div>
        <ToolbarButton
          tone="soft"
          aria-label={expandLabel}
          title={expandLabel}
          onClick={() => onExpand?.()}
        >
          <ChevronDown aria-hidden="true" className="translate-y-[2px]" />
        </ToolbarButton>
      </Toolbar>
    );
  }

  return (
    <div
      className={cn(
        "sidebar-brand-dock sticky top-0 z-[calc(var(--z-index-sticky)+1)] flex items-center justify-between gap-2 px-[var(--airport-sidebar-inset)] transition-[padding,background,box-shadow] duration-200 ease-out",
        "bg-[color-mix(in_oklab,var(--app-frost-tint)_86%,transparent)] [backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
        "shadow-[0_1px_0_color-mix(in_oklab,var(--atc-line)_56%,transparent)]",
        compact ? "pb-2 pt-3" : "pb-3 pt-5",
        "[[data-mobile-overlay=true]_&]:pt-[calc(24px+env(safe-area-inset-top))]",
        className,
      )}
    >
      <SidebarBrandMark compact={compact} />
      {showRule ? (
        <span
          aria-hidden="true"
          className="h-px min-w-8 flex-1 bg-[var(--atc-line-strong)]"
        />
      ) : null}
    </div>
  );
}
