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

export default function MobilePreviewCard({
  ariaLabel,
  children,
  actions = null,
  compact = false,
  placement = "top",
  style,
}: Record<string, any>) {
  // NOTE: the enter animation replays on entity change via a `key` on the
  // *call site* (<MobilePreviewCard key=...>), not a prop here — a `key`
  // on this root <aside> would be a no-op (React reads key at the call site).
  return (
    <aside
      aria-label={ariaLabel}
      data-density={compact ? "compact" : undefined}
      data-placement={placement === "bottomRight" ? "bottom-right" : "top"}
      data-ui="mobile-preview-card"
      style={style}
      className={cn(
        "fixed z-popover",
        placement === "bottomRight"
          ? [
              "bottom-[calc(12px+var(--mobile-preview-safe-bottom,var(--app-bottom-safe-area)))]",
              "right-[calc(12px+var(--mobile-preview-safe-right,env(safe-area-inset-right)))]",
              "w-[min(332px,calc(100vw-24px-var(--mobile-preview-safe-left,0px)-var(--mobile-preview-safe-right,0px)))]",
              "max-w-[calc(100vw-24px-var(--mobile-preview-safe-left,0px)-var(--mobile-preview-safe-right,0px))]",
            ]
          : [
              "left-1/2",
              "top-[calc(12px+env(safe-area-inset-top))]",
              "w-[min(342px,calc(100vw-24px))] max-w-[calc(100vw-24px)]",
            ],
        "isolate overflow-hidden select-none pointer-events-none",
        "app-preview-transition mobile-preview-card-enter",
        "rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] text-atc-text",
        // Frosted material card under a warm top-left gradient layer
        // (same 135deg language as the sidebar identity surface). The
        // semi-opaque preview surface plus a strong backdrop blur diffuse
        // the map behind the card into soft gray; the gradient's
        // transparent half lets that frosted wash read through.
        "bg-[var(--atc-surface-preview-card)]",
        "[background-image:var(--atc-preview-accent-wash)]",
        "[backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)]",
        "shadow-[var(--app-floating-shadow),var(--atc-preview-card-inset)]",
        // Bottom padding matches the 14px horizontal inset on the
        // actions row so the gap around the Track button reads as
        // equal on the left, right, and bottom.
        "flex flex-col gap-[3px] pb-[14px]",
        compact && placement !== "bottomRight" &&
          "top-[calc(10px+env(safe-area-inset-top))] w-[min(332px,calc(100vw-20px))] max-w-[calc(100vw-20px)] gap-0 pb-[10px]",
        compact && placement === "bottomRight" && "gap-0 pb-[10px]",
      )}
    >
      {children}
      {actions}
    </aside>
  );
}

// Actions row container. Sets `pointer-events-auto` so the buttons
// inside become tappable inside the otherwise pass-through card.
export function MobilePreviewActions({ children }: Record<string, any>) {
  return (
    <div className="pointer-events-auto mx-[14px] flex flex-col items-stretch gap-1 [[data-density=compact]_&]:mx-[12px] [[data-density=compact]_&]:gap-0.5">
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
        "relative z-[2] box-border flex w-full flex-col items-stretch gap-[6px] px-[14px] pb-[7px] pt-[10px] [[data-density=compact]_&]:gap-[4px] [[data-density=compact]_&]:px-[12px] [[data-density=compact]_&]:pb-[5px] [[data-density=compact]_&]:pt-[8px]",
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
          className="mb-[1px] grid size-[18px] flex-none place-items-center text-atc-dim"
        >
          <Icon aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
        </span>
        <span
          translate="no"
          className={cn(
            "notranslate min-w-0 truncate whitespace-nowrap font-[var(--font-mono)] text-[20px] font-extrabold leading-none tracking-normal text-atc-text",
            "[[data-density=compact]_&]:text-[18px]",
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
            "notranslate max-w-[122px] truncate whitespace-nowrap text-right font-[var(--font-mono)] text-[10px] font-semibold leading-none tracking-normal text-atc-dim",
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
          "notranslate min-w-0 text-right text-[10px] font-medium leading-tight tracking-normal text-atc-dim",
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
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-t border-atc-line pt-[5px] font-[var(--font-mono)] [[data-density=compact]_&]:gap-2 [[data-density=compact]_&]:pt-[4px]">
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left text-[11px] font-semibold leading-none tracking-normal text-atc-text [[data-density=compact]_&]:text-[10px]">
        {left}
      </div>
      <div className="flex min-w-0 shrink-0 items-baseline justify-end gap-[10px] overflow-hidden whitespace-nowrap text-right text-[11px] font-semibold leading-none tracking-normal text-atc-text [[data-density=compact]_&]:gap-[7px] [[data-density=compact]_&]:text-[10px]">
        {right}
      </div>
    </div>
  );
}

export function MobilePreviewMetaChips({ children }: React.PropsWithChildren) {
  return (
    <dl className="flex min-w-0 items-baseline gap-[10px] [[data-density=compact]_&]:gap-[7px]">
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
