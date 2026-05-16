"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useSelectedAircraftTrace } from "./SelectedAircraftTraceContext.jsx";

const TOAST_ID = "selected-aircraft-trace-loading";
const SHOW_DELAY_MS = 400;
const TOAST_MESSAGE = "Working on getting the recent trace…";

// Shows a sonner toast when the recent-trace fetch for the focused aircraft
// is still pending past SHOW_DELAY_MS. Dismisses the toast as soon as the
// fetch resolves (or the user switches selection / deselects), so a fast
// response stays silent.
export default function TraceLoadingToast() {
  const { aircraftHex, loading } = useSelectedAircraftTrace();

  useEffect(() => {
    if (!aircraftHex || !loading) {
      toast.dismiss(TOAST_ID);
      return undefined;
    }

    const timer = setTimeout(() => {
      toast.loading(TOAST_MESSAGE, { id: TOAST_ID });
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      toast.dismiss(TOAST_ID);
    };
  }, [aircraftHex, loading]);

  return null;
}
