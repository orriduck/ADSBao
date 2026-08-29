import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared shell for compact map signs. Identity, data and actions remain joined
// edge-to-edge so the card uses mobile space without introducing inner cards.
//
// `pointer-events-none` on the card surface lets map taps flow through
// the empty edges of the card; the Track button / suggest link
// re-enable interaction inside `MobilePreviewActions`.

// Drag distance (px) past which the grabber flips collapsed <-> expanded.
const SHEET_DRAG_THRESHOLD = 26;

export default function MobilePreviewCard({
  ariaLabel,
  children,
  topMedia = null,
  actions = null,
  compact = false,
  placement = "top",
  style,
  expandable = false,
  grabberLabel,
  expandedContent = null,
  onDismiss = null,
  dismissLabel = "Close",
}: Record<string, any>) {
  // NOTE: the enter animation replays on entity change via a `key` on the
  // *call site* (<MobilePreviewCard key=...>), not a prop here — a `key`
  // on this root <aside> would be a no-op (React reads key at the call site).
  const [expanded, setExpanded] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragRef = React.useRef<{
    y: number;
    lastY: number;
    lastAt: number;
    velocity: number;
  } | null>(null);
  // Portrait = top sheet, drags DOWN to expand. Landscape = bottom sheet,
  // drags UP to expand. expandDir is the sign of "open".
  const isTop = placement !== "bottomRight";
  const expandDir = isTop ? 1 : -1;

  const onGrabberPointerDown = (event: React.PointerEvent) => {
    dragRef.current = {
      y: event.clientY,
      lastY: event.clientY,
      lastAt: event.timeStamp,
      velocity: 0,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onGrabberPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientY - drag.y) * expandDir;
    const elapsed = Math.max(1, event.timeStamp - drag.lastAt);
    drag.velocity = ((event.clientY - drag.lastY) * expandDir) / elapsed;
    drag.lastY = event.clientY;
    drag.lastAt = event.timeStamp;
    setDragOffset(Math.max(-42, Math.min(42, delta)) * expandDir);
  };
  const onGrabberPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag) {
      const delta = (event.clientY - drag.y) * expandDir;
      if (delta > SHEET_DRAG_THRESHOLD || drag.velocity > 0.5) setExpanded(true);
      else if (delta < -SHEET_DRAG_THRESHOLD || drag.velocity < -0.5) {
        setExpanded(false);
      }
    }
    dragRef.current = null;
    setDragging(false);
    setDragOffset(0);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const grabber = expandable ? (
    <button
      type="button"
      className="mobile-preview-grabber pointer-events-auto"
      data-edge={isTop ? "bottom" : "top"}
      aria-label={grabberLabel}
      aria-expanded={expanded}
      onClick={() => setExpanded((value) => !value)}
      onPointerDown={onGrabberPointerDown}
      onPointerMove={onGrabberPointerMove}
      onPointerUp={onGrabberPointerUp}
      onPointerCancel={onGrabberPointerUp}
    >
      <span aria-hidden="true" className="mobile-preview-grabber__bar" />
    </button>
  ) : null;

  const reveal =
    expandable && expandedContent ? (
      <div
        className={cn(
          "pointer-events-auto grid transition-[grid-template-rows,opacity] duration-[var(--motion-ui-slow)] ease-[var(--motion-ease-out)] motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">{expandedContent}</div>
      </div>
    ) : null;
  const dismissible = typeof onDismiss === "function";

  return (
    <aside
      aria-label={ariaLabel}
      data-density={compact ? "compact" : undefined}
      data-placement={placement === "bottomRight" ? "bottom-right" : "top"}
      data-expanded={expanded ? "true" : undefined}
      data-dragging={dragging ? "true" : undefined}
      data-dismissible={dismissible ? "true" : undefined}
      data-has-top-media={topMedia ? "true" : undefined}
      data-ui="mobile-preview-card"
      style={
        {
          ...style,
          "--mobile-preview-drag-y": `${dragOffset}px`,
        } as React.CSSProperties
      }
      className={cn(
        "fixed z-popover",
        placement === "bottomRight"
          ? [
              "bottom-[calc(10px+var(--mobile-preview-safe-bottom,var(--app-bottom-safe-area)))]",
              "right-[calc(10px+var(--mobile-preview-safe-right,env(safe-area-inset-right)))]",
              "w-[min(318px,calc(100vw-20px-var(--mobile-preview-safe-left,0px)-var(--mobile-preview-safe-right,0px)))]",
              "max-w-[calc(100vw-20px-var(--mobile-preview-safe-left,0px)-var(--mobile-preview-safe-right,0px))]",
            ]
          : [
              "left-1/2",
              "top-[calc(10px+env(safe-area-inset-top))]",
              "w-[min(326px,calc(100vw-20px))] max-w-[calc(100vw-20px)]",
            ],
        "isolate overflow-hidden select-none pointer-events-none",
        "app-preview-transition mobile-preview-card-enter",
        "rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] text-atc-text",
        "shadow-[var(--preview-card-shadow),var(--atc-preview-card-inset)]",
        "flex flex-col gap-0",
        compact && placement !== "bottomRight" &&
          "top-[calc(9px+env(safe-area-inset-top))] w-[min(316px,calc(100vw-18px))] max-w-[calc(100vw-18px)]",
      )}
    >
      {/* Landscape bottom-sheet: grabber rides the top edge (drag up). */}
      {!isTop ? grabber : null}
      <div data-preview-content className="min-w-0">
        {topMedia}
        {children}
      </div>
      {dismissible ? (
        <button
          type="button"
          className="pointer-events-auto absolute right-3 top-3 z-10 grid size-6 cursor-pointer place-items-center rounded-full text-atc-dim transition-[background-color,color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)] hover:bg-[var(--atc-control-surface-muted)] hover:text-atc-text active:scale-[0.92] focus-visible:bg-[var(--atc-control-surface-muted)] focus-visible:text-atc-text focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-2"
          aria-label={dismissLabel}
          title={dismissLabel}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-[14px]" strokeWidth={1.8} />
        </button>
      ) : null}
      {/* Expanded detail reveals between the collapsed content and the
          actions so the action row stays put as the sheet grows. */}
      {reveal}
      {actions}
      {/* Portrait top-sheet: grabber rides the bottom edge (drag down). */}
      {isTop ? grabber : null}
    </aside>
  );
}

// Actions row container. Sets `pointer-events-auto` so the buttons
// inside become tappable inside the otherwise pass-through card.
export function MobilePreviewActions({ children }: Record<string, any>) {
  return (
    <div className="mobile-preview-actions pointer-events-auto flex flex-col items-stretch">
      {children}
    </div>
  );
}

// Primary action — the same restrained signal-accent button as desktop.
export const MobilePreviewTrackButton = React.forwardRef(
  function MobilePreviewTrackButton(
    { className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "mobile-preview-track-button min-h-9 w-full cursor-pointer px-[10px]",
          "border-0 border-t border-[var(--atc-action-primary-border)]",
          "rounded-none",
          "bg-[var(--atc-signal-accent)] text-[var(--atc-signal-accent-fg)]",
          "shadow-[var(--atc-action-primary-shadow)]",
          "font-[var(--font-sans)] text-[11px] not-italic tracking-normal leading-[1.15] text-center [[data-density=compact]_&]:text-[10px]",
          "[-webkit-tap-highlight-color:transparent]",
          "transition-[box-shadow,filter,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
          "hover:brightness-[1.04] active:scale-[0.97] active:brightness-[0.96]",
          "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          className,
        )}
        {...props}
      />
    );
  },
);

// Secondary icon action for compact previews. It deliberately uses the
// neutral control material so utility actions never compete with Track.
export const MobilePreviewIconButton = React.forwardRef(
  function MobilePreviewIconButton(
    { className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "grid min-h-9 w-9 flex-none cursor-pointer place-items-center",
          "rounded-none border-0 border-l border-t border-[var(--atc-control-border)]",
          "bg-[var(--atc-control-surface-muted)] text-atc-dim shadow-[var(--atc-control-inset-shadow-subtle)]",
          "[-webkit-tap-highlight-color:transparent]",
          "transition-[background-color,color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
          "hover:bg-[var(--atc-control-surface-hover)] hover:text-atc-text active:scale-[0.96]",
          "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[3px]",
          className,
        )}
        {...props}
      />
    );
  },
);
