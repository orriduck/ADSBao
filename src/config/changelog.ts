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
export const CHANGELOG_TOTAL_COUNT = 101;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.30.5",
    kind: "patch",
    title: {
      en: "Mobile fixes — sidebar list clearance + first-screen entrance",
      zh: "移动端修复——侧栏列表留白与首屏入场",
    },
    summary: {
      en: "Two mobile fixes: a sidebar view's last row (e.g. the spotting list) no longer hides under the floating toolbar, and the first-screen entrance fade is deferred until the main thread is idle so it plays smoothly instead of crawling in over ~0.5–1s while the page is still busy mounting.",
      zh: "两个移动端修复:侧栏视图(如拍机点列表)的最后一行不再被底部浮动工具栏遮挡;首屏入场淡入改为等主线程空闲后再播放,避免页面挂载繁忙时动画被拖成 ~0.5–1s 的卡顿爬升。",
    },
    highlights: [],
  },
  {
    version: "v2.30.3",
    kind: "patch",
    title: {
      en: "Lighter frosted glass, smoother sidebar",
      zh: "更轻的磨砂玻璃,更流畅的侧栏",
    },
    summary: {
      en: "Frosted panels now use one light blur over a full-bleed map and the sidebar header blends in seamlessly — less scroll and transition jank, with a consistent glass look across sidebars, preview cards, and toolbars.",
      zh: "磨砂面板统一为叠在铺满地图上的单档轻模糊,侧栏顶部无缝融入——滚动与切换更少掉帧,侧栏、预览卡与工具栏玻璃质感一致。",
    },
    highlights: [],
  },
  {
    version: "v2.30.2",
    kind: "patch",
    title: {
      en: "Flight-count card — stacked rows + tile transitions",
      zh: "航班卡——分行排列与切换动效",
    },
    summary: {
      en: "The flight-count card stacks into three rows — count, departures/arrivals, then weather/ATC/spotting — with a soft animated highlight when switching tiles.",
      zh: "航班卡改为三行——航班数、起飞/到达、天气/ATC/拍机点——切换 tile 时带柔和的高亮动效。",
    },
    highlights: [],
  },
  {
    version: "v2.30.1",
    kind: "patch",
    title: {
      en: "Sidebar typography pass",
      zh: "侧栏排版微调",
    },
    summary: {
      en: "Sidebar and panel font sizes run through two scale tokens for a tighter, fixed hierarchy, and section headers move from serif to a heavier sans.",
      zh: "侧栏与面板字号统一走两个缩放 token,层级更紧凑且固定;区块标题由衬线改为更重的无衬线。",
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
