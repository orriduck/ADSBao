export const LOST_SIGNAL_TOAST_ID = "tracked-flight-lost-signal";
export const LOST_SIGNAL_RESUME_GRACE_MS = 90_000;

type LostSignalTranslator = (
  key: string,
  params?: {
    callsign?: string;
  },
) => string;

type LostSignalToastOptions = {
  callsign?: string;
  t?: LostSignalTranslator;
  onStay?: () => void;
  onBackHome?: () => void;
};

export function buildLostSignalToastOptions({
  callsign = "",
  t,
  onStay,
  onBackHome,
}: LostSignalToastOptions = {}) {
  const translate = typeof t === "function" ? t : (key) => key;
  const label = String(callsign || "this flight").trim().toUpperCase();

  return {
    id: LOST_SIGNAL_TOAST_ID,
    title: translate("lostSignal.title", { callsign: label }),
    description: translate("lostSignal.description"),
    duration: Infinity,
    closeButton: false,
    cancel: {
      label: translate("lostSignal.acknowledge"),
      onClick: () => {
        onStay?.();
      },
    },
    action: {
      label: translate("lostSignal.home"),
      onClick: () => {
        onBackHome?.();
      },
    },
  };
}

export function resolveLostSignalToastDelayMs({
  active = false,
  hidden = false,
  delayMs = 45_000,
  nowMs = Date.now(),
  resumeGraceUntilMs = 0,
} = {}) {
  if (!active || hidden) return null;

  const normalizedDelay = Math.max(0, Number(delayMs) || 0);
  const normalizedNow = Number(nowMs);
  const normalizedGraceUntil = Number(resumeGraceUntilMs);
  const graceRemaining =
    Number.isFinite(normalizedNow) && Number.isFinite(normalizedGraceUntil)
      ? Math.max(0, normalizedGraceUntil - normalizedNow)
      : 0;

  return Math.max(normalizedDelay, graceRemaining);
}
