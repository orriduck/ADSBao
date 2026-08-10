import { Plane, RadioTower } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/effects/usePrefersReducedMotion";

type AviationLoadingStateProps = {
  ariaLabel: string;
  label?: string;
};

type AviationLoadingGlyphProps = {
  compact?: boolean;
};

type AviationLoadingIndicatorProps = {
  label?: string;
  playbackKey?: number;
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

export function AviationLoadingIndicator({
  label,
  playbackKey,
}: AviationLoadingIndicatorProps) {
  return (
    <>
      <AviationLoadingGlyph key={playbackKey} />
      {label ? (
        <div className="adsb-loading-overlay__label relative z-[1] flex items-center gap-2 px-6 text-center text-[12px] text-atc-dim">
          <span>{label}</span>
        </div>
      ) : null}
    </>
  );
}

export function AviationLoadingState({ ariaLabel, label }: AviationLoadingStateProps) {
  return (
    <main
      className="relative flex min-h-dvh bg-atc-bg text-atc-text"
      role="status"
      aria-label={ariaLabel}
    >
      <div className="adsb-loading-overlay adsb-loading-overlay--flight">
        <AviationLoadingIndicator label={label} />
      </div>
    </main>
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
