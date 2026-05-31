export const LOST_SIGNAL_TOAST_ID = "tracked-flight-lost-signal";

export function buildLostSignalToastOptions({
  callsign = "",
  t,
  onStay,
  onBackHome,
} = {}) {
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
