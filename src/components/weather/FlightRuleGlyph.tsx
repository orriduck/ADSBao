import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

// Flight-rule category glyph. Ported faithfully from the design reference
// (flight-rules-glyph-preview.html) — same viewBox, paths, stroke weight, and
// draw-on timing. The motif is a shared runway + the *means of seeing it*:
// eyes for the visual rules (VFR / MVFR) graduating to an attitude instrument
// for the instrument rules (IFR / LIFR), with obscuring / ground bands added
// as conditions deteriorate.
//
// Entrance draws on once via stroke-dashoffset (the `.dr` / `.d2` / `.d3` /
// `.pop` classes + keyframes live scoped under `.flight-rule-glyph` in
// style.css, which also honors prefers-reduced-motion by jumping to the final
// state). The component plays on mount; re-key it by `rule` at the call site so
// it redraws when the flight category changes.
//
// Color is inherited: the glyph strokes/fills with `currentColor`, so the
// caller sets the per-rule category color (e.g. `flightRuleColor(category)`)
// on the wrapper — the glyph stays decoupled from any color token.

export type FlightRule = "VFR" | "MVFR" | "IFR" | "LIFR";

function VfrGlyph() {
  return (
    <>
      <g className="dr" style={{ "--len": 120 }}>
        <path d="M33,46 L37,30 M47,46 L43,30" />
        <path d="M40,46 L40,42 M40,38 L40,34" />
        <path d="M35,30 L45,30" />
      </g>
      <path className="dr d2" style={{ "--len": 46 }} d="M28,16 Q40,7 52,16 Q40,25 28,16" />
      <circle className="pop" cx="40" cy="16" r="3.4" fill="currentColor" stroke="none" />
    </>
  );
}

function MvfrGlyph() {
  return (
    <>
      <g className="dr" style={{ "--len": 120 }}>
        <path d="M33,46 L37,30 M47,46 L43,30" />
        <path d="M40,46 L40,42 M40,38 L40,34" />
        <path d="M35,30 L45,30" />
      </g>
      <path className="dr d2" style={{ "--len": 46 }} d="M28,15 Q40,6 52,15 Q40,24 28,15" />
      <circle className="pop" cx="40" cy="15" r="3.4" fill="currentColor" stroke="none" />
      <path
        className="dr d3"
        style={{ "--len": 34 }}
        d="M26,33 q6,-5 13,-1 q7,-4 15,1"
        strokeDasharray="3.5 4"
      />
    </>
  );
}

function IfrGlyph() {
  return (
    <>
      <g className="dr" style={{ "--len": 120 }}>
        <path d="M33,46 L37,32 M47,46 L43,32" />
        <path d="M40,46 L40,42 M40,38 L40,36" />
        <path d="M35,32 L45,32" />
      </g>
      <circle className="dr d2" style={{ "--len": 82 }} cx="40" cy="16" r="12" />
      <path className="dr d3" style={{ "--len": 22 }} d="M29,16 h22" />
      <path className="pop" d="M40,16 L47,10" />
      <circle className="pop" cx="40" cy="16" r="1.6" fill="currentColor" stroke="none" />
    </>
  );
}

function LifrGlyph() {
  return (
    <>
      <g className="dr" style={{ "--len": 120 }}>
        <path d="M34,46 L37,34 M46,46 L43,34" />
        <path d="M40,46 L40,43 M40,40 L40,38" />
        <path d="M37,34 L43,34" />
      </g>
      <circle className="dr d2" style={{ "--len": 82 }} cx="40" cy="15" r="12" />
      <path className="dr d3" style={{ "--len": 22 }} d="M29,15 h22" />
      <path className="pop" d="M40,15 L40,7" />
      <circle className="pop" cx="40" cy="15" r="1.6" fill="currentColor" stroke="none" />
      <path
        className="dr d3"
        style={{ "--len": 26 }}
        d="M30,40 h20"
        strokeDasharray="2.5 3.5"
      />
    </>
  );
}

const GLYPHS: Record<FlightRule, () => ReactElement> = {
  VFR: VfrGlyph,
  MVFR: MvfrGlyph,
  IFR: IfrGlyph,
  LIFR: LifrGlyph,
};

export default function FlightRuleGlyph({
  rule,
  className,
}: {
  rule: FlightRule;
  className?: string;
}) {
  const Glyph = GLYPHS[rule];
  if (!Glyph) return null;

  return (
    <svg
      className={cn("flight-rule-glyph", className)}
      width={84}
      height={50}
      viewBox="0 0 80 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${rule} flight rule`}
    >
      <Glyph />
    </svg>
  );
}
