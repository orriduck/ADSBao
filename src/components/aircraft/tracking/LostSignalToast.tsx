import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  LOST_SIGNAL_TOAST_ID,
  LOST_SIGNAL_RESUME_GRACE_MS,
  buildLostSignalToastOptions,
  resolveLostSignalToastDelayMs,
} from "@/features/aircraft/tracking/lostSignalToastModel";

const LOST_SIGNAL_TOAST_DELAY_MS = 45_000;

function isPageHidden() {
  return (
    typeof document !== "undefined" &&
    (document.hidden || document.visibilityState === "hidden")
  );
}

export default function LostSignalToast({
  active = false,
  callsign = "",
  onStay,
  onBackHome,
  delayMs = LOST_SIGNAL_TOAST_DELAY_MS,
  resumeGraceMs = LOST_SIGNAL_RESUME_GRACE_MS,
}) {
  const { t } = useI18n();
  const [visibilityVersion, setVisibilityVersion] = useState(0);
  const wasHiddenRef = useRef(false);
  const resumeGraceUntilRef = useRef(0);

  useEffect(() => {
    const markHidden = () => {
      wasHiddenRef.current = true;
      toast.dismiss(LOST_SIGNAL_TOAST_ID);
      setVisibilityVersion((value) => value + 1);
    };
    const markVisible = () => {
      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        resumeGraceUntilRef.current =
          Date.now() + Math.max(0, Number(resumeGraceMs) || 0);
        toast.dismiss(LOST_SIGNAL_TOAST_ID);
      }
      setVisibilityVersion((value) => value + 1);
    };
    const handleVisibility = () => {
      if (isPageHidden()) markHidden();
      else markVisible();
    };
    const handlePageShow = () => {
      if (!isPageHidden()) {
        wasHiddenRef.current = false;
        resumeGraceUntilRef.current =
          Date.now() + Math.max(0, Number(resumeGraceMs) || 0);
        toast.dismiss(LOST_SIGNAL_TOAST_ID);
        setVisibilityVersion((value) => value + 1);
      }
    };

    if (isPageHidden()) wasHiddenRef.current = true;
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", markHidden);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", markHidden);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [resumeGraceMs]);

  useEffect(() => {
    const toastDelay = resolveLostSignalToastDelayMs({
      active,
      hidden: isPageHidden(),
      delayMs,
      nowMs: Date.now(),
      resumeGraceUntilMs: resumeGraceUntilRef.current,
    });

    if (toastDelay == null) {
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
      if (isPageHidden()) return;
      toast.warning(title, options);
    }, toastDelay);

    return () => window.clearTimeout(timer);
  }, [
    active,
    callsign,
    delayMs,
    onBackHome,
    onStay,
    t,
    visibilityVersion,
  ]);

  return null;
}
