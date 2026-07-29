// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Keep entries terse — the long-form story
// belongs in the PR.
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
export const CHANGELOG_TOTAL_COUNT = 68;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.3.2",
    kind: "feat",
    title: {
      en: "Cleaner map settings and camera template control",
      zh: "更干净的地图设置与相机模板控制",
    },
    summary: {
      en: "Ambient colour has been removed from the map settings and rendering path. Plane Hunter now has a template-position button for portrait-locked phones held sideways, and airport navigation resolves from a coarse map mosaic into live detail.",
      zh: "地图设置和渲染链路移除了氛围配色。Plane Hunter 现在加入模板位置按钮,方便竖屏锁定但横拿手机时调整模板;进入机场时地图会从粗颗粒马赛克解算到实时细节。",
    },
    highlights: [
      {
        en: "Removed Ambient colour from saved map settings, the settings sheet, map wash layers, aircraft ambient tinting, and the sidebar/toolbar ambient surface treatment.",
        zh: "移除「氛围配色」的保存设置、设置面板入口、地图遮罩层、飞机氛围染色,以及侧栏/工具栏的氛围表面处理。",
      },
      {
        en: "Added a Plane Hunter template-position control that only moves the overlay template, so camera capture can adapt when a portrait-locked phone is physically rotated.",
        zh: "Plane Hunter 新增模板位置控制,只移动 overlay 模板本身,让竖屏锁定但实际横拿手机时也能调整取景模板。",
      },
      {
        en: "Slow traffic dots are no longer hidden at lower zooms; below 12x their opacity drops to 10% so airport and nearby-airport clusters read as secondary context.",
        zh: "慢速交通点在低 zoom 下不再被隐藏;12x 以下透明度降为 10%,让机场和邻近机场的密集点位成为次要背景信息。",
      },
      {
        en: "Airport map loading now resolves through an airport-centred aerograph scan, with a reduced-motion fallback.",
        zh: "机场地图加载改为通过以机场为中心的航图扫描显影到实时细节,并为减少动态效果偏好提供普通淡入。",
      },
    ],
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
