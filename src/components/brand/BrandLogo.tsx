import { useId } from "react";

// ADSBao wordmark and product mark. The mark is an inline SVG approximation
// of the app icon so it stays crisp in dense navigation surfaces.
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
  const id = useId();
  const plateGradientId = `${id}-brand-plate`;
  const rimGradientId = `${id}-brand-rim`;
  const shadowFilterId = `${id}-brand-shadow`;

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
      <defs>
        <linearGradient
          id={plateGradientId}
          x1="10"
          y1="8"
          x2="47"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fbfaf7" />
          <stop offset="0.58" stopColor="#eef2f4" />
          <stop offset="1" stopColor="#dfe8ec" />
        </linearGradient>
        <linearGradient
          id={rimGradientId}
          x1="12"
          y1="7"
          x2="45"
          y2="49"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="0.58" stopColor="#d7dee2" stopOpacity="0.36" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.86" />
        </linearGradient>
        <filter
          id={shadowFilterId}
          x="-8"
          y="-5"
          width="68"
          height="68"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2.2"
            floodColor="#1f2731"
            floodOpacity="0.16"
          />
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="5"
            floodColor="#1f2731"
            floodOpacity="0.14"
          />
        </filter>
      </defs>
      <g className="brand-logo__mark">
        <rect
          className="brand-logo__frame"
          x="4"
          y="4"
          width="44"
          height="44"
          rx="13.5"
          fill={`url(#${plateGradientId})`}
          filter={`url(#${shadowFilterId})`}
        />
        <path
          className="brand-logo__frame"
          d="M11.8 8.1c4.4-2.7 10.6-2.6 18.6-2.6h4.2c6.1 0 11 4.9 11 11v19c0 5.8-4.7 10.5-10.5 10.5H16.9c-5.8 0-10.5-4.7-10.5-10.5v-18c0-3.9 2.1-7.4 5.4-9.4Z"
          fill="#ffffff"
          opacity="0.22"
        />
        <rect
          className="brand-logo__frame"
          x="4.7"
          y="4.7"
          width="42.6"
          height="42.6"
          rx="13"
          stroke={`url(#${rimGradientId})`}
          strokeWidth="1.4"
        />
        <g
          className="brand-logo__glyph"
          stroke="#344358"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g fill="none" strokeWidth="2.45">
            <path d="M12.9 18.2v-4.1c0-2 1.6-3.6 3.6-3.6h4.7" />
            <path d="M39.4 18.2v-4.1c0-2-1.6-3.6-3.6-3.6h-4.7" />
            <path d="M12.9 33.5v4.1c0 2 1.6 3.6 3.6 3.6h4.7" />
            <path d="M39.4 33.5v4.1c0 2-1.6 3.6-3.6 3.6h-4.7" />
          </g>
          <path
            d="M17.2 36.8c6.4-1 10.9-4.8 15.1-11.4"
            fill="none"
            strokeWidth="2.3"
            strokeDasharray="2.8 4.5"
          />
          <path
            className="brand-logo__aircraft"
            d="M30.8 24.7 38.1 17.4c.9-.9 2.3-.9 3.1-.1.8.9.7 2.2-.2 3.1l-6.3 6.4 2.8 7.8c.3.8-.4 1.6-1.2 1.5l-4.6-6.5-4.8 3.7c-.4.3-1 .3-1.4-.1l-1.8-1.7 4.8-4.5-7.6-2.9c-.8-.3-.9-1.4-.1-1.8l10 2.4Z"
            fill="#2f3d51"
            stroke="#344358"
            strokeWidth="0.55"
            transform="translate(6 4) scale(0.82)"
          />
        </g>
        <path
          className="brand-logo__frame"
          d="M9.7 17.9c1.6-5.3 5.4-8.2 11.3-8.7"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.64"
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
