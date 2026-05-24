"use client";

import { useEndfieldContentSwap } from "./useEndfieldContentSwap.js";

export default function EndfieldValueSwap({
  identityKey,
  value,
  className = "",
  direction = "forward",
}) {
  const swap = useEndfieldContentSwap({
    identityKey,
    value,
    delaySeconds: 0,
  });
  const contentPhaseClass = swap.contentPhaseClass.replace(
    "endf-content-swap",
    "endf-value-swap",
  );

  return (
    <span
      style={swap.style}
      className={`endf-value-swap ${
        swap.replacing ? "endf-value-swap--replacing" : ""
      } ${
        direction === "reverse" ? "endf-value-swap--reverse" : ""
      } ${className}`}
    >
      <span
        className={`endf-value-swap__content ${contentPhaseClass}`}
      >
        {swap.displayedValue}
      </span>
    </span>
  );
}
