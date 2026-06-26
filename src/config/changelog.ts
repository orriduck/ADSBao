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
export const CHANGELOG_TOTAL_COUNT = 100;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.29.0",
    kind: "feat",
    title: {
      en: "Airport sidebar redesign — one scroll, single-line traffic list",
      zh: "机场侧栏改版——整体滚动、单行航班列表",
    },
    summary: {
      en: "The default airport sidebar is rebuilt on the frosted-glass language: a code-first identity (BOS · KBOS), a flat Flights hero with Wx / ATC / Spot cells, and a 2×2 filter grid where dropdowns carry a chevron and the Route toggle becomes an orange accent pill. Only the logo is pinned now — identity, hero, filters, and the nearby list scroll together as one region — while the list keeps windowing via scroll-margin virtualization, so the v2.28.8 performance win is preserved. Traffic rows collapse to a single fixed-height line: callsign · route on the left, distance and altitude grouped on the right and told apart by tone.",
      zh: "默认机场侧栏按霜面玻璃语言重做:以代码为主的标识(BOS · KBOS)、扁平的航班数概览(Wx / ATC / Spot),以及 2×2 筛选网格——下拉项带箭头,Route 开关激活时变为橙色强调胶囊。现在只有 Logo 固定,标识、概览、筛选与邻近列表作为一个区域一起滚动;列表仍通过 scroll-margin 虚拟化窗口化,因此保留了 v2.28.8 的性能改进。航班行收为单行定高:左侧呼号 · 航路,右侧距离与高度并排并以明暗区分。",
    },
    highlights: [
      {
        en: "Identity leads with the airport code; name and city/country · coordinates recede beneath it (no flag emoji)",
        zh: "标识以机场代码为主,名称与城市/国家 · 坐标退居其下(无国旗 emoji)",
      },
      {
        en: "Flat Flights hero with a large count over Wx / ATC / Spot cells (Dep / Arr added only with FlightAware)",
        zh: "扁平航班数概览:大号计数叠加 Wx / ATC / Spot 单元(仅在 FlightAware 下加入 Dep / Arr)",
      },
      {
        en: "Logo is the only pinned element; everything below scrolls as one region with the nearby list still virtualized",
        zh: "Logo 是唯一固定元素;其下内容作为一个区域滚动,邻近列表仍保持虚拟化",
      },
      {
        en: "Single-line, fixed-height traffic rows — distance and altitude grouped on the right and separated by tone",
        zh: "单行定高的航班行——距离与高度在右侧并排,并以明暗区分",
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
