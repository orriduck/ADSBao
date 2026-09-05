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
    version: "v3.18.4",
    kind: "feat",
    title: {
      en: "Neutral instrument surfaces",
      zh: "中性材质仪表界面",
    },
    summary: {
      en: "Rounded neutral surfaces, shallow shadows and larger readouts unify the app in both themes. Local time compares airport and browser clocks, dates and the current time difference. Loading placeholders match the live layout; settings, photo-location dialogs and loading/error notices share consistent surfaces, centered icons and clearer interaction feedback. Photo controls and camera headers now follow the same rounded treatment.",
      zh: "全应用采用中性圆角表面、浅层阴影和舒展读数，保留明暗两套模式。当地时间可对照机场与浏览器的时间、日期和当前时差。加载骨架与实际布局对齐，设置、拍机点弹窗及加载和失败提示统一材质、图标居中与交互反馈，并统一照片入口和拍摄界面顶栏的圆角样式。",
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
