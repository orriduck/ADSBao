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
export const CHANGELOG_TOTAL_COUNT = 99;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.8",
    kind: "patch",
    title: {
      en: "Nearby list performance — desktop sidebar virtualizes again",
      zh: "邻近列表性能——桌面侧栏恢复虚拟化",
    },
    summary: {
      en: "On desktop the whole sidebar used to scroll, which left the nearby traffic list unbounded and defeated its virtualizer — every airport/flight page mounted all 80–100+ rows at once. Now the brand, identity, and filters stay fixed and only the list scrolls internally (matching the mobile layout), so it windows ~20 rows. Selecting a row no longer re-renders or re-measures the whole list.",
      zh: "桌面端此前是整条侧栏一起滚动,导致邻近列表高度不受限、虚拟化被架空——每个机场/航班页都会一次性挂载全部 80–100+ 行。现在品牌、标识、筛选固定不动,只有列表内部滚动(与移动端一致),因此只渲染约 20 行。选中某行也不再重渲染或重新测量整张列表。",
    },
    highlights: [
      {
        en: "Desktop airport + flight sidebars now have a fixed header with an internally-scrolling nearby list, so the virtualizer windows ~20 rows instead of mounting the full ~87",
        zh: "桌面机场 + 航班侧栏改为固定表头 + 列表内部滚动,虚拟化只渲染约 20 行,而不是挂载全部约 87 行",
      },
      {
        en: "Selecting an aircraft/airport only re-renders the affected rows (memoized) and skips the per-click full re-measure — clicking a row is noticeably snappier",
        zh: "选中飞机/机场只重渲染受影响的行(memo 化),并跳过每次点击的整表重测量——点击明显更跟手",
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
