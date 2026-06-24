type ChunkLike = {
  isEntry?: boolean;
  moduleIds?: string[];
};

export const ADSBAO_OFFLINE_NAVIGATION_PATHS = [
  "/",
  "/about",
  "/mechanism",
  "/changelog",
] as const;

export const ADSBAO_HOME_VIDEO_PATH =
  "/brand/adsbao-aircraft-brand-loop-20260619.mp4";

export const ADSBAO_HOME_VIDEO_POSTER_PATH =
  "/brand/adsbao-aircraft-brand-poster.jpg";

export const ADSBAO_PWA_PUBLIC_ASSET_PATHS = [
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  ADSBAO_HOME_VIDEO_PATH,
  ADSBAO_HOME_VIDEO_POSTER_PATH,
  "/brand/adsbao-logo.png",
] as const;

export const ADSBAO_NETWORK_ONLY_PATHS = [
  "/ws",
  "/runtime-env.js",
  "/adsbao-version.json",
] as const;

export const ADSBAO_NETWORK_ONLY_PREFIXES = [
  "/api/",
  "/debug",
  "/health",
] as const;

const STATIC_PAGE_MODULE_NEEDLES = [
  "/src/main.tsx",
  "/src/App.tsx",
  "/src/components/app-shell/DitherPageShell.tsx",
  "/src/components/screens/HomeScreen.tsx",
  "/src/components/about/AboutPanel.tsx",
  "/src/components/mechanism/MechanismPanel.tsx",
  "/src/components/changelog/ChangelogPanel.tsx",
] as const;

function cleanPath(value: unknown) {
  const raw = String(value || "").trim() || "/";
  try {
    return new URL(raw, "https://adsbao.local").pathname || "/";
  } catch {
    const path = raw.split("?")[0]?.split("#")[0] || "/";
    return path.startsWith("/") ? path : `/${path}`;
  }
}

export function isAdsbaoOfflineNavigationPath(value: unknown) {
  const path = cleanPath(value).replace(/\/+$/, "") || "/";
  return (ADSBAO_OFFLINE_NAVIGATION_PATHS as readonly string[]).includes(path);
}

export function isAdsbaoNetworkOnlyPath(value: unknown) {
  const path = cleanPath(value);
  return (
    (ADSBAO_NETWORK_ONLY_PATHS as readonly string[]).includes(path) ||
    ADSBAO_NETWORK_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

export function shouldPrecacheViteChunk(chunk: ChunkLike) {
  if (chunk.isEntry) return true;
  const moduleIds = Array.isArray(chunk.moduleIds) ? chunk.moduleIds : [];
  return moduleIds.some((id) =>
    STATIC_PAGE_MODULE_NEEDLES.some((needle) => id.endsWith(needle)),
  );
}
