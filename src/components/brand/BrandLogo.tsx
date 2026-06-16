// ADSBao wordmark and product mark. The mark is structured into semantic
// pieces so the route, airframe, and wordmark can reveal independently.
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
        <circle className="brand-logo__disc" cx="26" cy="26" r="23.5" />
        <path
          className="brand-logo__disc-rim"
          d="M49.5 26a23.5 23.5 0 1 1-47 0 23.5 23.5 0 0 1 47 0Z"
        />
        <path
          className="brand-logo__route"
          d="M6.5 43.5C13.2 39.2 18.9 35.7 24.4 33.2c7.1-3.2 14.2-4.8 21.4-5.7"
          pathLength="1"
        />
        <g className="brand-logo__plane">
          <path
            className="brand-logo__plane-wing"
            d="M2.7 25.5 22.4 24c-.2 1.4-.2 2.9.1 4.2L3.3 27.1c-.7 0-1.2-.5-1.3-1.1-.1-.3.2-.5.7-.5Zm46.6 0L29.6 24c.2 1.4.2 2.9-.1 4.2l19.2-1.1c.7 0 1.2-.5 1.3-1.1.1-.3-.2-.5-.7-.5Z"
          />
          <path
            className="brand-logo__plane-body"
            d="M26 15.4c-3.7 2-5.5 6.3-4.9 11.8.4 3.6 1.7 6.7 3.5 9h2.8c1.8-2.3 3.1-5.4 3.5-9 .6-5.5-1.2-9.8-4.9-11.8Z"
          />
          <path
            className="brand-logo__plane-tail"
            d="M18.2 34.2 33.8 32.6l-4.6 4.4H22l-3.8-2.8Z"
          />
          <path
            className="brand-logo__plane-fin"
            d="M25.4 15.4 26 10.9l.6 4.5v3.5h-1.2v-3.5Z"
          />
        </g>
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
