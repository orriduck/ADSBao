import { useEffect, useRef, useState } from "react";

// A "decode" text transition: when `text` changes, the new value resolves
// left-to-right out of a stream of random scramble characters. Used for the
// here-mode place name so crossing into a new city/area reads as the label
// being decoded rather than hard-cutting.
//
// Conventions match the rest of the app's motion (see FlightRuleGlyph): the
// effect plays only on a real value change, and `prefers-reduced-motion`
// jumps straight to the final text. Scramble characters are drawn from a pool
// that matches the target's script (CJK target → CJK scramble) so glyph width
// stays stable and the line doesn't jitter mid-animation.

const LATIN_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*<>/";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isCjk(ch: string) {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x2e80 && code <= 0x9fff;
}

function scrambleChar(target: string) {
  if (isCjk(target)) {
    // Random common-CJK code point keeps the (double-width) glyph stable.
    return String.fromCodePoint(0x4e00 + Math.floor(Math.random() * 0x5176));
  }
  return LATIN_POOL[Math.floor(Math.random() * LATIN_POOL.length)] ?? "";
}

export default function DecodeText({
  text,
  className,
  intervalMs = 45,
  minTicks = 8,
  maxTicks = 22,
}: {
  text: string;
  className?: string;
  intervalMs?: number;
  minTicks?: number;
  maxTicks?: number;
}) {
  const [display, setDisplay] = useState(text);
  const prevTextRef = useRef(text);

  useEffect(() => {
    const target = text ?? "";
    const prev = prevTextRef.current;
    prevTextRef.current = target;

    // No animation on first mount, an unchanged value, an empty target, or
    // when the user prefers reduced motion — show the final text immediately.
    if (prev === target || !target || prefersReducedMotion()) {
      setDisplay(target);
      return undefined;
    }

    const chars = Array.from(target);
    const totalTicks = Math.min(
      maxTicks,
      Math.max(minTicks, chars.length + 4),
    );
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      if (tick >= totalTicks) {
        setDisplay(target);
        clearInterval(id);
        return;
      }
      const revealed = Math.floor((tick / totalTicks) * chars.length);
      setDisplay(
        chars
          .map((ch, i) =>
            i < revealed || /\s/.test(ch) ? ch : scrambleChar(ch),
          )
          .join(""),
      );
    }, intervalMs);

    return () => clearInterval(id);
  }, [text, intervalMs, minTicks, maxTicks]);

  // aria-label carries the resolved text so assistive tech never reads the
  // transient scramble.
  return (
    <span className={className} aria-label={text}>
      {display}
    </span>
  );
}
