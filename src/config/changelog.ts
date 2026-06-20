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
export const CHANGELOG_TOTAL_COUNT = 109;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.22.10",
    kind: "patch",
    title: {
      en: "Tracking route and trace stability",
      zh: "追踪页航线与轨迹稳定性",
    },
    summary: {
      en: "Aircraft tracking now keeps its realtime connection state, FlightAware routes, and turning trace samples stable while the focused flight is prioritized.",
      zh: "飞机追踪页现在会稳定保持实时连接状态、FlightAware 航线和转弯轨迹点，并优先获取焦点航班航线。",
    },
    highlights: [
      {
        en: "Stale WebSocket callbacks can no longer overwrite the active tracking connection with a reconnecting state",
        zh: "旧 WebSocket 回调不再能把当前追踪连接覆盖成重新连接状态",
      },
      {
        en: "FlightAware routes stay visible across tracking-center drift and focused callsigns move to the front of the route lookup queue",
        zh: "FlightAware 航线会在追踪中心移动后继续显示，焦点航班号也会排在航线查询队列前面",
      },
      {
        en: "Live tracking traces keep finer turn samples so curves stop reshaping around the latest minute bucket",
        zh: "实时追踪轨迹会保留更细的转弯采样，曲线不再围绕最新分钟桶反复修正",
      },
    ],
  },
  {
    version: "v2.22.9",
    kind: "patch",
    title: {
      en: "Airspace carousel and sidebar gestures",
      zh: "空域轮播与侧栏手势",
    },
    summary: {
      en: "Airspace previews now use compact dot carousel controls, and sidebar collapse requires a clearer bottom-edge gesture.",
      zh: "空域预览现在使用更紧凑的点控轮播，侧栏缩起也需要更明确的底部二次手势。",
    },
    highlights: [
      {
        en: "Mobile airspace preview cards stay near the top of the screen and can be changed by swipe, trackpad wheel, or tapping dots",
        zh: "移动端空域预览卡保持在屏幕上方，可通过横向滑动、触控板滚动或点按圆点切换",
      },
      {
        en: "Trackpad carousel gestures advance one card per gesture while still recognizing a second deliberate quick swipe",
        zh: "触控板轮播手势每次只前进一张，同时仍能识别明确的第二次快滑",
      },
      {
        en: "Sidebar collapse no longer fires from the same scroll that merely reaches the bottom, and small bottom-edge scrolls are ignored",
        zh: "侧栏不会再因为同一段滚动刚到达底部就缩起，底部的小幅滚动也会被忽略",
      },
    ],
  },
  {
    version: "v2.22.8",
    kind: "patch",
    title: {
      en: "OpenAIP airspace access metadata",
      zh: "OpenAIP 空域准入信息",
    },
    summary: {
      en: "Airport airspace previews now preserve OpenAIP class, vertical limits, and access status from the data-service payload.",
      zh: "机场空域预览现在会保留 data-service payload 中的 OpenAIP 等级、高度范围和准入状态。",
    },
    highlights: [
      {
        en: "Class B/C/D/E airspaces now display as controlled airspace instead of falling back to status unknown",
        zh: "B/C/D/E 类空域现在显示为管制空域，不再回退成状态未明",
      },
      {
        en: "OpenAIP lower and upper limits are carried through the Go data-service for the preview card and map overlay model",
        zh: "OpenAIP 下限和上限会经由 Go data-service 保留给预览卡和地图覆盖模型使用",
      },
      {
        en: "Restricted, danger, and temporary airspaces keep their active-window and dynamic-status access classification",
        zh: "限制区、危险区和临时空域保留活动时段与动态状态的准入分类",
      },
    ],
  },
  {
    version: "v2.22.7",
    kind: "patch",
    title: {
      en: "Metric card count transitions",
      zh: "指标卡数字过渡",
    },
    summary: {
      en: "Airport sidebar metric cards keep their compact count transitions while dense lists and row headers stay on static numbers.",
      zh: "机场侧栏指标卡保留紧凑的数字过渡动画，同时高密度列表和行表头继续使用静态数字。",
    },
    highlights: [
      {
        en: "Restored NumberFlow only on the small metric-card count surface",
        zh: "只在少量指标卡计数区域恢复 NumberFlow",
      },
      {
        en: "Nearby list rows and table summary counts remain static to avoid extra work in the dense scrolling path",
        zh: "附近列表行和表格汇总计数保持静态，避免给高密度滚动路径增加额外工作",
      },
      {
        en: "The heavier aircraft light animation reduction from v2.22.6 remains unchanged",
        zh: "v2.22.6 中更重的飞机灯效减负保持不变",
      },
    ],
  },
  {
    version: "v2.22.6",
    kind: "patch",
    title: {
      en: "Viewport-bounded inferred motion",
      zh: "视口内推断动画",
    },
    summary: {
      en: "Aircraft motion keeps inferred animation for smooth movement, while dense mobile maps skip extrapolation work for aircraft outside the current viewport.",
      zh: "飞机移动保留推断动画以保持流畅，同时高密度移动端地图会跳过当前视口外飞机的外推开销。",
    },
    highlights: [
      {
        en: "Visible and near-viewport aircraft use shared inferred motion again instead of snapshot-only jumps",
        zh: "可见和接近视口的飞机重新使用共享推断动画，不再只按快照跳动",
      },
      {
        en: "Aircraft outside the viewport settle directly to the latest real position until a later snapshot brings them into view",
        zh: "视口外飞机会直接落到最新真实位置，直到之后的快照进入视口再开始推断",
      },
      {
        en: "The shared marker frame loop now uses epoch time, so aircraft markers move with inferred trace heads instead of freezing at the latest snapshot",
        zh: "共享 marker 帧循环现在使用 epoch 时间，飞机本体会跟随推断轨迹头部移动，不再停在最新快照点",
      },
      {
        en: "Dense maps no longer render wingtip, side, beacon, or strobe light animations; daytime markers have no light effect and night markers keep a static headlight only",
        zh: "高密度地图不再渲染翼尖、侧边、防撞灯或频闪动画；日间飞机没有灯效，夜间只保留静态头灯",
      },
    ],
  },
  {
    version: "v2.22.5",
    kind: "patch",
    title: {
      en: "Stable aircraft marker updates",
      zh: "飞机标记位置稳定性",
    },
    summary: {
      en: "Dense airport maps now update aircraft markers only from fresh snapshots, removing the visual extrapolation path that could lag the map and animate markers backward.",
      zh: "高密度机场地图现在只按最新快照更新飞机标记，移除会拖慢地图并让标记倒退的视觉外推路径。",
    },
    highlights: [
      {
        en: "Aircraft markers no longer keep per-marker correction animation work alive between traffic snapshots",
        zh: "飞机标记不再在交通快照之间保留逐标记位置修正动画",
      },
      {
        en: "Flight tracking map focus also follows snapshot positions instead of extrapolated visual correction",
        zh: "航班跟踪页的地图焦点也改为跟随快照位置，不再使用外推视觉修正",
      },
      {
        en: "The stale prediction path that could ease a marker back from an overshot position has been removed",
        zh: "会把标记从外推过头的位置缓慢拉回的旧预测路径已移除",
      },
    ],
  },
  {
    version: "v2.22.4",
    kind: "patch",
    title: {
      en: "JFK map and FlightAware route relief",
      zh: "JFK 地图与 FlightAware 航路减负",
    },
    summary: {
      en: "Dense airport maps reduce idle marker animation work, and FlightAware route lookup stays on the private service instead of hedging with ADSBDB.",
      zh: "高密度机场地图减少空闲飞机标记动画开销，FlightAware 航路查询也只走私有服务，不再同时请求 ADSBDB。",
    },
    highlights: [
      {
        en: "Aircraft markers now stop their animation frame loop when correction and extrapolation are no longer needed",
        zh: "飞机标记在不再需要位置修正或外推时会停止 animation frame 循环",
      },
      {
        en: "FlightAware route provider calls no longer create parallel ADSBDB fallback requests",
        zh: "FlightAware 航路 provider 不再额外创建并行 ADSBDB 兜底请求",
      },
      {
        en: "Route pending lookup scans skip cached and blocked callsigns before distance ranking",
        zh: "航路待查询扫描会先跳过已缓存或已阻塞的呼号，再做距离排序",
      },
    ],
  },
  {
    version: "v2.22.3",
    kind: "patch",
    title: {
      en: "Route fetch parallel hedge",
      zh: "航路请求并行提速",
    },
    summary: {
      en: "FlightAware route queries now run in parallel with ADSBDB fallback, cutting tail latency on FA timeouts.",
      zh: "FlightAware 航路查询现在与 ADSBDB 兜底并行运行，减少 FA 超时时的尾延迟。",
    },
    highlights: [
      {
        en: "When RouteProvider is FlightAware, both FA and ADSBDB fire simultaneously; FA wins on success, ADSBDB serves as instant fallback",
        zh: "RouteProvider 为 FlightAware 时，FA 与 ADSBDB 同时发起；FA 成功即返回，失败则 ADSBDB 作为即时兜底",
      },
      {
        en: "Eliminates the serial wait for ADSBDB after an FA failure, making route polling more resilient under degraded conditions",
        zh: "消除了 FA 失败后串行等待 ADSBDB 的步骤，让航路轮询在降级情况下更稳定",
      },
    ],
  },
  {
    version: "v2.22.2",
    kind: "patch",
    title: {
      en: "FlightAware private-service efficiency",
      zh: "FlightAware 私有服务提速",
    },
    summary: {
      en: "FlightAware callsign fallback now starts in parallel with ADS-B tracking, and the deployment docs keep the private endpoint in the same Railway project.",
      zh: "FlightAware 呼号兜底现在会和 ADS-B 跟踪并行启动，部署文档也明确私有 endpoint 放在同一个 Railway project。",
    },
    highlights: [
      {
        en: "When ADS-B returns empty, the app can reuse an already-started FlightAware fallback request instead of waiting for another serial round trip",
        zh: "当 ADS-B 返回空结果时，app 会复用已启动的 FlightAware 兜底请求，不再等下一轮串行请求",
      },
      {
        en: "ADS-B still wins when it has a real aircraft result, and the pending FlightAware request is canceled without logging a provider error",
        zh: "ADS-B 有真实飞机结果时仍然优先，并会取消待处理的 FlightAware 请求且不记录为 provider error",
      },
      {
        en: "FlightAware route and callsign calls now share one private-service remote client",
        zh: "FlightAware 航路与呼号请求现在共用同一个 private-service remote client",
      },
    ],
  },
  {
    version: "v2.22.1",
    kind: "patch",
    title: {
      en: "Photo location directions trigger",
      zh: "拍机点前往按钮",
    },
    summary: {
      en: "Photo locations now show their preview first; the directions chooser opens only from the Go button.",
      zh: "点击拍机点现在先显示预览卡，只有点“前往”按钮才会打开导航选择。",
    },
    highlights: [
      {
        en: "Selecting a photo location no longer opens the navigation modal immediately",
        zh: "选中拍机点时不再立刻弹出导航窗口",
      },
      {
        en: "Desktop and mobile previews use a dedicated Go action before showing map-app choices",
        zh: "桌面和移动端预览卡都会先显示独立的“前往”操作，再进入地图应用选择",
      },
    ],
  },
  {
    version: "v2.22.0",
    kind: "feat",
    title: {
      en: "Private FlightAware service",
      zh: "FlightAware 私有服务",
    },
    summary: {
      en: "FlightAware-backed lookups now go through a private Railway service instead of public ADSBao code.",
      zh: "FlightAware 相关查询现在走私有 Railway 服务，不再由公共 ADSBao 代码直接访问上游。",
    },
    highlights: [
      {
        en: "Callsign fallback, FlightAware route lookup, and airline logos share the same private REST boundary",
        zh: "呼号兜底、FlightAware 航路查询和航司 logo 都统一到私有 REST 边界",
      },
      {
        en: "The public data-service keeps only remote client code and feature-gated wiring",
        zh: "公共 data-service 只保留远端 client 和 feature gate 接线",
      },
    ],
  },
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
