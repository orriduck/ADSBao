// Geometric ADSBao wordmark. Kept as SVG so the app does not need a
// bitmap logo asset, but styled like the new consumer travel UI.
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
  const canvasWidth = 44 + textWidth + 14;
  const width = Math.round((height * canvasWidth) / 50);
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${canvasWidth} 50`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? "brand-logo--animated" : ""}`.trim()}
    >
      <g className="brand-logo__mark">
        <circle
          className="brand-logo__disc"
          cx="19"
          cy="25"
          r="13"
          fill="var(--endf-yellow)"
        />
        <path
          className="brand-logo__arrow"
          d="M13 25h12m-5-5 5 5-5 5"
          stroke="var(--endf-ink)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <text
        className="brand-logo__word"
        x="44"
        y="34"
        fill="currentColor"
        fontFamily='"Plus Jakarta Sans", "Noto Sans SC", system-ui, sans-serif'
        fontWeight="800"
        fontSize={isCjkWordmark ? "28" : "29"}
        letterSpacing="0"
      >
        {normalizedWordmark}
      </text>
      <rect
        className="brand-logo__underline"
        x="44"
        y="40"
        width={Math.min(textWidth, isCjkWordmark ? 78 : 86)}
        height="3"
        rx="1.5"
        fill="var(--endf-yellow)"
      />
    </svg>
  );
}
