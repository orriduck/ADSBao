// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Patch-only followups can be folded into the
// latest representative entry. Keep entries terse — the long-form story belongs
// in the PR.

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
export const CHANGELOG_TOTAL_COUNT = 92;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.1",
    kind: "patch",
    title: {
      en: "Material fidelity — flatter glass, quieter accent",
      zh: "材质回正——更平的玻璃、更克制的强调色",
    },
    summary: {
      en: "A correction pass on the v2.28 surfaces: frosted panels go back to flat translucent tints instead of painted gradients, the orange signal is reserved for selection again, and the left-column hierarchy reads cleaner over a busy map.",
      zh: "对 v2.28 表面的一次回正：磨砂面板回到平整的半透明色调而非渐变涂层，橙色信号色重新只用于选择态，左栏层次在繁忙地图上更清爽。",
    },
    highlights: [
      {
        en: "Frosted surfaces (search box, sidebar, preview cards, toolbars, toasts) drop linear-gradient fills and heavy ambient shadows for one flat tint + a single inset hairline — no more gray mud at the edges over the live map",
        zh: "磨砂表面（搜索框、侧栏、预览卡片、工具条、提示）去掉线性渐变填充与厚重投影，改为单一平整色调 + 一道内描边——地图之上不再有灰浊边缘",
      },
      {
        en: "Orange is reserved for selection, the tracked trace, and the Track button again — removed from the search glyph, the map LIVE indicator, and the map menu wash; altitude trend stays glyph + luminance",
        zh: "橙色重新只用于选择态、追踪轨迹与 Track 按钮——从搜索图标、地图 LIVE 指示与地图菜单底色中移除；高度趋势仍以箭头 + 明度表达",
      },
      {
        en: "Sidebar filters (targets / route / type / altitude) read as aligned rails instead of a boxed table",
        zh: "侧栏筛选（目标 / 航路 / 机型 / 高度）改为对齐的导轨，而非方框表格",
      },
      {
        en: "Stronger size contrast on Explorer / About list rows; weather view no longer stacks a flight-count hero above its flight-rules hero, and hero footer labels never wrap",
        zh: "Explorer / About 列表行的字号对比更明确；天气视图不再在飞行规则主指标之上叠加航班数主指标，主指标底部标签不再换行",
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
