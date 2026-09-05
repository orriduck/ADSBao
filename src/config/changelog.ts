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
export const CHANGELOG_TOTAL_COUNT = 79;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.19.2",
    kind: "feat",
    title: {
      en: "Map context refinement",
      zh: "地图上下文精修",
    },
    summary: {
      en: "Live digits now transition individually, loading uses a quiet dot matrix, and panels open more smoothly. Airport and flight identity cards carry subtle grayscale photo backgrounds; airports fall back to their country flag, and flights share the preview photo. Nearby airport and navaid labels retain the focused airport's compact instrument materials, with clearer ATC and spotting readouts.",
      zh: "实时数字现在按变化位数轻巧过渡，加载改用安静的点阵，面板展开也更顺滑。机场和航班信息卡提供若隐若现的灰度照片背景：机场无图时显示国旗，航班复用预览照片。附近机场和导航台标签延续焦点机场的紧凑仪表材质，ATC 和拍机点读数也更加清晰。",
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
