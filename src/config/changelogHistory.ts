import type { ChangelogEntry, ChangelogLocalizedReleaseCopy } from "./changelog";

export const CHANGELOG_HISTORY_ZH_COPY: Record<string, ChangelogLocalizedReleaseCopy> = {
  "v2.6.0": {
    title: "Railway 单服务与可观测性",
    summary:
      "这一版线把应用收敛到 Railway 单服务，并补齐后端可观测性与迁移后的地图修复。",
    highlights: [],
  },
  "v2.5.0": {
    title: "Realtime 数据服务与工具栏打磨",
    summary:
      "实时交通切到 ADSBao 自有数据服务，地图工具栏与跟踪流程也一起收紧。",
    highlights: [],
  },
  "v2.4.0": {
    title: "液态玻璃视觉系统",
    summary:
      "应用界面重建为液态玻璃视觉系统，并统一了浏览列表、工具栏、字体和机场名称显示。",
    highlights: [],
  },
  "v2.3.0": {
    title: "屏幕常亮与追踪稳定性",
    summary:
      "地图页加入屏幕常亮控制，同时改善状态栏、加载稳定性和飞行跟踪韧性。",
    highlights: [],
  },
  "v2.2.0": {
    title: "天气、地图细节与动效",
    summary:
      "天气卡片、我的位置体验、标准地图细节和全站动效一起升级。",
    highlights: [],
  },
  "v2.1.0": {
    title: "我的位置探索页 + 拍机打磨",
    summary:
      "新增 /here 页,以你的当前位置为中心,镜像机场详情页的体验,带实时位置追踪。拍机功能改用更简单的系统原生选择器,地图模板更紧凑。",
    highlights: [],
  },
  "v2.0.0": {
    title: "拍机正式上线",
    summary:
      "拍机功能正式发布,两步式工作流:先拍照,再套模板,导出一张可分享的 PNG。新增「地图」模板,在照片上叠一张你所在位置的 OSM 拼贴。",
    highlights: [],
  },
  "v1.13.0": {
    title: "移动端底部浮动工具栏与设备感知设置",
    summary:
      "移动端所有页面都使用同一个底部固定的工具栏,登录用户可以分别保存桌面端和移动端的地图偏好。",
    highlights: [],
  },
  "v1.12.0": {
    title: "地图可读性与 badge 打磨",
    summary: "更安静的地形配色与带碰撞检测的统一 badge 体系。",
    highlights: [],
  },
  "v1.11.0": {
    title: "全航迹地图上下文计数",
    summary: "全航迹在低缩放层级把密集导航台标签替换为缓存的 NAV 计数 badge。",
    highlights: [],
  },
  "v1.10.0": {
    title: "机场设施数据与侧栏打磨",
    summary:
      "机场详情页在 OpenAIP 之外恢复了 OurAirports 设施数据,补齐 ATC 频率和导航台覆盖。",
    highlights: [],
  },
  "v1.9.0": {
    title: "看客模式候选拍机点",
    summary: "看客模式基于跑道朝向和 OSM 数据为焦点机场生成候选拍机点。",
    highlights: [],
  },
  "v1.8.0": {
    title: "机场空域与导航细节",
    summary:
      "机场地图加入 OpenAIP 空域，并补齐机型名称、导航细节和缩放层级减噪。",
    highlights: [],
  },
  "v1.7.0": {
    title: "OpenAIP 机场目录迁移",
    summary: "机场搜索与详情上下文改用 OpenAIP 作为主航空目录。",
    highlights: [],
  },
  "v1.6.0": {
    title: "附近列表虚拟化与数据层接入",
    summary:
      "侧栏附近列表改为窗口化滚动,距离和高度数字滚动呈现;TanStack Query 开始接管客户端数据获取。",
    highlights: [],
  },
  "v1.5.0": {
    title: "跟踪稳定性与地图标签优化",
    summary: "飞行跟踪区分实时、兜底、陈旧、缺失位置状态;地图标签更清晰。",
    highlights: [],
  },
  "v1.4.0": {
    title: "账号登录与更安静的信号丢失处理",
    summary:
      "从地图工具栏或导航菜单登录;丢失信号时,弹窗保留当前视图并在后台静默重试。",
    highlights: [],
  },
  "v1.3.0": {
    title: "adsbdb 航路、社区反馈与完整跑道地图",
    summary:
      "航路查询迁移到 api.adsbdb.com,用户可提交临时航路修正,跑道地图从 OpenAIP 渲染所有跑道。",
    highlights: [],
  },
  "v1.2.0": {
    title: "主题化跑道进近、机首光束与比例尺",
    summary: "按主题切换进近可视化、暗色机首光束、常驻比例尺和应用主题 toast。",
    highlights: [],
  },
  "v1.1.0": {
    title: "距离环与地图比例尺",
    summary:
      "机场页同心距离环、进近缩放下自适应比例尺;附近搜索统一为 40 海里。",
    highlights: [],
  },
  "v1.0.0": {
    title: "持久跟踪会话与上弹导航菜单",
    summary: "刷新后保留航迹、信号丢失覆盖层、新增 /changelog 页面。",
    highlights: [],
  },
  "v0.12.0": {
    title: "飞机跟踪页与多形态 explorer",
    summary:
      "/aircraft/[callsign] 路由,多形态侧栏与预览,适配航迹,多数据源 failover。",
    highlights: [],
  },
  "v0.11.0": {
    title: "选中飞机航迹与重新验证",
    summary: "焦点飞机实时航迹线、AeroDataBox 重验航路、ADS-B 数据源 failover。",
    highlights: [],
  },
  "v0.10.0": {
    title: "全球机场数据与更丰富的飞机轮廓",
    summary: "OpenAIP 提供全球搜索,178 种 ICAO 类型轮廓,首页与机场头部显示国旗。",
    highlights: [],
  },
  "v0.9.0": {
    title: "海军蓝跟踪控制台重设计",
    summary: "侧栏 + 地图布局、呼号优先交通表、深海军蓝配色、轮廓标记。",
    highlights: [],
  },
  "v0.8.0": {
    title: "Next.js Vercel 重构",
    summary: "应用从 Vue 3 / Vite 重建为 Next.js App Router 上的 React 应用。",
    highlights: [],
  },
  "v0.7.0": {
    title: "飞行航路与交通上下文",
    summary: "机场感知航路标签、航路查询、双范围 ADS-B 轮询。",
    highlights: [],
  },
  "v0.6.0": {
    title: "Vercel 可观测性与生产路由",
    summary: "Web Analytics、Speed Insights、强化代理与上游日志。",
    highlights: [],
  },
  "v0.5.0": {
    title: "Vercel-first Web 架构",
    summary: "Vercel 部署配置、同源代理、移除 Electron 和 Homebrew。",
    highlights: [],
  },
  "v0.4.0": {
    title: "ADSBao Web 转向",
    summary: "重命名为 ADSBao,重新定位为机场 explorer,移除 LiveATC UI、播放器与转录。",
    highlights: [],
  },
};

export const CHANGELOG_HISTORY: ChangelogEntry[] = [
  {
    version: "v2.43.1",
    kind: "feat",
    title: {
      en: "Steadier tracking: current-leg traces, routes that survive navigation, resilient feeds",
      zh: "更稳的追踪:当前航段航迹、跨页不丢的航线、更抗故障的数据流",
    },
    summary: {
      en: "The three core tracking mechanisms got a stability pass. Traces: the flight page now clips history to the current leg — earlier legs and yesterday's same-callsign trail no longer bleed in, while transoceanic coverage holes at cruise are correctly kept (the 'all recorded points' view still shows everything); the watched session's real position fixes are now genuinely saved (a starved debounce meant they often weren't), and a failed or rate-limited background trace refresh keeps what you already have instead of wiping the trail. Routes: resolved origin/destination pairs persist in the browser, so opening a flight's detail page reuses the route the map already fetched instead of re-asking upstream. Positions: when the realtime socket falls back to polling, repeated upstream failures now back off exponentially instead of hammering every 3 seconds.",
      zh: "对三大核心追踪机制做了一轮稳定性改造。航迹:飞机页历史现在按当前航段裁剪——更早的航段和昨天同呼号的旧航迹不再混入,而巡航高度上的跨洋覆盖空洞会被正确保留(「所有记录点」视图仍可看全部);追踪期间的真实位置点现在会切实存下来(原先的防抖被持续更新饿死,经常根本没写入),后台航迹刷新失败或被限流时保留已有数据,不再清空轨迹。航线:已解析的出发/到达在浏览器本地持久化,打开航班详情页直接复用地图页已取到的航线,不再重复请求上游。位置:实时连接退化为轮询时,上游连续失败会指数退避,不再每 3 秒硬砸。",
    },
    highlights: [
      {
        en: "Flight traces clip to the current leg — multi-leg days and yesterday's flight under the same callsign stay out; cruise-altitude ocean gaps are kept, so transatlantic traces stay whole. 'Full trace' is the flight-path view; 'all recorded points' shows the leg's recorded samples.",
        zh: "航迹按当前航段裁剪——同日多段和昨天同呼号的航班不再混入;巡航高度的海洋空洞会保留,跨洋航迹保持完整。「完整航迹」是航路视图,「所有记录点」展示本航段已记录的点。",
      },
      {
        en: "Trace refreshes union with what's already recorded instead of replacing it — the rolling recent window no longer drops the takeoff segment mid-flight (notably right after UTC midnight, when the upstream day-file can lag).",
        zh: "航迹刷新与已记录点求并集而非整体替换——滚动窗口不再在航程中丢掉起飞段(尤其 UTC 午夜后上游日文件滞后时)。",
      },
      {
        en: "Real live fixes are appended and persisted while you watch; the inferred marker head stays display-only.",
        zh: "追踪时真实位置点持续入轨并持久化;推断的视觉头仅用于显示。",
      },
      {
        en: "A failed/empty trace refresh never wipes points you already have, and the recent trace re-pulls every ~3 minutes so upstream corrections land.",
        zh: "航迹刷新失败/为空不再清掉已有点;最近航迹每约 3 分钟静默补拉,上游修正能落地。",
      },
      {
        en: "Routes persist across page navigations (provider-partitioned, hits only), so detail pages show origin/destination instantly.",
        zh: "航线跨页持久化(按提供方分区、只存命中),详情页即时显示出发/到达。",
      },
      {
        en: "Position polling backs off exponentially (3s → 30s) on repeated upstream failures.",
        zh: "位置轮询在上游连续失败时指数退避(3s → 30s)。",
      },
      {
        en: "Fixed: readsb trace flags were misread as 'on ground', which broke leg detection right at oceanic coverage holes.",
        zh: "修复:readsb 航迹 flags 位被误读为「在地面」,恰好在跨洋空洞处破坏航段判定。",
      },
    ],
  },
  {
    version: "v2.42.4",
    kind: "feat",
    title: {
      en: "A zoom slider for the map, and clearer building footprints",
      zh: "地图缩放滑条 + 更清晰的建筑轮廓",
    },
    summary: {
      en: "The map's Far / Medium / Near zoom menu became a single compact viewfinder button that frames the current level (e.g. 13) and opens a slider — drag from 10x to 15x, snapping at each whole step, while the map stays centred on the airport instead of jumping between three fixed levels. The button stays the same compact size as the rest of the toolbar. On the flight-tracking page the full-trace and all-points view toggles fold into that same submenu so the toolbar stays short. Separately, building footprints on the standard map now read with more contrast, so the surrounding city stays legible at neighbourhood zoom.",
      zh: "地图的 远 / 中 / 近 三档缩放菜单,变成一个把当前倍数(如 13)框在取景框里的紧凑按钮,点开是一根滑条——从 10x 拖到 15x、每一级吸附,缩放时地图始终以机场为中心,不再在三个固定档位间跳。按钮与工具栏其他按钮一样紧凑等宽。飞机追踪页的「完整航迹 / 所有记录点」也收进同一个子菜单,工具栏更短。另外,标准地图的建筑轮廓提高了对比度,放大到街区级时周边城市更清晰。",
    },
    highlights: [
      {
        en: "Zoom is a slider now (10x–15x, snaps each step) on a compact viewfinder button that frames the current level — replacing the three fixed Far / Medium / Near presets.",
        zh: "缩放改成滑条(10x–15x、逐级吸附),紧凑的取景框按钮里显示当前倍数——取代原来的 远 / 中 / 近 三档。",
      },
      {
        en: "Zooming keeps the airport centred; the map no longer jumps between fixed levels.",
        zh: "缩放时机场始终居中,不再在固定档位间跳变。",
      },
      {
        en: "Flight page: the full-trace / all-points toggles fold into the same zoom submenu, shortening the toolbar.",
        zh: "飞机页:完整航迹 / 所有记录点 收进同一个缩放子菜单,工具栏更短。",
      },
      {
        en: "Standard-map building footprints get more contrast for legibility at neighbourhood zoom.",
        zh: "标准地图建筑轮廓提高对比度,街区级缩放更清晰。",
      },
      {
        en: "Selecting an aircraft on any tracking page now fetches its route first, so the focused flight's origin/destination fills in ahead of the surrounding traffic.",
        zh: "在任意追踪页选中一架飞机,现在会优先拉取它的航线,聚焦航班的出发/到达会先于周边交通显示出来。",
      },
      {
        en: "On mobile, opening the detail sidebar now hides the zoom and map-settings buttons from its toolbar — they only apply to the map, which isn't visible there.",
        zh: "移动端打开详情侧栏时,工具栏不再显示缩放和地图设置按钮——它们只对地图生效,而此时看不到地图。",
      },
      {
        en: "Toolbars are less busy: every toolbar (map controls, page nav, sidebar) now keeps a single divider before the language/theme/account cluster instead of one between every group.",
        zh: "工具栏更清爽:各处工具栏(地图控制、页面导航、侧栏)只在语言/主题/账号这一组前保留一条分隔符,不再每组之间都放一条。",
      },
    ],
  },
  {
    version: "v2.40.1",
    kind: "feat",
    title: {
      en: "Aircraft cards reveal the city behind each airport code",
      zh: "飞机卡片在机场代码旁轮播出发/到达城市",
    },
    summary: {
      en: "Tap an aircraft and its route line now crossfades between the airport codes (e.g. PHL — BOS) and the cities they serve (🇺🇸 Philadelphia — 🇺🇸 Boston), so you can read a flight's route without knowing every code. The city + country come from a built-in OurAirports lookup keyed by airport identifier, so it's the airport's actual served city (PHL → Philadelphia) rather than the township the runway physically sits in. Works on both the desktop and mobile preview cards, respects reduced-motion (no carousel, just the codes), and adds no network calls — the lookup ships with the app.",
      zh: "点开一架飞机,航线行现在会在机场代码(如 PHL — BOS)和它们服务的城市(🇺🇸 Philadelphia — 🇺🇸 Boston)之间淡入淡出轮播,不用记住每个代码也能读懂航线。城市+国家来自内置的 OurAirports 机场表(按机场代码查),给的是机场真正服务的城市(PHL → Philadelphia),而不是跑道物理所在的乡镇。桌面和移动端预览卡都生效,尊重系统的减少动态设置(不轮播、只显示代码),且不增加任何网络请求——查表随应用一起打包。",
    },
    highlights: [
      {
        en: "Preview-card route line crossfades between airport codes and 🇺🇸 City place labels every few seconds, on both desktop and mobile.",
        zh: "预览卡航线行每隔几秒在机场代码与 🇺🇸 城市标签之间淡入淡出,桌面与移动端均生效。",
      },
      {
        en: "Served city comes from a bundled OurAirports ICAO→city table (~8.7k airports), lazy-loaded only when a route card opens — accurate (PHL → Philadelphia) with no extra requests or database dependency.",
        zh: "服务城市来自打包的 OurAirports ICAO→城市表(约 8700 个机场),仅在打开航线卡片时懒加载——准确(PHL → Philadelphia)且不增加请求或数据库依赖。",
      },
      {
        en: "Reduced-motion users see the static airport codes with no carousel; routes without a known city stay code-only.",
        zh: "开启减少动态的用户只看到静态机场代码、不轮播;查不到城市的航线保持只显示代码。",
      },
      {
        en: "Fixed an intermittent case where an aircraft visible on the map showed “no broadcast position” on its tracking page: the detail page now falls back to the aircraft's ICAO24 (hex) feed when the callsign feed lags, and the data-service resolves callsign→hex from recent snapshots — so a flight you can see on the map reliably shows its position when you open it.",
        zh: "修复了一个偶发问题:地图上明明能看到的飞机,点进追踪页却显示「没有广播位置」。详情页现在会在呼号源滞后时回落到该机的 ICAO24(hex)源,数据服务也会从近期快照里把呼号解析成 hex——这样在地图上能看到的航班,点开后能稳定显示位置。",
      },
    ],
  },
  {
    version: "v2.39.5",
    kind: "feat",
    title: {
      en: "Faster, more complete trace & route on busy airports",
      zh: "繁忙机场的航迹与航线更快、更全",
    },
    summary: {
      en: "Returning to a flight you just left is quicker, and busy airports now show far more routes. The data-service keeps a short-lived (5-minute) shared cache of each flight's recent trace and route, so revisiting a flight (detail-page navigation fully reloads the page) serves them straight from the cache instead of re-fetching from the rate-limited upstreams (adsb.lol traces, adsbdb / FlightAware routes); a just-expired entry is shown instantly and refreshed in the background. We also fixed a cause of missing routes on busy airports: a FlightAware route scrape is fast on its own (~0.6s) but balloons to 5–10s when dozens fire at once, and those were being cut off at 7s — dropping a large share of valid commercial routes. We now cap how many FlightAware lookups run at once (so each stays fast) and give the rest a longer timeout, so valid routes complete instead of being dropped. Live aircraft position is unaffected and stays real-time.",
      zh: "刚离开又点回来的航班加载更快了,繁忙机场也能显示出多得多的航线。数据服务为每个航班的最近航迹和航线保留一份短时(5 分钟)共享缓存,重访航班(详情页跳转是整页重载)时直接从缓存返回,而不再向限流上游(adsb.lol 航迹、adsbdb / FlightAware 航线)重拉;刚过期的条目会立即返回并在后台刷新。同时修了繁忙机场漏航线的一个成因:单次 FlightAware 航线抓取本身很快(~0.6 秒),但几十个一起打就会膨胀到 5–10 秒,这些会在 7 秒处被掐断,丢掉一大批有效的商业航线。现在我们给 FlightAware 查询限制了并发(让每次都保持快),其余的也给了更长的超时,有效航线能跑完而不被丢弃。飞机实时位置不受影响,仍保持实时。",
    },
    highlights: [
      {
        en: "Recent trace and route are cached server-side for 5 minutes and shared across users, so returning to a flight within that window doesn't re-hit the upstream.",
        zh: "最近航迹与航线在服务端缓存 5 分钟且跨用户共享,在此窗口内重访航班不再重打上游。",
      },
      {
        en: "Stale-while-revalidate: a just-expired entry is served instantly and refreshed in the background; multi-MB full traces are never cached (they stay client-side).",
        zh: "Stale-while-revalidate:刚过期的条目即时返回并在后台刷新;多兆字节的完整航迹不进缓存(仍留在客户端)。",
      },
      {
        en: "FlightAware and adsbdb routes are cached separately and never mixed, and the cache falls back to direct fetches when the database is unavailable.",
        zh: "FlightAware 与 adsbdb 航线分开缓存、绝不混用;数据库不可用时自动回退为直连上游。",
      },
      {
        en: "Busy airports show more routes: FlightAware lookups are now concurrency-bounded so each stays ~fast instead of ballooning to 5–10s under a burst, with a longer timeout and a few quick retries as backstops — valid commercial routes that used to silently drop now resolve.",
        zh: "繁忙机场显示更多航线:FlightAware 查询现在限制了并发,每次都保持较快,不再在突发下膨胀到 5–10 秒,并以更长超时和几次快速重试兜底——以前会悄悄丢掉的商业航线现在能解析出来。",
      },
      {
        en: "Here-mode weather no longer flickers: the local-weather card now refreshes only when you move into a new place (city/area) instead of on every GPS micro-update.",
        zh: "Here 模式天气不再频繁闪烁:本地天气卡现在只在你移动到新的地点(城市/地区)时才刷新,而不是每次 GPS 微小抖动都重新请求。",
      },
      {
        en: "Crossing into a new place in here-mode now plays a decode-text transition on the place name (city/state) instead of a hard cut; respects reduced-motion.",
        zh: "Here 模式下走进新地点时,地点名(城市/州省)会以解码文字的动效过渡,而不是硬切换;尊重系统的减少动态设置。",
      },
    ],
  },
  {
    version: "v2.38.1",
    kind: "feat",
    title: {
      en: "Frosted map labels, colour-coded targets, steadier flight pages",
      zh: "磨砂地图标签、目标配色与更稳的飞行页",
    },
    summary: {
      en: "The map's labels for airports, navaids and reporting points are now the same frosted-glass pill as the toolbar, so the whole map reads as one material. Targets gain a clear colour hierarchy: the page's primary target — the focal airport, or the tracked aircraft — is the orange signal accent, while an aircraft you click is a high-contrast neutral, so the two are distinct at a glance. Flight tracking pages are also far more stable: navigating between detail pages now loads each page fresh (no stale map, no leftover connections), the map shows a clear loading animation while acquiring a signal, and a flight with no live position — including a trans-oceanic leg with no coverage — shows an explicit card (\"no live position\" / \"signal lost\" / \"flight ended\") instead of an endless spinner or an unrelated fallback map.",
      zh: "地图上机场、导航台、报告点的标签现在统一为和工具栏一致的磨砂玻璃胶囊,整张地图读起来是同一种材质。目标有了清晰的颜色层级:页面的首要目标——所在机场,或被追踪的飞机——用橙色信号强调色,而你点选的飞机是高对比中性色,一眼就能区分。飞行追踪页也更稳定:在详情页之间跳转现在会整页全新加载(没有残留地图、没有残留连接),获取信号时地图显示清晰的加载动画,而没有实时位置的航班——包括无覆盖的跨洋航段——会显示明确的卡片(\"暂无实时位置\"/\"信号丢失\"/\"航班已结束\"),而不是无尽转圈或一张不相干的兜底地图。",
    },
    highlights: [
      {
        en: "Airport / navaid / reporting-point map labels and the navaid count marker are now the toolbar's frosted-glass pill — one consistent material across the map.",
        zh: "机场 / 导航台 / 报告点的地图标签以及导航台计数标记,现在都是工具栏那种磨砂玻璃胶囊——全图统一材质。",
      },
      {
        en: "Map target colours: the primary target (focal airport or tracked aircraft) uses the orange accent; a clicked aircraft uses a high-contrast neutral — distinct at a glance, theme-aware in light and dark.",
        zh: "地图目标配色:首要目标(所在机场或被追踪飞机)用橙色强调色;点选的飞机用高对比中性色——一眼可分,明暗主题各自适配。",
      },
      {
        en: "Stable detail-page navigation: each flight/airport page loads fresh on navigation (the old realtime connection is torn down), with a clear loading animation and an explicit no-live-position / signal-lost / flight-ended state instead of a stuck spinner or fallback map.",
        zh: "更稳的详情页跳转:跳转时每个飞机/机场页都全新加载(旧实时连接被切断),配清晰的加载动画,以及明确的「暂无实时位置 / 信号丢失 / 航班已结束」状态,而非卡住的转圈或兜底地图。",
      },
      {
        en: "The tracked flight now defaults to its full recorded trace (all available history), not just the trail since you opened the page; clicked aircraft still show their recent trail.",
        zh: "被追踪航班现在默认显示完整记录航迹(全部可用历史),而不只是你打开页面之后的那一段;点选的飞机仍显示最近航迹。",
      },
    ],
  },
  {
    version: "v2.37.0",
    kind: "feat",
    title: {
      en: "Lighter Explorer re-renders",
      zh: "更轻的 Explorer 重渲染",
    },
    summary: {
      en: "The airport Explorer's UI state used to live in one large context object: any change — selecting an aircraft, panning, zooming, toggling a map layer — produced a new object and re-rendered every consumer, including the busy aircraft list. The context is now split into focused slices so a component can subscribe to just what it reads (the aircraft list subscribes only to the list filters), and the list itself is memoized. High-frequency updates that the list doesn't care about — zooming and map-layer toggles — no longer re-run the list's rendering work, while genuine changes (new traffic data, selecting a row) still update only what changed.",
      zh: "机场 Explorer 的 UI 状态过去集中在一个大 context 对象里:任何变化——选中飞机、平移、缩放、切换地图图层——都会生成新对象并重渲染所有消费者,包括繁忙的航班列表。现在 context 拆成聚焦切片,组件只订阅自己读取的部分(航班列表只订阅列表筛选项),列表本身也做了 memo 化。列表不关心的高频更新——缩放、图层开关——不再触发列表的渲染工作;而真正的变化(新流量数据、选中某行)仍只更新发生变化的部分。",
    },
    highlights: [
      {
        en: "ExplorerUiContext is split into focused slices (filters, selection) alongside the full aggregate, so consumers re-render on their slice rather than on every unrelated field.",
        zh: "ExplorerUiContext 在保留完整聚合的同时拆出聚焦切片(filters、selection),消费者只在自己的切片变化时重渲染,而非任何无关字段。",
      },
      {
        en: "The aircraft list is memoized and subscribes only to the list filters: zooming and map-layer toggles no longer re-render it (≈3× fewer list re-renders during a zoom versus a full-context consumer).",
        zh: "航班列表 memo 化并只订阅列表筛选项:缩放和图层开关不再触发它重渲染(缩放期间列表重渲染约为全量 context 消费者的 1/3)。",
      },
      {
        en: "Selecting an aircraft still updates only the changed rows, not the whole list (existing per-row memoization), and the map canvas continues to own per-frame aircraft motion — no per-frame React work was added.",
        zh: "选中飞机仍只更新变化的行、而非整列表(沿用既有逐行 memo);逐帧的飞机运动依旧由地图 canvas 负责——没有新增任何逐帧 React 工作。",
      },
    ],
  },
  {
    version: "v2.36.0",
    kind: "feat",
    title: {
      en: "Steadier realtime aircraft subscriptions",
      zh: "更稳的实时航空器订阅",
    },
    summary: {
      en: "The realtime aircraft pipeline now resists subscription churn end-to-end. Rapidly opening and closing an aircraft detail no longer tears down and rebuilds its WebSocket subscription (and, for FlightAware, re-authenticates) on every toggle: the client holds callsign/aircraft subscriptions for a short grace window and reuses them if you come back, and the Go data-service mirrors that with a configurable idle grace before it stops a channel's polling loop — so a returning subscriber keeps the same warm loop with no rebuild or re-fetch spike. Switching between aircraft also stops flickering: the previous aircraft's data stays on screen until the new channel delivers instead of blanking instantly.",
      zh: "实时航空器数据管线现在端到端地抵抗订阅抖动。快速开关某架飞机详情,不再每次都拆掉并重建它的 WebSocket 订阅(FlightAware 还要重新鉴权):客户端会把 callsign/aircraft 订阅保留一个短的 grace 窗口,期间再次进入则原地复用;Go 数据服务以一个可配置的 idle grace 镜像同样行为——最后一个订阅者离开后延迟停止该频道的轮询循环,于是 grace 窗口内返回的订阅者续用同一个热循环,无重建、无重取尖峰。切换不同飞机也不再闪烁:上一架的数据会保留到新频道送来数据,而不是瞬间清空。",
    },
    highlights: [
      {
        en: "Opening/closing the same aircraft repeatedly now sends at most one subscribe and one unsubscribe (after the grace), instead of a churn of teardown/rebuild messages.",
        zh: "反复开关同一架飞机,现在最多发出一次 subscribe、一次 unsubscribe(grace 之后),而不再是一连串拆除/重建消息。",
      },
      {
        en: "Switching between aircraft details no longer blanks the view — the previous aircraft stays until the new channel delivers, killing the detail-switch flicker.",
        zh: "在不同飞机详情间切换不再清空视图——上一架会保留到新频道送达,消除了切换闪烁。",
      },
      {
        en: "Backend symmetry: the data-service keeps a channel's polling loop alive for a configurable idle grace (CHANNEL_IDLE_GRACE_PERIOD_MS) after the last unsubscribe, while still guaranteeing the loop stops once the grace expires.",
        zh: "前后端对称:数据服务在最后退订后,会按可配置的 idle grace(CHANNEL_IDLE_GRACE_PERIOD_MS)保留频道的轮询循环;grace 到期后仍保证循环停止。",
      },
    ],
  },
  {
    version: "v2.35.0",
    kind: "feat",
    title: {
      en: "Adaptive aircraft position smoothing",
      zh: "自适应飞机位置平滑",
    },
    summary: {
      en: "Aircraft marker movement between ADS-B fixes is rebuilt as an adaptive dead-reckoning + critically-damped easing system. Each fix becomes an anchor positioned by its own source timestamp (position age), so multi-source updates align on one timeline. Targets are extrapolated forward only above a speed threshold (off for slow/taxiing aircraft, where the per-update displacement is the same size as ADS-B noise — the old cause of high-zoom \"drift\"), and the displayed marker eases toward the target with a frame-rate-independent low-pass filter whose time constant adapts to zoom (smoother when zoomed in, tighter when zoomed out). A new fix only moves the anchor, so the marker never teleports, and source switches are absorbed by the easing instead of jumping.",
      zh: "飞机标记在两次 ADS-B 定位之间的运动重做成一套自适应航位推算 + 临界阻尼缓动系统。每次定位成为一个 anchor,按其数据源自身的时间戳(位置年龄)定位,因此多源更新对齐在同一条时间线上。只有速度超过阈值才向前外推(慢速/滑行飞机关闭——这时每次更新的位移和 ADS-B 噪声同量级,正是旧版高 zoom “漂移”的根因);显示标记以与帧率无关的低通滤波缓动逼近目标,其时间常数随 zoom 自适应(放大更顺、缩小更跟手)。新定位只移动 anchor,标记永不瞬移,数据源切换被缓动吸收而非跳变。",
    },
    highlights: [
      {
        en: "Slow/taxiing aircraft no longer drift the wrong way then snap back at high zoom (extrapolation gates off below ~8–25kt and on the ground); steady targets sit visually still at far/mid zoom (per-frame jitter ~0).",
        zh: "慢速/滑行飞机在高 zoom 下不再先朝错误方向漂移再回弹(约 8–25kt 以下及地面时关闭外推);稳定目标在远/中 zoom 下视觉上保持静止(逐帧抖动 ~0)。",
      },
      {
        en: "Runs inside the existing single-canvas render loop — a few float ops per aircraft per frame (~0.16µs/plane), no new map layers or repaints. Tuning constants live in one POSITION_SMOOTHING config block.",
        zh: "运行在现有单 canvas 渲染循环内——每架飞机每帧几次浮点运算(约 0.16µs/架),不新增地图图层或重绘。调参常量集中在一个 POSITION_SMOOTHING 配置块。",
      },
      {
        en: "Proven before wiring to the display: real KLAX fix sequences (slow, fast-cruise, and source-switching targets) were recorded and replayed through an offline harness that asserts jitter, lag, drift, and source-switch thresholds across far/mid/high zoom. Fixtures and harness are committed for repeatability.",
        zh: "接入显示前先证明:录制真实 KLAX 定位序列(慢速、巡航、跨源切换目标)并通过离线 harness 重放,在远/中/高 zoom 下对抖动、滞后、漂移、源切换阈值逐一断言。fixtures 与 harness 已入库可复跑。",
      },
    ],
  },
  {
    version: "v2.34.1",
    kind: "feat",
    title: {
      en: "Crisp-line airport night lighting",
      zh: "细线机场夜间灯光",
    },
    summary: {
      en: "The airport runway/taxiway lighting is rebuilt as a performance-safe, crisp-line night system — a handful of thin themed SVG lines (dashed runway edges with amber caution zones, faint centerline, white end bars, flashing REIL, lit taxiways) instead of 1,500–2,000 colored point markers per airport, with no GPU blur or dimming layer. Zoom-gated to the detail view and dark theme; v2.34.1 also shows aerodrome-polygon buildings at the detail zoom and draws the runway as a thin clean bar at the medium zoom.",
      zh: "机场跑道/滑行道灯光重做成一套性能安全的细线夜间系统——少量主题化细 SVG 线(虚线跑道边灯与 amber 警戒段、淡中线、白色端横杠、闪烁 REIL、点亮滑行道),取代每机场 1500–2000 个彩色点 marker,不用 GPU 模糊或压暗层。门控在详情 zoom 与暗色主题;v2.34.1 还在详情 zoom 显示机场边界多边形内的建筑,并把中间 zoom 档跑道画成细线。",
    },
    highlights: [],
  },
  {
    version: "v2.33.1",
    kind: "feat",
    title: {
      en: "Canvas aircraft rendering",
      zh: "Canvas 飞机渲染",
    },
    summary: {
      en: "Every aircraft on the map now draws into a single <canvas> overlay in one loop, replacing the old per-plane DOM markers. A busy airport collapses from ~80 composited layers to one, freeing the GPU so the map stays smooth while you scroll the sidebar list; live extrapolated positions, selection, click-to-track, filtering, and per-target frame-rate are preserved, with a cleaner flat glyph.",
      zh: "地图上的每架飞机现在都在一个绘制循环里画进同一块 <canvas> 叠加层,取代旧的每架一个 DOM marker。繁忙机场从约 80 个合成层收敛为一个,把 GPU 解放出来,让你滚动侧栏列表时地图保持顺滑;实时外推位置、选中、点击追踪、筛选和按目标的帧率都保留,字形改为更干净的扁平剪影。",
    },
    highlights: [],
  },
  {
    version: "v2.32.13",
    kind: "feat",
    title: {
      en: "Animated flight-rule glyph + live-map & sidebar-scroll performance",
      zh: "飞行规则动效图标 + 实时地图与侧栏滚动性能",
    },
    summary: {
      en: "The METAR weather view gained an animated flight-rules category glyph, and the 2.32 line landed a sustained live-map and sidebar-scroll performance run: aircraft markers stopped rebuilding their SVG on every tick and had their motion rate-limited, the desktop sidebar dropped its live backdrop blur for an opaque frosted tint, and a production trace pinned the residual scroll jank on forced synchronous layout — removed from both the marker motion loop and the nearby-list virtualizer.",
      zh: "METAR 天气视图新增了飞行规则分类动效图标,2.32 这条线还做了一轮持续的实时地图与侧栏滚动性能优化:飞机 marker 不再每个 tick 重建 SVG 并对运动限频,桌面侧栏去掉实时背景模糊改用不透明磨砂,一段生产 trace 把残留的滚动卡顿定位到强制同步布局——从 marker 运动循环和附近列表虚拟化里一并移除。",
    },
    highlights: [],
  },
  {
    version: "v2.31.8",
    kind: "feat",
    title: {
      en: "Flight route badges in the nearby list",
      zh: "邻近列表加入航路徽章",
    },
    summary: {
      en: "Routed aircraft in the nearby list now carry a compact route badge — origin → destination in a frosted pill, with the airline's logo fading in at the left when one is available. When the list re-sorts, each row stays in place and its content cross-fades to the new aircraft instead of sliding around, and the Flights metric and logo row in the airport sidebar got matching motion and blend polish.",
      zh: "邻近列表中有航路的飞机现在带一枚紧凑的航路徽章——磨砂胶囊里显示起点 → 终点,有航司 logo 时在左侧淡入。列表重新排序时每一行位置不动、内容就地交叉淡入切到新飞机(而非整行滑动);机场侧边栏的 Flights 指标与 logo 行也获得了配套的动效与融合打磨。",
    },
    highlights: [],
  },
  {
    version: "v2.30.17",
    kind: "feat",
    title: {
      en: "Airport weather redesign + sidebar & landscape polish",
      zh: "机场天气改版 + 侧栏与横屏打磨",
    },
    summary: {
      en: "Airport weather is rebuilt around one colour-coded hero card per view (METAR / Local, now with UV index and visibility). On top of that, a long polish run: a quieter frosted sidebar with an opaque logo bar (no scroll blur), tighter typography, a smoother first screen, and a full mobile-landscape pass — an edge-to-edge panel clear of the Dynamic Island, the full place identity at a home-matched width, and the map scale kept clear of the sidebar.",
      zh: "机场天气以每视图一张颜色编码主卡片重做(METAR / 实况,新增紫外线与能见度)。在此基础上一轮长打磨:更安静的磨砂侧栏与不透明 logo 条(滚动无模糊)、排版更紧、首屏更顺滑,以及一整轮移动端横屏修整——面板铺到边缘并避开灵动岛、完整地点信息且宽度与首屏对齐、地图比例尺避开侧栏。",
    },
    highlights: [],
  },
  {
    version: "v2.29.0",
    kind: "feat",
    title: {
      en: "Airport sidebar redesign — one scroll, single-line traffic list",
      zh: "机场侧栏改版——整体滚动、单行航班列表",
    },
    summary: {
      en: "The default airport sidebar is rebuilt on the frosted-glass language: a code-first identity (BOS · KBOS), a flat Flights hero with Wx / ATC / Spot cells, and a 2×2 filter grid where dropdowns carry a chevron and the Route toggle becomes an orange accent pill. Only the logo is pinned now — identity, hero, filters, and the nearby list scroll together as one region — while the list keeps windowing via scroll-margin virtualization, so the v2.28.8 performance win is preserved. Traffic rows collapse to a single fixed-height line: callsign · route on the left, distance and altitude grouped on the right and told apart by tone.",
      zh: "默认机场侧栏按霜面玻璃语言重做:以代码为主的标识(BOS · KBOS)、扁平的航班数概览(Wx / ATC / Spot),以及 2×2 筛选网格——下拉项带箭头,Route 开关激活时变为橙色强调胶囊。现在只有 Logo 固定,标识、概览、筛选与邻近列表作为一个区域一起滚动;列表仍通过 scroll-margin 虚拟化窗口化,因此保留了 v2.28.8 的性能改进。航班行收为单行定高:左侧呼号 · 航路,右侧距离与高度并排并以明暗区分。",
    },
    highlights: [],
  },
  {
    version: "v2.28.8",
    kind: "feat",
    title: {
      en: "Designed, not aligned — system pass",
      zh: "为「设计感」而非「对齐」打磨",
    },
    summary: {
      en: "A page-by-page pass applying ADSBao's existing material system with intentional hierarchy, density rhythm, and surface separation — hierarchy now comes from size and luminance, never weight. The Explorer, About, and Mechanism sidebars converge on monospace code chips and serif group labels, while the aircraft and other preview cards share one frosted typography with a single orange accent. A material-fidelity correction flattened the glass and reserved orange for selection, and the desktop nearby list virtualizes again so dense pages window ~20 rows instead of mounting all of them.",
      zh: "逐页打磨，让 ADSBao 既有的材质系统以更有层次、更有节奏、更分面的方式呈现——层次来自字号与明度，而非字重。机场探索、关于、机制三处侧栏统一为等宽代号芯片与衬线分组标签，飞机及其它预览卡片共用同一套磨砂排版与唯一橙色强调色。一次材质回正让玻璃更平、橙色重新只用于选择态;桌面邻近列表也恢复虚拟化,密集页面只窗口化约 20 行而非全部挂载。",
    },
    highlights: [],
  },
  {
    version: "v2.27.0",
    kind: "feat",
    title: {
      en: "Frosted interface redesign",
      zh: "Frosted 界面重构",
    },
    summary: {
      en: "A whole-app frosted-glass visual system: theme-following chrome, one orange signal accent, a shared first-screen type scale, and consistent airport / aircraft / home / static surfaces.",
      zh: "全应用 Frosted 玻璃视觉系统：跟随主题的界面、统一橙色信号强调色、共享首屏排版梯度，以及一致的机场 / 飞机 / 首页 / 静态页表面。",
    },
    highlights: [],
  },
  {
    version: "v2.26.17",
    kind: "feat",
    title: {
      en: "Dark glass interface redesign",
      zh: "深色玻璃界面重设计",
    },
    summary: {
      en: "Sidebars, static pages, toolbars, search fields, and settings converge on a denser dark-glass interface inspired by compact professional dashboards. A long refinement run aligns the home and airport lists to shared text rails, drops divider lines and heavy separators for column alignment across the traffic list and toolbars, and lightens map settings into linear inline rows. The mechanism, about, and home pages gain quieter chrome, more readable mobile panels, and source rails in place of repeated badges.",
      zh: "侧栏、静态页、工具栏、搜索框和设置面板统一到更紧凑的深色玻璃界面，灵感来自专业仪表盘的克制密度。一轮长期精修让首页与机场列表对齐到共享文字轴,航班列表与工具栏以列对齐取代分隔线和厚重分隔符,地图设置也轻量化为线性内联行。机制、关于、首页等页面外观更安静,移动端面板更可读,数据来源改用对齐 rail 而非重复 badge。",
    },
    highlights: [],
  },
  {
    version: "v2.25.1",
    kind: "feat",
    title: {
      en: "Minimal interface density pass",
      zh: "极简界面密度重设",
    },
    summary: {
      en: "The app interface favors alignment, thin dividers, compact rows, and quieter surfaces over boxed panels, while preserving the existing typography and map toolbar model. A follow-up pass tightens nearby rows, removes glass highlights from metric and filter selection states, and quiets search and table-header styling.",
      zh: "全站界面改为以对齐、细分隔线、紧凑行和更克制的表面建立秩序，减少盒子式面板，同时保留现有字体与地图工具栏模型。后续打磨进一步收紧邻近列表行,移除指标和筛选选中态的玻璃高光,并让搜索框与表头样式更克制。",
    },
    highlights: [],
  },
  {
    version: "v2.24.5",
    kind: "feat",
    title: {
      en: "My location status and compass in settings",
      zh: "设置中显示我的位置状态与罗盘",
    },
    summary: {
      en: "Map settings now surface live location acquisition and compass heading status, with a force re-acquire button when position is not yet ready and reliable heading-beam rotation on mobile. A run of sidebar and scale work keeps landscape sidebars scrollable and safe-area aware, restores the wider column on narrow devices, aligns nearby numeric columns, and standardizes the vertical scale ruler. Mobile home loads its dot-matrix video from the PWA static shell.",
      zh: "地图设置现在展示实时位置获取与罗盘朝向状态:位置未就绪时显示强制重新获取按钮,移动端罗盘光束也能可靠旋转。一系列侧栏与比例尺工作让横屏侧栏保持可滚动、避开安全区,在窄设备上恢复较宽列,对齐邻近列表数值列,并统一为竖向比例尺。移动端首页从 PWA 静态 shell 加载飞机点阵视频。",
    },
    highlights: [],
  },
  {
    version: "v2.22.18",
    kind: "feat",
    title: {
      en: "Route lookup boundary and here-view location",
      zh: "航路查询边界与我的位置定位",
    },
    summary: {
      en: "Route lookup and aircraft metadata now flow through a protected backend boundary instead of browser-side upstream calls. A sustained run hardens the /here experience: its own live location marker, a heading arc that follows the phone compass, tighter position filtering, and more reliable recovery after the browser has been backgrounded. Live marker coordinates and compass heading now update across every map view that can show my location, sidebar altitude filtering goes multi-select, and tracking, airspace, gesture, and photo-navigation paths get steadier.",
      zh: "航路查询和飞机元数据现在走受保护的后端边界,不再由浏览器直接访问上游。一轮持续工作强化了 /here 体验:独立的实时定位点、跟随手机罗盘的视角圆弧、更灵敏的位置防抖,以及浏览器长时间后台后更可靠的恢复。任何能显示我的位置的地图视图都会即时更新定位点坐标与罗盘朝向,侧栏高度筛选改为多选,追踪、空域、手势与拍机点导航路径也更稳定。",
    },
    highlights: [],
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
    highlights: [],
  },
  {
    version: "v2.19.6",
    kind: "feat",
    title: {
      en: "OurAirports names and reporting point previews",
      zh: "OurAirports 机场名称与报告点预览",
    },
    summary: {
      en: "Airport names now come from the OurAirports database table rather than OpenAIP, with no OpenAIP name fallback. Airport maps can optionally show OpenAIP reporting points with their own icon treatment and desktop/mobile preview cards. Static pages also feel cleaner through refreshed brand media, steadier sidebar spacing, and quieter page chrome.",
      zh: "机场名称现在来自数据库里的 OurAirports 表,不再回退使用 OpenAIP 名称。机场地图可按设置显示 OpenAIP 报告点,并使用独立图标样式与桌面端/移动端预览卡。静态页面也通过新版品牌媒体、更稳定的侧栏留白和更安静的页面外观变得更干净。",
    },
    highlights: [],
  },
  {
    version: "v2.18.0",
    kind: "feat",
    title: {
      en: "Progressive changelog loading",
      zh: "更新日志渐进加载",
    },
    summary: {
      en: "The changelog became lighter by keeping recent releases in the shell and loading older history only when readers ask for it.",
      zh: "更新日志变得更轻：静态壳只带近期发布记录，更早历史在读者继续查看时再加载。",
    },
    highlights: [],
  },
  {
    version: "v2.17.0",
    kind: "feat",
    title: {
      en: "Offline static shell",
      zh: "静态页面离线壳",
    },
    summary: {
      en: "Static pages gained an offline shell and the mobile app handoff became steadier across updates and rotation.",
      zh: "静态页面加入离线壳，移动端在更新接管和旋转恢复上也更稳定。",
    },
    highlights: [],
  },
  {
    version: "v2.16.0",
    kind: "feat",
    title: {
      en: "Collapsible sidebars and faster map controls",
      zh: "可收起侧栏与更快地图控件",
    },
    summary: {
      en: "Sidebars became more consistent across map and static pages, while common map controls felt faster and less jumpy.",
      zh: "地图页和静态页侧栏变得更一致，常用地图控件也更快、更少跳动。",
    },
    highlights: [],
  },
  {
    version: "v2.15.0",
    kind: "feat",
    title: {
      en: "Landscape mobile cockpit",
      zh: "移动设备横屏座舱",
    },
    summary: {
      en: "Mobile landscape layouts became more reliable across safe areas, rotation recovery, previews, and shared device behavior.",
      zh: "移动横屏布局在安全区、旋转恢复、预览卡和共享设备判断上更可靠。",
    },
    highlights: [],
  },
  {
    version: "v2.14.0",
    kind: "feat",
    title: {
      en: "Airport surface layers load progressively",
      zh: "机场地面图层分层加载",
    },
    summary: {
      en: "Airport surface maps became more resilient, and older runtime paths were cleaned up around the active Railway data-service.",
      zh: "机场地面图层更有韧性，同时围绕当前 Railway data-service 清理了旧运行时代码。",
    },
    highlights: [],
  },
  {
    version: "v2.13.0",
    kind: "feat",
    title: {
      en: "Faster first screen",
      zh: "首屏加载提速",
    },
    summary: {
      en: "The first screen and near-airport map detail became lighter, faster, and easier to read.",
      zh: "首屏和近场机场地图细节变得更轻、更快，也更容易读。",
    },
    highlights: [],
  },
  {
    version: "v2.12.0",
    kind: "feat",
    title: {
      en: "Better Stack observability",
      zh: "Better Stack 可观测性",
    },
    summary: {
      en: "Backend observability moved to Better Stack, and the in-app version prompt became less noisy.",
      zh: "后端可观测性迁移到 Better Stack，应用内版本提示也减少了误报。",
    },
    highlights: [],
  },
  {
    version: "v2.11.0",
    kind: "feat",
    title: {
      en: "Version refresh prompt",
      zh: "新版刷新提示",
    },
    summary: {
      en: "Open ADSBao tabs now check the latest deployed build and show a persistent refresh toast when a newer version is available.",
      zh: "已打开的 ADSBao 页面现在会检查最新部署版本；当有新版可用时，会显示持续的刷新提示。",
    },
    highlights: [],
  },
  {
    version: "v2.10.0",
    kind: "feat",
    title: {
      en: "Route data reuse",
      zh: "跨页面数据复用",
    },
    summary: {
      en: "Airport detail, deferred context, surface maps, and aircraft photos now share TanStack-backed session data so repeat page switches reuse fresh payloads instead of restarting every request path.",
      zh: "机场详情、延迟上下文、地面图层和飞机照片现在共享 TanStack 会话数据，重复页面切换会复用新鲜 payload，而不是重新走一遍请求链路。",
    },
    highlights: [],
  },
  {
    version: "v2.9.0",
    kind: "feat",
    title: {
      en: "Faster page transitions",
      zh: "页面切换提速",
    },
    summary: {
      en: "Airport-to-airport, airport-to-aircraft, and aircraft-to-airport transitions now avoid duplicate payloads, keep more route shell state alive, and move heavy optional modules out of the first page switch.",
      zh: "机场到机场、机场到飞机、飞机回机场的切换现在会避免重复 payload，保留更多路由外壳状态，并把较重的可选模块移出首次页面切换。",
    },
    highlights: [],
  },
  {
    version: "v2.8.0",
    kind: "feat",
    title: {
      en: "Faster map readiness and view controls",
      zh: "更快的地图就绪与视图控制",
    },
    summary: {
      en: "Airport and aircraft maps became quicker to reach, clearer when traces are missing, and steadier during nearby-airport navigation.",
      zh: "机场和飞机地图进入更快，航迹缺失时更清楚，附近机场跳转时也更稳定。",
    },
    highlights: [],
  },
  {
    version: "v2.7.0",
    kind: "feat",
    title: {
      en: "Legacy cleanup & bilingual changelog",
      zh: "旧架构清理与双语更新日志",
    },
    summary: {
      en: "The app shed legacy client code, made the changelog bilingual, and improved runway, taxiway, and aircraft-light visuals.",
      zh: "应用清理了旧客户端代码，更新日志变为双语，并增强了跑道、滑行道和飞机灯光表现。",
    },
    highlights: [],
  },
  {
    version: "v2.6.0",
    kind: "feat",
    title: "Railway single-service and observability",
    summary:
      "The app converged on a Railway single-service architecture, with observability and migration polish folded into one release line.",
    highlights: [],
  },
  {
    version: "v2.5.0",
    kind: "feat",
    title: "Realtime data service and toolbar polish",
    summary:
      "Live traffic moved to ADSBao's own realtime service, while map toolbars and tracking flows became more consistent.",
    highlights: [],
  },
  {
    version: "v2.4.0",
    kind: "feat",
    title: "Liquid glass visual system",
    summary:
      "The interface moved to a liquid-glass visual system, with cleaner browse lists, toolbar treatment, typography, and airport names.",
    highlights: [],
  },
  {
    version: "v2.3.0",
    kind: "feat",
    title: "Screen wake lock and tracking stability",
    summary:
      "The map gained a keep-awake control, while loading states, list feedback, and flight tracking became sturdier.",
    highlights: [],
  },
  {
    version: "v2.2.0",
    kind: "feat",
    title: "Weather, map detail, and motion polish",
    summary:
      "Weather cards, near-me behavior, standard map detail, and app-wide motion all became richer.",
    highlights: [],
  },
  {
    version: "v2.1.0",
    kind: "feat",
    title: "Near-me explorer + Plane Hunter polish",
    summary:
      "A new /here page mirrors the airport detail experience but centered on the user's location, with live position tracking. Plane Hunter gets a simpler native source picker and a tighter map template.",
    highlights: [],
  },
  {
    version: "v2.0.0",
    kind: "breaking",
    title: "Plane Hunter mode goes GA",
    summary:
      "Plane Hunter ships as a two-step capture studio that bakes the chosen template into a shareable PNG. A new Maps template overlays an OSM tile of your location.",
    highlights: [],
  },
  {
    version: "v1.13.0",
    kind: "feat",
    title: "Bottom-floating mobile toolbar + device-aware settings",
    summary:
      "Mobile gets a single bottom-pinned toolbar across every page, and signed-in users keep separate desktop and mobile map preferences.",
    highlights: [],
  },
  {
    version: "v1.12.0",
    kind: "feat",
    title: "Map readability + badge polish",
    summary:
      "Quieter terrain palette and a unified badge system with collision-aware stacking.",
    highlights: [],
  },
  {
    version: "v1.11.0",
    kind: "feat",
    title: "Full-trace nav count badges",
    summary:
      "Long routes stay readable — dense low-zoom navaid labels collapse into cached count badges.",
    highlights: [],
  },
  {
    version: "v1.10.0",
    kind: "feat",
    title: "Airport facilities + sidebar polish",
    summary:
      "OurAirports facility data joins OpenAIP for better ATC frequency and nearby navaid coverage.",
    highlights: [],
  },
  {
    version: "v1.9.0",
    kind: "feat",
    title: "Watcher Mode candidate photo spots",
    summary:
      "Watcher Mode generates and renders runway-aligned candidate plane-watching spots for the focused airport.",
    highlights: [],
  },
  {
    version: "v1.8.0",
    kind: "feat",
    title: "Airport airspace and navigation polish",
    summary:
      "Airport maps gained OpenAIP airspace overlays, friendlier aircraft labels, navigation fixes, and quieter zoom behavior.",
    highlights: [],
  },
  {
    version: "v1.7.0",
    kind: "feat",
    title: "OpenAIP directory migration",
    summary:
      "Airport search and detail context now use OpenAIP as the primary aviation directory.",
    highlights: [],
  },
  {
    version: "v1.6.0",
    kind: "feat",
    title: "Virtualized nearby list + TanStack Query",
    summary:
      "Sidebar nearby list windows through a virtualizer with animated digit metrics; TanStack Query starts handling client-side data fetching.",
    highlights: [],
  },
  {
    version: "v1.5.0",
    kind: "feat",
    title: "Tracking stability + map label optimization",
    summary:
      "Flight tracking separates live, fallback, stale, and missing position states. Route overlays and map labels stay clearer.",
    highlights: [],
  },
  {
    version: "v1.4.0",
    kind: "feat",
    title: "Account sign-in + cleaner lost-signal",
    summary:
      "Sign in from the map toolbar or nav menu. The lost-signal modal now retries silently in the background.",
    highlights: [],
  },
  {
    version: "v1.3.0",
    kind: "feat",
    title: "adsbdb routes + community feedback + complete runway map",
    summary:
      "Route lookups move to api.adsbdb.com, users can submit temporary route corrections, and the runway map now renders every runway from OpenAIP.",
    highlights: [],
  },
  {
    version: "v1.2.0",
    kind: "feat",
    title: "Themed approach + nose beam + scale bar polish",
    summary:
      "Theme-aware runway approach visualization, dark-theme aircraft nose beam, always-on scale bar, and themed toasts.",
    highlights: [],
  },
  {
    version: "v1.1.0",
    kind: "feat",
    title: "Distance rings + scale bar",
    summary:
      "Concentric distance rings on the airport page and an adaptive scale bar at approach zoom; nearby searches unified to a 40 NM radius.",
    highlights: [],
  },
  {
    version: "v1.0.0",
    kind: "feat",
    title: "Persistent tracking + nav menu",
    summary:
      "Trace persists across refresh, a lost-signal overlay handles drops, and there's a new /changelog page.",
    highlights: [],
  },
  {
    version: "v0.12.0",
    kind: "feat",
    title: "Aircraft tracking page + polymorphic explorer",
    summary:
      "/aircraft/[callsign] route with a polymorphic sidebar + preview, fit-to-trace, and multi-provider failover.",
    highlights: [],
  },
  {
    version: "v0.11.0",
    kind: "feat",
    title: "Selected-aircraft trace + revalidation",
    summary:
      "Focused-aircraft live trace polyline, route revalidation via AeroDataBox, and ADS-B provider failover.",
    highlights: [],
  },
  {
    version: "v0.10.0",
    kind: "feat",
    title: "Global airport data + richer silhouettes",
    summary:
      "OpenAIP-backed global airport search, 178 ICAO-type silhouettes, and country flags on the home rows and airport headers.",
    highlights: [],
  },
  {
    version: "v0.9.0",
    kind: "feat",
    title: "Navy tracking console redesign",
    summary:
      "Sidebar + map layout, callsign-first traffic table, deep navy palette, and aircraft silhouette markers.",
    highlights: [],
  },
  {
    version: "v0.8.0",
    kind: "feat",
    title: "Next.js Vercel refactor",
    summary:
      "Rebuilt the app from Vue 3 / Vite to React on the Next.js App Router.",
    highlights: [],
  },
  {
    version: "v0.7.0",
    kind: "feat",
    title: "Flight route + traffic context",
    summary:
      "Airport-aware route labels, route lookup, and dual-range ADS-B polling.",
    highlights: [],
  },
  {
    version: "v0.6.0",
    kind: "feat",
    title: "Vercel observability + production routing",
    summary:
      "Web Analytics, Speed Insights, and hardened proxy + upstream logging.",
    highlights: [],
  },
  {
    version: "v0.5.0",
    kind: "feat",
    title: "Vercel-first web architecture",
    summary:
      "Vercel deploy config, same-origin proxies, Electron + Homebrew dropped.",
    highlights: [],
  },
  {
    version: "v0.4.0",
    kind: "breaking",
    title: "ADSBao web pivot",
    summary:
      "Renamed to ADSBao and repositioned as an airport explorer; dropped LiveATC UI, player, and transcription scope.",
    highlights: [],
  },
];
