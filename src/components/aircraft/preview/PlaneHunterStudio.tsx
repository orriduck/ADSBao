"use client";

import { Camera, CameraOff, Copy, Download, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SidebarBrandMark from "@/components/sidebar/SidebarBrandMark";
import {
  Toolbar,
  ToolbarButton,
} from "@/components/ui/Toolbar";
import { MetricCard } from "@/components/ui/MetricCard";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const TEMPLATES = ["none", "previewCard", "lowerThird"] as const;
type PlaneHunterTemplate = (typeof TEMPLATES)[number];

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
  labels: ReturnType<typeof getAircraftLabels>,
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
  labels: ReturnType<typeof getAircraftLabels>;
  template: PlaneHunterTemplate;
}) {
  if (template === "none") return null;

  const metadata = labels.metadata.slice(0, 3).join(" · ");

  if (template === "previewCard") {
    return (
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-start md:inset-x-8 md:bottom-8">
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

  return (
    <div className="pointer-events-none absolute inset-x-[10px] bottom-[10px] flex h-[82px] items-stretch shadow-[0_-18px_42px_rgba(0,0,0,0.22)] md:h-[96px]">
      <div className="grid w-full grid-cols-[clamp(150px,24vw,380px)_minmax(0,1fr)] items-stretch overflow-hidden">
        <div className="flex min-w-0 items-center bg-[rgb(242,243,238)] px-4 text-[rgb(14,15,16)] md:px-7">
          <strong
            translate="no"
            className="notranslate truncate text-[24px] font-black leading-none tracking-normal md:text-[34px]"
          >
            {labels.callsign}
          </strong>
        </div>
        <div className="flex min-w-0 flex-col justify-center bg-[rgba(14,15,16,0.94)] px-4 text-[rgb(242,243,238)] md:px-7">
          <div className="truncate text-[15px] font-extrabold leading-tight md:text-[20px]">
            {labels.route}
          </div>
          <div className="mt-2 truncate text-[11px] font-black leading-none text-[rgba(242,243,238,0.66)] md:text-[14px]">
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

  return (
    <div
      className="fixed inset-0 z-[10000] bg-[color-mix(in_oklab,var(--atc-bg)_82%,black_18%)] text-atc-text"
      role="dialog"
      aria-modal="true"
      aria-label={t("planeHunter.title")}
    >
      <div className="dither-page-shell plane-hunter-shell flex h-dvh w-full flex-col text-atc-text md:flex-row">
        <aside className="dither-page-panel plane-hunter-panel sidebar-shell order-2 flex max-h-[48dvh] w-full flex-none flex-col border-t border-atc-line-strong bg-atc-bg md:order-1 md:w-[var(--app-sidebar-width)] md:border-r md:border-t-0">
          <div className="flex-none px-4 pb-2 pt-4 md:px-6 md:pb-5 md:pt-7">
            <div className="hidden items-center gap-3 md:flex">
              <SidebarBrandMark className="dither-page-brand-mark" />
              <span
                aria-hidden="true"
                className="h-px flex-1 bg-[var(--atc-line-strong)]"
              />
            </div>
            <h2
              className="text-[18px] font-extrabold leading-[1.08] text-atc-text md:mt-5 md:text-[28px]"
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
            <p className="hidden mt-1.5 text-[11px] font-semibold leading-relaxed text-atc-dim md:mt-2 md:block md:text-[12px]">
              {capturedImage
                ? `${labels.route} · ${labels.type}`
                : t("planeHunter.cameraHint")}
            </p>

            {capturedImage && (
              <div className="mt-4">
                <Toolbar layout="inline" aria-label={t("planeHunter.title")}>
                  <ToolbarButton
                    onClick={retake}
                    aria-label={t("planeHunter.retake")}
                    title={t("planeHunter.retake")}
                  >
                    <RotateCcw aria-hidden="true" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={copyImage}
                    aria-label={t("planeHunter.copy")}
                    title={t("planeHunter.copy")}
                  >
                    <Copy aria-hidden="true" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={saveImage}
                    aria-label={t("planeHunter.save")}
                    title={t("planeHunter.save")}
                  >
                    <Download aria-hidden="true" />
                  </ToolbarButton>
                </Toolbar>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 md:gap-4 md:px-6 md:pb-6">
            <div>
              <p className="hidden font-[var(--font-display)] text-[15px] font-extrabold leading-tight md:block md:text-[17px]">
                {capturedImage
                  ? t("planeHunter.editorTitle")
                  : t("planeHunter.cameraTitle")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
              {TEMPLATES.map((item) => (
                <MetricCard
                  key={item}
                  onClick={() => setTemplate(item)}
                  active={template === item}
                  label={t("planeHunter.templateLabel")}
                  value={t(`planeHunter.templates.${item}`)}
                  unit={t(`planeHunter.templateUnits.${item}`)}
                  valueSize="compact"
                  valueTranslate
                  className="min-h-[54px] gap-1 p-2 grid-rows-[9px_20px_9px] [&>span]:text-[8px] [&>strong]:h-5 [&>strong]:text-[17px] [&>small]:h-2.5 [&>small]:text-[8px] md:min-h-[72px] md:gap-1.5 md:p-3 md:grid-rows-[11px_26px_10px] md:[&>span]:text-[10px] md:[&>strong]:h-8.5 md:[&>strong]:text-[22px] md:[&>small]:h-3 md:[&>small]:text-[10px] [.airport-map-kit_&]:min-h-[72px] [.airport-map-kit_&]:p-3"
                />
              ))}
            </div>

            {status && (
              <p className="rounded-[var(--atc-radius-card)] bg-atc-bg px-3 py-2 text-[11px] font-semibold text-atc-dim">
                {status}
              </p>
            )}

            {!capturedImage ? (
              <div className="mt-auto grid gap-2">
                <button
                  type="button"
                  onClick={capture}
                  disabled={Boolean(cameraError)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-4 text-[13px] font-extrabold text-[var(--primary-ink)] shadow-[var(--atc-action-primary-shadow)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Camera aria-hidden="true" className="size-5" />
                  {t("planeHunter.capture")}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-[var(--atc-radius-card)] border border-[var(--sidebar-tile-rest-border)] bg-[var(--atc-control-surface)] px-4 text-[13px] font-extrabold text-atc-text shadow-[var(--atc-control-inset-shadow)] transition hover:bg-[var(--atc-control-hover-bg)] active:scale-[0.98]"
                >
                  {t("planeHunter.back")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={saveImage}
                className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-4 text-[13px] font-extrabold text-[var(--primary-ink)] shadow-[var(--atc-action-primary-shadow)] transition active:scale-[0.98]"
              >
                <Download aria-hidden="true" className="size-5" />
                {t("planeHunter.save")}
              </button>
            )}
          </div>
        </aside>

        <main className="dither-page-background plane-hunter-stage relative order-1 min-h-0 flex-1 overflow-hidden bg-black md:order-2">
          {!capturedImage ? (
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
