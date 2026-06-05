"use client";

import { Camera, Copy, Download, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { cn } from "@/lib/utils";

const TEMPLATES = ["none", "hunter", "spotter"] as const;
type PlaneHunterTemplate = (typeof TEMPLATES)[number];

function normalizeLabel(value: unknown, fallback = "") {
  const label = String(value || "").trim();
  return label || fallback;
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

  return {
    callsign,
    route: route || "ROUTE PENDING",
    type: type.toUpperCase(),
    registration,
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
  const pad = Math.round(34 * scale);
  const titleSize = Math.round(40 * scale);
  const bodySize = Math.round(22 * scale);
  const smallSize = Math.round(16 * scale);

  context.save();
  context.textBaseline = "alphabetic";

  if (template === "hunter") {
    const panelHeight = Math.round(168 * scale);
    const panelY = height - panelHeight - pad;

    context.fillStyle = "rgba(8, 14, 22, 0.78)";
    roundedRect(context, pad, panelY, width - pad * 2, panelHeight, 30 * scale);
    context.fill();

    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    context.fillRect(pad + 26 * scale, panelY + 38 * scale, width - pad * 2 - 52 * scale, 1.4 * scale);

    context.fillStyle = "#f8fbff";
    context.font = `800 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.callsign, pad + 26 * scale, panelY + 78 * scale);

    context.textAlign = "right";
    context.font = `700 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.route, width - pad - 26 * scale, panelY + 78 * scale);

    context.textAlign = "left";
    context.fillStyle = "rgba(248, 251, 255, 0.76)";
    context.font = `650 ${bodySize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.type, pad + 26 * scale, panelY + 122 * scale);

    context.textAlign = "right";
    context.fillStyle = "#ffcf66";
    context.font = `800 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText("ADSBao Plane Hunter", width - pad - 26 * scale, panelY + 122 * scale);
  }

  if (template === "spotter") {
    context.strokeStyle = "rgba(255, 207, 102, 0.9)";
    context.lineWidth = Math.max(2, 3 * scale);
    const centerX = width - pad - 82 * scale;
    const centerY = pad + 82 * scale;
    context.beginPath();
    context.arc(centerX, centerY, 46 * scale, 0, Math.PI * 2);
    context.moveTo(centerX - 72 * scale, centerY);
    context.lineTo(centerX - 22 * scale, centerY);
    context.moveTo(centerX + 22 * scale, centerY);
    context.lineTo(centerX + 72 * scale, centerY);
    context.moveTo(centerX, centerY - 72 * scale);
    context.lineTo(centerX, centerY - 22 * scale);
    context.moveTo(centerX, centerY + 22 * scale);
    context.lineTo(centerX, centerY + 72 * scale);
    context.stroke();

    context.fillStyle = "rgba(8, 14, 22, 0.64)";
    roundedRect(context, pad, pad, Math.min(width - pad * 2, 470 * scale), 132 * scale, 24 * scale);
    context.fill();

    context.fillStyle = "#f8fbff";
    context.font = `800 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.callsign, pad + 22 * scale, pad + 58 * scale);

    context.fillStyle = "rgba(248, 251, 255, 0.72)";
    context.font = `650 ${smallSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
    context.fillText(labels.registration || labels.route, pad + 22 * scale, pad + 94 * scale);
    context.fillText(labels.capturedAt, pad + 22 * scale, pad + 118 * scale);
  }

  context.restore();
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
  const [template, setTemplate] = useState<PlaneHunterTemplate>("hunter");
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
      className="fixed inset-0 z-[10000] flex items-stretch justify-center bg-[color-mix(in_oklab,var(--atc-bg)_82%,black_18%)] text-atc-text"
      role="dialog"
      aria-modal="true"
      aria-label={t("planeHunter.title")}
    >
      <div className="flex h-dvh w-full flex-col bg-atc-bg md:max-w-[960px] md:border-x md:border-atc-line-strong">
        <header className="flex min-h-[58px] items-center justify-between gap-3 border-b border-atc-line px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold leading-none text-atc-dim">
              {t("planeHunter.kicker")}
            </p>
            <h2
              translate="no"
              className="notranslate mt-1 truncate font-[var(--font-display)] text-[20px] font-extrabold leading-none tracking-normal"
            >
              {labels.callsign}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-10 flex-none place-items-center rounded-full border border-atc-line bg-atc-card text-atc-text transition hover:bg-atc-card-strong focus-visible:outline-2 focus-visible:outline-[var(--atc-action-focus-ring)]"
            aria-label={t("planeHunter.cancel")}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-1">
          <section className="relative min-h-0 overflow-hidden bg-black">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <div className="pointer-events-none absolute inset-0 border-[10px] border-[rgba(255,255,255,0.08)]" />
                {cameraError && (
                  <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-[var(--atc-radius-panel)] border border-atc-line-strong bg-atc-card p-4 text-center shadow-[var(--app-floating-shadow)]">
                    <p className="text-[14px] font-bold">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-4 min-h-10 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-4 text-[12px] font-extrabold text-[var(--primary-ink)]"
                    >
                      {t("planeHunter.tryAgain")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt=""
                className="h-full w-full object-contain"
                draggable="false"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </section>

          <aside className="flex min-h-[232px] flex-col border-t border-atc-line bg-atc-card px-4 py-4 md:min-h-0 md:border-l md:border-t-0">
            {!capturedImage ? (
              <div className="flex h-full flex-col justify-between gap-4">
                <div>
                  <p className="font-[var(--font-display)] text-[18px] font-extrabold leading-tight">
                    {t("planeHunter.cameraTitle")}
                  </p>
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-atc-dim">
                    {t("planeHunter.cameraHint")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={capture}
                  disabled={Boolean(cameraError)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-4 text-[13px] font-extrabold text-[var(--primary-ink)] shadow-[var(--atc-action-primary-shadow)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Camera aria-hidden="true" className="size-5" />
                  {t("planeHunter.capture")}
                </button>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col gap-4">
                <div>
                  <p className="font-[var(--font-display)] text-[18px] font-extrabold leading-tight">
                    {t("planeHunter.editorTitle")}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-atc-dim">
                    {labels.route} · {labels.type}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
                  {TEMPLATES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTemplate(item)}
                      data-active={template === item}
                      className={cn(
                        "min-h-[46px] rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-bg px-3 text-left text-[12px] font-bold leading-tight text-atc-text",
                        "transition hover:bg-atc-card-strong data-[active=true]:border-[var(--primary-bright)] data-[active=true]:bg-[color-mix(in_oklab,var(--primary-bright)_17%,var(--atc-bg))]",
                      )}
                    >
                      {t(`planeHunter.templates.${item}`)}
                    </button>
                  ))}
                </div>

                {status && (
                  <p className="rounded-[var(--atc-radius-card)] bg-atc-bg px-3 py-2 text-[11px] font-semibold text-atc-dim">
                    {status}
                  </p>
                )}

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={retake}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-bg px-3 text-[12px] font-bold"
                  >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    {t("planeHunter.retake")}
                  </button>
                  <button
                    type="button"
                    onClick={copyImage}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-bg px-3 text-[12px] font-bold"
                  >
                    <Copy aria-hidden="true" className="size-4" />
                    {t("planeHunter.copy")}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="min-h-10 rounded-[var(--atc-radius-card)] border border-atc-line bg-atc-bg px-3 text-[12px] font-bold"
                  >
                    {t("planeHunter.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={saveImage}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-[var(--atc-radius-card)] bg-[var(--primary-bright)] px-3 text-[12px] font-extrabold text-[var(--primary-ink)]"
                  >
                    <Download aria-hidden="true" className="size-4" />
                    {t("planeHunter.save")}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
