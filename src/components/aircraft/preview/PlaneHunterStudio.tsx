"use client";

import {
  Camera,
  CameraOff,
  Copy,
  Download,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SidebarBrandMark from "@/components/sidebar/SidebarBrandMark";
import { MetricCard } from "@/components/ui/MetricCard";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const TEMPLATES = ["none", "previewCard", "lowerThird"] as const;
type PlaneHunterTemplate = (typeof TEMPLATES)[number];
type PlaneHunterTranslator = ReturnType<typeof useI18n>["t"];
type AircraftLabels = ReturnType<typeof getAircraftLabels>;

// Picker cell sizing — keep one source of truth so the picker stays
// compact on the mobile card but breathes on the desktop sidebar.
const PICKER_CARD_CLASS = cn(
  "min-h-[54px] gap-1 p-2 grid-rows-[9px_20px_9px]",
  "[&>span]:text-[8px] [&>strong]:h-5 [&>strong]:text-[17px] [&>small]:h-2.5 [&>small]:text-[8px]",
  "md:min-h-[68px] md:gap-1.5 md:p-2.5 md:grid-rows-[11px_24px_10px]",
  "md:[&>span]:text-[10px] md:[&>strong]:h-7 md:[&>strong]:text-[20px] md:[&>small]:h-3 md:[&>small]:text-[10px]",
);

function normalizeLabel(value: unknown, fallback = "") {
  const label = String(value || "").trim();
  return label || fallback;
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getAircraftLabels(aircraft: Record<string, any> | null | undefined) {
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
  const metadata = [
    type.toUpperCase(),
    registration,
    speed === null ? "" : `${Math.round(speed)} KT`,
    altitude === null ? "" : `${Math.round(altitude).toLocaleString()} FT`,
    verticalRate === null ? "" : `${Math.round(verticalRate)} FPM`,
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

function drawTemplate(
  context: CanvasRenderingContext2D,
  template: PlaneHunterTemplate,
  labels: AircraftLabels,
  width: number,
  height: number,
) {
  const scale = Math.max(1, Math.min(width, height) / 900);
  const pad = Math.round(30 * scale);
  const titleSize = Math.round(36 * scale);
  const bodySize = Math.round(20 * scale);
  const smallSize = Math.round(15 * scale);
  const routeLabel = labels.route;
  const metaLabel = labels.metadata.slice(0, 3).join(" · ");

  context.save();
  context.textBaseline = "alphabetic";

  if (template === "previewCard") {
    const panelWidth = Math.min(width - pad * 2, Math.round(560 * scale));
    const panelHeight = Math.round(150 * scale);
    const panelY = height - panelHeight - pad;

    context.fillStyle = "rgba(242, 243, 238, 0.92)";
    roundedRect(context, pad, panelY, panelWidth, panelHeight, 24 * scale);
    context.fill();

    context.strokeStyle = "rgba(14, 15, 16, 0.16)";
    context.lineWidth = Math.max(1, 1.2 * scale);
    roundedRect(context, pad, panelY, panelWidth, panelHeight, 24 * scale);
    context.stroke();

    context.fillStyle = "rgba(14, 15, 16, 0.92)";
    context.font = `800 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.callsign, pad + 24 * scale, panelY + 56 * scale);

    context.textAlign = "right";
    context.font = `760 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.type, pad + panelWidth - 24 * scale, panelY + 56 * scale);

    context.textAlign = "left";
    context.fillStyle = "rgba(14, 15, 16, 0.56)";
    context.fillRect(pad + 24 * scale, panelY + 76 * scale, panelWidth - 48 * scale, Math.max(1, 1.2 * scale));

    context.fillStyle = "rgba(14, 15, 16, 0.78)";
    context.font = `720 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(routeLabel, pad + 24 * scale, panelY + 106 * scale);

    context.fillStyle = "rgba(14, 15, 16, 0.54)";
    context.font = `800 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(metaLabel || labels.capturedAt, pad + 24 * scale, panelY + 130 * scale);
  }

  if (template === "lowerThird") {
    const frameInset = Math.max(1, Math.round(10 * scale));
    const barHeight = Math.round(96 * scale);
    const barY = height - barHeight - frameInset;
    const barWidth = width - frameInset * 2;
    const callsignWidth = Math.min(
      Math.round(380 * scale),
      Math.max(Math.round(190 * scale), barWidth * 0.24),
    );

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
    context.font = `850 ${Math.round(34 * scale)}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.callsign, frameInset + 28 * scale, barY + 58 * scale);

    context.fillStyle = "rgba(242, 243, 238, 0.96)";
    context.font = `780 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      routeLabel,
      frameInset + callsignWidth + 28 * scale,
      barY + 39 * scale,
    );

    context.fillStyle = "rgba(242, 243, 238, 0.66)";
    context.font = `760 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(
      metaLabel || labels.capturedAt,
      frameInset + callsignWidth + 28 * scale,
      barY + 68 * scale,
    );
  }

  context.restore();
}

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
      <div className="pointer-events-none absolute inset-x-[10px] bottom-[10px] flex justify-start md:inset-x-8 md:bottom-8">
        <div className="w-[min(78vw,520px)] rounded-[22px] border border-[rgba(14,15,16,0.16)] bg-[rgba(242,243,238,0.92)] px-5 py-4 text-[rgb(14,15,16)] shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
          <div className="flex items-baseline justify-between gap-4 border-b border-[rgba(14,15,16,0.18)] pb-2">
            <strong
              translate="no"
              className="notranslate truncate text-[24px] font-black leading-none tracking-normal"
            >
              {labels.callsign}
            </strong>
            <span className="truncate text-right text-[14px] font-extrabold leading-none">
              {labels.type}
            </span>
          </div>
          <div className="mt-3 truncate text-[15px] font-extrabold leading-none">
            {labels.route}
          </div>
          <div className="mt-2 truncate text-[11px] font-black leading-none text-[rgba(14,15,16,0.56)]">
            {metadata || labels.capturedAt}
          </div>
        </div>
      </div>
    );
  }

  // News bar: pinned 10px inside the camera frame on all sides, no
  // rounding, callsign block on the left, route + metadata on the right.
  return (
    <div className="pointer-events-none absolute inset-x-[10px] bottom-[10px] flex h-[68px] items-stretch shadow-[0_-18px_42px_rgba(0,0,0,0.22)] md:h-[96px]">
      <div className="grid w-full grid-cols-[clamp(120px,32vw,340px)_minmax(0,1fr)] items-stretch overflow-hidden">
        <div className="flex min-w-0 items-center bg-[rgb(242,243,238)] px-3 text-[rgb(14,15,16)] md:px-7">
          <strong
            translate="no"
            className="notranslate truncate text-[20px] font-black leading-none tracking-normal md:text-[34px]"
          >
            {labels.callsign}
          </strong>
        </div>
        <div className="flex min-w-0 flex-col justify-center bg-[rgba(14,15,16,0.94)] px-3 text-[rgb(242,243,238)] md:px-7">
          <div className="truncate text-[13px] font-extrabold leading-tight md:text-[20px]">
            {labels.route}
          </div>
          <div className="mt-1 truncate text-[10px] font-black leading-none text-[rgba(242,243,238,0.66)] md:mt-2 md:text-[14px]">
            {metadata || labels.capturedAt}
          </div>
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
  return (
    <div className="absolute inset-0 flex items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_28%,rgba(242,243,238,0.16),transparent_32%),linear-gradient(135deg,rgba(242,243,238,0.08)_0_1px,transparent_1px_22px),rgb(10,11,12)] px-5 pt-8 text-[rgb(242,243,238)]">
      <div className="max-w-[360px] rounded-[var(--atc-radius-panel)] border border-[rgba(242,243,238,0.18)] bg-[rgba(10,11,12,0.72)] px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <CameraOff aria-hidden="true" className="size-4 text-[var(--primary-bright)]" />
          <p className="text-[13px] font-extrabold leading-none">{title}</p>
        </div>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[rgba(242,243,238,0.68)]">
          {message}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex text-[11px] font-extrabold leading-none text-[var(--primary-bright)] underline decoration-[color-mix(in_oklab,var(--primary-bright)_62%,transparent)] decoration-1 underline-offset-4 transition hover:text-[rgb(242,243,238)]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// Compact header: callsign on the left, "Plane Hunter" on the right.
// Mobile renders this inside the bottom card; desktop replaces it with
// the larger brand + title block.
function PlaneHunterMobileHeader({
  callsign,
  title,
}: {
  callsign: string;
  title: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 md:hidden">
      <span
        translate="no"
        className="notranslate truncate text-[15px] font-black leading-none tracking-normal text-atc-text"
      >
        {callsign}
      </span>
      <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.08em] text-atc-dim">
        {title}
      </span>
    </div>
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
      {TEMPLATES.map((item) => (
        <MetricCard
          key={item}
          onClick={() => onSelect(item)}
          active={template === item}
          label={t("planeHunter.templateLabel")}
          value={t(`planeHunter.templates.${item}`)}
          unit={t(`planeHunter.templateUnits.${item}`)}
          valueSize="compact"
          valueTranslate
          className={PICKER_CARD_CLASS}
        />
      ))}
    </div>
  );
}

function PlaneHunterActionStack({
  captured,
  cameraDisabled,
  onCapture,
  onClose,
  onRetake,
  onCopy,
  onSave,
  t,
}: {
  captured: boolean;
  cameraDisabled: boolean;
  onCapture: () => void;
  onClose: () => void;
  onRetake: () => void;
  onCopy: () => void;
  onSave: () => void;
  t: PlaneHunterTranslator;
}) {
  const primaryClass = cn(
    "flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] px-3 text-[12px] font-extrabold leading-none",
    "bg-[var(--primary-bright)] text-[var(--primary-ink)] shadow-[var(--atc-action-primary-shadow)]",
    "transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
    "md:min-h-12 md:text-[13px]",
  );
  const secondaryClass = cn(
    "flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--atc-radius-card)] px-3 text-[12px] font-extrabold leading-none",
    "border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] text-atc-text",
    "shadow-[var(--atc-control-inset-shadow)] transition hover:bg-[var(--atc-control-hover-bg)] active:scale-[0.98]",
    "md:min-h-12 md:text-[13px]",
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
          aria-label={t("planeHunter.save")}
        >
          <Download aria-hidden="true" className="size-4" />
          {t("planeHunter.save")}
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
  captured,
  cameraDisabled,
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
  captured: boolean;
  cameraDisabled: boolean;
  status: string;
  onCapture: () => void;
  onClose: () => void;
  onRetake: () => void;
  onCopy: () => void;
  onSave: () => void;
  t: PlaneHunterTranslator;
}) {
  return (
    <div className="flex flex-col gap-2.5 md:gap-3">
      <PlaneHunterMobileHeader
        callsign={labels.callsign}
        title={t("planeHunter.title")}
      />
      <PlaneHunterTemplatePicker
        template={template}
        onSelect={onSelectTemplate}
        t={t}
      />
      {status && (
        <p className="rounded-[var(--atc-radius-card)] bg-atc-bg/60 px-3 py-2 text-[11px] font-semibold text-atc-dim">
          {status}
        </p>
      )}
      <PlaneHunterActionStack
        captured={captured}
        cameraDisabled={cameraDisabled}
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
  const labels = useMemo(() => getAircraftLabels(aircraft), [aircraft]);

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
      }
    } catch {
      setCameraError(t("planeHunter.cameraDenied"));
    }
  }, [t]);

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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `adsbao-plane-hunter-${labels.callsign.toLowerCase()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(t("planeHunter.saved"));
    } catch {
      setStatus(t("planeHunter.saveFailed"));
    }
  }, [labels.callsign, renderFinalCanvas, t]);

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
          {/* Desktop brand + title block — hidden on mobile (the mobile
              card surfaces callsign + title inline via the picker
              header to keep the surface compact). */}
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
            <p
              translate="no"
              className="notranslate mt-2 truncate text-[15px] font-black leading-none text-atc-text"
            >
              {labels.callsign}
            </p>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-atc-dim">
              {captured
                ? `${labels.route} · ${labels.type}`
                : t("planeHunter.cameraHint")}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3 md:gap-4 md:px-6 md:pb-6 md:pt-0">
            <PlaneHunterControlPanel
              labels={labels}
              template={template}
              onSelectTemplate={setTemplate}
              captured={captured}
              cameraDisabled={cameraDisabled}
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
          {!captured ? (
            <>
              <video
                ref={videoRef}
                className={cn(
                  "h-full w-full object-cover",
                  cameraError ? "opacity-0" : "opacity-100",
                )}
                playsInline
                muted
                autoPlay
              />
              {cameraError && (
                <PlaneHunterCameraFallback
                  actionLabel={t("planeHunter.cameraRequestAction")}
                  onAction={startCamera}
                  title={t("planeHunter.cameraFallbackTitle")}
                  message={cameraError}
                />
              )}
              <div className="pointer-events-none absolute inset-0 border-[10px] border-[rgba(255,255,255,0.08)]" />
              <PlaneHunterTemplateOverlay labels={labels} template={template} />
            </>
          ) : (
            <img
              src={previewImage || capturedImage}
              alt=""
              className="h-full w-full object-contain"
              draggable="false"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </main>
      </div>
    </div>
  );
}
