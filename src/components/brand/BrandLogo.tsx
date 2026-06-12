const BRAND_MARK_SRC = "/brand/adsbao-logo.png";

// ADSBao wordmark and product mark. The mark uses the canonical raster app
// icon so the sidebar and installed-app surfaces stay visually aligned.
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
      <g className="brand-logo__mark">
        <image
          className="brand-logo__image"
          href={BRAND_MARK_SRC}
          x="1"
          y="1"
          width="50"
          height="50"
          preserveAspectRatio="xMidYMid meet"
        />
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
