"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared shell for the bottom-of-screen mobile preview card. Both the
// aircraft and airport variants render through this so the outer
// chrome — position, dark card surface + warm 135deg gradient, border,
// shadow, action slot, trace-status slide — lives in one place. Variant
// content goes in `children`; action buttons (Track / Suggest) go in
// `actions` so they stay below the content with the right pointer
// behaviour. Adjust card size / radius / gradient here and every
// preview reflects.
//
// `pointer-events-none` on the card surface lets map taps flow through
// the empty edges of the card; the Track button / suggest link
// re-enable interaction inside `MobilePreviewActions`.

export default function MobilePreviewCard({
  identityKey,
  ariaLabel,
  children,
  actions = null,
  traceStatus = null,
}: Record<string, any>) {
  return (
    <aside
      key={identityKey}
      aria-label={ariaLabel}
      data-ui="mobile-preview-card"
      className={cn(
        "fixed left-1/2 z-popover",
        "bottom-[calc(64px+env(safe-area-inset-bottom))]",
        "w-[min(342px,calc(100vw-24px))] max-w-[calc(100vw-24px)]",
        "isolate overflow-hidden select-none pointer-events-none",
        "mobile-preview-card-enter",
        "rounded-[var(--atc-radius-card)] border border-atc-line-strong/85 text-atc-text",
        // Solid card under a warm top-left gradient layer (same 135deg
        // language as the sidebar identity surface). Use background +
        // background-image separately so the gradient's transparent
        // half reveals the solid bg, not the map.
        "bg-[color-mix(in_oklab,var(--atc-card)_96%,var(--atc-bg))]",
        "[background-image:linear-gradient(135deg,color-mix(in_oklab,var(--atc-orange)_10%,transparent),transparent_48%)]",
        "shadow-[var(--app-floating-shadow),inset_0_1px_0_color-mix(in_oklab,var(--atc-text)_8%,transparent)]",
        // Bottom padding matches the 14px horizontal inset on the
        // actions row so the gap around the Track button reads as
        // equal on the left, right, and bottom.
        "flex flex-col gap-[3px] pb-[14px]",
      )}
    >
      {children}
      {traceStatus}
      {actions}
    </aside>
  );
}

// Slide-down loading strip — collapses out of the layout when inactive
// so the card height stays stable.
export function MobilePreviewTraceStatus({ active, children }: Record<string, any>) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "self-stretch mx-[14px] text-center text-atc-dim",
        "font-[var(--font-mono)] text-[10px] font-semibold tracking-[0.08em] leading-[1.15] uppercase",
        "pointer-events-none whitespace-normal overflow-hidden",
        "transition-[max-height,margin-top,opacity,transform] duration-[280ms] ease",
        active
          ? "max-h-[44px] mt-1 opacity-100 translate-y-0"
          : "max-h-0 mt-0 opacity-0 -translate-y-1",
      )}
    >
      {children}
    </div>
  );
}

// Actions row container. Sets `pointer-events-auto` so the buttons
// inside become tappable inside the otherwise pass-through card.
export function MobilePreviewActions({ children }: Record<string, any>) {
  return (
    <div className="pointer-events-auto mx-[14px] flex flex-col items-stretch gap-1">
      {children}
    </div>
  );
}

export function MobilePreviewContent({ children }: React.PropsWithChildren) {
  return (
    <div className="relative z-[2] box-border flex w-full flex-col items-stretch gap-[6px] px-[14px] pb-[7px] pt-[10px]">
      {children}
    </div>
  );
}

export function MobilePreviewEntityHeader({
  icon: Icon,
  label,
  children,
}: React.PropsWithChildren<{ icon: LucideIcon; label: string }>) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span
        aria-label={label}
        title={label}
        className="grid size-[18px] flex-none place-items-center text-atc-dim"
      >
        <Icon aria-hidden="true" className="size-[16px]" strokeWidth={1.8} />
      </span>
      {children ? (
        <div className="flex min-w-0 max-w-[62%] items-center justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MobilePreviewIdentity({
  icon: Icon,
  label,
  primary,
  secondary = null,
  secondaryClassName,
}: {
  icon: LucideIcon;
  label: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  secondaryClassName?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
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
          className="notranslate min-w-0 truncate whitespace-nowrap font-[var(--font-mono)] text-[20px] font-extrabold leading-none tracking-normal text-atc-text"
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
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-t border-atc-line pt-[5px] font-[var(--font-mono)]">
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left text-[11px] font-semibold leading-none tracking-normal text-atc-text">
        {left}
      </div>
      <div className="flex min-w-0 shrink-0 items-baseline justify-end gap-[10px] overflow-hidden whitespace-nowrap text-right text-[11px] font-semibold leading-none tracking-normal text-atc-text">
        {right}
      </div>
    </div>
  );
}

export function MobilePreviewMetaChips({ children }: React.PropsWithChildren) {
  return (
    <dl className="flex min-w-0 items-baseline gap-[10px]">
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

export function MobilePreviewHeaderValue({ children }: React.PropsWithChildren) {
  return (
    <span
      translate="no"
      className="notranslate min-w-0 truncate whitespace-nowrap text-right font-[var(--font-mono)] text-[10px] font-semibold leading-none tracking-normal text-atc-dim"
    >
      {children}
    </span>
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
          "min-h-[34px] w-full px-[10px] cursor-pointer",
          "border border-[color-mix(in_oklab,var(--primary-bright)_82%,var(--primary-ink))]",
          "rounded-[calc(var(--atc-radius-card)-3px)]",
          "bg-[var(--primary-bright)] text-[var(--primary-ink)]",
          "shadow-[0_8px_16px_color-mix(in_oklab,var(--primary-bright)_16%,transparent),inset_0_-2px_0_color-mix(in_oklab,var(--primary-ink)_28%,transparent)]",
          "font-[var(--font-display)] text-[11px] font-extrabold not-italic tracking-normal leading-[1.15] text-center",
          "[-webkit-tap-highlight-color:transparent]",
          "transition-[box-shadow,filter,transform] duration-150 ease-out",
          "hover:brightness-[1.04] active:scale-[0.97] active:brightness-[0.96]",
          "focus-visible:outline-2 focus-visible:outline-[color-mix(in_oklab,var(--primary-bright)_72%,white)] focus-visible:outline-offset-[3px]",
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
          "flex w-full min-h-[20px] items-center justify-center px-0 py-1",
          "border-0 bg-transparent text-atc-dim cursor-pointer",
          "font-sans text-[10px] font-bold tracking-normal leading-[1.15] text-center",
          "[-webkit-tap-highlight-color:transparent]",
          "transition-[color,opacity,transform] duration-150 ease-out",
          "hover:text-atc-text hover:opacity-90 active:text-atc-text active:scale-[0.97]",
          "focus-visible:outline-2 focus-visible:outline-[color-mix(in_oklab,var(--primary-bright)_72%,white)] focus-visible:outline-offset-[3px]",
          className,
        )}
        {...props}
      />
    );
  },
);
