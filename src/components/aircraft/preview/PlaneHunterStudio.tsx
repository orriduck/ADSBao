"use client";

import {
  Camera,
  CameraOff,
  Copy,
  Download,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SidebarBrandMark from "@/components/sidebar/SidebarBrandMark";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const TEMPLATES = ["none", "previewCard", "lowerThird"] as const;
type PlaneHunterTemplate = (typeof TEMPLATES)[number];

// Metadata fields the photographer can toggle on/off. Order in the
// array drives display order in the templates and the card subtitle.
const META_FIELDS = [
  "type",
  "registration",
  "speed",
  "altitude",
  "verticalRate",
] as const;
type MetaField = (typeof META_FIELDS)[number];
const DEFAULT_META_FIELDS = new Set<MetaField>(META_FIELDS);

type PlaneHunterTranslator = ReturnType<typeof useI18n>["t"];
type AircraftLabels = ReturnType<typeof getAircraftLabels>;

function normalizeLabel(value: unknown, fallback = "") {
  const label = String(value || "").trim();
  return label || fallback;
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getAircraftLabels(
  aircraft: Record<string, any> | null | undefined,
  enabledFields: Set<MetaField> = DEFAULT_META_FIELDS,
) {
  const callsign = normalizeLabel(
    aircraft?.callsign,
    normalizeLabel(aircraft?.icao24, "UNKNOWN"),
  ).toUpperCase();
  const route =
    normalizeLabel(aircraft?.flightRouteLabel) ||
    normalizeLabel(aircraft?.route) ||
    [aircraft?.origin, aircraft?.destination]
      .map((item) => normalizeLabel(item).toUpperCase())
      .filter(Boolean)
      .join(" - ");
  const type =
    normalizeLabel(aircraft?.desc) ||
    normalizeLabel(aircraft?.type) ||
    normalizeLabel(aircraft?.category, "AIRCRAFT");
  const registration = normalizeLabel(aircraft?.registration).toUpperCase();
  const speed = normalizeNumber(aircraft?.gs ?? aircraft?.speed);
  const altitude = normalizeNumber(aircraft?.alt_baro ?? aircraft?.altitude);
  const verticalRate = normalizeNumber(aircraft?.baro_rate ?? aircraft?.verticalRate);
  const allow = (field: MetaField) => enabledFields.has(field);
  const metadata = [
    allow("type") ? type.toUpperCase() : "",
    allow("registration") ? registration : "",
    allow("speed") && speed !== null ? `${Math.round(speed)} KT` : "",
    allow("altitude") && altitude !== null
      ? `${Math.round(altitude).toLocaleString()} FT`
      : "",
    allow("verticalRate") && verticalRate !== null
      ? `${Math.round(verticalRate)} FPM`
      : "",
  ].filter(Boolean);

  return {
    callsign,
    route: route || "ROUTE PENDING",
    type: type.toUpperCase(),
    registration,
    metadata,
    capturedAt: new Date().toLocaleString(),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render image"));
    }, "image/png");
  });
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const nextRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.arcTo(x + width, y, x + width, y + height, nextRadius);
  context.arcTo(x + width, y + height, x, y + height, nextRadius);
  context.arcTo(x, y + height, x, y, nextRadius);
  context.arcTo(x, y, x + width, y, nextRadius);
  context.closePath();
}

// Single source of truth for overlay proportions. Both the on-screen
// HTML overlay (via cqi container queries on the photo-box) and the
// off-screen canvas (via `width * RATIO`) use these so the framing the
// photographer sees IS the framing they save.
//
// All values are fractions of the photo-box / canvas inline (width)
// dimension. The photo-box's aspect-ratio matches the camera stream,
// so positions in width-units land in the same visual place at any
// scale.
const PH_RATIOS = {
  pad: 0.022,        // outer inset → cqi: 2.2cqi
  cornerR: 0.018,    // rounded corner radius
  // Preview card
  cardW: 0.34,
  cardH: 0.105,
  cardInner: 0.014,  // inner padding inside the card
  titleY: 0.039,     // distance from card top to baseline of callsign
  routeY: 0.072,     // baseline of route line
  metaY:  0.091,     // baseline of meta line
  titleSize: 0.025,
  bodySize:  0.015,
  smallSize: 0.011,
  // News bar
  barH: 0.067,
  barCallsignFrac: 0.24, // fraction of bar width that's the cream block
  barInset: 0.0075,
  barCallsignSize: 0.024,
  barRouteY: 0.027,
  barMetaY:  0.048,
} as const;

function drawTemplate(
  context: CanvasRenderingContext2D,
  template: PlaneHunterTemplate,
  labels: AircraftLabels,
  width: number,
  height: number,
) {
  const r = PH_RATIOS;
  const pad = width * r.pad;
  const cornerR = width * r.cornerR;
  const routeLabel = labels.route;
  const metaLabel = labels.metadata.slice(0, 3).join(" · ");

  context.save();
  context.textBaseline = "alphabetic";

  if (template === "previewCard") {
    const panelWidth = Math.min(width - pad * 2, width * r.cardW);
    const panelHeight = width * r.cardH;
    const panelY = height - panelHeight - pad;
    const inner = width * r.cardInner;
    const titleSize = width * r.titleSize;
    const bodySize = width * r.bodySize;
    const smallSize = width * r.smallSize;

    context.fillStyle = "rgba(242, 243, 238, 0.92)";
    roundedRect(context, pad, panelY, panelWidth, panelHeight, cornerR);
    context.fill();

    context.strokeStyle = "rgba(14, 15, 16, 0.16)";
    context.lineWidth = Math.max(1, width * 0.001);
    roundedRect(context, pad, panelY, panelWidth, panelHeight, cornerR);
    context.stroke();

    context.fillStyle = "rgba(14, 15, 16, 0.92)";
    context.font = `800 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.callsign, pad + inner, panelY + width * r.titleY);

    context.textAlign = "right";
    context.font = `760 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.type, pad + panelWidth - inner, panelY + width * r.titleY);

    context.textAlign = "left";
    context.fillStyle = "rgba(14, 15, 16, 0.56)";
    context.fillRect(
      pad + inner,
      panelY + width * 0.053,
      panelWidth - inner * 2,
      Math.max(1, width * 0.001),
    );

    context.fillStyle = "rgba(14, 15, 16, 0.78)";
    context.font = `720 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(routeLabel, pad + inner, panelY + width * r.routeY);

    context.fillStyle = "rgba(14, 15, 16, 0.54)";
    context.font = `800 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(metaLabel || labels.capturedAt, pad + inner, panelY + width * r.metaY);
  }

  if (template === "lowerThird") {
    const frameInset = width * r.barInset;
    const barHeight = width * r.barH;
    const barY = height - barHeight - frameInset;
    const barWidth = width - frameInset * 2;
    const callsignWidth = barWidth * r.barCallsignFrac;
    const callsignSize = width * r.barCallsignSize;
    const bodySize = width * r.bodySize;
    const smallSize = width * r.smallSize;
    const blockInner = width * 0.02;

    context.fillStyle = "rgba(242, 243, 238, 0.95)";
    context.fillRect(frameInset, barY, callsignWidth, barHeight);

    context.fillStyle = "rgba(14, 15, 16, 0.94)";
    context.fillRect(
      frameInset + callsignWidth,
      barY,
      barWidth - callsignWidth,
      barHeight,
    );

    context.fillStyle = "rgba(14, 15, 16, 0.95)";
    context.font = `850 ${callsignSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.callsign, frameInset + blockInner, barY + barHeight * 0.62);

    context.fillStyle = "rgba(242, 243, 238, 0.96)";
    context.font = `780 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      routeLabel,
      frameInset + callsignWidth + blockInner,
      barY + barHeight * 0.42,
    );

    context.fillStyle = "rgba(242, 243, 238, 0.66)";
    context.font = `760 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      metaLabel || labels.capturedAt,
      frameInset + callsignWidth + blockInner,
      barY + barHeight * 0.78,
    );
  }

  context.restore();
}

// Live overlay. Positioned inside the photo-box (a container with
// `container-type: inline-size`) using `cqi` units (1cqi = 1% of the
// box's inline width) so the on-screen layout matches the canvas
// drawTemplate output proportionally — what the photographer frames is
// what they save, regardless of viewport size.
//
// Ratios mirror PH_RATIOS in drawTemplate.
function PlaneHunterTemplateOverlay({
  labels,
  template,
}: {
  labels: AircraftLabels;
  template: PlaneHunterTemplate;
}) {
  if (template === "none") return null;

  const metadata = labels.metadata.slice(0, 3).join(" · ");

  if (template === "previewCard") {
    return (
      <div
        className="pointer-events-none absolute left-[2.2cqi] right-[2.2cqi] bottom-[2.2cqi] flex justify-start"
      >
        <div
          className="w-[34cqi] min-w-[180px] rounded-[1.8cqi] border border-[rgba(14,15,16,0.16)] bg-[rgba(242,243,238,0.92)] text-[rgb(14,15,16)] shadow-[0_1.8cqi_4cqi_rgba(0,0,0,0.22)]"
          style={{ padding: "1.4cqi 1.4cqi" }}
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(14,15,16,0.18)] pb-[0.6cqi]">
            <strong
              translate="no"
              className="notranslate truncate text-[2.5cqi] font-black leading-none tracking-normal"
            >
              {labels.callsign}
            </strong>
            <span className="truncate text-right text-[1.5cqi] font-extrabold leading-none">
              {labels.type}
            </span>
          </div>
          <div className="mt-[0.8cqi] truncate text-[1.5cqi] font-extrabold leading-none">
            {labels.route}
          </div>
          {(metadata || labels.capturedAt) && (
            <div className="mt-[0.5cqi] truncate text-[1.1cqi] font-black leading-none text-[rgba(14,15,16,0.56)]">
              {metadata || labels.capturedAt}
            </div>
          )}
        </div>
      </div>
    );
  }

  // News bar: pinned just above the bottom edge of the photo-box, no
  // rounding, callsign block on the left, route + metadata on the right.
  return (
    <div className="pointer-events-none absolute inset-x-[0.75cqi] bottom-[0.75cqi] flex h-[6.7cqi] items-stretch shadow-[0_-1.8cqi_4cqi_rgba(0,0,0,0.22)]">
      <div className="grid w-full grid-cols-[24%_minmax(0,1fr)] items-stretch overflow-hidden">
        <div className="flex min-w-0 items-center bg-[rgb(242,243,238)] px-[2cqi] text-[rgb(14,15,16)]">
          <strong
            translate="no"
            className="notranslate truncate text-[2.4cqi] font-black leading-none tracking-normal"
          >
            {labels.callsign}
          </strong>
        </div>
        <div className="flex min-w-0 flex-col justify-center bg-[rgba(14,15,16,0.94)] px-[2cqi] text-[rgb(242,243,238)]">
          <div className="truncate text-[1.5cqi] font-extrabold leading-tight">
            {labels.route}
          </div>
          {(metadata || labels.capturedAt) && (
            <div className="mt-[0.3cqi] truncate text-[1.1cqi] font-black leading-none text-[rgba(242,243,238,0.66)]">
              {metadata || labels.capturedAt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small chip pinned inside the viewfinder top-left so the camera area
// always reads as "live" rather than blank waiting space. Mirrors a
// real camera's HUD: a pulsing dot, the live / captured state label,
// and the active template name.
function PlaneHunterViewfinderChip({
  captured,
  templateLabel,
  liveLabel,
  capturedLabel,
}: {
  captured: boolean;
  templateLabel: string;
  liveLabel: string;
  capturedLabel: string;
}) {
  return (
    <div className="pointer-events-none absolute left-[1.8cqi] top-[1.8cqi] flex items-center gap-[0.6cqi] rounded-full bg-[rgba(10,11,12,0.55)] px-[1.1cqi] py-[0.35cqi] text-[1.15cqi] font-extrabold uppercase tracking-[0.08em] text-[rgba(242,243,238,0.92)] shadow-[0_0.4cqi_1.2cqi_rgba(0,0,0,0.32)] backdrop-blur">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-[0.6cqi] min-h-[3px] min-w-[3px] rounded-full",
          captured ? "bg-[rgba(242,243,238,0.7)]" : "bg-[rgb(255,196,80)] animate-pulse",
        )}
      />
      <span>{captured ? capturedLabel : liveLabel}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span className="truncate max-w-[18cqi]">{templateLabel}</span>
    </div>
  );
}

// Rule-of-thirds + crosshair reticle. Lives inside the camera frame so a
// blank or permission-pending viewfinder still reads like a camera
// surface, and gives the photographer aim cues when shooting an
// aircraft against a featureless sky. Lines are barely visible at rest
// but bright enough on a featureless sky to anchor a moving subject.
function PlaneHunterViewfinderGrid() {
  const gridLine = "absolute bg-[rgba(255,255,255,0.18)]";
  const crosshair = "absolute bg-[rgba(255,255,255,0.65)]";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-[0.75cqi]"
    >
      <div className={cn(gridLine, "left-0 right-0 top-1/3 h-px")} />
      <div className={cn(gridLine, "left-0 right-0 top-2/3 h-px")} />
      <div className={cn(gridLine, "top-0 bottom-0 left-1/3 w-px")} />
      <div className={cn(gridLine, "top-0 bottom-0 left-2/3 w-px")} />
      {/* Center reticle: 4 short ticks + a hollow centerpoint, sized
          relative to the photo-box so the crosshair stays proportional. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative size-[6cqi] min-w-[40px] min-h-[40px]">
          <span className={cn(crosshair, "left-1/2 top-0 h-[20%] w-px -translate-x-1/2")} />
          <span className={cn(crosshair, "left-1/2 bottom-0 h-[20%] w-px -translate-x-1/2")} />
          <span className={cn(crosshair, "top-1/2 left-0 h-px w-[20%] -translate-y-1/2")} />
          <span className={cn(crosshair, "top-1/2 right-0 h-px w-[20%] -translate-y-1/2")} />
          <span className="absolute left-1/2 top-1/2 size-[10%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,255,255,0.78)]" />
        </div>
      </div>
    </div>
  );
}

function PlaneHunterCameraFallback({
  actionLabel,
  onAction,
  title,
  message,
}: {
  actionLabel: string;
  onAction: () => void;
  title: string;
  message: string;
}) {
  // Fallback panel always sits on a dark camera surface, so anchor the
  // accent color to a fixed bright value instead of the theme token
  // `--primary-bright` (which flips to a dark ink color in light mode
  // and renders the link invisibly dark-on-dark).
  const accent = "rgb(255,196,80)";
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_36%,rgba(242,243,238,0.18),transparent_42%),linear-gradient(135deg,rgba(242,243,238,0.06)_0_1px,transparent_1px_22px),rgb(10,11,12)] p-5 text-[rgb(242,243,238)]">
      <div
        className="w-full max-w-[380px] rounded-[var(--atc-radius-panel)] border border-[rgba(242,243,238,0.18)] bg-[rgba(10,11,12,0.78)] px-4 py-3.5 text-center shadow-[0_24px_56px_rgba(0,0,0,0.42)] backdrop-blur md:px-5 md:py-4 md:text-left"
      >
        <div className="flex items-center justify-center gap-2 md:justify-start">
          <span
            aria-hidden="true"
            className="inline-flex size-6 items-center justify-center rounded-full"
            style={{ background: "rgba(255,196,80,0.16)", color: accent }}
          >
            <CameraOff className="size-3.5" />
          </span>
          <p className="text-[13px] font-extrabold leading-none">{title}</p>
        </div>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[rgba(242,243,238,0.7)]">
          {message}
        </p>
        <button
          type="button"
          onClick={onAction}
          style={{
            color: "rgb(14,15,16)",
            background: accent,
          }}
          className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold leading-none transition active:scale-[0.97] hover:brightness-105"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// Compact 2-line header for the mobile bottom card. Top line pairs
// the callsign with the "飞机探长" feature tag; second line packs the
// remaining aircraft metadata (type · registration · altitude) so the
// card never reads as empty even before the photographer captures.
function PlaneHunterMobileHeader({
  callsign,
  metaParts,
  title,
}: {
  callsign: string;
  metaParts: string[];
  title: string;
}) {
  const metaText = metaParts.filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-0.5 md:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <span
          translate="no"
          className="notranslate truncate text-[13px] font-black leading-none tracking-normal text-atc-text"
        >
          {callsign}
        </span>
        <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-atc-dim">
          {title}
        </span>
      </div>
      {metaText && (
        <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.06em] text-atc-faint">
          {metaText}
        </span>
      )}
    </div>
  );
}

// Metadata field toggles — sits between the template picker and the
// capture actions so the photographer can quickly hide or show stats
// in the previewCard / news-bar templates without leaving the studio.
function PlaneHunterMetaToggles({
  enabledFields,
  onToggle,
  t,
}: {
  enabledFields: Set<MetaField>;
  onToggle: (field: MetaField) => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-atc-faint">
        {t("planeHunter.metaToggle")}
      </span>
      <div className="flex flex-wrap gap-1">
        {META_FIELDS.map((field) => {
          const active = enabledFields.has(field);
          return (
            <button
              key={field}
              type="button"
              onClick={() => onToggle(field)}
              data-active={active ? "true" : undefined}
              aria-pressed={active}
              className={cn(
                "min-h-6 rounded-full border px-2 text-[10px] font-bold uppercase tracking-[0.04em] leading-none transition",
                "border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] text-atc-dim",
                "hover:bg-[var(--atc-control-hover-bg)] hover:text-atc-text",
                "data-[active=true]:border-transparent data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
              )}
            >
              {t(`planeHunter.metaFields.${field}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Mini visualization of each template's layout — sketched onto a
// 24×14 (16:9) rectangle so the photographer can recognize the
// overlay shape at a glance instead of decoding the label text.
function TemplatePreviewIcon({
  template,
  className,
}: {
  template: PlaneHunterTemplate;
  className?: string;
}) {
  const stroke = "currentColor";
  return (
    <svg
      viewBox="0 0 24 14"
      aria-hidden="true"
      className={cn("h-auto", className)}
      fill="none"
    >
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="13"
        rx="1.4"
        stroke={stroke}
        strokeWidth="0.6"
        opacity="0.55"
      />
      {/* aircraft hint: a small angled line for sense of subject */}
      <path
        d="M9 6.5 L13 5 L16 5.6 L13.4 6.4 L13.4 7.6 L12.6 7.6 L12.6 7.0 Z"
        fill={stroke}
        opacity="0.32"
      />
      {template === "previewCard" && (
        <g>
          <rect x="1.6" y="9.2" width="8.4" height="3.5" rx="0.6" fill={stroke} opacity="0.92" />
          <rect x="2.2" y="9.9" width="3.6" height="0.6" fill="black" opacity="0.55" />
          <rect x="2.2" y="11.0" width="5.6" height="0.4" fill="black" opacity="0.35" />
          <rect x="2.2" y="11.7" width="4.0" height="0.3" fill="black" opacity="0.25" />
        </g>
      )}
      {template === "lowerThird" && (
        <g>
          <rect x="0.7" y="11.1" width="5.4" height="2.2" fill={stroke} opacity="0.95" />
          <rect x="6.1" y="11.1" width="17.2" height="2.2" fill="black" opacity="0.72" />
          <rect x="1.3" y="11.7" width="3.6" height="0.5" fill="black" opacity="0.55" />
          <rect x="6.8" y="11.5" width="9.0" height="0.45" fill={stroke} opacity="0.55" />
          <rect x="6.8" y="12.3" width="6.0" height="0.35" fill={stroke} opacity="0.4" />
        </g>
      )}
    </svg>
  );
}

function PlaneHunterTemplatePicker({
  template,
  onSelect,
  t,
}: {
  template: PlaneHunterTemplate;
  onSelect: (next: PlaneHunterTemplate) => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-2.5">
      {TEMPLATES.map((item) => {
        const active = template === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            data-active={active ? "true" : undefined}
            aria-pressed={active}
            className={cn(
              // Shared shell
              "group relative flex w-full select-none flex-col gap-1 overflow-hidden rounded-[var(--atc-radius-card)] border px-2 py-1.5 text-left transition",
              "border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] text-atc-text",
              // Mobile vs desktop sizing
              "min-h-[56px] md:min-h-[78px] md:px-3 md:py-2.5",
              // Hover (inactive)
              "hover:border-[var(--sidebar-tile-hover-border)] hover:bg-[var(--atc-control-hover-bg)]",
              // Active state — accent border + filled tile + halo
              "data-[active=true]:border-[var(--atc-click-bg)] data-[active=true]:bg-[var(--atc-click-bg)] data-[active=true]:text-[var(--atc-click-fg)]",
              "data-[active=true]:shadow-[var(--atc-action-primary-shadow),0_8px_18px_color-mix(in_oklab,var(--atc-click-bg)_28%,transparent)]",
              "active:scale-[0.98]",
              "shadow-[0_1px_2px_rgba(14,15,16,0.05),0_4px_12px_rgba(14,15,16,0.04)]",
            )}
          >
            {/* Selected indicator dot — visual cue that the active
                state isn't just a hover/style difference. */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute right-1.5 top-1.5 size-1.5 rounded-full transition",
                active
                  ? "bg-[var(--atc-click-fg)] opacity-100"
                  : "bg-current opacity-0",
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.1em] opacity-65 md:text-[9.5px]">
                {t("planeHunter.templateLabel")}
              </span>
              <TemplatePreviewIcon
                template={item}
                className={cn(
                  "w-8 shrink-0 transition md:w-10",
                  active ? "opacity-100" : "opacity-75",
                )}
              />
            </div>
            <div className="mt-auto flex items-baseline justify-between gap-2">
              <span
                translate="no"
                className="notranslate truncate text-[12px] font-extrabold leading-none md:text-[15px]"
              >
                {t(`planeHunter.templates.${item}`)}
              </span>
              {/* Unit text duplicates what the thumbnail already shows
                  on narrow cards, so it only appears on desktop where
                  there's room. */}
              <span className="hidden shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.1em] opacity-60 md:inline">
                {t(`planeHunter.templateUnits.${item}`)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PlaneHunterActionStack({
  captured,
  cameraDisabled,
  canShareFile,
  onCapture,
  onClose,
  onRetake,
  onCopy,
  onSave,
  t,
}: {
  captured: boolean;
  cameraDisabled: boolean;
  canShareFile: boolean;
  onCapture: () => void;
  onClose: () => void;
  onRetake: () => void;
  onCopy: () => void;
  onSave: () => void;
  t: PlaneHunterTranslator;
}) {
  const primaryClass = cn(
    "flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] px-3 text-[12px] font-extrabold leading-none",
    "bg-[var(--primary-bright)] text-[var(--primary-ink)]",
    // Layered shadow: a tight inner drop for definition and a wider
    // ambient halo so the primary action lifts off a light panel.
    "shadow-[var(--atc-action-primary-shadow),0_8px_22px_rgba(14,15,16,0.18)]",
    "transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
    "md:min-h-11 md:text-[13px]",
  );
  const secondaryClass = cn(
    "flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] px-3 text-[12px] font-extrabold leading-none",
    "border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] text-atc-text",
    "shadow-[var(--atc-control-inset-shadow),0_2px_6px_rgba(14,15,16,0.06)]",
    "transition hover:bg-[var(--atc-control-hover-bg)] active:scale-[0.98]",
    "md:min-h-11 md:text-[13px]",
  );

  if (captured) {
    return (
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onRetake}
          className={secondaryClass}
          aria-label={t("planeHunter.retake")}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {t("planeHunter.retake")}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className={secondaryClass}
          aria-label={t("planeHunter.copy")}
        >
          <Copy aria-hidden="true" className="size-4" />
          {t("planeHunter.copy")}
        </button>
        <button
          type="button"
          onClick={onSave}
          className={primaryClass}
          aria-label={canShareFile ? t("planeHunter.share") : t("planeHunter.save")}
        >
          {canShareFile ? (
            <Share2 aria-hidden="true" className="size-4" />
          ) : (
            <Download aria-hidden="true" className="size-4" />
          )}
          {canShareFile ? t("planeHunter.share") : t("planeHunter.save")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={onCapture}
        disabled={cameraDisabled}
        className={primaryClass}
      >
        <Camera aria-hidden="true" className="size-4 md:size-5" />
        {t("planeHunter.capture")}
      </button>
      <button
        type="button"
        onClick={onClose}
        className={secondaryClass}
      >
        <X aria-hidden="true" className="size-4" />
        {t("planeHunter.back")}
      </button>
    </div>
  );
}

// Shared control surface used by both layouts. Mobile gets a compact
// header inline; desktop renders the larger brand+title block above
// this panel so the picker + actions stay identical across viewports.
function PlaneHunterControlPanel({
  labels,
  template,
  onSelectTemplate,
  enabledFields,
  onToggleField,
  captured,
  cameraDisabled,
  canShareFile,
  status,
  onCapture,
  onClose,
  onRetake,
  onCopy,
  onSave,
  t,
}: {
  labels: AircraftLabels;
  template: PlaneHunterTemplate;
  onSelectTemplate: (next: PlaneHunterTemplate) => void;
  enabledFields: Set<MetaField>;
  onToggleField: (field: MetaField) => void;
  captured: boolean;
  cameraDisabled: boolean;
  canShareFile: boolean;
  status: string;
  onCapture: () => void;
  onClose: () => void;
  onRetake: () => void;
  onCopy: () => void;
  onSave: () => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="flex flex-col gap-2 md:gap-2.5">
      <PlaneHunterMobileHeader
        callsign={labels.callsign}
        metaParts={labels.metadata}
        title={t("planeHunter.title")}
      />
      <PlaneHunterTemplatePicker
        template={template}
        onSelect={onSelectTemplate}
        t={t}
      />
      <PlaneHunterMetaToggles
        enabledFields={enabledFields}
        onToggle={onToggleField}
        t={t}
      />
      {status && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-atc-bg/70 px-3 py-2 text-[11px] font-semibold leading-snug text-atc-dim"
        >
          {status}
        </p>
      )}
      <PlaneHunterActionStack
        captured={captured}
        cameraDisabled={cameraDisabled}
        canShareFile={canShareFile}
        onCapture={onCapture}
        onClose={onClose}
        onRetake={onRetake}
        onCopy={onCopy}
        onSave={onSave}
        t={t}
      />
    </div>
  );
}

export default function PlaneHunterStudio({
  aircraft,
  open,
  onOpenChange,
}: {
  aircraft?: Record<string, any> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [template, setTemplate] = useState<PlaneHunterTemplate>("previewCard");
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState("");
  // Photo-box aspect ratio. Updated when the camera stream's metadata
  // loads so the box's shape matches what the camera will save; the
  // live overlays and the canvas overlays share the same coordinate
  // basis (PH_RATIOS), so the framing is consistent.
  const [photoAspect, setPhotoAspect] = useState(16 / 9);
  // Detect Web Share API file support so the captured "Save" action
  // can prefer the native share sheet (which on iOS surfaces "Save
  // Image" / "Add to Photos", on Android surfaces the system share
  // sheet, etc.) and fall back to download on browsers without it.
  const [canShareFile, setCanShareFile] = useState(false);
  const [enabledFields, setEnabledFields] = useState<Set<MetaField>>(
    () => new Set<MetaField>(DEFAULT_META_FIELDS),
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    try {
      const probe = new File(["probe"], "probe.png", { type: "image/png" });
      setCanShareFile(
        typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [probe] }),
      );
    } catch {
      setCanShareFile(false);
    }
  }, []);
  const toggleField = useCallback((field: MetaField) => {
    setEnabledFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);
  const labels = useMemo(
    () => getAircraftLabels(aircraft, enabledFields),
    [aircraft, enabledFields],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setStatus("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("planeHunter.cameraUnsupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const w = videoRef.current.videoWidth;
        const h = videoRef.current.videoHeight;
        if (w > 0 && h > 0) setPhotoAspect(w / h);
      }
    } catch {
      setCameraError(t("planeHunter.cameraDenied"));
    }
  }, [t]);

  // Some browsers (Safari) fire `loadedmetadata` after play(); listen
  // there too so the photo-box matches the actual sensor aspect once
  // it's known, not just whatever the requested constraints negotiated.
  const handleVideoMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setPhotoAspect(video.videoWidth / video.videoHeight);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return undefined;
    }

    if (!capturedImage) startCamera();
    return () => stopCamera();
  }, [capturedImage, open, startCamera, stopCamera]);

  const close = useCallback(() => {
    stopCamera();
    setCapturedImage("");
    setStatus("");
    setCameraError("");
    onOpenChange(false);
  }, [onOpenChange, stopCamera]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  // Auto-dismiss the inline status note so save/copy feedback doesn't
  // stay forever and shift the action stack down on repeat actions.
  useEffect(() => {
    if (!status) return undefined;
    const timeout = window.setTimeout(() => setStatus(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);
    setCapturedImage(canvas.toDataURL("image/png"));
    setStatus("");
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage("");
    setStatus("");
  }, []);

  const renderFinalCanvas = useCallback(async () => {
    if (!capturedImage) return null;
    const image = await loadImage(capturedImage);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawTemplate(context, template, labels, canvas.width, canvas.height);
    return canvas;
  }, [capturedImage, labels, template]);

  useEffect(() => {
    let cancelled = false;

    if (!capturedImage) {
      setPreviewImage("");
      return undefined;
    }

    renderFinalCanvas()
      .then((canvas) => {
        if (cancelled) return;
        setPreviewImage(canvas?.toDataURL("image/png") || capturedImage);
      })
      .catch(() => {
        if (!cancelled) setPreviewImage(capturedImage);
      });

    return () => {
      cancelled = true;
    };
  }, [capturedImage, renderFinalCanvas]);

  const saveImage = useCallback(async () => {
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      const filename = `adsbao-plane-hunter-${labels.callsign.toLowerCase()}.png`;

      // Prefer the system share sheet on supported devices — that's
      // how iOS Safari users land an image in Photos (the share sheet
      // exposes "Save Image" / "Add to Photos"). Falls back to a
      // download link if the user cancels or the browser cannot share
      // files (desktop browsers, older Android WebViews).
      if (canShareFile && typeof navigator.share === "function") {
        const file = new File([blob], filename, { type: blob.type });
        if (
          typeof navigator.canShare === "function" &&
          !navigator.canShare({ files: [file] })
        ) {
          // Capability changed since the initial probe — fall through
          // to the download path below.
        } else {
          try {
            await navigator.share({
              files: [file],
              title: `ADSBao · ${labels.callsign}`,
            });
            setStatus(t("planeHunter.shared"));
            return;
          } catch (error) {
            // AbortError = user dismissed the sheet. Treat as a
            // non-error so we don't flash a failure toast.
            if ((error as Error | undefined)?.name === "AbortError") return;
            // Anything else: fall through to the download path so
            // the photo isn't lost.
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(t("planeHunter.saved"));
    } catch {
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [canShareFile, labels.callsign, renderFinalCanvas, t]);

  const copyImage = useCallback(async () => {
    try {
      const canvas = await renderFinalCanvas();
      if (!canvas) return;
      const blob = await canvasToBlob(canvas);
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        setStatus(t("planeHunter.copyUnsupported"));
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setStatus(t("planeHunter.copied"));
    } catch {
      setStatus(t("planeHunter.copyFailed"));
    }
  }, [renderFinalCanvas, t]);

  if (!open) return null;

  const captured = Boolean(capturedImage);
  const cameraDisabled = Boolean(cameraError);

  return (
    <div
      className="fixed inset-0 z-[10000] bg-[color-mix(in_oklab,var(--atc-bg)_82%,black_18%)] text-atc-text"
      role="dialog"
      aria-modal="true"
      aria-label={t("planeHunter.title")}
    >
      <div className="dither-page-shell plane-hunter-shell flex h-dvh w-full flex-col text-atc-text md:flex-row">
        <aside className="dither-page-panel plane-hunter-panel sidebar-shell order-2 flex w-full flex-none flex-col border-t border-atc-line-strong bg-atc-bg md:order-1 md:w-[var(--app-sidebar-width)] md:border-r md:border-t-0">
          {/* Desktop header — brand + title + callsign/type. Mobile
              swaps this for the compact header inline with the
              control panel to keep the bottom card tight. */}
          <div className="hidden flex-none px-6 pt-7 pb-5 md:block">
            <div className="flex items-center gap-3">
              <SidebarBrandMark className="dither-page-brand-mark" />
              <span
                aria-hidden="true"
                className="h-px flex-1 bg-[var(--atc-line-strong)]"
              />
            </div>
            <h2
              className="mt-5 text-[26px] font-extrabold leading-[1.08] text-atc-text"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0" }}
            >
              {t("planeHunter.title")}
            </h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                translate="no"
                className="notranslate truncate text-[15px] font-black leading-none text-atc-text"
              >
                {labels.callsign}
              </span>
              {labels.type && (
                <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.06em] text-atc-faint">
                  {labels.type}
                </span>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-2.5 md:gap-4 md:px-6 md:pb-6 md:pt-0">
            <PlaneHunterControlPanel
              labels={labels}
              template={template}
              onSelectTemplate={setTemplate}
              enabledFields={enabledFields}
              onToggleField={toggleField}
              captured={captured}
              cameraDisabled={cameraDisabled}
              canShareFile={canShareFile}
              status={status}
              onCapture={capture}
              onClose={close}
              onRetake={retake}
              onCopy={copyImage}
              onSave={saveImage}
              t={t}
            />
          </div>
        </aside>

        <main className="dither-page-background plane-hunter-stage relative order-1 min-h-0 flex-1 overflow-hidden bg-black md:order-2">
          {cameraError ? (
            <PlaneHunterCameraFallback
              actionLabel={t("planeHunter.cameraRequestAction")}
              onAction={startCamera}
              title={t("planeHunter.cameraFallbackTitle")}
              message={cameraError}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center p-[clamp(6px,1.5vmin,18px)] [container-type:size]"
              style={{
                // Reserve room for the floating control card on mobile
                // (panel is `position: absolute; bottom: 12px` at
                // ≤720px). On desktop the panel is the sidebar and
                // this collapses to 0.
                paddingBottom: "var(--plane-hunter-stage-bottom-inset, clamp(6px,1.5vmin,18px))",
                ["--ph-r" as string]: String(photoAspect),
              }}
            >
              {/* Photo-box: a single coordinate space shared by the
                  live video, the live overlays, and the captured
                  preview. Its aspect ratio matches the camera stream
                  (default 16:9 before metadata loads), so what you
                  frame is what gets saved. The min(cqw, cqh*r) trick
                  fits the box inside the parent without depending on
                  the browser to solve aspect-ratio + max constraints
                  (which collapses to 0×0 in some engines).
                  `container-type: inline-size` enables `cqi` units
                  for overlays inside the box. */}
              <div
                className="plane-hunter-photo-box relative overflow-hidden bg-black [container-type:inline-size]"
                style={{
                  width: `min(100cqw, calc(100cqh * var(--ph-r)))`,
                  height: `min(100cqh, calc(100cqw / var(--ph-r)))`,
                  aspectRatio: String(photoAspect),
                }}
              >
                {!captured ? (
                  <>
                    <video
                      ref={videoRef}
                      onLoadedMetadata={handleVideoMetadata}
                      className="absolute inset-0 h-full w-full object-cover"
                      playsInline
                      muted
                      autoPlay
                    />
                    <PlaneHunterViewfinderGrid />
                    <PlaneHunterViewfinderChip
                      captured={false}
                      templateLabel={t(`planeHunter.templates.${template}`)}
                      liveLabel={t("planeHunter.live")}
                      capturedLabel={t("planeHunter.editorTitle")}
                    />
                    <PlaneHunterTemplateOverlay labels={labels} template={template} />
                  </>
                ) : (
                  <img
                    src={previewImage || capturedImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable="false"
                  />
                )}
                <div className="pointer-events-none absolute inset-0 border-[0.75cqi] border-[rgba(255,255,255,0.14)]" />
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </main>
      </div>
    </div>
  );
}
