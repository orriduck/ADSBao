"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  LOST_SIGNAL_TOAST_ID,
  buildLostSignalToastOptions,
} from "@/features/aircraft/tracking/lostSignalToastModel";

export default function LostSignalToast({
  active = false,
  callsign = "",
  onStay,
  onBackHome,
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
    toast.warning(title, options);

    return undefined;
  }, [active, callsign, onBackHome, onStay, t]);

  return null;
}
