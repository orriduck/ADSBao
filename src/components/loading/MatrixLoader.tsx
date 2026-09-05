import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Transitions.dev scan pattern. CSS owns the cycle and each column's phase;
// there is no interval, randomized render, or icon carousel to restart.
export default function MatrixLoader({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("t-matrix matrix-loader", className)} data-variant="scan">
      {Array.from({ length: 16 }, (_, index) => (
        <i key={index} style={{ "--column": index % 4 } as CSSProperties} />
      ))}
    </span>
  );
}
