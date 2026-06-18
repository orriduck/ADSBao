export const APP_VERSION_MANIFEST_PATH = "/adsbao-version.json";
export const APP_UPDATE_TOAST_ID = "app-update-available";

export type AppVersionUpdate = {
  currentVersion: string;
  latestVersion: string;
};

export function normalizeAppVersion(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^v/i, "") : "";
}

function cmpSemver(a: string, b: string): number {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (isNaN(av) || isNaN(bv)) return 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
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
  if (!current || !latest) return null;
  if (cmpSemver(latest, current) <= 0) return null;
  return {
    currentVersion: current,
    latestVersion: latest,
  };
}

export function versionManifestUrl(nowMs = Date.now()) {
  return `${APP_VERSION_MANIFEST_PATH}?t=${Math.max(0, Math.floor(nowMs))}`;
}
