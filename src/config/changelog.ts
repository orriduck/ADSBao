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
export const CHANGELOG_TOTAL_COUNT = 95;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.4",
    kind: "patch",
    title: {
      en: "Mechanism redesign + Changelog type scale",
      zh: "机制页重设计 + 更新日志字号统一",
    },
    summary: {
      en: "The Mechanism page adopts the Explorer/About design system, and the Changelog aligns to the same type scale. Both join the first-screen family with serif group labels and the accent title tick.",
      zh: "机制页沿用机场探索 / 关于页的设计语言，更新日志对齐同一套字号。两页都归入首屏家族，配衬线分组标签与强调标题短线。",
    },
    highlights: [
      {
        en: "Mechanism rows become numbered accordion entries (mono index, title + signal, chevron); the expanded row gets a faint neutral panel with the data flow drawn as a vertical node pipeline — only the final produced payload is the orange node",
        zh: "机制行改为带编号的折叠条目（等宽序号、标题 + 信号、折叠箭头）；展开行为淡色面板，数据流以竖向节点管线呈现——仅最终产出的 payload 为橙色节点",
      },
      {
        en: "Mechanism group labels switch to the upright serif with an accent tick, and the title gains the accent underline tick + a quiet subtitle (kicker/count dropped)",
        zh: "机制分组标签改用直立衬线并配强调短线，标题加上强调下划线短线与一行安静副标题（去掉旧的标签 / 计数头）",
      },
      {
        en: "Changelog aligns to the shared type scale — 15px entry titles, 11.5px summaries, mono version, and FEAT/PATCH/BREAKING as the shared mono chip — with the accent title tick; structure unchanged",
        zh: "更新日志对齐共享字号——15px 条目标题、11.5px 摘要、等宽版本号，FEAT/PATCH/BREAKING 采用共享的等宽芯片——并加上强调标题短线；结构不变",
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
