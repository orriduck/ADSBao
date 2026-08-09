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
// AppUpdateToast's semver compare still fires on every release. Start a fresh
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

export const CHANGELOG_INITIAL_LIMIT = 1;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 73;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.10.4",
    kind: "feat",
    title: {
      en: "80 NM airport exploration, smooth flight tracking, and clearer saved settings",
      zh: "80 海里机场探索、平滑航班追踪与更清晰的设置保存提示",
    },
    summary: {
      en: "Airport maps retain aircraft and nearby airports within an 80 NM airport-centred area, where you can pan within the boundary and recenter from Map range. Flight tracking locks its live map view, keeps the watched aircraft's full current-leg trail visible, and moves its marker and centre together on the inferred-position animation frame. Completed map-setting saves appear as full, unobstructed notices.",
      zh: "机场地图会保留以机场为中心、80 海里范围内的飞机与附近机场；你可以在该范围内移动视野，并从地图范围菜单回到机场中心。航班追踪页锁定实时地图视图，始终保留被追踪飞机当前航段的完整轨迹，并让飞机标记和地图中心在同一推断位置动画帧上连续移动。地图设置保存完成后则以完整、不被遮挡的提示显示。",
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
