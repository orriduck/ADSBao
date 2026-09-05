import type { ChangelogEntry, ChangelogLocalizedReleaseCopy } from "./changelog";

export const CHANGELOG_HISTORY_ZH_COPY: Record<string, ChangelogLocalizedReleaseCopy> = {
  "v2.6.0": {
    title: "后端修复",
    summary: "修复后端 bug。",
    highlights: [],
  },
  "v2.5.0": {
    title: "Realtime 数据服务与工具栏打磨",
    summary: "新增或优化：Realtime 数据服务与工具栏打磨。",
    highlights: [],
  },
  "v2.4.0": {
    title: "液态玻璃视觉系统",
    summary: "新增或优化：液态玻璃视觉系统。",
    highlights: [],
  },
  "v2.3.0": {
    title: "屏幕常亮与追踪稳定性",
    summary: "新增或优化：屏幕常亮与追踪稳定性。",
    highlights: [],
  },
  "v2.2.0": {
    title: "天气、地图细节与动效",
    summary: "新增或优化：天气、地图细节与动效。",
    highlights: [],
  },
  "v2.1.0": {
    title: "我的位置探索页 + 拍机打磨",
    summary: "新增或优化：我的位置探索页 + 拍机打磨。",
    highlights: [],
  },
  "v2.0.0": {
    title: "拍机正式上线",
    summary: "新增或优化：拍机正式上线。",
    highlights: [],
  },
  "v1.13.0": {
    title: "移动端底部浮动工具栏与设备感知设置",
    summary: "新增或优化：移动端底部浮动工具栏与设备感知设置。",
    highlights: [],
  },
  "v1.12.0": {
    title: "地图可读性与 badge 打磨",
    summary: "新增或优化：地图可读性与 badge 打磨。",
    highlights: [],
  },
  "v1.11.0": {
    title: "全航迹地图上下文计数",
    summary: "新增或优化：全航迹地图上下文计数。",
    highlights: [],
  },
  "v1.10.0": {
    title: "机场设施数据与侧栏打磨",
    summary: "新增或优化：机场设施数据与侧栏打磨。",
    highlights: [],
  },
  "v1.9.0": {
    title: "看客模式候选拍机点",
    summary: "新增或优化：看客模式候选拍机点。",
    highlights: [],
  },
  "v1.8.0": {
    title: "机场空域与导航细节",
    summary: "新增或优化：机场空域与导航细节。",
    highlights: [],
  },
  "v1.7.0": {
    title: "OpenAIP 机场目录迁移",
    summary: "新增或优化：OpenAIP 机场目录迁移。",
    highlights: [],
  },
  "v1.6.0": {
    title: "附近列表虚拟化与数据层接入",
    summary: "新增或优化：附近列表虚拟化与数据层接入。",
    highlights: [],
  },
  "v1.5.0": {
    title: "跟踪稳定性与地图标签优化",
    summary: "新增或优化：跟踪稳定性与地图标签优化。",
    highlights: [],
  },
  "v1.4.0": {
    title: "账号登录与更安静的信号丢失处理",
    summary: "新增或优化：账号登录与更安静的信号丢失处理。",
    highlights: [],
  },
  "v1.3.0": {
    title: "航路、社区反馈与完整跑道地图",
    summary: "新增或优化：航路、社区反馈与完整跑道地图。",
    highlights: [],
  },
  "v1.2.0": {
    title: "主题化跑道进近、机首光束与比例尺",
    summary: "新增或优化：主题化跑道进近、机首光束与比例尺。",
    highlights: [],
  },
  "v1.1.0": {
    title: "距离环与地图比例尺",
    summary: "新增或优化：距离环与地图比例尺。",
    highlights: [],
  },
  "v1.0.0": {
    title: "持久跟踪会话与上弹导航菜单",
    summary: "新增或优化：持久跟踪会话与上弹导航菜单。",
    highlights: [],
  },
  "v0.12.0": {
    title: "飞机跟踪页与多形态 explorer",
    summary: "新增或优化：飞机跟踪页与多形态 explorer。",
    highlights: [],
  },
  "v0.11.0": {
    title: "选中飞机航迹与重新验证",
    summary: "新增或优化：选中飞机航迹与重新验证。",
    highlights: [],
  },
  "v0.10.0": {
    title: "全球机场数据与更丰富的飞机轮廓",
    summary: "新增或优化：全球机场数据与更丰富的飞机轮廓。",
    highlights: [],
  },
  "v0.9.0": {
    title: "海军蓝跟踪控制台重设计",
    summary: "新增或优化：海军蓝跟踪控制台重设计。",
    highlights: [],
  },
  "v0.8.0": {
    title: "后端修复",
    summary: "修复后端 bug。",
    highlights: [],
  },
  "v0.7.0": {
    title: "飞行航路与交通上下文",
    summary: "新增或优化：飞行航路与交通上下文。",
    highlights: [],
  },
  "v0.6.0": {
    title: "后端修复",
    summary: "修复后端 bug。",
    highlights: [],
  },
  "v0.5.0": {
    title: "后端修复",
    summary: "修复后端 bug。",
    highlights: [],
  },
};

export const CHANGELOG_HISTORY: ChangelogEntry[] = [
  {
    version: "v3.18.5",
    kind: "feat",
    title: {
      en: "Neutral instrument surfaces",
      zh: "中性材质仪表界面",
    },
    summary: {
      en: "Rounded neutral surfaces, shallow shadows and larger readouts unify the app in both themes. Local time compares airport and browser clocks, dates and the current time difference. Loading placeholders match the live layout; settings, photo-location dialogs and loading/error notices share consistent surfaces, centered icons and clearer interaction feedback. Photo controls and camera headers now follow the same rounded treatment. ATC and photo-location lists now keep their full content height and scroll through the sidebar on desktop and mobile.",
      zh: "全应用采用中性圆角表面、浅层阴影和舒展读数，保留明暗两套模式。当地时间可对照机场与浏览器的时间、日期和当前时差。加载骨架与实际布局对齐，设置、拍机点弹窗及加载和失败提示统一材质、图标居中与交互反馈，并统一照片入口和拍摄界面顶栏的圆角样式。ATC 和拍机点列表现在会保留完整内容高度，并可在桌面和手机侧栏中正常滚动。",
    },
    highlights: [],
  },
  {
    version: "v3.16.15",
    kind: "feat",
    title: {
      en: "Tracking interface refinement",
      zh: "追踪界面精修",
    },
    summary: {
      en: "Airport pages now reveal progressively, preserve stable known coordinates without duplicate nearby subscriptions or a zero-coordinate detour, avoid parallel HTTP traffic requests while a healthy SSE startup is pending, and surface separately delivered nearby-airport context in flight tracking.",
      zh: "机场页现在会渐进呈现，稳定保留已知坐标并避免重复附近订阅或绕经零坐标；健康 SSE 启动等待期间也不再并行请求 HTTP 航空流量，航班追踪则能正确显示独立送达的附近机场信息。",
    },
    highlights: [],
  },
  {
    version: "v3.15.2",
    kind: "feat",
    title: {
      en: "Wayfinding clarity",
      zh: "导视清晰度",
    },
    summary: {
      en: "A grayscale-and-yellow wayfinding refresh sharpens aircraft, stabilizes nearby lists, and gives Plane Studio a calmer camera and capture-review interface.",
      zh: "灰黄导视更新提升飞机清晰度、稳定附近列表，并让 Plane Studio 的拍摄与成片审核界面更清晰克制。",
    },
    highlights: [],
  },
  {
    version: "v3.14.3",
    kind: "feat",
    title: {
      en: "Cloudflare-native ADSBao",
      zh: "Cloudflare 原生 ADSBao",
    },
    summary: {
      en: "Cloudflare serves the site and API with free live traffic and airport context. The interface now pairs a grayscale wayfinding system with yellow reserved for airport identity and the primary Track action, color photography, one calm typeface, clearer hierarchy, continuous full-height rails with a restrained glass finish, white provider marks on a compact deep-blue sign, a quieter airport directory, and complete airport identities.",
      zh: "Cloudflare 承载站点与 API，并提供免费实时流量与机场上下文；界面现采用灰度导视系统，仅以黄色标记机场身份和主 Track 操作，并结合彩色摄影、单一字体、清晰字阶、带克制玻璃质感的连续全高 rail、紧凑深蓝导视条上的白色服务商标识、更安静的机场目录和完整的机场身份信息建立层级。",
    },
    highlights: [],
  },
  {
    version: "v3.13.37",
    kind: "feat",
    title: {
      en: "Cloudflare delivery",
      zh: "Cloudflare 交付",
    },
    summary: {
      en: "The frontend began routing same-origin API and EventSource requests through Cloudflare.",
      zh: "前端开始经由 Cloudflare 转发同源 API 与 EventSource 请求。",
    },
    highlights: [],
  },
  {
    version: "v3.12.4",
    kind: "feat",
    title: {
      en: "Operational wayfinding",
      zh: "导视化追踪界面",
    },
    summary: {
      en: "Airport, flight, and first-screen sidebars adopt a concise joined-sign hierarchy with clearer metrics, filters, and aircraft lists.",
      zh: "机场、航班与首屏侧栏采用简洁的连体导视层级，并提升指标、筛选器与飞机列表的扫读效率。",
    },
    highlights: [],
  },
  {
    version: "v3.10.28",
    kind: "feat",
    title: {
      en: "Stable tracking and map preferences",
      zh: "稳定追踪与地图偏好",
    },
    summary: {
      en: "Flight tracking rejects stale position frames, preserves a coherent live trace through brief feed gaps, and keeps map preferences on this device.",
      zh: "航班追踪会拒绝过期定位帧，在短暂数据中断时保持连续航迹，并将地图偏好保存在本机。",
    },
    highlights: [],
  },
  {
    version: "v3.9.13",
    kind: "feat",
    title: {
      en: "Recorded flight trace views",
      zh: "主动记录航迹视图",
    },
    summary: {
      en: "Flight tracking adds Follow, Full, and Recorded trace views, keeps route context coherent through brief feed gaps, and makes map controls and previews easier to scan on desktop and mobile.",
      zh: "航班追踪新增跟随、完整与记录航迹视图，在短暂数据中断时保持航路上下文连贯，并统一桌面与移动端的地图控件和预览结构。",
    },
    highlights: [],
  },
  {
    version: "v3.8.3",
    kind: "feat",
    title: {
      en: "More observable live tracking",
      zh: "更易观察的实时追踪",
    },
    summary: {
      en: "Live airport and flight context now reconnects transparently, route lookup recovers more reliably from temporary source outages, and journey endpoints and filters are easier to scan.",
      zh: "机场与航班的实时信息现在可自动恢复；航路查询在数据源暂时不可用时也会更稳定地恢复，飞行行程端点与筛选器也更易扫读。",
    },
    highlights: [],
  },
  {
    version: "v3.5.0",
    kind: "feat",
    title: {
      en: "Clearer temporary controls",
      zh: "临时交互更清晰",
    },
    summary: {
      en: "Settings and route feedback now adapt their surfaces to desktop and mobile.",
      zh: "地图设置与航路反馈现在会按桌面和移动端采用合适的交互层。",
    },
    highlights: [],
  },
  {
    version: "v3.3.8",
    kind: "feat",
    title: {
      en: "Airport loading and Plane Hunter framing refinement",
      zh: "机场加载与拍机取景优化",
    },
    summary: {
      en: "Added or improved: Airport loading and Plane Hunter framing refinement.",
      zh: "新增或优化：机场加载与拍机取景优化。",
    },
    highlights: [],
  },
  {
    version: "v3.3.2",
    kind: "feat",
    title: {
      en: "Cleaner map settings and camera template control",
      zh: "更干净的地图设置与相机模板控制",
    },
    summary: {
      en: "Added or improved: Cleaner map settings and camera template control.",
      zh: "新增或优化：更干净的地图设置与相机模板控制。",
    },
    highlights: [],
  },
  {
    version: "v3.2.10",
    kind: "feat",
    title: {
      en: "Aircraft blend into the weather and light",
      zh: "飞机融入天气与光照氛围",
    },
    summary: {
      en: "Added or improved: Aircraft blend into the weather and light.",
      zh: "新增或优化：飞机融入天气与光照氛围。",
    },
    highlights: [],
  },
  {
    version: "v3.1.2",
    kind: "feat",
    title: {
      en: "Proximity alerts: airport nearby (Here mode) and aircraft closing in",
      zh: "接近提醒:附近机场(我的位置模式)与飞机接近",
    },
    summary: {
      en: "Added or improved: Proximity alerts: airport nearby (Here mode) and aircraft closing in.",
      zh: "新增或优化：接近提醒:附近机场(我的位置模式)与飞机接近。",
    },
    highlights: [],
  },
  {
    version: "v3.0.1",
    kind: "feat",
    title: {
      en: "Plane Hunter for everyone: one-screen capture studio, no flag",
      zh: "拍机工作室面向所有人:一屏拍照,不再内测",
    },
    summary: {
      en: "Added or improved: Plane Hunter for everyone: one-screen capture studio, no flag.",
      zh: "新增或优化：拍机工作室面向所有人:一屏拍照,不再内测。",
    },
    highlights: [],
  },
  {
    version: "v2.43.1",
    kind: "feat",
    title: {
      en: "Steadier tracking: current-leg traces, routes that survive navigation, resilient feeds",
      zh: "更稳的追踪:当前航段航迹、跨页不丢的航线、更抗故障的数据流",
    },
    summary: {
      en: "Added or improved: Steadier tracking: current-leg traces, routes that survive navigation, resilient feeds.",
      zh: "新增或优化：更稳的追踪:当前航段航迹、跨页不丢的航线、更抗故障的数据流。",
    },
    highlights: [],
  },
  {
    version: "v2.42.4",
    kind: "feat",
    title: {
      en: "A zoom slider for the map, and clearer building footprints",
      zh: "地图缩放滑条 + 更清晰的建筑轮廓",
    },
    summary: {
      en: "Added or improved: A zoom slider for the map, and clearer building footprints.",
      zh: "新增或优化：地图缩放滑条 + 更清晰的建筑轮廓。",
    },
    highlights: [],
  },
  {
    version: "v2.40.1",
    kind: "feat",
    title: {
      en: "Aircraft cards reveal the city behind each airport code",
      zh: "飞机卡片在机场代码旁轮播出发/到达城市",
    },
    summary: {
      en: "Added or improved: Aircraft cards reveal the city behind each airport code.",
      zh: "新增或优化：飞机卡片在机场代码旁轮播出发/到达城市。",
    },
    highlights: [],
  },
  {
    version: "v2.39.5",
    kind: "feat",
    title: {
      en: "Faster, more complete trace & route on busy airports",
      zh: "繁忙机场的航迹与航线更快、更全",
    },
    summary: {
      en: "Added or improved: Faster, more complete trace & route on busy airports.",
      zh: "新增或优化：繁忙机场的航迹与航线更快、更全。",
    },
    highlights: [],
  },
  {
    version: "v2.38.1",
    kind: "feat",
    title: {
      en: "Frosted map labels, colour-coded targets, steadier flight pages",
      zh: "磨砂地图标签、目标配色与更稳的飞行页",
    },
    summary: {
      en: "Added or improved: Frosted map labels, colour-coded targets, steadier flight pages.",
      zh: "新增或优化：磨砂地图标签、目标配色与更稳的飞行页。",
    },
    highlights: [],
  },
  {
    version: "v2.37.0",
    kind: "feat",
    title: {
      en: "Lighter Explorer re-renders",
      zh: "更轻的 Explorer 重渲染",
    },
    summary: {
      en: "Added or improved: Lighter Explorer re-renders.",
      zh: "新增或优化：更轻的 Explorer 重渲染。",
    },
    highlights: [],
  },
  {
    version: "v2.36.0",
    kind: "feat",
    title: {
      en: "Steadier realtime aircraft subscriptions",
      zh: "更稳的实时航空器订阅",
    },
    summary: {
      en: "Added or improved: Steadier realtime aircraft subscriptions.",
      zh: "新增或优化：更稳的实时航空器订阅。",
    },
    highlights: [],
  },
  {
    version: "v2.35.0",
    kind: "feat",
    title: {
      en: "Adaptive aircraft position smoothing",
      zh: "自适应飞机位置平滑",
    },
    summary: {
      en: "Added or improved: Adaptive aircraft position smoothing.",
      zh: "新增或优化：自适应飞机位置平滑。",
    },
    highlights: [],
  },
  {
    version: "v2.34.1",
    kind: "feat",
    title: {
      en: "Crisp-line airport night lighting",
      zh: "细线机场夜间灯光",
    },
    summary: {
      en: "Added or improved: Crisp-line airport night lighting.",
      zh: "新增或优化：细线机场夜间灯光。",
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
      en: "Added or improved: Canvas aircraft rendering.",
      zh: "新增或优化：Canvas 飞机渲染。",
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
      en: "Added or improved: Animated flight-rule glyph + live-map & sidebar-scroll performance.",
      zh: "新增或优化：飞行规则动效图标 + 实时地图与侧栏滚动性能。",
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
      en: "Added or improved: Flight route badges in the nearby list.",
      zh: "新增或优化：邻近列表加入航路徽章。",
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
      en: "Added or improved: Airport weather redesign + sidebar & landscape polish.",
      zh: "新增或优化：机场天气改版 + 侧栏与横屏打磨。",
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
      en: "Added or improved: Airport sidebar redesign — one scroll, single-line traffic list.",
      zh: "新增或优化：机场侧栏改版——整体滚动、单行航班列表。",
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
      en: "Added or improved: Designed, not aligned — system pass.",
      zh: "新增或优化：为「设计感」而非「对齐」打磨。",
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
      en: "Added or improved: Frosted interface redesign.",
      zh: "新增或优化：Frosted 界面重构。",
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
      en: "Added or improved: Dark glass interface redesign.",
      zh: "新增或优化：深色玻璃界面重设计。",
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
      en: "Added or improved: Minimal interface density pass.",
      zh: "新增或优化：极简界面密度重设。",
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
      en: "Added or improved: My location status and compass in settings.",
      zh: "新增或优化：设置中显示我的位置状态与罗盘。",
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
      en: "Added or improved: Route lookup boundary and here-view location.",
      zh: "新增或优化：航路查询边界与我的位置定位。",
    },
    highlights: [],
  },
  {
    version: "v2.20.0",
    kind: "feat",
    title: {
      en: "Backend fixes",
      zh: "后端修复",
    },
    summary: {
      en: "Fixed backend bugs.",
      zh: "修复后端 bug。",
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
      en: "Added or improved: OurAirports names and reporting point previews.",
      zh: "新增或优化：OurAirports 机场名称与报告点预览。",
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
      en: "Added or improved: Progressive changelog loading.",
      zh: "新增或优化：更新日志渐进加载。",
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
      en: "Added or improved: Offline static shell.",
      zh: "新增或优化：静态页面离线壳。",
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
      en: "Added or improved: Collapsible sidebars and faster map controls.",
      zh: "新增或优化：可收起侧栏与更快地图控件。",
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
      en: "Added or improved: Landscape mobile cockpit.",
      zh: "新增或优化：移动设备横屏座舱。",
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
      en: "Added or improved: Airport surface layers load progressively.",
      zh: "新增或优化：机场地面图层分层加载。",
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
      en: "Added or improved: Faster first screen.",
      zh: "新增或优化：首屏加载提速。",
    },
    highlights: [],
  },
  {
    version: "v2.12.0",
    kind: "feat",
    title: {
      en: "Backend fixes",
      zh: "后端修复",
    },
    summary: {
      en: "Fixed backend bugs.",
      zh: "修复后端 bug。",
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
      en: "Added or improved: Version refresh prompt.",
      zh: "新增或优化：新版刷新提示。",
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
      en: "Added or improved: Route data reuse.",
      zh: "新增或优化：跨页面数据复用。",
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
      en: "Added or improved: Faster page transitions.",
      zh: "新增或优化：页面切换提速。",
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
      en: "Added or improved: Faster map readiness and view controls.",
      zh: "新增或优化：更快的地图就绪与视图控制。",
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
      en: "Added or improved: Legacy cleanup & bilingual changelog.",
      zh: "新增或优化：旧架构清理与双语更新日志。",
    },
    highlights: [],
  },
  {
    version: "v2.6.0",
    kind: "feat",
    title: "Backend fixes",
    summary: "Fixed backend bugs.",
    highlights: [],
  },
  {
    version: "v2.5.0",
    kind: "feat",
    title: "Realtime data service and toolbar polish",
    summary: "Added or improved: Realtime data service and toolbar polish.",
    highlights: [],
  },
  {
    version: "v2.4.0",
    kind: "feat",
    title: "Liquid glass visual system",
    summary: "Added or improved: Liquid glass visual system.",
    highlights: [],
  },
  {
    version: "v2.3.0",
    kind: "feat",
    title: "Screen wake lock and tracking stability",
    summary: "Added or improved: Screen wake lock and tracking stability.",
    highlights: [],
  },
  {
    version: "v2.2.0",
    kind: "feat",
    title: "Weather, map detail, and motion polish",
    summary: "Added or improved: Weather, map detail, and motion polish.",
    highlights: [],
  },
  {
    version: "v2.1.0",
    kind: "feat",
    title: "Near-me explorer + Plane Hunter polish",
    summary: "Added or improved: Near-me explorer + Plane Hunter polish.",
    highlights: [],
  },
  {
    version: "v2.0.0",
    kind: "breaking",
    title: "Plane Hunter mode goes GA",
    summary: "Added or improved: Plane Hunter mode goes GA.",
    highlights: [],
  },
  {
    version: "v1.13.0",
    kind: "feat",
    title: "Bottom-floating mobile toolbar + device-aware settings",
    summary: "Added or improved: Bottom-floating mobile toolbar + device-aware settings.",
    highlights: [],
  },
  {
    version: "v1.12.0",
    kind: "feat",
    title: "Map readability + badge polish",
    summary: "Added or improved: Map readability + badge polish.",
    highlights: [],
  },
  {
    version: "v1.11.0",
    kind: "feat",
    title: "Full-trace nav count badges",
    summary: "Added or improved: Full-trace nav count badges.",
    highlights: [],
  },
  {
    version: "v1.10.0",
    kind: "feat",
    title: "Airport facilities + sidebar polish",
    summary: "Added or improved: Airport facilities + sidebar polish.",
    highlights: [],
  },
  {
    version: "v1.9.0",
    kind: "feat",
    title: "Watcher Mode candidate photo spots",
    summary: "Added or improved: Watcher Mode candidate photo spots.",
    highlights: [],
  },
  {
    version: "v1.8.0",
    kind: "feat",
    title: "Airport airspace and navigation polish",
    summary: "Added or improved: Airport airspace and navigation polish.",
    highlights: [],
  },
  {
    version: "v1.7.0",
    kind: "feat",
    title: "OpenAIP directory migration",
    summary: "Added or improved: OpenAIP directory migration.",
    highlights: [],
  },
  {
    version: "v1.6.0",
    kind: "feat",
    title: "Virtualized nearby list + TanStack Query",
    summary: "Added or improved: Virtualized nearby list + TanStack Query.",
    highlights: [],
  },
  {
    version: "v1.5.0",
    kind: "feat",
    title: "Tracking stability + map label optimization",
    summary: "Added or improved: Tracking stability + map label optimization.",
    highlights: [],
  },
  {
    version: "v1.4.0",
    kind: "feat",
    title: "Account sign-in + cleaner lost-signal",
    summary: "Added or improved: Account sign-in + cleaner lost-signal.",
    highlights: [],
  },
  {
    version: "v1.3.0",
    kind: "feat",
    title: "Routes + community feedback + complete runway map",
    summary: "Added or improved: routes + community feedback + complete runway map.",
    highlights: [],
  },
  {
    version: "v1.2.0",
    kind: "feat",
    title: "Themed approach + nose beam + scale bar polish",
    summary: "Added or improved: Themed approach + nose beam + scale bar polish.",
    highlights: [],
  },
  {
    version: "v1.1.0",
    kind: "feat",
    title: "Distance rings + scale bar",
    summary: "Added or improved: Distance rings + scale bar.",
    highlights: [],
  },
  {
    version: "v1.0.0",
    kind: "feat",
    title: "Persistent tracking + nav menu",
    summary: "Added or improved: Persistent tracking + nav menu.",
    highlights: [],
  },
  {
    version: "v0.12.0",
    kind: "feat",
    title: "Aircraft tracking page + polymorphic explorer",
    summary: "Added or improved: Aircraft tracking page + polymorphic explorer.",
    highlights: [],
  },
  {
    version: "v0.11.0",
    kind: "feat",
    title: "Selected-aircraft trace + revalidation",
    summary: "Added or improved: Selected-aircraft trace + revalidation.",
    highlights: [],
  },
  {
    version: "v0.10.0",
    kind: "feat",
    title: "Global airport data + richer silhouettes",
    summary: "Added or improved: Global airport data + richer silhouettes.",
    highlights: [],
  },
  {
    version: "v0.9.0",
    kind: "feat",
    title: "Navy tracking console redesign",
    summary: "Added or improved: Navy tracking console redesign.",
    highlights: [],
  },
  {
    version: "v0.8.0",
    kind: "feat",
    title: "Backend fixes",
    summary: "Fixed backend bugs.",
    highlights: [],
  },
  {
    version: "v0.7.0",
    kind: "feat",
    title: "Flight route + traffic context",
    summary: "Added or improved: Flight route + traffic context.",
    highlights: [],
  },
  {
    version: "v0.6.0",
    kind: "feat",
    title: "Backend fixes",
    summary: "Fixed backend bugs.",
    highlights: [],
  },
  {
    version: "v0.5.0",
    kind: "feat",
    title: "Backend fixes",
    summary: "Fixed backend bugs.",
    highlights: [],
  },
];
