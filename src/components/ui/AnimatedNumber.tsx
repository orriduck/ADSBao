import { useLayoutEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/effects/usePrefersReducedMotion";
import { formattedNumberSlots, numberSlots } from "./numberSlots";

// Transitions.dev number pop-in, keyed by place value. The current formatted
// value is always in the DOM; no interpolated or queued telemetry readings.
export default function AnimatedNumber({
  value,
  format,
  locales,
}: {
  value: number | string;
  format?: Intl.NumberFormatOptions;
  locales?: string | string[];
}) {
  const formatter = useMemo(() => new Intl.NumberFormat(locales, format), [locales, format]);
  const reducedMotion = usePrefersReducedMotion();
  const formatted = typeof value === "string";
  const text = formatted ? value : formatter.format(value);
  const slots = formatted
    ? formattedNumberSlots(value)
    : numberSlots(formatter.formatToParts(value));
  if (!/\p{Decimal_Number}/u.test(text)) return <>{text}</>;
  return (
    <span className={`animated-number${formatted ? " animated-number--formatted" : ""}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="animated-number__digits">
        {slots.map(({ key, text }) =>
          /^\p{Decimal_Number}$/u.test(text) ? (
            <NumberDigit key={key} text={text} reducedMotion={reducedMotion} />
          ) : (
            <span key={key}>{text}</span>
          ),
        )}
      </span>
    </span>
  );
}

function NumberDigit({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<string | null>(null);
  useLayoutEffect(() => {
    const changed = previous.current !== text;
    previous.current = text;
    const element = ref.current;
    if (!element) return;
    element.classList.remove("is-animating");
    if (changed && !reducedMotion && !document.hidden) {
      void element.offsetHeight;
      element.classList.add("is-animating");
    }
  }, [text, reducedMotion]);
  return (
    <span ref={ref} className="t-digit-group" onAnimationEnd={() => ref.current?.classList.remove("is-animating")}>
      <span className="t-digit">{text}</span>
    </span>
  );
}
