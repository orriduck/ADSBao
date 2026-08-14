import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ADSBAO_SITE_VERSION } from "@/config/siteMeta";
import {
  resolveAppVersionUpdate,
  versionManifestUrl,
  type AppVersionUpdate,
} from "@/features/app-shell/appVersionModel";

const APP_VERSION_CHECK_INTERVAL_MS = 5 * 60_000;

type AppVersionManifest = {
  version?: unknown;
};

type AppVersionUpdateContextValue = {
  update: AppVersionUpdate | null;
};

const AppVersionUpdateContext = createContext<AppVersionUpdateContextValue>({
  update: null,
});

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

export function useAppVersionUpdate() {
  return useContext(AppVersionUpdateContext);
}

export default function AppVersionUpdateProvider({
  children,
  currentVersion = ADSBAO_SITE_VERSION,
  checkIntervalMs = APP_VERSION_CHECK_INTERVAL_MS,
}: {
  children: ReactNode;
  currentVersion?: string;
  checkIntervalMs?: number;
}) {
  const [update, setUpdate] = useState<AppVersionUpdate | null>(null);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();

    const checkForUpdate = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const latestVersion = await fetchLatestAppVersion(controller.signal);
        if (disposed) return;
        setUpdate(resolveAppVersionUpdate({ currentVersion, latestVersion }));
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
  }, [checkIntervalMs, currentVersion]);

  const value = useMemo(() => ({ update }), [update]);

  return (
    <AppVersionUpdateContext.Provider value={value}>
      {children}
    </AppVersionUpdateContext.Provider>
  );
}
