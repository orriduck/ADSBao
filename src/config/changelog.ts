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
export const CHANGELOG_TOTAL_COUNT = 93;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.2",
    kind: "patch",
    title: {
      en: "Explorer sidebar — code chips, serif group labels",
      zh: "机场探索侧栏——代号芯片、衬线分组标签",
    },
    summary: {
      en: "The home Explorer list trades flat gray text for real design: monospace ICAO chips, an upright serif for group labels, and one orange near-me CTA. Hierarchy comes from size and luminance, never weight.",
      zh: "首页机场探索列表从扁平灰字升级为真正的设计语言：等宽 ICAO 代号芯片、衬线分组标签，以及唯一的橙色「附近」入口。层次来自字号与明度，而非字重。",
    },
    highlights: [
      {
        en: "ICAO codes become monospace chips (JetBrains Mono) with a hairline rim; the chip keeps one typeface/size/shape across states and changes color only when selected",
        zh: "ICAO 代号变为带细描边的等宽芯片（JetBrains Mono）；芯片在各状态下保持同一字体/字号/形状，仅在选中时改变颜色",
      },
      {
        en: "Group labels (Near me / Spotter favorites / hubs) use an upright serif (Fraunces) with a small accent tick; the page title stays in Manrope",
        zh: "分组标签（附近 / 收藏 / 枢纽）改用直立衬线（Fraunces）并配一道强调短线；页面标题仍为 Manrope",
      },
      {
        en: "The near-me row is the one orange CTA — accent chip, faint wash, and a left rail; orange appears in exactly three places (title tick, group ticks, near-me row)",
        zh: "「附近」行是唯一的橙色入口——强调芯片、淡底色与左侧导轨；橙色全页仅出现三处（标题短线、分组短线、附近行）",
      },
      {
        en: "Airport names lead at a larger inked size and wrap instead of mid-word ellipsis; both light and dark themes retune through the existing signal-accent and ink tokens",
        zh: "机场名以更大的深色字号领衔，超长时换行而非中途省略；明暗两套主题均通过既有的信号强调色与墨色令牌自动适配",
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
