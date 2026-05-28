// Compact ADSBao mark for tight spaces.
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
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
      <circle cx="12" cy="12" r="6" fill="var(--endf-yellow)" />
      <path
        d="M9 12h6m-2.5-2.5L15 12l-2.5 2.5"
        stroke="var(--endf-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
