// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache only the first 20 entries. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Keep entries terse — the long-form story
// belongs in the PR.

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

export const CHANGELOG_INITIAL_LIMIT = 20;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 91;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.19.2",
    kind: "patch",
    title: {
      en: "Brand video refresh",
      zh: "品牌视频刷新",
    },
    summary: {
      en: "The static-page brand background has a regenerated grayscale dither loop from Mixkit stock video, with a smaller 15fps encode for lighter playback.",
      zh: "静态页品牌背景已用 Mixkit 库存视频重新生成灰度点阵循环，并改为更轻的 15fps 编码。",
    },
    highlights: [
      {
        en: "Home, About, Mechanism, and Changelog now share the refreshed airport-and-aircraft dither video and matching poster frame",
        zh: "首页、关于、机制与更新日志现在共用新的机场与飞机点阵视频和同步 poster 帧",
      },
      {
        en: "The loop is preprocessed into H.264 with no audio, lower frame rate, and a much smaller file while keeping the existing cached asset path",
        zh: "循环视频预处理为无音频 H.264、降低帧率并显著缩小文件，同时保留原有缓存资源路径",
      },
    ],
  },
  {
    version: "v2.19.1",
    kind: "feat",
    title: {
      en: "Reporting point previews",
      zh: "报告点预览",
    },
    summary: {
      en: "Airport maps can optionally show OpenAIP reporting points with their own icon treatment and desktop/mobile preview cards.",
      zh: "机场地图现在可按设置显示 OpenAIP 报告点，并使用独立图标样式与桌面端/移动端预览卡。",
    },
    highlights: [
      {
        en: "Reporting points default off and can be enabled from the shared map settings panel",
        zh: "报告点默认关闭，可从共享地图设置面板打开",
      },
      {
        en: "Reporting point map badges use the shared badge base with a signpost icon and a round point marker instead of the navaid diamond",
        zh: "报告点地图标牌复用共享 badge 基座，但使用路牌图标和圆形点位，不再沿用 navaid 菱形",
      },
      {
        en: "Selecting a reporting point opens its own shared-shell desktop or mobile preview card",
        zh: "选中报告点会打开基于共享外壳的专属桌面端或移动端预览卡",
      },
    ],
  },
  {
    version: "v2.19.0",
    kind: "feat",
    title: {
      en: "OurAirports airport names",
      zh: "OurAirports 机场名称",
    },
    summary: {
      en: "Airport names now come from the OurAirports database table instead of OpenAIP, with no OpenAIP name fallback.",
      zh: "机场名称现在来自数据库里的 OurAirports 表，不再回退使用 OpenAIP 名称。",
    },
    highlights: [
      {
        en: "/api/search, /api/airport, and nearby-airport payloads all apply the same OurAirports name lookup",
        zh: "/api/search、/api/airport 和附近机场 payload 都使用同一套 OurAirports 名称查询",
      },
      {
        en: "When an OurAirports name is missing, the API leaves the airport name blank instead of exposing the OpenAIP value",
        zh: "缺少 OurAirports 名称时，API 会留空机场名称，而不是暴露 OpenAIP 值",
      },
    ],
  },
  {
    version: "v2.18.1",
    kind: "patch",
    title: {
      en: "Landscape settings stability",
      zh: "横屏设置稳定性",
    },
    summary: {
      en: "Mobile landscape map settings no longer get stuck saving, and the settings sheet keeps its close button clear of safe-area cutouts.",
      zh: "移动端横屏地图设置不再卡在保存中，设置面板关闭按钮也会避开 safe-area 遮挡。",
    },
    highlights: [
      {
        en: "Server timestamp-only responses no longer mark map settings dirty again",
        zh: "服务端只更新时间戳的响应不再把地图设置重新标记为待保存",
      },
      {
        en: "The map settings sheet now uses native safe-area insets in landscape and exposes a larger glass close target",
        zh: "地图设置面板在横屏下使用原生 safe-area inset，并提供更大的玻璃关闭按钮",
      },
    ],
  },
  {
    version: "v2.18.0",
    kind: "feat",
    title: {
      en: "Progressive changelog loading",
      zh: "更新日志渐进加载",
    },
    summary: {
      en: "The changelog now ships the latest 20 releases in the PWA shell and loads older history only as readers scroll.",
      zh: "更新日志现在只把最新 20 条发布记录放进 PWA 静态壳，读者继续滚动时再加载更早历史。",
    },
    highlights: [
      {
        en: "Static shell version metadata now reads the latest release without importing the complete historical changelog",
        zh: "静态壳版本信息现在只读取最新版本，不再导入完整历史 changelog",
      },
      {
        en: "The /changelog page starts with 20 entries, then reveals older releases in 20-entry batches near the scroll boundary",
        zh: "/changelog 页面先显示 20 条，在接近滚动边界时按 20 条一批继续展开旧版本",
      },
      {
        en: "The package version and baked client changelog version are synchronized for the v2.18.0 minor release",
        zh: "package 版本与客户端内置 changelog 版本已同步到 v2.18.0 小版本发布",
      },
    ],
  },
  {
    version: "v2.17.7",
    kind: "patch",
    title: {
      en: "Viewport scroll cleanup",
      zh: "视口滚动清理",
    },
    summary: {
      en: "The iOS rotation recovery now shares one viewport-scroll reset helper across static and map shells, reducing duplicated platform workaround code.",
      zh: "iOS 旋转恢复现在让静态页和地图壳共用同一个视口滚动重置 helper，减少重复的平台 workaround 代码。",
    },
    highlights: [
      {
        en: "Root and shell scroll resets are centralized in the app-shell viewport helper instead of being repeated in page animation and static shell code",
        zh: "root 与 shell 的滚动重置集中到 app-shell 视口 helper，不再散落在页面入场动画和静态页壳中",
      },
      {
        en: "The delayed iOS recovery passes remain, but their timing now lives in one small utility that can be retuned without hunting through page components",
        zh: "延迟执行的 iOS 恢复步骤保留，但时序集中在一个小工具里，后续调整不需要翻多个页面组件",
      },
    ],
  },
  {
    version: "v2.17.6",
    kind: "patch",
    title: {
      en: "Static page rotation cleanup",
      zh: "静态页旋转清理",
    },
    summary: {
      en: "Home and static pages now clear stale document scroll and keep their sidebar panel height tied to the sampled viewport after repeated iOS PWA rotations.",
      zh: "主页和静态页在 iOS PWA 反复旋转后会清理过期 document 滚动，并让侧栏面板高度继续跟随采样视口。",
    },
    highlights: [
      {
        en: "Route and viewport recovery now resets the document and static sidebar scroll positions in delayed passes, covering iOS adjustments that land after React commits",
        zh: "路由与视口恢复会分阶段重置 document 和静态侧栏滚动位置，覆盖 React 提交后才落下的 iOS 调整",
      },
      {
        en: "The static-page scroll panel now uses `--app-viewport-height` instead of raw `100dvh`, so the shell and scroll owner no longer disagree after rotation",
        zh: "静态页滚动面板现在使用 `--app-viewport-height` 而不是原始 `100dvh`，旋转后外壳和滚动容器不再高度不一致",
      },
    ],
  },
  {
    version: "v2.17.5",
    kind: "patch",
    title: {
      en: "iOS PWA rotation recovery",
      zh: "iOS PWA 旋转恢复",
    },
    summary: {
      en: "Home Screen launches now recover the real portrait layout after repeated rotations, so static pages and airport detail sidebars stop inheriting stale landscape geometry.",
      zh: "主屏启动的 PWA 在反复旋转后会恢复真实竖屏布局，静态页和机场详情侧栏不再继承过期横屏几何。",
    },
    highlights: [
      {
        en: "The app-shell device model now reconciles layout viewport, visualViewport, orientation, and safe-area evidence before choosing mobile or landscape desktop layout",
        zh: "app-shell 设备模型现在会综合 layout viewport、visualViewport、方向和 safe-area 证据，再决定移动端或横屏桌面布局",
      },
      {
        en: "Locked static and map shells use the sampled viewport height so iOS standalone mode cannot leave a stale bottom block after rotation",
        zh: "锁定视口的静态页和地图壳会使用采样后的视口高度，避免 iOS standalone 旋转后留下过期底部白块",
      },
    ],
  },
  {
    version: "v2.17.4",
    kind: "patch",
    title: {
      en: "Mobile dock and sidebar gestures",
      zh: "移动端 Dock 与侧栏手势",
    },
    summary: {
      en: "Mobile bottom chrome now clamps rotated iOS safe-area offsets, and collapsible sidebars wait for a fresh scroll gesture after reaching the end.",
      zh: "移动端底部浮层现在会夹住旋转后的 iOS safe-area 偏移；可收起侧栏也会等到底部后的下一次主动滑动再缩小。",
    },
    highlights: [
      {
        en: "Bottom toolbars, preview cards, and map scale labels share a capped safe-area offset so rotation cannot leave a large blank strip below them",
        zh: "底部工具栏、预览卡和地图比例尺共用受限的 safe-area 偏移，旋转后不会在下方留下大块空白",
      },
      {
        en: "Desktop collapsible sidebars only shrink when the wheel or touch gesture starts at the true bottom",
        zh: "桌面可收起侧栏只有在滚轮或触摸手势从真正底部开始时才会缩小",
      },
    ],
  },
  {
    version: "v2.17.3",
    kind: "patch",
    title: {
      en: "Home Screen app update handoff",
      zh: "主屏应用更新接管",
    },
    summary: {
      en: "The Home Screen app now lets the newest static shell service worker activate immediately, so mobile pages stop staying on an older cached toolbar layout.",
      zh: "主屏应用现在会让最新静态壳 service worker 立即激活，避免移动端页面长期停留在旧缓存工具栏布局。",
    },
    highlights: [
      {
        en: "New service workers skip the waiting phase and claim same-origin pages after activation",
        zh: "新的 service worker 会跳过等待阶段，并在激活后接管同源页面",
      },
      {
        en: "Live aviation API and WebSocket paths remain network-only",
        zh: "实时航空 API 和 WebSocket 路径仍保持只走网络",
      },
    ],
  },
  {
    version: "v2.17.2",
    kind: "patch",
    title: {
      en: "Static-page iOS viewport lock",
      zh: "静态页 iOS 视口锁定",
    },
    summary: {
      en: "Home and static pages now keep the document viewport locked after returning from a rotated airport map, preventing the bottom toolbar from revealing a white safe-area block.",
      zh: "从旋转过的机场地图返回后，首页和静态页现在会继续锁住 document 视口，避免底部工具栏露出白色安全区块。",
    },
    highlights: [
      {
        en: "The dither static shell now uses the same document overscroll lock as the full-screen map shell while preserving its own panel scrolling",
        zh: "静态 dither 壳现在和全屏地图壳一样锁住 document overscroll，同时保留面板自身滚动",
      },
      {
        en: "This targets the rotate-map, open-sidebar, return-home path that could leave iOS showing a bottom white block behind the floating toolbar",
        zh: "这个修复针对“旋转地图、打开侧边栏、回首页”路径下 iOS 底部工具栏后方出现白块的问题",
      },
    ],
  },
  {
    version: "v2.17.1",
    kind: "patch",
    title: {
      en: "Mobile static-page toolbar spacing",
      zh: "移动端静态页工具栏留白修正",
    },
    summary: {
      en: "Mobile Home and static pages no longer reserve a visible white block behind the floating bottom toolbar after scrolling or interacting.",
      zh: "移动端首页和静态页在滚动或操作后，不再在底部悬浮工具栏后方预留可见白块。",
    },
    highlights: [
      {
        en: "The static-page scroll panel now uses scroll padding instead of visible bottom padding, so content can continue behind the floating toolbar",
        zh: "静态页滚动面板改用 scroll padding，而不是可见底部 padding，让内容可以继续延伸到悬浮工具栏后方",
      },
      {
        en: "Programmatic scroll and focus positioning still keep toolbar clearance without pushing the page content upward",
        zh: "程序化滚动和聚焦仍保留工具栏避让距离，但不会把页面内容整体向上顶",
      },
    ],
  },
  {
    version: "v2.17.0",
    kind: "feat",
    title: {
      en: "Offline static shell",
      zh: "静态页面离线壳",
    },
    summary: {
      en: "Home, About, Mechanism, and Changelog can now reopen from the local app shell, with the homepage branding video cached for offline starts while live aviation data remains network-only.",
      zh: "首页、关于、机制和更新日志现在可以从本地应用壳重新打开；首页品牌视频会为离线启动缓存，而实时航空数据仍保持只走网络。",
    },
    highlights: [
      {
        en: "The Vite build emits a small service worker that precaches the static-page shell, icons, manifest, and homepage branding video",
        zh: "Vite 构建会产出一个小型 service worker，预缓存静态页面壳、图标、manifest 和首页品牌视频",
      },
      {
        en: "API routes, WebSocket traffic, runtime env, and version checks stay network-only so stale aircraft positions, METAR, airport traffic, and flight status are not replayed offline",
        zh: "API 路由、WebSocket 流量、运行时环境和版本检查继续只走网络，避免离线回放过期飞机位置、METAR、机场流量和航班状态",
      },
      {
        en: "Railway static serving now gives hashed assets immutable cache headers while SPA HTML stays no-store",
        zh: "Railway 静态服务现在为带 hash 的资源设置 immutable 缓存头，同时 SPA HTML 保持 no-store",
      },
    ],
  },
  {
    version: "v2.16.2",
    kind: "patch",
    title: {
      en: "Route provider exclusivity fixes",
      zh: "航路数据源互斥修正",
    },
    summary: {
      en: "FlightAware and adsbdb route lookup now stay mutually exclusive, and static-page brand docks no longer gain an extra divider line.",
      zh: "FlightAware 与 adsbdb 航路查询现在保持互斥，静态页品牌栏也不再多出额外分隔线。",
    },
    highlights: [
      {
        en: "FlightAware route mode no longer subscribes to adsbdb route channels or accepts adsbdb cached routes as a fallback",
        zh: "FlightAware 航路模式不再订阅 adsbdb 航路频道，也不会把 adsbdb 缓存航路当作 fallback",
      },
      {
        en: "Home and static pages keep the clean brand dock without the sidebar divider rule",
        zh: "首页和静态页保持干净的品牌栏，不再添加侧栏分隔横线",
      },
    ],
  },
  {
    version: "v2.16.1",
    kind: "patch",
    title: {
      en: "Mobile sidebar scroll fixes",
      zh: "移动端侧栏滚动修正",
    },
    summary: {
      en: "Landscape mobile collapsed sidebars no longer leave a scrollable transparent hit area, and portrait static pages keep the compact sticky logo while scrolling.",
      zh: "移动端横屏侧栏收起后不再留下透明可滚动命中区域；竖屏静态页面滚动时继续保留置顶并缩小的 Logo。",
    },
    highlights: [
      {
        en: "Collapsed landscape map sidebars shrink their shell to the pill height so touches beneath the pill return to the map",
        zh: "横屏地图侧栏收起后，外壳会缩到胶囊高度，胶囊下方触摸回到地图",
      },
      {
        en: "Mobile static pages keep the frosted panel as the scroll owner so the brand dock stays sticky and compacts on scroll",
        zh: "移动端静态页继续由磨砂面板负责滚动，让品牌栏保持置顶并在滚动时缩小",
      },
    ],
  },
  {
    version: "v2.16.0",
    kind: "feat",
    title: {
      en: "Collapsible sidebars and faster map controls",
      zh: "可收起侧栏与更快地图控件",
    },
    summary: {
      en: "Airport, flight, Plane Hunter, and static-page sidebars now share the same compact collapse behavior, while map taps avoid unwanted recentering and the view-range toolbar responds faster.",
      zh: "机场、航班、拍机入口和静态页面侧栏现在共用同一套紧凑收起行为；地图点击不会意外重心移动，视野范围工具栏响应也更快。",
    },
    highlights: [
      {
        en: "The airport identity, filters, table headers, and nearby rows move together instead of keeping a fixed table head above an inner list",
        zh: "机场身份、筛选器、表头和附近目标会一起滚动，不再把表头固定在内部列表上方",
      },
      {
        en: "At the true bottom of a desktop sidebar, one more upward scroll collapses it to the same pill-style ADSBao mark used across map and static pages",
        zh: "桌面侧栏真正滚到底后，再向上滑一次会收起为地图页和静态页一致的胶囊式 ADSBao 标识",
      },
      {
        en: "Selecting aircraft, airport, navaid, runway, or watching-spot map elements no longer asks the map to pan itself into focus",
        zh: "选择飞机、机场、导航点、跑道或拍摄点等地图元素时，不再触发地图自动平移聚焦",
      },
      {
        en: "Map range toolbar taps skip the old long-press progress animation path and defer heavier fit work so pointer interactions paint sooner",
        zh: "地图视野范围按钮跳过旧的长按进度动画路径，并延后较重的 fit 计算，让 pointer 交互更快完成绘制",
      },
    ],
  },
  {
    version: "v2.15.6",
    kind: "patch",
    title: {
      en: "Unified layout profile",
      zh: "统一布局 Profile",
    },
    summary: {
      en: "Home, airport, flight, preview, Plane Hunter, and near-me surfaces now share the same client-device layout profile, with a duplicate historical changelog version cleaned up.",
      zh: "主页、机场、航班、预览卡、拍机入口和附近页面现在共用同一套客户端设备布局 profile，同时清理了一处历史 changelog 版本重复。",
    },
    highlights: [
      {
        en: "Airport and flight shells derive mobile, desktop, and landscape-phone sidebar modes from the shared app-shell device model",
        zh: "机场和航班外壳改由共享 app-shell 设备模型决定移动端、桌面端和手机横屏侧栏模式",
      },
      {
        en: "Plane Hunter and the near-me location flow no longer keep separate device heuristics from the rest of the app",
        zh: "拍机入口和附近位置流程不再维护独立于应用其它部分的设备判断",
      },
      {
        en: "The version update toast fix and Better Stack duration parser patch now have distinct historical patch entries",
        zh: "版本更新提示修复与 Better Stack duration 解析修复现在各自对应独立的历史 patch 条目",
      },
    ],
  },
  {
    version: "v2.15.5",
    kind: "patch",
    title: {
      en: "Rotation scroll recovery",
      zh: "旋转滚动恢复",
    },
    summary: {
      en: "Airport and flight maps now clear stale page and sidebar scroll after repeated phone rotations, keeping the landscape shell pinned to the viewport.",
      zh: "机场和航班地图现在会在手机多次旋转后清理残留页面与侧栏滚动，让横屏地图外壳固定在可视区域。",
    },
    highlights: [
      {
        en: "The full-screen landscape map shell participates in the same document scroll lock as portrait map pages",
        zh: "横屏全屏地图外壳与竖屏地图页使用同一套 document 滚动锁",
      },
      {
        en: "Returning to landscape resets the sidebar scroll position so the header does not reopen midway down the panel",
        zh: "回到横屏时会重置侧栏滚动位置，避免侧栏从面板中段重新打开",
      },
    ],
  },
  {
    version: "v2.15.4",
    kind: "patch",
    title: {
      en: "Preview and dither polish",
      zh: "预览卡与点阵背景打磨",
    },
    summary: {
      en: "Landscape preview cards now sit on the same lower edge as the sidebar, and the home dither animation fills behind the floating panel without a poster-frame ghost.",
      zh: "横屏预览卡现在与侧栏下缘对齐，主页点阵动画会铺到浮动面板背后，并去掉首帧重影。",
    },
    highlights: [
      {
        en: "Compact mobile preview cards in landscape keep horizontal safe-area offsets while aligning their bottom edge with the sidebar",
        zh: "横屏紧凑移动预览卡保留左右 safe-area 偏置，同时底边与侧栏对齐",
      },
      {
        en: "The dither video loads directly, stays hidden until ready, and fills the static-page shell behind the frosted sidebar",
        zh: "点阵视频直接加载、未就绪前隐藏，并铺满静态页外壳、位于磨砂侧栏背后",
      },
    ],
  },
  {
    version: "v2.15.3",
    kind: "patch",
    title: {
      en: "Rotation recovery",
      zh: "旋转恢复稳定性",
    },
    summary: {
      en: "Airport and flight pages now recover their mobile or landscape layout after rotation, reversed orientation, and app focus changes.",
      zh: "机场页和航班页现在会在旋转、倒转和切出切回后恢复到对应的移动端或横屏布局。",
    },
    highlights: [
      {
        en: "Portrait phones no longer keep the landscape desktop sidebar when the browser reports a stale visual viewport",
        zh: "当浏览器短暂保留旧的 visual viewport 时，手机竖屏不会继续停留在横屏桌面侧栏布局",
      },
      {
        en: "The layout profile is resampled after orientation, focus, visibility, and page restore events so safe-area edges settle correctly",
        zh: "布局 profile 会在旋转、聚焦、可见性变化和页面恢复后重新采样，让 safe-area 方向稳定回正",
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
