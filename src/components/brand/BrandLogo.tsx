// ADSBao wordmark and product mark. The four planes describe a single tracked
// position resolving into direction; the surrounding tile adapts to theme.
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
  const canvasWidth = 60 + textWidth + 14;
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
      <g className="brand-logo__mark" aria-hidden="true">
        <rect className="brand-logo__tile" x="2" y="2" width="48" height="48" rx="13" />
        <path className="brand-logo__plane brand-logo__plane--primary" d="M26 7v23.5l-13 8.5L26 7Z" />
        <path className="brand-logo__plane brand-logo__plane--signal" d="M26 7 39 39l-13-8.5V7Z" />
        <path className="brand-logo__plane brand-logo__plane--light" d="M13 39l13-8.5V46L13 39Z" />
        <path className="brand-logo__plane brand-logo__plane--shade" d="m26 30.5 13 8.5L26 46V30.5Z" />
      </g>
      <text
        className="brand-logo__word"
        x="60"
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
