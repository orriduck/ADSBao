// ADSBao wordmark and product mark. The mark is a camera viewfinder
// wrapped around a flight track so it reads as "plane spotting" rather
// than the legacy yellow arrow badge.
export default function BrandLogo({
  height = 44,
  className = "",
  animated = false,
  wordmark = "ADSBao",
  ariaLabel = wordmark,
}) {
  const normalizedWordmark = String(wordmark || "ADSBao");
  const isCjkWordmark = /[\u3400-\u9fff]/.test(normalizedWordmark);
  const textWidth = isCjkWordmark
    ? Math.max(108, normalizedWordmark.length * 40)
    : Math.max(126, normalizedWordmark.length * 18 + 18);
  const canvasWidth = 50 + textWidth + 14;
  const width = Math.round((height * canvasWidth) / 52);
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${canvasWidth} 52`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? "brand-logo--animated" : ""}`.trim()}
    >
      <g className="brand-logo__mark">
        <circle
          className="brand-logo__disc"
          cx="23"
          cy="26"
          r="19"
          fill="color-mix(in oklab, var(--atc-text) 8%, transparent)"
          stroke="color-mix(in oklab, var(--atc-text) 16%, transparent)"
        />
        <path
          className="brand-logo__viewfinder"
          d="M14 19v-4h5M32 19v-4h-5M14 33v4h5M32 33v4h-5"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="brand-logo__track"
          d="M14.5 31.5c5.6-7 10.4-10.8 17.1-13.7"
          stroke="var(--atc-mint)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          className="brand-logo__aircraft"
          d="M25.4 17.2 36 12.9 31.8 23.6l-2.3-4.4-6.7 4.5-1.4-1.5 6-5.2-4.6-2.1Z"
          fill="currentColor"
        />
        <circle
          className="brand-logo__trace-dot"
          cx="14.5"
          cy="31.5"
          r="1.9"
          fill="var(--atc-mint)"
        />
      </g>
      <text
        className="brand-logo__word"
        x="52"
        y="34.5"
        fill="currentColor"
        fontFamily='"Manrope", "Noto Sans SC", system-ui, sans-serif'
        fontWeight="800"
        fontSize={isCjkWordmark ? "27" : "29"}
        letterSpacing="normal"
      >
        {normalizedWordmark}
      </text>
    </svg>
  );
}
