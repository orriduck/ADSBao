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
export const CHANGELOG_TOTAL_COUNT = 98;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.21.1",
    kind: "patch",
    title: {
      en: "Photo location navigation",
      zh: "拍机点导航",
    },
    summary: {
      en: "Photo locations now open a navigation chooser with system maps and Google Maps options.",
      zh: "点击拍机点现在会打开导航选择，可用系统地图或 Google Maps 导航到该位置。",
    },
    highlights: [
      {
        en: "Selecting a photo location keeps the existing preview while opening a focused directions modal",
        zh: "选中拍机点时保留现有预览，同时弹出聚焦的路线选择窗口",
      },
      {
        en: "System Maps uses the device-native map route where available, with Google Maps as a separate option",
        zh: "系统地图优先使用设备原生地图路线，Google Maps 作为独立选项提供",
      },
    ],
  },
  {
    version: "v2.21.0",
    kind: "feat",
    title: {
      en: "Curated photo locations",
      zh: "机场拍机点",
    },
    summary: {
      en: "Watcher Mode now reads curated photo locations from Railway Postgres through ADSBao's canonical airport identity layer.",
      zh: "看客模式现在通过 ADSBao 的 canonical airport identity 层，从 Railway Postgres 读取机场拍机点。",
    },
    highlights: [
      {
        en: "Airport detail responses include spotterLocations resolved by ICAO, IATA, or canonical ident aliases instead of loading static JSON files in the browser",
        zh: "机场详情响应会通过 ICAO、IATA 或 canonical ident 别名返回 spotterLocations，不再由浏览器加载静态 JSON 文件",
      },
      {
        en: "The old OSM-inferred candidate spot files have been replaced by curated rows stored under the spotter schema with canonical airport_ident keys",
        zh: "旧的 OSM 推测候选点文件已替换为存储在 spotter schema 下的精选拍机点数据，并使用 canonical airport_ident key",
      },
    ],
  },
  {
    version: "v2.20.0",
    kind: "feat",
    title: {
      en: "Canonical airport identity",
      zh: "机场身份统一层",
    },
    summary: {
      en: "Airport lookups now resolve ICAO, IATA, OurAirports, and OpenAIP aliases through a shared canonical identity layer before reading source-specific data.",
      zh: "机场查询现在先通过共享的 canonical identity 层解析 ICAO、IATA、OurAirports 与 OpenAIP 别名，再读取各来源数据。",
    },
    highlights: [
      {
        en: "Railway Postgres now has aviation.airports and aviation.airport_aliases so airport-related tables no longer need each DAO to reinterpret its own identifier columns",
        zh: "Railway Postgres 新增 aviation.airports 与 aviation.airport_aliases，让机场相关表不再由每个 DAO 各自解释 identifier 字段",
      },
      {
        en: "Airport names, runway geometry, and OurAirports frequencies resolve through the same alias cache, so IATA and ICAO inputs map back to the same canonical airport",
        zh: "机场名称、跑道几何与 OurAirports 频率都通过同一个 alias cache 解析，因此 IATA 与 ICAO 输入会映射回同一个 canonical airport",
      },
    ],
  },
  {
    version: "v2.19.6",
    kind: "patch",
    title: {
      en: "Homepage video cache refresh",
      zh: "首页视频缓存刷新",
    },
    summary: {
      en: "The homepage branding video now uses a new asset URL so stale browser and PWA caches fetch the refreshed file.",
      zh: "首页品牌视频现在使用新的资源 URL，让旧的浏览器和 PWA 缓存能拉到刷新后的文件。",
    },
    highlights: [
      {
        en: "Renamed the homepage MP4 asset and updated the video component, service worker video path, and precache list together",
        zh: "重命名首页 MP4 资源，并同步更新视频组件、service worker 视频路径和预缓存列表",
      },
      {
        en: "The package version and changelog version are bumped together so the update toast can prompt old tabs to refresh",
        zh: "同步提升 package 版本和 changelog 版本，让旧页面能通过更新提示刷新",
      },
    ],
  },
  {
    version: "v2.19.5",
    kind: "patch",
    title: {
      en: "Static sidebar bottom placeholder",
      zh: "静态侧栏底部占位",
    },
    summary: {
      en: "Static mobile sidebars such as About now keep the same 96px scroll-end placeholder used by map sidebars.",
      zh: "关于等静态页移动侧栏现在也使用与地图侧栏一致的 96px 滚动末尾占位。",
    },
    highlights: [
      {
        en: "The DitherPageShell panel now has visible bottom padding on mobile so the last source, mechanism, or changelog rows can scroll above the page toolbar",
        zh: "DitherPageShell 面板在移动端现在有可见底部 padding，让最后的来源、机制或更新日志条目能滚到页面工具栏上方",
      },
      {
        en: "The same bottom-placeholder token drives static, airport, and flight sidebars without changing their scroll owners",
        zh: "静态页、机场页和航班页侧栏共用同一个底部占位 token，同时不改变滚动容器归属",
      },
    ],
  },
  {
    version: "v2.19.4",
    kind: "patch",
    title: {
      en: "Mobile sidebar bottom clearance",
      zh: "移动侧栏底部留白",
    },
    summary: {
      en: "Mobile airport and flight sidebars now keep a 96px scroll-end placeholder so bottom content clears the fixed toolbar.",
      zh: "移动端机场与航班侧栏在内容末尾保留 96px 滚动占位，避免底部内容被固定工具栏挡住。",
    },
    highlights: [
      {
        en: "The shared mobile sidebar panels use a dedicated bottom-placeholder token while preserving the existing single scroll owner",
        zh: "共享移动侧栏面板改用专门的底部占位 token，同时保留现有单一滚动容器",
      },
      {
        en: "Scroll padding matches the placeholder so focus and programmatic scroll positions also clear the bottom toolbar",
        zh: "scroll padding 与占位高度保持一致，让聚焦和程序滚动位置也能避开底部工具栏",
      },
    ],
  },
  {
    version: "v2.19.3",
    kind: "patch",
    title: {
      en: "Sidebar and dither polish",
      zh: "侧栏与点阵打磨",
    },
    summary: {
      en: "Sidebar panels suppress visible scrollbar chrome, and the brand dither loop now uses a finer grayscale dot matrix with clearer aircraft and airport detail.",
      zh: "侧栏隐藏可见滚动条，品牌点阵循环也改为更细的灰度点阵，让飞机与机场细节更清楚。",
    },
    highlights: [
      {
        en: "Desktop and mobile sidebar scroll owners now hide WebKit, Firefox, and legacy Edge scrollbar tracks without changing overflow ownership",
        zh: "桌面端与移动端侧栏滚动容器现在会隐藏 WebKit、Firefox 和旧 Edge 滚动条，同时不改变滚动归属",
      },
      {
        en: "Static pages keep the same cached brand video path, but the regenerated 2px grayscale matrix preserves more runway, window, and aircraft silhouette texture",
        zh: "静态页保留同一个品牌视频缓存路径，但重新生成的 2px 灰度点阵保留了更多跑道、舷窗与飞机轮廓纹理",
      },
    ],
  },
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
