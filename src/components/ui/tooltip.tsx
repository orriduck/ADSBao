import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const forwardRef = React.forwardRef as <
  Element = any,
  Props = Record<string, any>,
>(
  render: (
    props: Props,
    ref: React.ForwardedRef<Element>,
  ) => React.ReactNode,
) => React.ForwardRefExoticComponent<Props & React.RefAttributes<Element>>;

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // Frosted-glass tooltip — same material as the dropdown menus
        // (frost-tint surface + blur + hairline + soft drop) instead of
        // the old solid near-black blob, so it reads as part of the
        // liquid-glass system. Text uses --atc-text so it stays legible
        // on the light frost (and flips correctly in dark theme).
        "z-50 max-w-[260px] overflow-hidden rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-surface-preview-card)] px-3 py-2 text-xs leading-snug text-atc-text shadow-[var(--atc-menu-panel-shadow)] [backdrop-filter:var(--app-frost-strong)] [-webkit-backdrop-filter:var(--app-frost-strong)] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props} />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
