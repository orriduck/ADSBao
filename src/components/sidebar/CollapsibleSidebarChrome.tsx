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

export function useCollapsibleSidebarPanel<
  Element extends HTMLElement = HTMLDivElement,
>({
  collapsed = false,
  collapseEnabled = false,
  onCollapse = null,
}: CollapsibleSidebarOptions) {
  const shellRef = useRef<Element | null>(null);
  const touchStartYRef = useRef<number | null>(null);
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

  const requestCollapseFromEnd = useCallback(() => {
    if (!canCollapse || isCollapsed || !isScrolledToBottom()) return false;
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
      if (event.deltaY <= 8) return;
      if (requestCollapseFromEnd()) event.preventDefault();
    },
    [requestCollapseFromEnd],
  );

  const handleTouchStart = useCallback((event: React.TouchEvent<Element>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<Element>) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY ?? null;
      if (startY == null || currentY == null) return;
      if (startY - currentY <= 18) return;
      if (requestCollapseFromEnd()) touchStartYRef.current = null;
    },
    [requestCollapseFromEnd],
  );

  return {
    shellRef,
    brandCompact,
    isCollapsed,
    handleScroll,
    handleWheel,
    handleTouchStart,
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
