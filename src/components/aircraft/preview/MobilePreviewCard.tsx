import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared shell for the bottom-of-screen mobile preview card. Both the
// aircraft and airport variants render through this so the outer
// chrome — position, dark card surface + warm 135deg gradient, border,
// shadow, action slot — lives in one place. Variant
// content goes in `children`; action buttons (Track / Suggest) go in
// `actions` so they stay below the content with the right pointer
// behaviour. Adjust card size / radius / gradient here and every
// preview reflects.
//
// `pointer-events-none` on the card surface lets map taps flow through
// the empty edges of the card; the Track button / suggest link
// re-enable interaction inside `MobilePreviewActions`.

// Whether the sheet is expanded — read by the variant content to reveal the
// full detail. Provided by MobilePreviewCard.
const MobilePreviewExpandedContext = React.createContext(false);
export function useMobilePreviewExpanded() {
  return React.useContext(MobilePreviewExpandedContext);
}

// Drag distance (px) past which the grabber flips collapsed <-> expanded.
const SHEET_DRAG_THRESHOLD = 26;

export default function MobilePreviewCard({
  ariaLabel,
  children,
  actions = null,
  compact = false,
  placement = "top",
  style,
  expandable = false,
  grabberLabel,
  expandedContent = null,
}: Record<string, any>) {
  // NOTE: the enter animation replays on entity change via a `key` on the
  // *call site* (<MobilePreviewCard key=...>), not a prop here — a `key`
  // on this root <aside> would be a no-op (React reads key at the call site).
  const [expanded, setExpanded] = React.useState(false);
  const dragRef = React.useRef<{ y: number } | null>(null);
  // Portrait = top sheet, drags DOWN to expand. Landscape = bottom sheet,
  // drags UP to expand. expandDir is the sign of "open".
  const isTop = placement !== "bottomRight";
  const expandDir = isTop ? 1 : -1;

  const onGrabberPointerDown = (event: React.PointerEvent) => {
    dragRef.current = { y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onGrabberPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (event.clientY - drag.y) * expandDir;
    if (delta > SHEET_DRAG_THRESHOLD) setExpanded(true);
    else if (delta < -SHEET_DRAG_THRESHOLD) setExpanded(false);
  };
  const onGrabberPointerUp = (event: React.PointerEvent) => {
    dragRef.current = null;
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

  return (
    <aside
      aria-label={ariaLabel}
      data-density={compact ? "compact" : undefined}
      data-placement={placement === "bottomRight" ? "bottom-right" : "top"}
      data-expanded={expanded ? "true" : undefined}
      data-ui="mobile-preview-card"
      style={style}
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
        // Same frosted preview surface as the desktop card: one
        // semi-opaque material plus strong backdrop blur over the map.
        "[background:var(--atc-surface-preview-card)]",
        "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
        "shadow-[var(--preview-card-shadow),var(--atc-preview-card-inset)]",
        // Bottom padding matches the 14px horizontal inset on the
        // actions row so the gap around the Track button reads as
        // equal on the left, right, and bottom.
        "flex flex-col gap-[2px] pb-[12px]",
        compact && placement !== "bottomRight" &&
          "top-[calc(9px+env(safe-area-inset-top))] w-[min(316px,calc(100vw-18px))] max-w-[calc(100vw-18px)] gap-0 pb-[9px]",
        compact && placement === "bottomRight" && "gap-0 pb-[9px]",
      )}
    >
      <MobilePreviewExpandedContext.Provider value={expanded}>
        {/* Landscape bottom-sheet: grabber rides the top edge (drag up). */}
        {!isTop ? grabber : null}
        {children}
        {/* Expanded detail reveals between the collapsed content and the
            actions so the action row stays put as the sheet grows. */}
        {reveal}
        {actions}
        {/* Portrait top-sheet: grabber rides the bottom edge (drag down). */}
        {isTop ? grabber : null}
      </MobilePreviewExpandedContext.Provider>
    </aside>
  );
}

// Actions row container. Sets `pointer-events-auto` so the buttons
// inside become tappable inside the otherwise pass-through card.
export function MobilePreviewActions({ children }: Record<string, any>) {
  return (
    <div className="pointer-events-auto mx-[12px] flex flex-col items-stretch gap-1 [[data-density=compact]_&]:mx-[10px] [[data-density=compact]_&]:gap-0.5">
      {children}
    </div>
  );
}

export function MobilePreviewContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative z-[2] box-border flex w-full flex-col items-stretch gap-[5px] px-[12px] pb-[6px] pt-[9px] [[data-density=compact]_&]:gap-[3px] [[data-density=compact]_&]:px-[10px] [[data-density=compact]_&]:pb-[4px] [[data-density=compact]_&]:pt-[7px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MobilePreviewIdentity({
  icon: Icon,
  label,
  primary,
  primaryClassName,
  secondary = null,
  secondaryClassName,
}: {
  icon: LucideIcon;
  label: string;
  primary: React.ReactNode;
  primaryClassName?: string;
  secondary?: React.ReactNode;
  secondaryClassName?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 [[data-density=compact]_&]:gap-1.5">
      <div className="flex min-w-0 items-end gap-[6px]">
        <span
          aria-label={label}
          title={label}
          className="mb-[1px] grid size-[16px] flex-none place-items-center text-atc-dim"
        >
          <Icon aria-hidden="true" className="size-[14px]" strokeWidth={1.8} />
        </span>
        <span
          translate="no"
          className={cn(
            "notranslate min-w-0 truncate whitespace-nowrap font-[var(--font-mono)] text-[18px] font-extrabold leading-none tracking-normal text-atc-text",
            "[[data-density=compact]_&]:text-[17px]",
            primaryClassName,
          )}
        >
          {primary}
        </span>
      </div>
      {secondary ? (
        <span
          translate="no"
          className={cn(
            "notranslate max-w-[116px] truncate whitespace-nowrap text-right font-[var(--font-mono)] text-[9px] font-semibold leading-none tracking-normal text-atc-dim",
            secondaryClassName,
          )}
        >
          {secondary}
        </span>
      ) : null}
    </div>
  );
}

export function MobilePreviewDetailRow({
  wrap = false,
  children,
}: React.PropsWithChildren<{ wrap?: boolean }>) {
  return (
    <div className="flex min-w-0 items-baseline justify-end font-[var(--font-mono)]">
      <span
        translate="no"
        className={cn(
          "notranslate min-w-0 text-right text-[9px] font-medium leading-tight tracking-normal text-atc-dim",
          wrap ? "whitespace-normal break-words" : "truncate whitespace-nowrap",
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function MobilePreviewRuleRow({
  left = null,
  right = null,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2.5 border-t border-atc-line pt-[4px] font-[var(--font-mono)] [[data-density=compact]_&]:gap-2 [[data-density=compact]_&]:pt-[3px]">
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left text-[10px] font-semibold leading-none tracking-normal text-atc-text [[data-density=compact]_&]:text-[9px]">
        {left}
      </div>
      <div className="flex min-w-0 shrink-0 items-baseline justify-end gap-[8px] overflow-hidden whitespace-nowrap text-right text-[10px] font-semibold leading-none tracking-normal text-atc-text [[data-density=compact]_&]:gap-[6px] [[data-density=compact]_&]:text-[9px]">
        {right}
      </div>
    </div>
  );
}

export function MobilePreviewMetaChips({ children }: React.PropsWithChildren) {
  return (
    <dl className="flex min-w-0 items-baseline gap-[8px] [[data-density=compact]_&]:gap-[6px]">
      {children}
    </dl>
  );
}

export function MobilePreviewMetaChip({
  children,
}: React.PropsWithChildren) {
  return (
    <div className="flex min-w-0">
      <dd
        translate="no"
        className="notranslate flex min-w-0 items-baseline gap-[2px] overflow-hidden whitespace-nowrap"
      >
        {children}
      </dd>
    </div>
  );
}

// Primary action — full-width bright pill that matches the active
// metric / filter card ink language (data-active flips to the same
// primary tokens elsewhere).
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
          "min-h-[34px] w-full px-[10px] cursor-pointer [[data-density=compact]_&]:min-h-[30px] [[data-density=compact]_&]:px-2",
          "border border-[var(--atc-action-primary-border)]",
          "rounded-[calc(var(--atc-radius-card)-3px)]",
          "bg-[var(--primary-bright)] text-[var(--primary-ink)]",
          "shadow-[var(--atc-action-primary-shadow)]",
          "font-[var(--font-display)] text-[11px] font-extrabold not-italic tracking-normal leading-[1.15] text-center [[data-density=compact]_&]:text-[10px]",
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

// Secondary text affordance — quiet so it doesn't compete with the
// Track button for taps.
export const MobilePreviewFeedbackLink = React.forwardRef(
  function MobilePreviewFeedbackLink(
    { className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full min-h-[20px] items-center justify-center px-0 py-1 [[data-density=compact]_&]:min-h-[15px] [[data-density=compact]_&]:py-0.5",
          "border-0 bg-transparent text-atc-dim cursor-pointer",
          "font-sans text-[10px] font-bold tracking-normal leading-[1.15] text-center [[data-density=compact]_&]:text-[9px]",
          "[-webkit-tap-highlight-color:transparent]",
          "transition-[color,opacity,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
          "hover:text-atc-text hover:opacity-90 active:text-atc-text active:scale-[0.97]",
          "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[3px]",
          className,
        )}
        {...props}
      />
    );
  },
);

// Square frosted icon button — camera (Plane Hunter) / raise-hand (suggest
// correction) beside the Track pill. Neutral; the accent stays on Track.
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
          "pointer-events-auto flex aspect-square min-h-[34px] flex-none items-center justify-center cursor-pointer [[data-density=compact]_&]:min-h-[30px]",
          "rounded-[calc(var(--atc-radius-card)-3px)] border border-atc-line",
          "bg-[var(--atc-control-surface)] text-atc-dim",
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

export const MobilePreviewSecondaryButton = React.forwardRef(
  function MobilePreviewSecondaryButton(
    { className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "min-h-[32px] w-full px-[10px] cursor-pointer [[data-density=compact]_&]:min-h-[30px] [[data-density=compact]_&]:px-2",
          "rounded-[calc(var(--atc-radius-card)-3px)] border border-atc-line",
          "bg-[color-mix(in_oklab,var(--atc-card)_72%,var(--primary-bright)_10%)] text-atc-text",
          "font-[var(--font-display)] text-[11px] font-extrabold not-italic tracking-normal leading-[1.15] text-center [[data-density=compact]_&]:text-[10px]",
          "[-webkit-tap-highlight-color:transparent]",
          "transition-[background-color,border-color,transform] duration-[var(--motion-ui-fast)] ease-[var(--motion-ease-out)]",
          "hover:border-atc-line-strong hover:bg-[var(--tone-card-strong)] active:scale-[0.97]",
          "focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)] focus-visible:outline-offset-[3px]",
          className,
        )}
        {...props}
      />
    );
  },
);
