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
export const CHANGELOG_TOTAL_COUNT = 62;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.38.1",
    kind: "feat",
    title: {
      en: "Frosted map labels, colour-coded targets, steadier flight pages",
      zh: "磨砂地图标签、目标配色与更稳的飞行页",
    },
    summary: {
      en: "The map's labels for airports, navaids and reporting points are now the same frosted-glass pill as the toolbar, so the whole map reads as one material. Targets gain a clear colour hierarchy: the page's primary target — the focal airport, or the tracked aircraft — is the orange signal accent, while an aircraft you click is a high-contrast neutral, so the two are distinct at a glance. Flight tracking pages are also far more stable: navigating between detail pages now loads each page fresh (no stale map, no leftover connections), the map shows a clear loading animation while acquiring a signal, and a flight with no live position — including a trans-oceanic leg with no coverage — shows an explicit card (\"no live position\" / \"signal lost\" / \"flight ended\") instead of an endless spinner or an unrelated fallback map.",
      zh: "地图上机场、导航台、报告点的标签现在统一为和工具栏一致的磨砂玻璃胶囊,整张地图读起来是同一种材质。目标有了清晰的颜色层级:页面的首要目标——所在机场,或被追踪的飞机——用橙色信号强调色,而你点选的飞机是高对比中性色,一眼就能区分。飞行追踪页也更稳定:在详情页之间跳转现在会整页全新加载(没有残留地图、没有残留连接),获取信号时地图显示清晰的加载动画,而没有实时位置的航班——包括无覆盖的跨洋航段——会显示明确的卡片(\"暂无实时位置\"/\"信号丢失\"/\"航班已结束\"),而不是无尽转圈或一张不相干的兜底地图。",
    },
    highlights: [
      {
        en: "Airport / navaid / reporting-point map labels and the navaid count marker are now the toolbar's frosted-glass pill — one consistent material across the map.",
        zh: "机场 / 导航台 / 报告点的地图标签以及导航台计数标记,现在都是工具栏那种磨砂玻璃胶囊——全图统一材质。",
      },
      {
        en: "Map target colours: the primary target (focal airport or tracked aircraft) uses the orange accent; a clicked aircraft uses a high-contrast neutral — distinct at a glance, theme-aware in light and dark.",
        zh: "地图目标配色:首要目标(所在机场或被追踪飞机)用橙色强调色;点选的飞机用高对比中性色——一眼可分,明暗主题各自适配。",
      },
      {
        en: "Stable detail-page navigation: each flight/airport page loads fresh on navigation (the old realtime connection is torn down), with a clear loading animation and an explicit no-live-position / signal-lost / flight-ended state instead of a stuck spinner or fallback map.",
        zh: "更稳的详情页跳转:跳转时每个飞机/机场页都全新加载(旧实时连接被切断),配清晰的加载动画,以及明确的「暂无实时位置 / 信号丢失 / 航班已结束」状态,而非卡住的转圈或兜底地图。",
      },
      {
        en: "The tracked flight now defaults to its full recorded trace (all available history), not just the trail since you opened the page; clicked aircraft still show their recent trail.",
        zh: "被追踪航班现在默认显示完整记录航迹(全部可用历史),而不只是你打开页面之后的那一段;点选的飞机仍显示最近航迹。",
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
