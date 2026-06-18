import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { ADSBAO_SITE_VERSION } from "@/config/siteMeta";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  APP_UPDATE_TOAST_ID,
  resolveAppVersionUpdate,
  versionManifestUrl,
} from "@/features/app-shell/appVersionModel";

const APP_VERSION_CHECK_INTERVAL_MS = 5 * 60_000;

type AppVersionManifest = {
  version?: unknown;
};

async function fetchLatestAppVersion(signal?: AbortSignal) {
  const response = await fetch(versionManifestUrl(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
    signal,
  });
  if (!response.ok) return "";
  const manifest = (await response.json()) as AppVersionManifest;
  return manifest.version;
}

export default function AppUpdateToast({
  currentVersion = ADSBAO_SITE_VERSION,
  checkIntervalMs = APP_VERSION_CHECK_INTERVAL_MS,
}: {
  currentVersion?: string;
  checkIntervalMs?: number;
}) {
  const { t } = useI18n();
  const latestToastVersionRef = useRef("");

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();

    const checkForUpdate = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const latestVersion = await fetchLatestAppVersion(controller.signal);
        if (disposed) return;
        const update = resolveAppVersionUpdate({
          currentVersion,
          latestVersion,
        });
        if (!update) return;
        if (latestToastVersionRef.current === update.latestVersion) return;
        latestToastVersionRef.current = update.latestVersion;
        toast.info(t("appUpdate.title"), {
          id: APP_UPDATE_TOAST_ID,
          description: t("appUpdate.description", {
            currentVersion: update.currentVersion,
            latestVersion: update.latestVersion,
          }),
          action: {
            label: t("appUpdate.refresh"),
            onClick: () => window.location.reload(),
          },
          duration: Infinity,
        });
      } catch {
        // Version checks are advisory; network failures should not interrupt
        // live tracking or airport workflows.
      }
    };

    void checkForUpdate();
    const interval = window.setInterval(
      checkForUpdate,
      Math.max(60_000, Number(checkIntervalMs) || APP_VERSION_CHECK_INTERVAL_MS),
    );
    const checkWhenVisible = () => {
      if (typeof document === "undefined" || !document.hidden) {
        void checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("focus", checkWhenVisible);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("focus", checkWhenVisible);
    };
  }, [checkIntervalMs, currentVersion, t]);

  return null;
}
