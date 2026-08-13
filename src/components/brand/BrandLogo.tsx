// The selected ADSBao mascot mark: a low-angle dumpling raising a radio toward
// the center of a white/gray signal burst. Keep the full square composition so
// the toolbar, PWA icon, and notification icon all share one recognizable mark.
export default function BrandLogo({
  size = 30,
  className = "",
  animated = false,
  ariaLabel = "ADSBao",
}) {
  return (
    <img
      src="/brand/adsbao-logo.png"
      alt={ariaLabel}
      width={size}
      height={size}
      draggable={false}
      className={`${className} ${animated ? "brand-logo--animated" : ""}`.trim()}
    />
  );
}
