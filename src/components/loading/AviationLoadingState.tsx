import { Plane, RadioTower } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/effects/usePrefersReducedMotion";

type AviationLoadingStateProps = {
  eyebrow?: string;
  title: string;
  hint?: string;
};

type AviationLoadingGlyphProps = {
  compact?: boolean;
};

export function AviationLoadingGlyph({
  compact = false,
}: AviationLoadingGlyphProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <span
      aria-hidden="true"
      className={`aviation-loading-glyph ${
        compact ? "aviation-loading-glyph--compact" : ""
      } ${reducedMotion ? "aviation-loading-glyph--static" : ""}`}
    >
      <span className="aviation-loading-glyph__frame aviation-loading-glyph__frame--plane">
        <Plane className="h-full w-full" strokeWidth={1.55} />
      </span>
      <span className="aviation-loading-glyph__frame aviation-loading-glyph__frame--tower">
        <RadioTower className="h-full w-full" strokeWidth={1.5} />
      </span>
      <span className="aviation-loading-glyph__frame aviation-loading-glyph__frame--runway">
        <RunwayGlyph />
      </span>
    </span>
  );
}

export function AviationLoadingState({
  eyebrow,
  title,
  hint,
}: AviationLoadingStateProps) {
  return (
    <div className="flex w-full max-w-[286px] flex-col items-start gap-3 rounded-[var(--atc-radius-card)] border border-[var(--app-frost-border)] bg-[var(--atc-control-surface)] px-4 py-4 shadow-[var(--atc-control-inset-shadow)] [backdrop-filter:var(--app-frost)] [-webkit-backdrop-filter:var(--app-frost)]">
      {eyebrow ? (
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-atc-dim">
          <AviationLoadingGlyph compact />
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <div className="text-[15px] font-medium leading-snug text-atc-text">
        {title}
      </div>
      {hint ? (
        <div className="text-[12px] leading-snug text-atc-dim">{hint}</div>
      ) : null}
    </div>
  );
}

function RunwayGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 28 13 4h6l6 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M16 8v3M16 15v3M16 22v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M5 28h22" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}
