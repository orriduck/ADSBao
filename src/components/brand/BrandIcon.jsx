// Compact ADSBao mark for tight spaces (mobile top nav etc.). Just the
// yellow rhombus diamond — same shape used elsewhere as the section
// accent — over a small ink square. SVG so it scales sharp.
export default function BrandIcon({ height = 20, className = "" }) {
  return (
    <svg
      role="img"
      aria-label="ADSBao"
      width={height}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        fill="currentColor"
        opacity="0.18"
      />
      <g transform="rotate(45 12 12)">
        <rect x="6" y="6" width="12" height="12" fill="var(--endf-yellow)" />
      </g>
    </svg>
  );
}
