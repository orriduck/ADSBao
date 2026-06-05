"use client";

import { RadioTower, TowerControl } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

// Shared airport-pin badge — a code pill (IATA / ICAO) plus an
// optional list of detail chips (NEAR n, RWY n, APP n, distance NM…).
//
// Two render modes because Leaflet's L.divIcon accepts an HTML string,
// not a React subtree:
//   - <AirportLabelBadge /> for the focal airport marker we mount via
//     React.createPortal (AirportMarker.jsx).
//   - airportLabelBadgeHtml({ code, details }) for the per-marker
//     icons NearbyAirportLayer renders into Leaflet directly.
//
// Both share the same DOM structure + class names so the styles in
// style.css (.airport-overlay-label*) only have to know one shape.

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Detail chip variants: "default" = neutral grey pill, "near" = warm
// yellow rounded pill used for proximity badges (NEAR 12 / 24 NM).
const detailClass = (variant) =>
  variant === "near"
    ? "airport-overlay-label__detail airport-overlay-label__detail--near"
    : "airport-overlay-label__detail";

function BadgeIcon({ type = "airport" }) {
  const Icon = type === "navaid" ? RadioTower : TowerControl;
  return (
    <span className="airport-overlay-label__code-icon" aria-hidden="true">
      <Icon
        aria-hidden="true"
        className="airport-overlay-label__code-icon-svg"
        focusable="false"
        size={9}
        strokeWidth={1.8}
      />
    </span>
  );
}

function renderBadgeIconHtml(type = "airport") {
  return renderToStaticMarkup(<BadgeIcon type={type} />);
}

function renderDetailHtml(detail) {
  const cls = detailClass(detail.variant);
  if (Array.isArray(detail.parts) && detail.parts.length > 0) {
    const partsHtml = detail.parts
      .map((part) => {
        if (part.type === "separator") {
          return `<span class="airport-overlay-label__detail-separator">${escapeHtml(part.value || "|")}</span>`;
        }
        const partClass =
          part.type === "label"
            ? "airport-overlay-label__detail-label"
            : "airport-overlay-label__detail-value";
        const motionClass = part.motion ? " airport-overlay-label__detail-part--motion" : "";
        return `<span class="${partClass}${motionClass}">${escapeHtml(part.value)}</span>`;
      })
      .join("");
    return `<span class="${cls}">${partsHtml}</span>`;
  }
  // Detail chips can either show a label + value pair (e.g. NEAR 12,
  // 24 NM) or a single flat value (RWY 4).
  if (detail.label != null && detail.value != null) {
    if (detail.variant === "near") {
      return `<span class="${cls}"><span class="airport-overlay-label__detail-label">${escapeHtml(detail.label)}</span><span class="airport-overlay-label__detail-value">${escapeHtml(detail.value)}</span></span>`;
    }
    return `<span class="${cls}">${escapeHtml(detail.label)} ${escapeHtml(detail.value)}</span>`;
  }
  return `<span class="${cls}">${escapeHtml(detail.value ?? detail.label ?? "")}</span>`;
}

export function airportLabelBadgeHtml({
  code = "",
  codeSuffix = "",
  details = [],
  className = "",
  icon = "airport",
  badgeType = "airport",
  collision = true,
}) {
  const wrap = ["airport-overlay-label", "notranslate", className]
    .filter(Boolean)
    .join(" ");
  const iconHtml = icon ? renderBadgeIconHtml(icon) : "";
  const suffixHtml = codeSuffix
    ? `<span class="airport-overlay-label__code-suffix">${escapeHtml(codeSuffix)}</span>`
    : "";
  const codePill = `<span class="airport-overlay-label__code endf-tab endf-tab--code">${iconHtml}<span>${escapeHtml(code)}</span>${suffixHtml}</span>`;
  const detailsHtml = details.map(renderDetailHtml).join("");
  const collisionAttrs = collision
    ? ` data-map-badge="true" data-map-badge-type="${escapeHtml(badgeType)}"`
    : "";
  return `<div class="${wrap}" translate="no"${collisionAttrs}>${codePill}${detailsHtml}</div>`;
}

function DetailChip({ detail }) {
  const cls = detailClass(detail.variant);
  if (Array.isArray(detail.parts) && detail.parts.length > 0) {
    return (
      <span className={cls}>
        {detail.parts.map((part, idx) => {
          if (part.type === "separator") {
            return (
              <span
                key={`${part.type}-${idx}`}
                className="airport-overlay-label__detail-separator"
              >
                {part.value || "|"}
              </span>
            );
          }
          return (
            <span
              key={`${part.type}-${part.value}-${idx}`}
              className={
                part.type === "label"
                  ? `airport-overlay-label__detail-label ${
                      part.motion ? "airport-overlay-label__detail-part--motion" : ""
                    }`
                  : `airport-overlay-label__detail-value ${
                      part.motion ? "airport-overlay-label__detail-part--motion" : ""
                    }`
              }
            >
              {part.value}
            </span>
          );
        })}
      </span>
    );
  }
  if (detail.label != null && detail.value != null) {
    if (detail.variant === "near") {
      return (
        <span className={cls}>
          <span className="airport-overlay-label__detail-label">{detail.label}</span>
          <span className="airport-overlay-label__detail-value">{detail.value}</span>
        </span>
      );
    }
    return (
      <span className={cls}>
        {detail.label} {detail.value}
      </span>
    );
  }
  return <span className={cls}>{detail.value ?? detail.label ?? ""}</span>;
}

export function AirportLabelBadge({
  code = "",
  details = [],
  className = "",
  icon = "airport",
  badgeType = "airport",
  collision = true,
}) {
  const wrap = ["airport-overlay-label", "notranslate", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={wrap}
      data-map-badge={collision ? "true" : undefined}
      data-map-badge-type={collision ? badgeType : undefined}
      translate="no"
    >
      <span className="airport-overlay-label__code endf-tab endf-tab--code">
        {icon ? <BadgeIcon type={icon} /> : null}
        <span>{code}</span>
      </span>
      {details.map((detail, idx) => (
        <DetailChip
          key={detail.key || `${detail.label || ""}-${detail.value || ""}-${idx}`}
          detail={detail}
        />
      ))}
    </div>
  );
}
