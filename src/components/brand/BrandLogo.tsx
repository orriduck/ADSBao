// Aircraft, flight path and position dot on the app's neutral instrument
// surface. Keep the shared composition across PWA, brand and notification icons.
export default function BrandLogo({
  size = 30,
  className = "",
  animated = false,
  ariaLabel = "ADSBao",
}) {
  return (
    <img
      src="/brand/adsbao-logo.78f3075809.png"
      alt={ariaLabel}
      width={size}
      height={size}
      draggable={false}
      className={`${className} ${animated ? "brand-logo--animated" : ""}`.trim()}
    />
  );
}
