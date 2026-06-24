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

export const CHANGELOG_INITIAL_LIMIT = 6;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 68;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.24.4",
    kind: "patch",
    title: {
      en: "Mobile landscape sidebar polish",
      zh: "移动横屏侧栏打磨",
    },
    summary: {
      en: "Mobile landscape airport pages now keep the sidebar scrollable, lighten first-paint motion, align nearby table values, and bring map settings back onto the liquid-glass surface system.",
      zh: "移动端横屏机场页现在保持侧栏可滚动，减少首屏动效负担，对齐邻近列表数值，并让地图设置回到液态玻璃表面系统。",
    },
    highlights: [
      {
        en: "Mobile landscape sidebars keep their full scroll range with safe-area clearance",
        zh: "移动横屏侧栏保留完整滚动范围，并避开安全区",
      },
      {
        en: "Nearby distance and altitude columns align consistently across values and empty rows",
        zh: "邻近列表中的距离与高度列在有值和空值时保持一致对齐",
      },
      {
        en: "Map settings now reuse the current frosted glass material and compact control rhythm",
        zh: "地图设置现在复用当前磨砂玻璃材质和更紧凑的控件节奏",
      },
    ],
  },
  {
    version: "v2.24.3",
    kind: "patch",
    title: {
      en: "Landscape sidebar and map scale polish",
      zh: "横屏侧栏与比例尺打磨",
    },
    summary: {
      en: "Landscape sidebars regain the wider column on narrow devices, nearby altitude values align closer to the table edge, and every map scale now uses the vertical ruler style.",
      zh: "窄横屏设备上的侧栏恢复较宽列，邻近列表的高度值更贴近表格右侧，所有地图比例尺也统一为竖向样式。",
    },
    highlights: [
      {
        en: "Mobile and narrow landscape views use the wider sidebar width again",
        zh: "移动端与窄屏横向视图重新使用更宽的侧栏宽度",
      },
      {
        en: "Nearby table altitude values sit closer to the right edge",
        zh: "邻近列表中的高度值更贴近右侧边界",
      },
      {
        en: "Desktop and mobile map scale indicators now share the vertical ruler treatment",
        zh: "桌面与移动端地图比例尺现在统一为竖向标尺",
      },
    ],
  },
  {
    version: "v2.24.2",
    kind: "patch",
    title: {
      en: "Sidebar layout and navigation cleanup",
      zh: "侧边栏布局与导航呈现优化",
    },
    summary: {
      en: "Desktop and landscape views now keep the sidebar and main surface as separate left-right regions. Sidebar controls use full-cell two-column groups while preserving the metric-card glass selected state and large numeric values.",
      zh: "桌面与横屏现在将侧边栏和主界面保持为左右两个区域。侧栏控件改为铺满单元格的双列分组，同时保留 metric card 的玻璃选中态和大号数字。",
    },
    highlights: [
      {
        en: "Airport view metrics now keep large values, with weather showing value and unit together while other metrics drop secondary unit labels",
        zh: "机场视图指标继续保持大号数值，天气合并显示数值和单位，其它指标移除副单位文字",
      },
      {
        en: "Desktop and landscape sidebars keep the original width while the map/page toolbar remains unchanged",
        zh: "桌面与横屏侧边栏保持原来的宽度，地图/页面工具栏保持不变",
      },
      {
        en: "Mobile portrait and landscape sidebar controls now share the same selected-state vocabulary",
        zh: "移动端竖屏与横屏的侧栏控件现在使用同一套选中态语言",
      },
      {
        en: "The sidebar aircraft search now matches the Home search pill while metric and filter groups read as distinct resting glass sections",
        zh: "侧栏航班搜索现在与首页搜索胶囊保持一致，metric 与筛选组也更像独立的静态玻璃分区",
      },
      {
        en: "Static pages keep open sections with aligned rounded rows, and no scroll-to-pill collapse",
        zh: "首页等静态页保持开放式分段，条目圆角和缩进统一，并取消滚动收成 pill 的效果",
      },
      {
        en: "Desktop and mobile preview cards now share the same frosted preview-card material",
        zh: "桌面与移动端 preview card 现在共享同一套磨砂玻璃材质",
      },
    ],
  },
  {
    version: "v2.24.1",
    kind: "patch",
    title: {
      en: "Compass heading beam rotation fix; proactive permission request",
      zh: "修复罗盘朝向光束旋转问题；进入机场时主动请求权限",
    },
    summary: {
      en: "Heading beam now rotates reliably on mobile. DeviceOrientation permission is requested proactively on airport entry. Location status block always visible in map settings.",
      zh: "罗盘光束在移动端可靠旋转。进入机场时主动请求 DeviceOrientation 权限。地图设置中始终显示位置状态。",
    },
    highlights: [
      {
        en: "Heading beam rotates reliably on mobile",
        zh: "罗盘光束在移动端可靠旋转",
      },
      {
        en: "DeviceOrientation requested proactively on airport entry",
        zh: "进入机场时主动请求 DeviceOrientation 权限",
      },
      {
        en: "Location status always visible in map settings",
        zh: "地图设置中始终显示位置状态",
      },
    ],
  },
  {
    version: "v2.24.0",
    kind: "feat",
    title: {
      en: "My location status and compass in settings",
      zh: "设置中显示我的位置状态与罗盘",
    },
    summary: {
      en: "Map settings now show live location acquisition and compass heading status. A force re-acquire button appears when position is not yet ready.",
      zh: "地图设置中现在显示位置获取与罗盘朝向状态。当位置尚未就绪时显示强制重新获取按钮。",
    },
    highlights: [
      {
        en: "Live location and compass heading status in map settings",
        zh: "地图设置中实时显示位置与罗盘朝向状态",
      },
      {
        en: "Force re-acquire location when position is not ready or permission was denied",
        zh: "位置未就绪或权限被拒绝时可强制重新获取",
      },
    ],
  },
  {
    version: "v2.23.5",
    kind: "patch",
    title: {
      en: "Spot dot theme color fix",
      zh: "拍机点远视图标颜色修复",
    },
    summary: {
      en: "Far-zoom spotting dots now use the same badge color: black in light theme, white in dark theme.",
      zh: "最远缩放下的拍机点圆点现在使用与 badge 一致的主题色:亮色主题为黑,暗色主题为白。",
    },
    highlights: [
      {
        en: "Spotting dots at far zoom now match the badge foreground color per theme",
        zh: "最远缩放下的拍机小点现在按主题匹配 badge 前景色",
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
