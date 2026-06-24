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
export const CHANGELOG_TOTAL_COUNT = 80;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.26.8",
    kind: "patch",
    title: {
      en: "Mobile home readability",
      zh: "移动端首页可读性修复",
    },
    summary: {
      en: "The mobile home screen now uses the same readable dark static-page panel as the other app pages instead of placing light text over a pale background.",
      zh: "移动端首页现在与其他静态页共用可读的深色面板，不再把浅色文字放在偏亮背景上。",
    },
    highlights: [
      {
        en: "The home screen's mobile-only pale panel override was removed so headings, discovery rows, and search results keep strong contrast",
        zh: "移除首页移动端专属浅色面板覆盖，让标题、发现列表和搜索结果保持足够对比度",
      },
      {
        en: "Discovery and search-result row alignment stays on the 20 px mobile rail",
        zh: "发现列表和搜索结果仍保持 20px 移动端列线",
      },
      {
        en: "Mechanism and about pages remain visually unchanged because they already used the readable static-page surface",
        zh: "机制页和关于页保持现状，因为它们已经使用可读的静态页表面",
      },
    ],
  },
  {
    version: "v2.26.7",
    kind: "patch",
    title: {
      en: "Home airport list rail alignment",
      zh: "首页机场列表列线对齐",
    },
    summary: {
      en: "The home airport picker now uses one shared rail for section headings, discovery rows, and search result rows.",
      zh: "首页机场选择器现在让分组标题、发现列表和搜索结果共用同一条列线。",
    },
    highlights: [
      {
        en: "Discovery and search-result rows now anchor their airport code column to the same edge as the search field",
        zh: "发现列表和搜索结果的机场代码列现在贴齐搜索框同一外缘",
      },
      {
        en: "Airport row text and chevrons keep fixed columns while the row height is slightly tighter",
        zh: "机场名称和右侧箭头保持固定列，同时行高更紧凑",
      },
      {
        en: "The change is scoped to the home search screen so static-page list primitives keep their current rhythm",
        zh: "调整只作用于首页搜索界面，静态页列表原语保持现有节奏",
      },
    ],
  },
  {
    version: "v2.26.6",
    kind: "patch",
    title: {
      en: "About page metadata polish",
      zh: "关于页元信息打磨",
    },
    summary: {
      en: "The about page version metadata is now inline and quieter, removing a decorative status dot and bringing data sources higher on the page.",
      zh: "关于页版本元信息改为更安静的内联展示，移除无意义装饰圆点，让数据来源更早进入首屏。",
    },
    highlights: [
      {
        en: "The version number now reads as an aligned value instead of a large standalone metric",
        zh: "版本号现在作为对齐值展示，不再像独立的大号指标卡",
      },
      {
        en: "The decorative muted dot beside the version field was removed because it did not carry state or meaning",
        zh: "版本字段旁的灰色圆点没有状态含义，已移除",
      },
      {
        en: "The data-source list starts higher on mobile while keeping the open, unboxed static-page layout",
        zh: "移动端数据来源列表更早出现，同时保持静态页开放、无重盒子的布局",
      },
    ],
  },
  {
    version: "v2.26.5",
    kind: "patch",
    title: {
      en: "Compact map settings sheet",
      zh: "地图设置面板压缩",
    },
    summary: {
      en: "The map settings sheet is narrower and denser, with lighter selected-row glass and less footer chrome in landscape.",
      zh: "地图设置面板变窄并提高密度，选中行玻璃感更轻，横屏底部提示也更少占位。",
    },
    highlights: [
      {
        en: "The settings drawer width, close control, header, and footer are tightened so the map keeps more working space",
        zh: "设置抽屉宽度、关闭按钮、标题区和底部提示都更紧凑，让地图保留更多工作空间",
      },
      {
        en: "Settings rows now use a tighter inline grid and smaller switches without adding separators or table wrappers",
        zh: "设置行改用更紧的行内网格和更小开关，不新增分隔符或表格式包裹",
      },
      {
        en: "Phone landscape now shows seven complete settings rows before scrolling",
        zh: "手机横屏首屏现在能完整显示七行设置项后再滚动",
      },
    ],
  },
  {
    version: "v2.26.4",
    kind: "patch",
    title: {
      en: "Home list, search result, and toolbar polish",
      zh: "首页列表、搜索结果与工具栏打磨",
    },
    summary: {
      en: "Home discovery rows and search results now share the same list rail, localized result counts, and quieter toolbar grouping.",
      zh: "首页发现列表与搜索结果现在共用同一条列表轨道，结果计数本地化，工具栏分组也更克制。",
    },
    highlights: [
      {
        en: "Home discovery rows and search result rows now align to the same outer rail as the search field",
        zh: "首页发现列表和搜索结果列表现在与搜索框使用同一条外缘列线",
      },
      {
        en: "Search result counts are localized, so Chinese no longer falls back to English result labels",
        zh: "搜索结果计数改为本地化文案，中文界面不再出现英文 result 标签",
      },
      {
        en: "Toolbar separators are shorter and lower contrast, and local Query Devtools is opt-in so review screenshots stay clean",
        zh: "工具栏分隔符更短更淡，本地 Query Devtools 改为显式开启，让界面截图保持干净",
      },
    ],
  },
  {
    version: "v2.26.3",
    kind: "patch",
    title: {
      en: "Home airport list alignment",
      zh: "首页机场列表对齐",
    },
    summary: {
      en: "The home airport picker now uses a stricter inline row grid so airport codes, names, and right-side affordances stay aligned.",
      zh: "首页机场选择列表改用更严格的行内网格，让机场代码、名称和右侧控件保持同一列线。",
    },
    highlights: [
      {
        en: "Airport rows now reserve a fixed code badge, text column, and trailing slot across discovery and search-result lists",
        zh: "机场行现在在发现列表和搜索结果中统一保留固定代码 badge、正文列和右侧占位列",
      },
      {
        en: "The code badge is subtle and token-driven, adding a column anchor without turning the list into boxed cards",
        zh: "代码 badge 保持轻量并沿用 token，只提供列锚点，不把列表变成重盒子",
      },
      {
        en: "The development Query Devtools button no longer covers the left sidebar during local UI review",
        zh: "开发环境的 Query Devtools 按钮不再覆盖本地 UI 检查时的左侧栏",
      },
    ],
  },
  {
    version: "v2.26.2",
    kind: "patch",
    title: {
      en: "Compact sidebar refinement",
      zh: "紧凑侧栏精修",
    },
    summary: {
      en: "The dark sidebar pass now removes heavier separators, neutralizes the chrome hue, tightens mobile landscape width, and restores readable ATC frequency rows.",
      zh: "深色侧栏继续减少厚重分隔符，收回 chrome 色相，压缩移动横屏宽度，并恢复 ATC 频率行的可读展示。",
    },
    highlights: [
      {
        en: "Metric and filter groups use softer internal lines with smaller selected-state margins, so alignment carries more of the structure",
        zh: "指标与筛选组改用更轻的内部线和更小的选中态留白，让结构更多依靠对齐呈现",
      },
      {
        en: "ATC and spotting subviews drop heavy header rules and boxed links while keeping their rows compact and scannable",
        zh: "ATC 与拍机点子页去掉厚重标题线和盒状链接，同时保留紧凑、可扫读的行布局",
      },
      {
        en: "ATC frequency rows now read current frequency fields correctly and avoid duplicate row keys during live refreshes",
        zh: "ATC 频率行现在正确读取当前频率字段，并避免实时刷新时出现重复行 key",
      },
    ],
  },
  {
    version: "v2.26.1",
    kind: "patch",
    title: {
      en: "Sidebar alignment and type polish",
      zh: "侧栏对齐与字号字色打磨",
    },
    summary: {
      en: "The dark-glass interface now tightens first-screen list columns, airport detail search, table colors, and mobile landscape sidebar density.",
      zh: "深色玻璃界面继续收紧首屏列表列线、机场详情搜索框、表格字色，以及移动横屏侧栏密度。",
    },
    highlights: [
      {
        en: "Home airport rows now use fixed code, title, and trailing columns so discovery lists align consistently",
        zh: "首页机场行改为固定 code、标题与右侧箭头列，发现列表不再随机场代码长度漂移",
      },
      {
        en: "Airport detail search is lighter and less pill-shaped, with table headers and row values sharing the same readable dark-sidebar text palette",
        zh: "机场详情搜索框更轻、更少胶囊感，表头与行数据统一到深色侧栏上可读的字色",
      },
      {
        en: "Mobile landscape sidebars spend less vertical space before the nearby table, bringing the header and first rows into the first screen",
        zh: "移动横屏侧栏减少进入邻近表格前的纵向占用，让表头和首行进入首屏",
      },
    ],
  },
  {
    version: "v2.26.0",
    kind: "feat",
    title: {
      en: "Dark glass interface redesign",
      zh: "深色玻璃界面重设计",
    },
    summary: {
      en: "Sidebars, static pages, toolbars, search fields, and settings now share a denser dark-glass interface language inspired by compact professional dashboards.",
      zh: "侧栏、静态页、工具栏、搜索框和设置面板统一到更紧凑的深色玻璃界面语言，接近专业仪表盘的克制密度。",
    },
    highlights: [
      {
        en: "Airport and flight sidebars now use a continuous dark translucent shell with inline metric and filter readouts instead of heavier boxed surfaces",
        zh: "机场和航班侧栏改为连续的深色半透明外壳，指标与筛选保留内联读数，不再依赖厚重盒子表面",
      },
      {
        en: "Home, about, changelog, and other static pages now share the same dark sidebar rhythm while keeping their open list layout",
        zh: "首页、关于、更新日志等静态页统一到同一套深色侧栏节奏，同时保留开放式列表布局",
      },
      {
        en: "Toolbar buttons, search fields, and map settings now use local glass highlights and subtler recessed controls",
        zh: "工具栏按钮、搜索框和地图设置改用局部玻璃高亮与更克制的内凹控件",
      },
    ],
  },
  {
    version: "v2.25.1",
    kind: "patch",
    title: {
      en: "Dense list and metric polish",
      zh: "高密度列表与指标打磨",
    },
    summary: {
      en: "The compact interface pass now tightens nearby rows, removes glass highlights from metric and filter selection states, and quiets search and table-header styling.",
      zh: "极简界面继续收紧邻近列表行，移除指标和筛选选中态的玻璃高光，并让搜索框与表头样式更克制。",
    },
    highlights: [
      {
        en: "Nearby aircraft rows now keep callsign and route on one line, with route rendered as a small badge when route data is available",
        zh: "邻近航班行现在把呼号与航路放在同一行，有航路数据时用小 badge 呈现",
      },
      {
        en: "Metric and filter selected states use a solid compact fill instead of glass sheen or rim shadows",
        zh: "指标与筛选选中态改为紧凑实底，不再使用玻璃高光或边缘阴影",
      },
      {
        en: "Search boxes regain the lighter previous pill rhythm while table headers fall back to a single restrained divider",
        zh: "搜索框恢复更接近之前的轻量胶囊节奏，表头则收回到单条克制分隔线",
      },
    ],
  },
  {
    version: "v2.25.0",
    kind: "feat",
    title: {
      en: "Minimal interface density pass",
      zh: "极简界面密度重设",
    },
    summary: {
      en: "The app interface now favors alignment, thin dividers, compact rows, and quieter surfaces over boxed panels, while preserving the existing typography and map toolbar model.",
      zh: "全站界面改为以对齐、细分隔线、紧凑行和更克制的表面建立秩序，减少盒子式面板，同时保留现有字体与地图工具栏模型。",
    },
    highlights: [
      {
        en: "Home, about, mechanism, changelog, and location-permission pages now share a more compact static-page rhythm",
        zh: "首页、关于、机制、更新日志和定位权限页统一到更紧凑的静态页节奏",
      },
      {
        en: "Airport and aircraft sidebars now use line-first metric, filter, search, and nearby-list layouts",
        zh: "机场与航班侧栏改用以线条和列对齐为主的指标、筛选、搜索和邻近列表布局",
      },
      {
        en: "Map settings now reads like a dense command list instead of grouped option cards",
        zh: "地图设置现在更像高密度命令列表，不再是成组的大号选项卡片",
      },
      {
        en: "Mobile preview and sidebar surfaces keep the same toolbar model with less padding and softer elevation",
        zh: "移动端预览与侧栏继续沿用原工具栏模型，但减少内边距并降低悬浮感",
      },
    ],
  },
  {
    version: "v2.24.5",
    kind: "patch",
    title: {
      en: "Mobile shell video and sidebar fit",
      zh: "移动端视频与侧栏适配",
    },
    summary: {
      en: "Mobile home now loads the aircraft dot-matrix video from the PWA static shell, while landscape sidebars fit the safe area and nearby focused rows keep their numeric columns aligned.",
      zh: "移动端首页现在从 PWA 静态 shell 加载飞机点阵视频；横屏侧栏避开安全区并完整显示首屏内容，邻近列表 focused 行的数值列也保持对齐。",
    },
    highlights: [
      {
        en: "The home aircraft video is visible on mobile and included in the PWA precache with its poster",
        zh: "首页飞机点阵视频现在会在移动端显示，并与 poster 一起进入 PWA 预缓存",
      },
      {
        en: "Mobile landscape airport sidebars fit inside safe-area bounds with the list header visible in the first screen",
        zh: "移动横屏机场侧栏现在落在安全区内，列表表头也能进入首屏",
      },
      {
        en: "Focused nearby rows align missing and unitless values to the same numeric column edge",
        zh: "邻近列表 focused 行的空值和无单位值会对齐到同一数值列边界",
      },
      {
        en: "Map settings now use compact sidebar-style row groups instead of large option cards",
        zh: "地图设置改用更接近侧边栏的紧凑行组，不再是大号选项卡片",
      },
    ],
  },
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
