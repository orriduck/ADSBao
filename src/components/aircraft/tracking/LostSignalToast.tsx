"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  LOST_SIGNAL_TOAST_ID,
  buildLostSignalToastOptions,
} from "@/features/aircraft/tracking/lostSignalToastModel";

const LOST_SIGNAL_TOAST_DELAY_MS = 45_000;

export default function LostSignalToast({
  active = false,
  callsign = "",
  onStay,
  onBackHome,
  delayMs = LOST_SIGNAL_TOAST_DELAY_MS,
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!active) {
      toast.dismiss(LOST_SIGNAL_TOAST_ID);
      return undefined;
    }

    const { title, ...options } = buildLostSignalToastOptions({
      callsign,
      t,
      onStay,
      onBackHome,
    });
    const timer = window.setTimeout(() => {
      toast.warning(title, options);
    }, Math.max(0, Number(delayMs) || 0));

    return () => window.clearTimeout(timer);
  }, [active, callsign, delayMs, onBackHome, onStay, t]);

  return null;
}
