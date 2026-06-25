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
export const CHANGELOG_TOTAL_COUNT = 94;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.3",
    kind: "patch",
    title: {
      en: "About page — same code chips and serif labels as Explorer",
      zh: "关于页——与机场探索一致的代号芯片与衬线标签",
    },
    summary: {
      en: "The About sidebar adopts the Explorer design system. The build meta stacks label-over-value, and the data sources reuse the Explorer row with monospace category chips and serif group labels.",
      zh: "关于页侧栏沿用机场探索的设计语言：构建信息改为标签在上、值在下的堆叠式，数据来源复用机场探索的行样式，配等宽分类芯片与衬线分组标签。",
    },
    highlights: [
      {
        en: "Version / Stack / Architecture become a stacked label-over-value meta block (no longer a left-label / right-value rail), separated from the sources by a hairline",
        zh: "版本 / 技术栈 / 架构改为标签在上、值在下的堆叠式信息块（不再是左标签 / 右值的导轨），并以细线与数据来源分隔",
      },
      {
        en: "Data sources reuse the Explorer row exactly — monospace category chips (ADS-B / METAR / ROUTE) with a hairline rim and an external-link trailing icon",
        zh: "数据来源完全复用机场探索的行样式——等宽分类芯片（ADS-B / METAR / ROUTE）带细描边，并配外链图标作为尾部",
      },
      {
        en: "Section and group labels use the upright serif; the title keeps Manrope with a small accent underline tick, and the data rows carry no orange",
        zh: "区块与分组标签改用直立衬线；标题仍为 Manrope 并配一道强调下划线短线，数据行不含橙色",
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
