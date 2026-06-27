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
export const CHANGELOG_TOTAL_COUNT = 87;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.30.16",
    kind: "feat",
    title: {
      en: "v2.30 — sidebar, landscape and performance polish",
      zh: "v2.30——侧栏、横屏与性能打磨",
    },
    summary: {
      en: "A run of refinements on top of the weather redesign. The frosted sidebar is quieter and lighter — an opaque logo bar with a fade scrim (no scroll blur), tightened typography, a smoother first-screen entrance and a shorter nearby list. Mobile landscape got a full pass: the panel runs edge-to-edge clear of the Dynamic Island, shows the full place identity at a width matched to the home screen, keeps the map scale clear of the sidebar, and the logo reliably returns home.",
      zh: "在天气改版基础上的一系列打磨。磨砂侧栏更安静更轻——不透明 logo 条配渐变淡出（滚动无模糊）、排版收紧、首屏入场更顺滑、邻近列表更短。移动端横屏也过了一遍：面板铺到边缘并避开灵动岛、完整显示地点信息且宽度与首屏对齐、地图比例尺避开侧栏、logo 稳定回主页。",
    },
    highlights: [],
  },
  {
    version: "v2.30.0",
    kind: "feat",
    title: {
      en: "Airport weather redesign — METAR + Local views",
      zh: "机场天气改版——METAR 与实况两视图",
    },
    summary: {
      en: "Airport weather is rebuilt around one colour-coded hero card per view, switched by a METAR / Local control: flight-rules category colours for METAR, temperature-mapped colour for Local (now with UV index and visibility).",
      zh: "机场天气以每视图一张颜色编码主卡片重做,由 METAR / 实况控件切换:METAR 按飞行规则类别着色,实况随温度映射(新增紫外线与能见度)。",
    },
    highlights: [],
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
