// Product release history rendered by `/changelog`. This is the
// source of truth — keep new releases here instead of editing a
// markdown file. Each release has a `kind` ("feat" | "patch" |
// "breaking"), a one-line `summary`, and a small set of high-level
// `highlights` bullets. Keep entries terse — the long-form story
// belongs in the PR.

export type LocalizedText = string | { en: string; zh: string };

export type ChangelogEntry = {
  version: string;
  kind: "feat" | "patch" | "breaking";
  title: LocalizedText;
  summary?: LocalizedText;
  highlights: LocalizedText[];
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

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v2.7.4",
    kind: "patch",
    title: {
      en: "Aircraft exterior navigation & anti-collision lights",
      zh: "飞机外部航行灯与防撞灯",
    },
    summary: {
      en: "Every silhouette icon now renders realistic navigation lights (red/green/white position lights, red flashing beacons, white strobes, landing and taxi lights) driven by ADS-B flight phase. Lighting anchors are auto-generated for all 178 aircraft types.",
      zh: "每个飞机剪影图标现在渲染真实的航行灯光（红/绿/白航行灯、红色闪烁防撞灯、白色频闪灯、着陆灯和滑行灯），由 ADS-B 飞行阶段驱动。灯光锚点为全部 178 种机型自动生成。",
    },
    highlights: [
      {
        en: "10 light types with correct colors and blink patterns: nav left (red steady), nav right (green steady), nav tail (white steady), beacon top/bottom (red ~1 Hz flash), strobe left/right (white ~2 Hz double-flash), landing (white steady + glow), taxi, logo",
        zh: "10 种灯光，颜色与闪烁行为正确：左航行灯（红常亮）、右航行灯（绿常亮）、尾航行灯（白常亮）、上下防撞灯（红 ~1Hz 闪烁）、左右频闪灯（白 ~2Hz 双闪）、着陆灯（白常亮+光晕）、滑行灯、Logo 灯",
      },
      {
        en: "Flight phase classifier maps ADS-B onGround / velocity / baroAltitude to parked → taxi → climb → cruise → descent light states per FAA AIM 4-3-23",
        zh: "飞行阶段推断器根据 ADS-B onGround / 速度 / 气压高度映射至停放→滑行→爬升→巡航→下降灯光状态，符合 FAA AIM 4-3-23",
      },
      {
        en: "5 new lighting anchors (topBeacon, bottomBeacon, landingLight, taxiLight, logoLight) auto-generated for all 178 aircraft icons via the anchor generator script",
        zh: "5 个新灯光锚点（顶部防撞灯、底部防撞灯、着陆灯、滑行灯、Logo灯）通过锚点生成脚本为全部 178 个飞机图标自动生成",
      },
      {
        en: "Airport detail now returns runway geometry before the optional OpenStreetMap surface layer, so the focused airport's runways render without waiting on slow Overpass responses",
        zh: "机场详情现在先返回跑道几何，再异步补充可选的 OpenStreetMap 地面图层；主机场跑道不再等待较慢的 Overpass 响应",
      },
    ],
  },
  {
    version: "v2.7.3",
    kind: "patch",
    title: {
      en: "Dev console warnings cleanup",
      zh: "开发控制台警告清理",
    },
    summary: {
      en: "Fixed WebSocket connection failure in local dev (Vite proxy origin mismatch), replaced Clerk structural CSS overrides with the official appearance API, and added the modern mobile-web-app-capable meta tag.",
      zh: "修复本地开发中 WebSocket 连接失败（Vite 代理 origin 不匹配），用 Clerk 官方 appearance API 替代结构性 CSS 覆盖，补充了新的 mobile-web-app-capable meta 标签。",
    },
    highlights: [
      {
        en: "WebSocket no longer fails on localhost — Vite proxy changeOrigin sent localhost:8081 as Origin which the Go WS handler rejected; added to the allowed origins list",
        zh: "WebSocket 在本地不再失败——Vite 代理的 changeOrigin 将 Origin 改为 localhost:8081 被 Go WS handler 拒绝，已加入允许列表",
      },
      {
        en: "Clerk avatar sizing now uses the appearance.elements API instead of targeting internal .cl-avatarBox CSS classes, silencing the structural CSS warning",
        zh: "Clerk 头像大小现使用 appearance.elements API 而非 .cl-avatarBox 内部 CSS 选择器，消除结构性 CSS 警告",
      },
      {
        en: "Added deprecated mobile-web-app-capable meta tag alongside the aging apple-mobile-web-app-capable",
        zh: "在过时的 apple-mobile-web-app-capable 旁补充了新的 mobile-web-app-capable meta 标签",
      },
    ],
  },
  {
    version: "v2.7.2",
    kind: "patch",
    title: {
      en: "Nearby airport runway geometry fix",
      zh: "附近机场跑道几何修复",
    },
    summary: {
      en: "Nearby airports in here mode now use stored OurAirports runway geometry when available, so large airports no longer render as synthetic star-shaped runway clusters.",
      zh: "here 模式的附近机场现在会优先使用已存储的 OurAirports 跑道几何，大型机场不再显示为合成的星型跑道簇。",
    },
    highlights: [
      {
        en: "The Railway data-service now batch-loads stored runway maps for nearby airport results and omits runway lines when stored geometry is unavailable, instead of showing OpenAIP heading-based approximations",
        zh: "Railway data-service 会为附近机场结果批量读取已存储的跑道图；没有存储几何时会省略跑道线，不再显示 OpenAIP 基于航向的近似跑道",
      },
      {
        en: "Fixes KBOS near the user's location showing a centered star pattern instead of the real runway layout",
        zh: "修复用户位置附近的 KBOS 显示成围绕中心展开的星型，而不是实际跑道布局的问题",
      },
    ],
  },
  {
    version: "v2.7.1",
    kind: "feat",
    title: {
      en: "FAA-accurate runway & taxiway lighting",
      zh: "符合 FAA 的跑道与滑行道灯光",
    },
    summary: {
      en: "Runway and taxiway lights now follow FAA color conventions and scale by zoom for performance.",
      zh: "跑道与滑行道灯光改为遵循 FAA 配色规范，并按缩放级别分层渲染以保证性能。",
    },
    highlights: [
      {
        en: "Synthesized FAA color zones: white/amber runway edges, white→red-white→red centerline, green threshold + red end bars, touchdown-zone lights, flashing REIL, plus blue taxiway edges and green taxiway centerline",
        zh: "合成 FAA 配色分区：白/琥珀色跑道边灯、白→红白→红的中线灯、绿色入口与红色端灯、接地区灯、闪烁 REIL，以及蓝色滑行道边灯与绿色滑行道中线灯",
      },
      {
        en: "Zoom level-of-detail: farthest zoom shows only approach beams, mid adds edge/threshold lights, near shows full detail — all point lights moved to a single canvas to stay smooth at busy fields",
        zh: "按缩放分级渲染：最远缩放只显示进近光束，中景加入边灯/入口灯，近景显示完整细节；所有点光源统一改用 canvas 渲染，繁忙机场也能保持流畅",
      },
      {
        en: "Light spacing is widened from the exact FAA values so individual lights stay legible at the map's maximum zoom, while the color zones remain distance-accurate; lights render in both light and dark themes",
        zh: "灯光间距在 FAA 实际值基础上适当放大，使单个灯光在最大缩放下仍可分辨，同时配色分区仍按真实距离精确呈现；明暗主题下均可显示",
      },
      {
        en: "Airport buildings are now colored: terminals get an accent fill, other on-field buildings and aprons a muted fill. Buildings are pulled from OpenStreetMap constrained to inside the aerodrome boundary, and the thick runway surface stroke is thinned when lights are shown so it no longer reads as a solid bar",
        zh: "机场建筑现在带有配色：航站楼使用强调色填充，场内其他建筑与停机坪使用低饱和填充。建筑数据取自 OpenStreetMap 并限定在机场边界内；显示灯光时跑道地面描边会变细，不再呈现为实心色条",
      },
    ],
  },
  {
    version: "v2.7.0",
    kind: "feat",
    title: {
      en: "Legacy cleanup & bilingual changelog",
      zh: "旧架构清理与双语更新日志",
    },
    summary: {
      en: "Removed dead client-side provider code left from the Vercel/Next era and made the changelog fully bilingual.",
      zh: "移除 Vercel/Next 时期遗留的客户端 provider 死代码，更新日志改为完整双语。",
    },
    highlights: [
      {
        en: "Deleted ~1,500 lines of unused client-side fetch mechanisms (aircraft photos, trace, icons, airport directory, local weather, METAR) now served by the Go data-service",
        zh: "删除约 1,500 行未使用的客户端抓取机制（飞机照片、轨迹、图标、机场目录、本地天气、METAR），相关逻辑已由 Go data-service 提供",
      },
      {
        en: "Changelog entries now carry per-locale en/zh fields and render in the active language",
        zh: "更新日志条目新增按语言的 en/zh 字段，并按当前语言渲染",
      },
      {
        en: "Stabilized the unit-preferences context value to cut redundant re-renders",
        zh: "稳定单位偏好 context 的值，减少多余的重渲染",
      },
    ],
  },
  {
    version: "v2.6.19",
    kind: "patch",
    title: "机场跑道灯与缩放修复",
    summary: "修正 KBOS 等机场的跑道分段重复、暗色中景灯光缺失和机场详情加载路径。",
    highlights: [
      "远景跑道显示改回物理跑道数量，避免 OSM 分段重复成星型",
      "中景暗色地图恢复跑道灯，跑道与灯光共用去重后的 OSM 几何",
      "OpenAIP fallback 按物理跑道去重，JFK/KBOS 等机场不再按双向记录重复绘制灯带",
      "空域图层关闭时隐藏几何不再触发空域预览卡",
      "PlaneSpotters 照片代理补充合规 User-Agent，恢复飞机预览照片",
      "浅色地图选中飞机不再叠加白色光晕",
      "机场详情接口并发加载周边数据，减少静态地面图层等待",
      "侧边栏品牌标识改为 SVG 分层动效，保留静态安装图标不变",
    ],
  },
  {
    version: "v2.6.18",
    kind: "patch",
    title: "机场跑道显示修复",
    summary: "主机场跑道、滑行道和灯光在迁移后改为同源渲染，减少重叠和错位。",
    highlights: [
      "远距离视图只显示简化跑道线和机场标记",
      "近距离视图使用 OSM 地面几何绘制跑道、滑行道和跑道灯",
      "移除主机场重复跑道线、端点编号和错位进近点阵",
    ],
  },
  {
    version: "v2.6.17",
    kind: "feat",
    title: "Railway 单服务迁移",
    summary: "前端、实时数据、代理接口和观测链路已收敛到 Railway 单服务架构。",
    highlights: [
      "移除 Next.js / Vercel 运行时，改为 Go data-service 托管 Vite SPA、API、WebSocket 和静态资源",
      "修复迁移后的首页、Clerk 登录、地图设置保存、附近机场跑道、主机场 OSM 地面几何、暗色底图、进近跑道灯、飞机图标、点击选中、截图分享和 OpenAIP 占位码显示",
      "统一 ADS-B 实时与 HTTP fallback，补上 provider 并发探测、冷却恢复和短暂失败缓存",
      "收敛 New Relic APM、日志和指标，保留可诊断的上游状态但不再把可选 provider 失败暴露成浏览器错误",
    ],
  },
  {
    version: "v2.6.2",
    kind: "patch",
    title: "URL-first provider logs",
    summary:
      "New Relic log messages now show the called URL, query parameters, error, and duration in one compact line.",
    highlights: [
      "Changed data-service external request logs to use status-prefixed provider URLs with optional query params and error details",
      "Changed Vercel proxy logs to show the requested API path, query params, status error, and duration",
      "Kept provider, source, route, status class, and duration fields queryable as structured New Relic attributes",
    ],
  },
  {
    version: "v2.6.1",
    kind: "patch",
    title: "Readable observability logs",
    summary:
      "New Relic logs now expose provider, route, status, result, and latency directly in the message column.",
    highlights: [
      "Expanded data-service external request logs with readable provider, endpoint, result, status class, and duration details",
      "Expanded Vercel proxy logs with route, source, attempt chain, status class, and duration details",
      "Added snake_case New Relic fields so Logs and NRQL views can show latency and status columns without dotted-field friction",
    ],
  },
  {
    version: "v2.6.0",
    kind: "feat",
    title: "New Relic observability",
    summary:
      "ADSBao now emits richer New Relic telemetry across the realtime data-service and Vercel proxy routes.",
    highlights: [
      "Added New Relic APM transactions for the Go data-service HTTP surface and background provider polling",
      "Recorded external provider requests as structured logs, custom events, custom metrics, and latency summaries",
      "Connected Vercel proxy routes to New Relic Metric API and Log API telemetry for route latency and provider errors",
    ],
  },
  {
    version: "v2.5.1",
    kind: "patch",
    title: "Toolbar and tracking polish",
    summary:
      "Map toolbars are more consistent across desktop and mobile, and precise callsign tracking recovers from empty provider responses.",
    highlights: [
      "Reworked map range controls into a shared Far, Medium, and Near menu with tracking-specific trace views",
      "Kept settings, screen wake lock, language, and theme controls consistent across map and mobile sidebar surfaces",
      "Fixed realtime callsign provider fallback so oceanic flights like DAL58 can resolve from airplanes.live when adsb.lol is empty",
    ],
  },
  {
    version: "v2.5.0",
    kind: "feat",
    title: "Realtime data service",
    summary:
      "Live traffic now runs through ADSBao's realtime data service with app-owned persistence.",
    highlights: [
      "Moved live map traffic behind a Railway data-service deployment with WebSocket updates for airport and nearby views",
      "Migrated app persistence to Railway Postgres so static airport augmentation and user settings share one app-owned database",
      "Tightened realtime channel boundaries around public traffic and selected-aircraft tracking while keeping internal route-cache work private",
    ],
  },
  {
    version: "v2.4.4",
    kind: "patch",
    title: "Full airport names",
    summary:
      "Airport names now render in full instead of OpenAIP's truncated, all-caps form.",
    highlights: [
      "Restored an OurAirports name table to override OpenAIP's ~40-character truncated names",
      "Airport headers and nearby lists show full mixed-case names (e.g. \"Boston Logan International Airport\")",
      "Backfills the city label when OpenAIP leaves it blank",
    ],
  },
  {
    version: "v2.4.3",
    kind: "patch",
    title: "Manrope typography",
    summary:
      "ADSBao now uses Manrope across the app for a cleaner, more confident transport-product voice.",
    highlights: [
      "Global font stack switches to Manrope with Noto Sans SC retained for Chinese text",
      "Logo, Open Graph image, and display titles use preset normal tracking instead of custom spacing",
    ],
  },
  {
    version: "v2.4.2",
    kind: "patch",
    title: "Browse lists & toolbar polish",
    summary:
      "Static-page browse lists and page toolbars now share the same tidy liquid-glass patterns.",
    highlights: [
      "Home, about, mechanism, and changelog lists use aligned rows with frosted hover and glass active states",
      "Static-page toolbars reuse the airport detail toolbar tone and sizing",
    ],
  },
  {
    version: "v2.4.1",
    kind: "patch",
    title: "Liquid glass polish",
    summary:
      "More controls, cards, and menus now match the liquid-glass system with cleaner motion and focus states.",
    highlights: [
      "Hourly forecast, tomorrow card, and home search adopt the shared glass material",
      "Interactive glass cards get smoother hover and press motion with reduced-motion support",
      "Menus, tooltips, focus rings, and standard basemap tone were cleaned up",
    ],
  },
  {
    version: "v2.4.0",
    kind: "feat",
    title: "Liquid glass redesign",
    summary:
      "ADSBao's floating surfaces were rebuilt around a two-material liquid-glass system.",
    highlights: [
      "Selected states use one shared glass capsule across cards, filters, settings, and toolbars",
      "Resting tiles and toolbar pills use a bright frosted material with luminous rims",
      "DESIGN.md and shared tokens now define the material system for future UI work",
    ],
  },
  {
    version: "v2.3.1",
    kind: "patch",
    title: "Hydration stability, list row polish & flight tracking resilience",
    summary:
      "Hydration, list-row feedback, and flight tracking fallbacks are more stable.",
    highlights: [
      "Skeleton loading and hydration gates reduce layout flicker",
      "Static-page list rows get unified hover feedback",
      "Flight tracking falls back to fresher nearby data and per-provider timeouts",
    ],
  },
  {
    version: "v2.3.0",
    kind: "feat",
    title: "Screen wake lock & status bar polish",
    summary:
      "The map toolbar can keep the screen awake, and the source status bar is easier to scan.",
    highlights: [
      "Wake lock toggle prevents screen sleep during spotting sessions",
      "Status bar shows keep-awake state inline with source badges",
      "Source text transitions are smoother and stay single-line",
    ],
  },
  {
    version: "v2.2.1",
    kind: "patch",
    title: "Standard map detail boost & GSAP animation layer",
    summary:
      "The standard base map now shows buildings, water bodies, parks, and roads with visible contrast — the dark theme no longer hides geography. GSAP powers entrance animations, card interactions, and staggered list reveals across the entire app.",
    highlights: [
      "Standard base layer renders buildings, water, landuse (parks/forests), and roads at visible grey tones on dark theme",
      "GSAP-driven page shell entrance, card hover/press spring interactions, and staggered list animations",
      "Bright OSM style replaces positron for light theme — 119 layers of geographic detail",
    ],
  },
  {
    version: "v2.2.0",
    kind: "feat",
    title: "Hourly forecast, locale fixes & near-me weather",
    summary:
      "Local weather gets a 6-hour forecast grid and next-day card. Simplified Chinese place names are consistently simplified. Near-me mode shows only weather. Desktop uses one-shot geolocation with a manual refresh.",
    highlights: [
      "Local weather: 3×2 hourly forecast grid with MetricCard-style tap interaction, plus a Tomorrow summary card",
      "Simplified Chinese: OSM semicolon-delimited name variants are stripped; trad→simp converter no longer corrupts already-simplified text",
      "Near-me mode: weather panel shows only the forecast (no METAR / rules / pressure / wiki); weather card is clickable",
      "Desktop near-me: one-shot geolocation instead of continuous watch, with a refresh button and last-fix timestamp",
      "Altitude prefix (FL) in preview cards now matches the unit typography so the row aligns cleanly",
    ],
  },
  {
    version: "v2.1.0",
    kind: "feat",
    title: "Near-me explorer + Plane Hunter polish",
    summary:
      "A new /here page mirrors the airport detail experience but centered on the user's location, with live position tracking. Plane Hunter gets a simpler native source picker and a tighter map template.",
    highlights: [
      "/here: live aircraft, nearby airports, and airspaces around your current position; auto-refreshes as you move",
      "Sidebar hero shows your actual city / state / country via reverse geocoding",
      "Plane Hunter capture simplified to a native camera / library picker; map template now ~1 NM radius",
      "Misc UI fixes — preview card slides in directionally, long aircraft types no longer overlap the callsign, route line only appears with FlightAware",
    ],
  },
  {
    version: "v2.0.0",
    kind: "breaking",
    title: "Plane Hunter mode goes GA",
    summary:
      "Plane Hunter ships as a two-step capture studio that bakes the chosen template into a shareable PNG. A new Maps template overlays an OSM tile of your location.",
    highlights: [
      "Two-step flow — shoot the photo, then compose with templates and share / save / copy",
      "Touch devices hand off to the OS camera or photo library",
      "New Maps template centers an OSM tile on your location with the aircraft when it's in view",
      "Feature flag removed — Plane Hunter is on for every signed-in user",
    ],
  },
  {
    version: "v1.13.1",
    kind: "patch",
    title: "Toolbar opacity polish",
    summary:
      "Floating toolbar pills sit on a more opaque surface so they stay legible against busy map backdrops on both themes.",
    highlights: [
      "Toolbar surface tightened across home dock, sidebar overlay, and map control rail",
    ],
  },
  {
    version: "v1.13.0",
    kind: "feat",
    title: "Bottom-floating mobile toolbar + device-aware settings",
    summary:
      "Mobile gets a single bottom-pinned toolbar across every page, and signed-in users keep separate desktop and mobile map preferences.",
    highlights: [
      "Mobile toolbar floats at the bottom center on every page",
      "Per-device map preferences for signed-in users",
      "High-altitude overflights no longer hidden by the approach-mask rule",
    ],
  },
  {
    version: "v1.12.0",
    kind: "feat",
    title: "Map readability + badge polish",
    summary:
      "Quieter terrain palette and a unified badge system with collision-aware stacking.",
    highlights: [
      "Calmer hillshade terrain in both themes",
      "Collision-aware airport / navaid badges with leader lines",
      "Click cycles through overlapping airspaces",
    ],
  },
  {
    version: "v1.11.1",
    kind: "patch",
    title: "Map UI polish",
    summary:
      "Tightens airspace readability, full-trace framing, mobile scrolling, and compact metric cards.",
    highlights: [
      "Inward airspace edge markings + cleaner full-trace boundary labels",
      "Mobile static pages keep panel-scoped scroll",
    ],
  },
  {
    version: "v1.11.0",
    kind: "feat",
    title: "Full-trace nav count badges",
    summary:
      "Long routes stay readable — dense low-zoom navaid labels collapse into cached count badges.",
    highlights: [
      "Aggregate navaid count tiles at low zoom",
      "Detailed labels return at the existing zoom threshold",
    ],
  },
  {
    version: "v1.10.0",
    kind: "feat",
    title: "Airport facilities + sidebar polish",
    summary:
      "OurAirports facility data joins OpenAIP for better ATC frequency and nearby navaid coverage.",
    highlights: [
      "Restored ATC frequency + navaid coverage via OurAirports",
      "Dedicated ATC and spotting panels in the airport sidebar",
    ],
  },
  {
    version: "v1.9.0",
    kind: "feat",
    title: "Watcher Mode candidate photo spots",
    summary:
      "Watcher Mode generates and renders runway-aligned candidate plane-watching spots for the focused airport.",
    highlights: [
      "Candidate spots from runway alignment + OpenStreetMap data",
      "Clickable camera markers + previews with OSM attribution",
    ],
  },
  {
    version: "v1.8.4",
    kind: "patch",
    title: "Airport zoom declutter",
    summary:
      "Airport map zoom levels share one feature configuration for labels, range rings, and surface-traffic suppression.",
    highlights: ["Unified zoom-level feature config"],
  },
  {
    version: "v1.8.3",
    kind: "patch",
    title: "Mechanism + navigation polish",
    summary:
      "Mechanism returns to the same dithered shell as Home / About; top nav preserves the active locale.",
    highlights: [
      "Mechanism page back on the Home/About background",
      "Locale survives Home / About / Mechanism / Changelog navigation",
    ],
  },
  {
    version: "v1.8.1",
    kind: "patch",
    title: "Aircraft type labels + airspace entry polish",
    summary:
      "Previews and filters prefer friendly aircraft names; the default airspace layer fades in on first load.",
    highlights: [
      "Friendly aircraft names; ICAO codes demoted to secondary",
      "Airspace overlays stagger-fade in",
    ],
  },
  {
    version: "v1.8.0",
    kind: "feat",
    title: "Airport airspace overlays",
    summary:
      "Airport maps render OpenAIP airspaces directly with translucent fills, labeled boundaries, clickable previews, and persisted layer toggles.",
    highlights: [
      "OpenAIP-style airspaces on airport maps with click-to-preview",
      "Map layer toggles persist in the browser",
    ],
  },
  {
    version: "v1.7.0",
    kind: "feat",
    title: "OpenAIP directory migration",
    summary:
      "Airport search and detail context now use OpenAIP as the primary aviation directory.",
    highlights: [
      "Search, details, frequencies, navaids, airspaces moved to OpenAIP",
      "Postgres-backed runway threshold geometry retained for accurate overlays",
    ],
  },
  {
    version: "v1.6.0",
    kind: "feat",
    title: "Virtualized nearby list + TanStack Query",
    summary:
      "Sidebar nearby list windows through a virtualizer with animated digit metrics; TanStack Query starts handling client-side data fetching.",
    highlights: [
      "Windowed nearby list (aircraft + airports) with NumberFlow digits",
      "Page-level z-index unified into named tier tokens",
      "TanStack Query mounted in the app shell",
    ],
  },
  {
    version: "v1.5.0",
    kind: "feat",
    title: "Tracking stability + map label optimization",
    summary:
      "Flight tracking separates live, fallback, stale, and missing position states. Route overlays and map labels stay clearer.",
    highlights: [
      "Explicit position states for tracked flights",
      "Predicted route arcs render as dashed lines",
      "Map place labels follow the selected app language",
    ],
  },
  {
    version: "v1.4.0",
    kind: "feat",
    title: "Account sign-in + cleaner lost-signal",
    summary:
      "Sign in from the map toolbar or nav menu. The lost-signal modal now retries silently in the background.",
    highlights: [
      "Account sign-in via the toolbar avatar",
      "Silent background retry once the feed is back",
    ],
  },
  {
    version: "v1.3.0",
    kind: "feat",
    title: "adsbdb routes + community feedback + complete runway map",
    summary:
      "Route lookups move to api.adsbdb.com, users can submit temporary route corrections, and the runway map now renders every runway from OpenAIP.",
    highlights: [
      "Route data source switched to api.adsbdb.com",
      "12 h community route overrides marked with `*`",
      "Complete OpenAIP-sourced runway map (incl. VFR-only runways)",
    ],
  },
  {
    version: "v1.2.1",
    kind: "patch",
    title: "Track button opens in a new tab",
    summary:
      "Preview-card Track action is now a real link so right-click → Open in New Tab works.",
    highlights: ["Track switched to <Link>"],
  },
  {
    version: "v1.2.0",
    kind: "feat",
    title: "Themed approach + nose beam + scale bar polish",
    summary:
      "Theme-aware runway approach visualization, dark-theme aircraft nose beam, always-on scale bar, and themed toasts.",
    highlights: [
      "Approach: dark = glowing wedge, light = dashed extended centerline",
      "Always-on scale bar with theme-aware backdrop",
    ],
  },
  {
    version: "v1.1.0",
    kind: "feat",
    title: "Distance rings + scale bar",
    summary:
      "Concentric distance rings on the airport page and an adaptive scale bar at approach zoom; nearby searches unified to a 40 NM radius.",
    highlights: [
      "Airport page: rings every 3 NM out to 30 NM",
      "Scale bar in the bottom-left at approach zoom",
    ],
  },
  {
    version: "v1.0.0",
    kind: "feat",
    title: "Persistent tracking + nav menu",
    summary:
      "Trace persists across refresh, a lost-signal overlay handles drops, and there's a new /changelog page.",
    highlights: [
      "12 h tracking session anchor + 24 h local trace cache",
      "Lost-signal overlay with keep / retry / back-home",
      "New /changelog page",
    ],
  },
  {
    version: "v0.12.0",
    kind: "feat",
    title: "Aircraft tracking page + polymorphic explorer",
    summary:
      "/aircraft/[callsign] route with a polymorphic sidebar + preview, fit-to-trace, and multi-provider failover.",
    highlights: [
      "/aircraft/[callsign] mirrors the airport layout",
      "Polymorphic preview card (aircraft + airport)",
      "Route renamed /[icao] → /airport/[icao]",
    ],
  },
  {
    version: "v0.11.0",
    kind: "feat",
    title: "Selected-aircraft trace + revalidation",
    summary:
      "Focused-aircraft live trace polyline, route revalidation via AeroDataBox, and ADS-B provider failover.",
    highlights: [
      "Gradient trace polyline with fade-in label cards",
      "ADS-B failover on 5xx / 429 / timeout",
    ],
  },
  {
    version: "v0.10.0",
    kind: "feat",
    title: "Global airport data + richer silhouettes",
    summary:
      "OpenAIP-backed global airport search, 178 ICAO-type silhouettes, and country flags on the home rows and airport headers.",
    highlights: [
      "OpenAIP backs /api/search and /api/airport/[ident]",
      "178 aircraft silhouettes ship in-repo",
    ],
  },
  {
    version: "v0.9.0",
    kind: "feat",
    title: "Navy tracking console redesign",
    summary:
      "Sidebar + map layout, callsign-first traffic table, deep navy palette, and aircraft silhouette markers.",
    highlights: [
      "400 px desktop sidebar alongside a full-height map",
      "Aircraft silhouette markers driven by ICAO type",
    ],
  },
  {
    version: "v0.8.0",
    kind: "feat",
    title: "Next.js Vercel refactor",
    summary:
      "Rebuilt the app from Vue 3 / Vite to React on the Next.js App Router.",
    highlights: [
      "React on the Next.js App Router",
      "Vercel Analytics + Speed Insights via Next integrations",
    ],
  },
  {
    version: "v0.7.1",
    kind: "patch",
    title: "Map and mobile polish",
    summary:
      "Polling guards, mobile sheet refinements, and ADS-B merge fixes.",
    highlights: ["Start aircraft polling only after coordinates load"],
  },
  {
    version: "v0.7.0",
    kind: "feat",
    title: "Flight route + traffic context",
    summary:
      "Airport-aware route labels, route lookup, and dual-range ADS-B polling.",
    highlights: [
      "Airport-aware flight route labels",
      "Dual-range polling (wide 20 NM + close 3 NM)",
    ],
  },
  {
    version: "v0.6.0",
    kind: "feat",
    title: "Vercel observability + production routing",
    summary:
      "Web Analytics, Speed Insights, and hardened proxy + upstream logging.",
    highlights: [
      "Web Analytics + Speed Insights",
      "Hardened proxy parsing against upstream HTML / errors",
    ],
  },
  {
    version: "v0.5.0",
    kind: "feat",
    title: "Vercel-first web architecture",
    summary:
      "Vercel deploy config, same-origin proxies, Electron + Homebrew dropped.",
    highlights: [
      "Same-origin proxies for METAR + ADS-B upstreams",
      "Removed Electron and Homebrew cask pipelines",
    ],
  },
  {
    version: "v0.4.0",
    kind: "breaking",
    title: "ADSBao web pivot",
    summary:
      "Renamed to ADSBao and repositioned as an airport explorer; dropped LiveATC UI, player, and transcription scope.",
    highlights: [
      "Project renamed to ADSBao",
      "Removed legacy LiveATC frontend + backend",
    ],
  },
];
