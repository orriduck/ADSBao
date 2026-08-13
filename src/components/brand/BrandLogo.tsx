// A compact, wordless airport mark for the global toolbar. The three paths
// describe arrivals, departures, and the live position between them: a small
// operational symbol rather than a miniature wordmark.
export default function BrandLogo({
  size = 20,
  className = "",
  animated = false,
  ariaLabel = "ADSBao",
}) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? "brand-logo--animated" : ""}`.trim()}
    >
      <g className="brand-logo__mark" aria-hidden="true">
        <g className="brand-logo__routes">
          <path
            className="brand-logo__route brand-logo__route--quiet"
            d="M7.75 12.5A5.25 5.25 0 0 1 13 7.25h6.5a4.75 4.75 0 0 1 4.75 4.75"
          />
          <path
            className="brand-logo__route brand-logo__route--light"
            d="M24.25 19.5A5.25 5.25 0 0 1 19 24.75h-6.5a4.75 4.75 0 0 1-4.75-4.75"
          />
          <path
            className="brand-logo__route brand-logo__route--signal"
            d="M8.5 21.75 23.5 10.25"
          />
        </g>
      </g>
    </svg>
  );
}
