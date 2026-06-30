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
export const CHANGELOG_TOTAL_COUNT = 66;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.42.4",
    kind: "feat",
    title: {
      en: "A zoom slider for the map, and clearer building footprints",
      zh: "地图缩放滑条 + 更清晰的建筑轮廓",
    },
    summary: {
      en: "The map's Far / Medium / Near zoom menu became a single compact viewfinder button that frames the current level (e.g. 13) and opens a slider — drag from 10x to 15x, snapping at each whole step, while the map stays centred on the airport instead of jumping between three fixed levels. The button stays the same compact size as the rest of the toolbar. On the flight-tracking page the full-trace and all-points view toggles fold into that same submenu so the toolbar stays short. Separately, building footprints on the standard map now read with more contrast, so the surrounding city stays legible at neighbourhood zoom.",
      zh: "地图的 远 / 中 / 近 三档缩放菜单,变成一个把当前倍数(如 13)框在取景框里的紧凑按钮,点开是一根滑条——从 10x 拖到 15x、每一级吸附,缩放时地图始终以机场为中心,不再在三个固定档位间跳。按钮与工具栏其他按钮一样紧凑等宽。飞机追踪页的「完整航迹 / 所有记录点」也收进同一个子菜单,工具栏更短。另外,标准地图的建筑轮廓提高了对比度,放大到街区级时周边城市更清晰。",
    },
    highlights: [
      {
        en: "Zoom is a slider now (10x–15x, snaps each step) on a compact viewfinder button that frames the current level — replacing the three fixed Far / Medium / Near presets.",
        zh: "缩放改成滑条(10x–15x、逐级吸附),紧凑的取景框按钮里显示当前倍数——取代原来的 远 / 中 / 近 三档。",
      },
      {
        en: "Zooming keeps the airport centred; the map no longer jumps between fixed levels.",
        zh: "缩放时机场始终居中,不再在固定档位间跳变。",
      },
      {
        en: "Flight page: the full-trace / all-points toggles fold into the same zoom submenu, shortening the toolbar.",
        zh: "飞机页:完整航迹 / 所有记录点 收进同一个缩放子菜单,工具栏更短。",
      },
      {
        en: "Standard-map building footprints get more contrast for legibility at neighbourhood zoom.",
        zh: "标准地图建筑轮廓提高对比度,街区级缩放更清晰。",
      },
      {
        en: "Selecting an aircraft on any tracking page now fetches its route first, so the focused flight's origin/destination fills in ahead of the surrounding traffic.",
        zh: "在任意追踪页选中一架飞机,现在会优先拉取它的航线,聚焦航班的出发/到达会先于周边交通显示出来。",
      },
      {
        en: "On mobile, opening the detail sidebar now hides the zoom and map-settings buttons from its toolbar — they only apply to the map, which isn't visible there.",
        zh: "移动端打开详情侧栏时,工具栏不再显示缩放和地图设置按钮——它们只对地图生效,而此时看不到地图。",
      },
      {
        en: "Toolbars are less busy: every toolbar (map controls, page nav, sidebar) now keeps a single divider before the language/theme/account cluster instead of one between every group.",
        zh: "工具栏更清爽:各处工具栏(地图控制、页面导航、侧栏)只在语言/主题/账号这一组前保留一条分隔符,不再每组之间都放一条。",
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
