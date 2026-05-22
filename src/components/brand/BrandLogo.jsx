// Original ADSBao wordmark. Rendered with Saira display font so it
// scales crisp at any size without separate PNG assets. The `//` and
// yellow diamond accents tie it into the same Endfield-family
// typography used across the app's section labels and chips.
export default function BrandLogo({ height = 44, className = "" }) {
  // Aspect ratio of the wordmark canvas; preserved as we scale by height.
  const width = Math.round(height * 4.9);
  return (
    <svg
      role="img"
      aria-label="ADSBao"
      width={width}
      height={height}
      viewBox="0 0 245 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Yellow rhombus accent */}
      <g transform="rotate(45 12 25)">
        <rect x="6" y="19" width="12" height="12" fill="var(--endf-yellow)" />
      </g>

      {/* `//` ink glyph */}
      <text
        x="30"
        y="34"
        fill="currentColor"
        fontFamily='"Saira", "Noto Sans SC", system-ui, sans-serif'
        fontWeight="900"
        fontSize="22"
        letterSpacing="0.5"
      >
        {"//"}
      </text>

      {/* ADSBAO wordmark */}
      <text
        x="58"
        y="34"
        fill="currentColor"
        fontFamily='"Saira", "Noto Sans SC", system-ui, sans-serif'
        fontWeight="900"
        fontSize="28"
        letterSpacing="1.2"
      >
        ADSBAO
      </text>

      {/* Yellow underline stub */}
      <rect x="58" y="40" width="44" height="3" fill="var(--endf-yellow)" />
    </svg>
  );
}
