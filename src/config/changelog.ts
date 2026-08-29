// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking") and one concise user-facing summary. Keep
// detailed implementation notes in the PR, not the product UI.
//
// ONE ENTRY PER MINOR. Don't add a new entry for every patch. Fold each patch
// into the current minor's single rolling entry (update its `summary` and bump
// its `version` to the new patch number, e.g. v2.30.16 -> v2.30.17). The
// `version` keeps a patch digit ON PURPOSE: it must match `package.json` so the
// The version-update indicator's semver compare still fires on every release. Start a fresh
// entry only when the minor digit changes (a real feature / milestone).

export type LocalizedText = string | { en: string; zh: string };

export type ChangelogEntry = {
  version: string;
  kind: "feat" | "patch" | "breaking";
  title: LocalizedText;
  summary?: LocalizedText;
  highlights: LocalizedText[];
};

export type ChangelogLocalizedReleaseCopy = {
  title?: string;
  summary?: string;
  highlights?: string[];
};

export type ChangelogHistoryPayload = {
  releases: ChangelogEntry[];
  localizedReleaseCopy: Record<string, ChangelogLocalizedReleaseCopy>;
};

// Resolve a possibly-bilingual changelog field to a single string for the
// active locale. Historical entries store plain strings and pass through
// unchanged; { en, zh } entries pick the language, falling back to English.
export function resolveChangelogText(
  value: LocalizedText | undefined,
  locale: string,
): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return locale === "zh-CN" ? value.zh : value.en;
}

export const CHANGELOG_INITIAL_LIMIT = 2;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 78;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.17.0",
    kind: "feat",
    title: {
      en: "Spatial map interaction",
      zh: "空间地图交互",
    },
    summary: {
      en: "Airport maps now combine a native MapLibre base with operational overlays, an optional Three.js altitude view, synchronized 2D and 3D cameras, and more tactile sidebar and mobile-card gestures across responsive layouts.",
      zh: "机场地图现在结合原生 MapLibre 底图与运行导视图层，提供可选的 Three.js 高度视图、同步的 2D 与 3D 相机，并在响应式布局中加入更具触感的侧边栏和移动卡片手势。",
    },
    highlights: [],
  },
  {
    version: "v3.16.15",
    kind: "feat",
    title: {
      en: "Tracking interface refinement",
      zh: "追踪界面精修",
    },
    summary: {
      en: "Airport pages now reveal progressively, preserve stable known coordinates without duplicate nearby subscriptions or a zero-coordinate detour, avoid parallel HTTP traffic requests while a healthy SSE startup is pending, and surface separately delivered nearby-airport context in flight tracking.",
      zh: "机场页现在会渐进呈现，稳定保留已知坐标并避免重复附近订阅或绕经零坐标；健康 SSE 启动等待期间也不再并行请求 HTTP 航空流量，航班追踪则能正确显示独立送达的附近机场信息。",
    },
    highlights: [],
  },
];

export const ADSBAO_LATEST_CHANGELOG_VERSION =
  CHANGELOG_RECENT[0]?.version || "v0.0.0";

export async function loadChangelogHistory(): Promise<ChangelogHistoryPayload> {
  const history = await import("./changelogHistory");
  return {
    releases: history.CHANGELOG_HISTORY,
    localizedReleaseCopy: history.CHANGELOG_HISTORY_ZH_COPY,
  };
}
