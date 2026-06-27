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
    version: "v2.30.11",
    kind: "patch",
    title: {
      en: "Map scale clears the sidebar on desktop too",
      zh: "桌面端比例尺也避开侧栏",
    },
    summary: {
      en: "The map's range scale is now offset clear of the sidebar on desktop and tablet as well — previously it sat hidden behind the panel except in mobile landscape.",
      zh: "地图比例尺在桌面和平板上也移到侧栏右侧,之前只在移动横屏避让、其它情况被面板挡住。",
    },
    highlights: [],
  },
  {
    version: "v2.30.10",
    kind: "patch",
    title: {
      en: "Keep the map scale clear of the landscape sidebar",
      zh: "横屏下比例尺避开侧栏",
    },
    summary: {
      en: "In mobile landscape the map's range scale is offset clear of the sidebar instead of hiding behind it.",
      zh: "移动端横屏下,地图比例尺移到侧栏右侧,不再被侧栏遮住。",
    },
    highlights: [],
  },
  {
    version: "v2.30.9",
    kind: "patch",
    title: {
      en: "Landscape sidebar — edge-to-edge glass, island-safe content",
      zh: "横屏侧栏——玻璃铺到边缘、内容避让灵动岛",
    },
    summary: {
      en: "In mobile landscape the sidebar's frosted background now runs to the screen edge while its content stays inset clear of the Dynamic Island, and the panel is a bit wider for more room.",
      zh: "移动端横屏下,侧栏的磨砂背景铺到屏幕边缘,内容则内缩避开灵动岛;面板也加宽了一些,内容区更充裕。",
    },
    highlights: [],
  },
  {
    version: "v2.30.8",
    kind: "patch",
    title: {
      en: "Skip the brand background video on mobile",
      zh: "移动端不再加载品牌背景视频",
    },
    summary: {
      en: "Mobile devices no longer load and decode the looping brand background video — it was decorative behind the full-width panel but competed for the main thread during a cold first-screen boot.",
      zh: "移动端不再加载和解码循环播放的品牌背景视频——它本来就藏在全宽面板后面只作装饰,却会在冷启动首屏时抢占主线程。",
    },
    highlights: [],
  },
  {
    version: "v2.30.7",
    kind: "patch",
    title: {
      en: "Fix photo-locations overflow on mobile",
      zh: "修复移动端拍机点横向溢出",
    },
    summary: {
      en: "The airport photo-locations list no longer runs off the right edge on mobile — long spot descriptions now wrap inside the sidebar instead of pushing the list wider than the screen.",
      zh: "机场拍机点列表在移动端不再冲出右边缘——长描述会在侧栏内换行,不再把列表撑得比屏幕还宽。",
    },
    highlights: [],
  },
  {
    version: "v2.30.6",
    kind: "patch",
    title: {
      en: "Smoother first-screen entrance",
      zh: "更顺滑的首屏入场",
    },
    summary: {
      en: "The first-screen entrance now fades in via a compositor animation, so it plays smoothly the moment content is ready instead of crawling in or sitting blank while the page is still busy mounting.",
      zh: "首屏入场改为合成器动画淡入,内容就绪即顺滑播放,不再在页面挂载繁忙时被拖成爬升或白屏。",
    },
    highlights: [],
  },
  {
    version: "v2.30.5",
    kind: "patch",
    title: {
      en: "Mobile fixes, first-screen entrance, and a lighter nearby list",
      zh: "移动端修复、首屏入场与更轻的邻近列表",
    },
    summary: {
      en: "Mobile sidebar lists no longer hide their last row under the floating toolbar, the first-screen fade waits for the main thread to settle so it plays smoothly, and the nearby list now defaults to aircraft below 10,000 ft and reveals a page at a time as you scroll for a shorter, lighter default cut.",
      zh: "移动端侧栏列表的最后一行不再被底部工具栏遮挡;首屏淡入改为等主线程空闲后再播放以更顺滑;邻近列表默认只看 10000 英尺以下的航空器,并随滚动逐页展开,默认列表更短更轻。",
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
