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
export const CHANGELOG_TOTAL_COUNT = 81;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.21.2",
    kind: "feat",
    title: { en: "A view of Here", zh: "看见此刻所在" },
    summary: {
      en: "Here location cards find a photograph by place and region name, with geographic matching to avoid namesakes. Images share the airport and flight cards' quiet grayscale treatment and source link, adapt to both themes, and update as the resolved place changes. Missing imagery keeps the existing neutral card. A sage, gray-olive and warm-ivory palette adds identity inlays, clearer selected readings and a colored temperature scale, with matching dark materials and neutral action buttons. Here place names now use a stronger serif heading; the map shares the sage geography, and page chrome meets panels and the mobile map through a continuous top edge.",
      zh: "Here 位置卡片按地点与地区名称查找照片，并结合地理位置排除同名异地结果。图片沿用机场和航班卡片的低对比灰度背景与来源入口，适配亮暗主题，并随解析出的地点变化更新；无图时保留原有中性卡片。鼠尾草绿、灰橄榄与暖米白组成新的界面材质，强化身份嵌件、选中读数与温度刻度，暗色主题同步适配，普通按钮保留中性样式。Here 地名采用更有分量的衬线标题，地图同步灰绿地理配色，页面顶部与面板及移动地图柔和衔接。",
    },
    highlights: [],
  },
  {
    version: "v3.20.6",
    kind: "feat",
    title: { en: "More deliberate interactions", zh: "更清晰顺手的交互" },
    summary: {
      en: "Search gains keyboard navigation, clear and retry actions, and better city matching. Map, unit and alert preferences are grouped and saved together, with more room in phone landscape. Traffic filters offer direct choices, clear-all and accessible menus. Here stays centered on each GPS update, with matching per-digit transitions across all Here numeric tiles. Loading indicators lose their card backdrop. Numeric detail tiles share per-digit transitions while preserving their formatting. Flight readings retain independent unit choices; weather pressure and ATC frequencies include their units. Fixes stale cached app icons and shows a dash for unavailable weather temperatures. Tile hover, focus and selected icons share clear, theme-aware surfaces with weather details. A cool jade accent adapts to light and dark themes across active states, focus and tracking actions, with a matching PWA position dot.",
      zh: "搜索支持键盘选择、清除与重试，城市名称匹配更准确。地图、单位和提醒设置分组呈现并统一保存或取消，手机横屏也有更多操作空间；流量筛选支持直接选择、一键清除和键盘菜单。Here 始终跟随最新 GPS 坐标居中，所有数字 tile 统一采用清晰的逐位过渡，加载动画去掉卡片底板。详情数字 tile 统一逐位跳动并保留原有格式；航班各项读数独立切换并保留单位选择，天气气压和 ATC 频率补齐单位，并修复旧缓存仍显示旧图标的问题；天气缺失时显示占位符，避免误报 0°C。Tile 悬停、聚焦和选中图标与天气详情统一明暗样式，修复图标融入深色底板的问题。主题强调色改为适配亮暗界面的翡翠绿，统一选中、焦点、追踪操作与 PWA 图标定位点。",
    },
    highlights: [{ en: "A new aircraft, flight-path and position-dot icon unifies the PWA, Apple Touch and browser identity, with fresh asset URLs to replace previously cached icons.", zh: "全新飞机、航迹与定位点标识，统一 PWA、Apple Touch 和浏览器图标，并通过独立资源地址更新旧缓存中的图标。" }],
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
