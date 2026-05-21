const ACCENT = "var(--atc-orange, #ffe900)";

export default function Logo({
  size = 24,
  className = "",
  ariaLabel = "ADSBao",
  ...rest
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
      className={className}
      {...rest}
    >
      <g transform="rotate(22 16 11)">
        <path
          d="M16 4 L20 17 L16 14.5 L12 17 Z"
          fill={ACCENT}
        />
      </g>

      <line
        x1="4.5"
        y1="20.5"
        x2="27.5"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="1 2.5"
        strokeLinecap="round"
        opacity="0.45"
      />

      <line
        x1="9"
        y1="26"
        x2="23"
        y2="26"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />

      <circle cx="16" cy="26" r="1.6" fill={ACCENT} />
    </svg>
  );
}
