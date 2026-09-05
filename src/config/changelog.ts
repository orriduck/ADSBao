// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking") and one concise user-facing summary. Keep
// detailed implementation notes in the PR, not the product UI.
//
// ONE ENTRY PER MINOR. Don't add a new entry for every patch. Fold each patch
// into the current minor's single rolling entry (update its `summary` and bump
// its `version` to the new patch number, e.g. v2.30.16 -> v2.30.17). The
// `version` keeps a patch digit ON PURPOSE: it must match `package.json` so the
// The version-update indicator's semver compare still fires on every release. Start a fresh
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

export const CHANGELOG_INITIAL_LIMIT = 2;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 80;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.20.3",
    kind: "feat",
    title: { en: "More deliberate interactions", zh: "更清晰顺手的交互" },
    summary: {
      en: "Search gains keyboard navigation, clear and retry actions, and better city matching. Map, unit and alert preferences are grouped and saved together, with more room in phone landscape. Traffic filters offer direct choices, clear-all and accessible menus. Here stays centered on each GPS update, with clearer per-digit compass transitions. Loading indicators lose their card backdrop. Numeric detail tiles share per-digit transitions while preserving their formatting. Flight readings retain independent unit choices; weather pressure and ATC frequencies include their units. Fixes stale cached app icons and shows a dash for unavailable weather temperatures.",
      zh: "搜索支持键盘选择、清除与重试，城市名称匹配更准确。地图、单位和提醒设置分组呈现并统一保存或取消，手机横屏也有更多操作空间；流量筛选支持直接选择、一键清除和键盘菜单。Here 始终跟随最新 GPS 坐标居中，罗盘航向数字过渡更加清晰，加载动画去掉卡片底板。详情数字 tile 统一逐位跳动并保留原有格式；航班各项读数独立切换并保留单位选择，天气气压和 ATC 频率补齐单位，并修复旧缓存仍显示旧图标的问题；天气缺失时显示占位符，避免误报 0°C。",
    },
    highlights: [{ en: "A new aircraft, flight-path and position-dot icon unifies the PWA, Apple Touch and browser identity, with fresh asset URLs to replace previously cached icons.", zh: "全新飞机、航迹与定位点标识，统一 PWA、Apple Touch 和浏览器图标，并通过独立资源地址更新旧缓存中的图标。" }],
  },
  {
    version: "v3.19.2",
    kind: "feat",
    title: {
      en: "Map context refinement",
      zh: "地图上下文精修",
    },
    summary: {
      en: "Live digits now transition individually, loading uses a quiet dot matrix, and panels open more smoothly. Airport and flight identity cards carry subtle grayscale photo backgrounds; airports fall back to their country flag, and flights share the preview photo. Nearby airport and navaid labels retain the focused airport's compact instrument materials, with clearer ATC and spotting readouts.",
      zh: "实时数字现在按变化位数轻巧过渡，加载改用安静的点阵，面板展开也更顺滑。机场和航班信息卡提供若隐若现的灰度照片背景：机场无图时显示国旗，航班复用预览照片。附近机场和导航台标签延续焦点机场的紧凑仪表材质，ATC 和拍机点读数也更加清晰。",
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
