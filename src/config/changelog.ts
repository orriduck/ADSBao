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
export const CHANGELOG_TOTAL_COUNT = 98;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.7",
    kind: "patch",
    title: {
      en: "Preview cards — airport / navaid / airspace match the aircraft card",
      zh: "预览卡片——机场 / 导航台 / 空域与飞机卡片统一",
    },
    summary: {
      en: "The airport, navaid, reporting-point, airspace, and watching-spot preview cards adopt the aircraft card's typography on both desktop and mobile — a mono identity with a secondary on the right, the shared metadata rows, and an orange Track button.",
      zh: "机场、导航台、报告点、空域、拍机点预览卡片在桌面和移动端都沿用飞机卡片的排版——等宽标识 + 右侧次级、共享的元数据行、橙色 Track 按钮。",
    },
    highlights: [
      {
        en: "All preview cards share one chrome — a primary identity (mono for codes, sans for names) over quiet sublines, the same label-left / value-right metadata rows, and a single dot-separated detail line on mobile; the kicker eyebrow, 28px bold heads, and entity icons are dropped",
        zh: "所有预览卡片共用一套外观——主标识（代号用等宽、名称用无衬线）+ 安静的副行、同样的左标签 / 右值元数据行，移动端用一行点分隔参数；去掉了 kicker eyebrow、28px 粗标题与实体图标",
      },
      {
        en: "The mobile Track button is the orange accent everywhere (matching desktop); the multi-airspace selector now advances exactly one card per swipe",
        zh: "移动端 Track 按钮统一为橙色强调色（与桌面一致）；多空域选择器现在每次滑动只前进一张",
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
