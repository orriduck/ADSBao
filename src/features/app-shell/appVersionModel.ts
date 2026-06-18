export const APP_VERSION_MANIFEST_PATH = "/adsbao-version.json";
export const APP_UPDATE_TOAST_ID = "app-update-available";

export type AppVersionUpdate = {
  currentVersion: string;
  latestVersion: string;
};

export function normalizeAppVersion(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^v/i, "") : "";
}

export function resolveAppVersionUpdate({
  currentVersion,
  latestVersion,
}: {
  currentVersion: unknown;
  latestVersion: unknown;
}): AppVersionUpdate | null {
  const current = normalizeAppVersion(currentVersion);
  const latest = normalizeAppVersion(latestVersion);
  if (!current || !latest || current === latest) return null;
  return {
    currentVersion: current,
    latestVersion: latest,
  };
}

export function versionManifestUrl(nowMs = Date.now()) {
  return `${APP_VERSION_MANIFEST_PATH}?t=${Math.max(0, Math.floor(nowMs))}`;
}
