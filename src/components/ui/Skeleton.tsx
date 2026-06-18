import { cn } from "@/lib/utils";

/**
 * Industrial-console skeleton placeholder — a fixed-dimension dimmed block
 * that fills the same space as live data without animated shimmer.
 *
 * ADSBao's visual language avoids SaaS-style pulsing shimmer; instead
 * the console shows muted placeholder blocks that clearly read as
 * "instrument waiting for data". Labels stay visible (dimmed) and
 * values are replaced with these blocks.
 *
 * @param className - Tailwind classes for width/height. Default: h-4 w-16
 * @param rounded  - Border radius token. Default: atc-radius-card
 * @param inline   - Render as inline-block (for text-line skeleton). Default: false
 */
export default function Skeleton({
  className = "",
  rounded = "rounded-[6px]",
  inline = false,
}: {
  className?: string;
  rounded?: string;
  inline?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        inline ? "inline-block align-middle" : "block",
        rounded,
        "bg-[var(--atc-surface-row-rest)]",
        "border border-[var(--atc-border-default)]",
        className,
      )}
    />
  );
}
