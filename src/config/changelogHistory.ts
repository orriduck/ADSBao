import type { ChangelogEntry, ChangelogLocalizedReleaseCopy } from "./changelog";

export const CHANGELOG_HISTORY_ZH_COPY: Record<string, ChangelogLocalizedReleaseCopy> = {
  "v2.6.0": {
    title: "New Relic 可观测性",
    summary:
      "ADSBao 在 realtime data-service 和 Vercel proxy routes 上输出更完整的 New Relic telemetry。",
    highlights: [
      "Go data-service 的 HTTP 入口和后台 provider polling 接入 New Relic APM transactions",
      "外部 provider 请求会记录为结构化 logs、custom events、custom metrics 和 latency summaries",
      "Vercel proxy routes 接入 New Relic Metric API 与 Log API，用于追踪 route latency 和 provider errors",
    ],
  },
  "v2.5.1": {
    title: "工具栏与跟踪打磨",
    summary:
      "地图工具栏在桌面端和移动端更一致；精确航班号跟踪遇到空 provider 响应时会继续尝试后续数据源。",
    highlights: [
      "地图范围控制改为共享的 Far / Medium / Near 菜单，并为跟踪页加入完整轨迹与全部记录点视图",
      "设置、屏幕常亮、语言与主题控制在地图工具栏和移动端侧边栏里保持一致",
      "修复 realtime 航班号 provider fallback，像 DAL58 这样的海洋航段在 adsb.lol 为空时能继续从 airplanes.live 解析",
    ],
  },
  "v2.5.0": {
    title: "Realtime 数据服务",
    summary:
      "实时交通切到 ADSBao 自有 realtime data-service，并接入 app-owned persistence。",
    highlights: [
      "机场与附近视图的实时地图交通改由 Railway data-service 通过 WebSocket 推送",
      "app 持久化迁移到 Railway Postgres，静态机场补充数据与用户设置共用自有数据库",
      "收紧 realtime channel 边界：公开交通、选中飞机跟踪和内部 route-cache 各自分层",
    ],
  },
  "v2.4.2": {
    title: "统一的浏览列表与工具栏",
    summary:
      "首页、关于、机制、更新日志的浏览列表统一为一种整齐的列表风格 —— 对齐的代码药丸、单行行高、圆角磨砂 hover,选中/展开行采用液态玻璃胶囊。页面工具栏复用机场详情页工具栏的按钮样式。",
    highlights: [
      "所有侧栏浏览列表统一走 TextPillListItem 一个组件:扁平对齐行、圆角磨砂 hover、玻璃胶囊选中态",
      "选中的搜索结果、展开的机制条目升起为共享的液态玻璃胶囊",
      "首页/关于/机制/更新日志工具栏复用机场详情的 rail 按钮风格(磨砂 hover,不再深色墨水填充)",
      "更新日志条目变为干净的阅读块,版本药丸去掉斜切",
    ],
  },
  "v2.4.1": {
    title: "液态玻璃打磨",
    summary:
      "在液态玻璃重设计之上的打磨：更多表面采用该材质，所有可交互玻璃卡片加上 GSAP hover/press 动效，并修复一批 UI 问题 —— 侧栏顶部纯色、下拉菜单统一玻璃拟态、去掉黑色 focus 边框、标准底图降饱和、航线 tooltip 改磨砂。",
    highlights: [
      "逐时天气、明天卡、首页搜索栏采用液态玻璃材质；逐时选中态变为玻璃胶囊",
      "指标标签、筛选芯片、逐时卡片加上 GSAP hover 抬升 + press 回弹，并尊重 prefers-reduced-motion",
      "所有侧栏顶边保持纯主题色，与 iPhone Safari 浏览器裁切无缝对齐；暖光挪到底部",
      "下拉菜单与 tooltip 统一为磨砂玻璃拟态；菜单投影不再呈现发光光晕",
      "去掉搜索框、海拔筛选、select 触发器上的近黑 focus 边框",
      "标准底图降饱和为柔和的手册纸张色调",
    ],
  },
  "v2.4.0": {
    title: "液态玻璃重设计",
    summary:
      "所有浮层在彩色底图之上重建为 Apple 风格的液态玻璃：静止态是奶白磨砂的卡片与工具栏，选中态是抛光玻璃胶囊 — 浅色主题为深色烟雾、深色主题为通透白光 — 并带有标志性的一角溶解。",
    highlights: [
      "选中卡片、筛选芯片、设置选项和工具栏按钮共用同一种玻璃胶囊材质：烟雾般的半透墨水、背景磨砂、顶部高光镶边，右下角溶解露出背后的表面",
      "深色主题选中态反转为通透白玻璃胶囊，深色墨水文字落在近黑机身上",
      "静止态卡片与工具栏胶囊变为明亮奶白磨砂玻璃，带发光镶边、柔和浮起阴影和清晰深色图标",
      "彩色 CARTO voyager 底图替换原本被冲淡的矢量样式，让磨砂有真实地理细节可扩散",
      "侧边栏与面板重建为 token 驱动的磨砂材质系统（--app-frost、--atc-glass-*、--atc-control-*），全站表面共享",
      "DESIGN.md 重写为液态玻璃的设计基准，供后续 UI 工作参考",
    ],
  },
  "v2.3.1": {
    title: "水合稳定性、列表行打磨与飞行跟踪韧性",
    summary:
      "消除全站 SSR 水合不匹配和中间状态闪烁。统一列表行 hover 背景+下划线。飞行跟踪使用 nearby 优先位置和单源超时保护。",
    highlights: [
      "全新 Skeleton 组件替换天气/设置加载中的文字占位 — 消除闪白",
      "地图设置和 feature flag 在水合完成前阻止渲染，防止布局跳动",
      "首页、关于、机制、更新日志页统一列表行 hover 效果（背景底色 + 下划线）",
      "HERE 徽章替换我的位置图标，宽度对齐 ICAO 代码行",
      "飞行地图焦点在 nearby 数据比 callsign 新鲜时自动使用合并后的位置",
      "callsign 请求单源 4s 超时 — 一个慢源不再拖死整次轮询",
      "useWakeLock 在 useEffect 中检测浏览器支持，修复 SSR 水合报错",
    ],
  },
  "v2.3.0": {
    title: "屏幕常亮开关 + 状态栏打磨",
    summary:
      "地图工具栏新增屏幕常亮开关，长时间看飞机时防止设备休眠。状态栏加宽、单行显示，并用 GSAP 过渡替换了旧动画。",
    highlights: [
      "工具栏新增屏幕常亮切换 — Coffee 图标，点击防止屏幕休眠",
      "状态栏激活时显示「☕ 屏幕常亮」指示，与数据源标识同行",
      "用 GSAP StatusSpan 替换旧文字切换动画，文字切换更流畅",
      "状态栏宽度放宽并移除换行 — 始终单行显示",
    ],
  },
  "v2.2.1": {
    title: "标准地图细节增强 + GSAP 动画层",
    summary:
      "标准底图现在能显示建筑、水体、公园和道路 — 暗色主题不再隐藏地理信息。GSAP 为全站注入入场动画、卡片交互动效和列表交错展现。",
    highlights: [
      "标准底图在暗色主题下渲染建筑、水体、绿地与灰色道路,不再一片黑",
      "GSAP 驱动的页面入场、卡片 hover 弹性回弹、列表交错动画覆盖全站",
      "亮色主题切换至 Bright OSM 风格,119 层地理细节完整呈现",
    ],
  },
  "v2.2.0": {
    title: "逐时预报 + 中文修正 + 我的位置天气",
    summary:
      "本地天气新增 6 小时逐时预报网格和明天卡片。简中地名统一修正。桌面端我的位置改用单次定位 + 手动刷新。",
    highlights: [
      "本地天气: 3×2 逐时预报网格,点击卡片有 MetricCard 风格的 ink 背景和底部光晕,附带明天摘要卡片",
      "简中修正: OSM 分号分隔的多地名变体只取第一个; 繁→简转换器不再污染已达简中的文字",
      "我的位置模式: 天气面板只显示逐时预报 (不再有 METAR / 规则 / 气压 / 百科); 天气卡片可点击",
      "桌面端我的位置: 改用单次定位,右上角显示刷新按钮和最后获取时间戳",
      "高度前缀样式: FL 等前缀现在与单位同级字号,预览卡高度行三元素对齐",
    ],
  },
  "v2.1.0": {
    title: "我的位置探索页 + 拍机打磨",
    summary:
      "新增 /here 页,以你的当前位置为中心,镜像机场详情页的体验,带实时位置追踪。拍机功能改用更简单的系统原生选择器,地图模板更紧凑。",
    highlights: [
      "/here:显示你周围的飞机、附近机场和空域,跟随你移动自动刷新",
      "侧栏头部按你的实际位置显示城市 / 州 / 国家",
      "拍机入口简化为系统相机 / 相册选择器;地图模板半径约 1 海里",
      "细节修复 — 预览卡按方向滑入、长机型不再压到 callsign 上、航路只在 FlightAware 时显示",
    ],
  },
  "v2.0.0": {
    title: "拍机正式上线",
    summary:
      "拍机功能正式发布,两步式工作流:先拍照,再套模板,导出一张可分享的 PNG。新增「地图」模板,在照片上叠一张你所在位置的 OSM 拼贴。",
    highlights: [
      "两步流程 — 先拍照,再套模板 + 分享 / 保存 / 复制",
      "调用系统原生相机或相册",
      "新增「地图」模板 — 以你为中心的 OSM 瓦片,飞机在视野内会叠上去",
      "feature flag 移除,所有登录用户都能使用",
    ],
  },
  "v1.13.1": {
    title: "工具栏不透明度打磨",
    summary: "所有浮动工具栏在繁忙地图背景上都更易读。",
    highlights: ["首页 dock、侧栏覆盖层、地图控制栏的表面统一收紧"],
  },
  "v1.13.0": {
    title: "移动端底部浮动工具栏与设备感知设置",
    summary:
      "移动端所有页面都使用同一个底部固定的工具栏,登录用户可以分别保存桌面端和移动端的地图偏好。",
    highlights: [
      "移动端工具栏在所有页面浮动在底部居中",
      "登录用户的桌面端和移动端地图设置独立保存",
      "高空过境飞机不再被进近高度遮罩规则隐藏",
    ],
  },
  "v1.12.0": {
    title: "地图可读性与 badge 打磨",
    summary: "更安静的地形配色与带碰撞检测的统一 badge 体系。",
    highlights: [
      "亮暗主题都采用更平静的 hillshade 地形",
      "机场 / 导航台 badge 重叠时自动避让并连出引线",
      "点击重叠空域可循环切换",
    ],
  },
  "v1.11.1": {
    title: "地图 UI 细节打磨",
    summary: "空域可读性、全航迹视野、移动端页面滚动和紧凑 metric card 一起优化。",
    highlights: [
      "空域边缘内向标记,全航迹下边界文字更整洁",
      "移动端静态页只在面板内部滚动",
    ],
  },
  "v1.11.0": {
    title: "全航迹地图上下文计数",
    summary: "全航迹在低缩放层级把密集导航台标签替换为缓存的 NAV 计数 badge。",
    highlights: [
      "低缩放时聚合导航台计数 tile",
      "放大到细节阈值后仍显示完整标签",
    ],
  },
  "v1.10.0": {
    title: "机场设施数据与侧栏打磨",
    summary:
      "机场详情页在 OpenAIP 之外恢复了 OurAirports 设施数据,补齐 ATC 频率和导航台覆盖。",
    highlights: [
      "OurAirports 频率和导航台覆盖恢复",
      "机场侧栏加入独立 ATC 与拍机点面板",
    ],
  },
  "v1.9.0": {
    title: "看客模式候选拍机点",
    summary: "看客模式基于跑道朝向和 OSM 数据为焦点机场生成候选拍机点。",
    highlights: [
      "候选拍机点来自跑道朝向 + OpenStreetMap",
      "可点击的相机标记和带 OSM attribution 的预览卡",
    ],
  },
  "v1.8.4": {
    title: "机场缩放层级减噪",
    summary: "机场地图缩放层级现在共用一张 feature 配置表。",
    highlights: ["缩放相关地图功能集中到同一配置表维护"],
  },
  "v1.8.3": {
    title: "机制页与导航细节",
    summary: "机制页改回 Home / About 同款点阵壳;顶部导航跨页保留当前语言。",
    highlights: [
      "机制页改回 Home / About 同款点阵背景",
      "Home / About / Mechanism / Changelog 跳转时保留 locale",
    ],
  },
  "v1.8.1": {
    title: "机型名称与空域初始动画",
    summary: "预览与筛选优先显示友好机型名称;默认空域图层首次加载会淡入。",
    highlights: [
      "预览卡显示友好机型名称,ICAO 码降为辅助信息",
      "空域图层首次加载播放分层淡入",
    ],
  },
  "v1.8.0": {
    title: "机场空域图层",
    summary:
      "机场地图直接渲染 OpenAIP 空域:透明填充、边界文字、可点击预览、可持久化图层开关。",
    highlights: [
      "机场地图加入 OpenAIP 风格空域,点击可预览",
      "图层开关会缓存到浏览器",
    ],
  },
  "v1.7.0": {
    title: "OpenAIP 机场目录迁移",
    summary: "机场搜索与详情上下文改用 OpenAIP 作为主航空目录。",
    highlights: [
      "搜索、详情、频率、导航台、空域全部迁移到 OpenAIP",
      "跑道阈值几何继续由 Postgres 持久化数据提供",
    ],
  },
  "v1.6.0": {
    title: "附近列表虚拟化与数据层接入",
    summary:
      "侧栏附近列表改为窗口化滚动,距离和高度数字滚动呈现;TanStack Query 开始接管客户端数据获取。",
    highlights: [
      "附近列表(飞机 + 机场)虚拟化,距离 / 高度 NumberFlow 数字滚动",
      "页面 z-index 统一为命名 tier token",
      "TanStack Query 接入应用骨架",
    ],
  },
  "v1.5.0": {
    title: "跟踪稳定性与地图标签优化",
    summary: "飞行跟踪区分实时、兜底、陈旧、缺失位置状态;地图标签更清晰。",
    highlights: [
      "跟踪航班使用明确的位置状态",
      "预测航路改为虚线",
      "地图地名跟随界面语言",
    ],
  },
  "v1.4.0": {
    title: "账号登录与更安静的信号丢失处理",
    summary:
      "从地图工具栏或导航菜单登录;丢失信号时,弹窗保留当前视图并在后台静默重试。",
    highlights: [
      "地图工具栏头像入口可登录注册",
      "数据源恢复后自动续上,无需手动重试",
    ],
  },
  "v1.3.0": {
    title: "adsbdb 航路、社区反馈与完整跑道地图",
    summary:
      "航路查询迁移到 api.adsbdb.com,用户可提交临时航路修正,跑道地图从 OpenAIP 渲染所有跑道。",
    highlights: [
      "航路数据源切换到 api.adsbdb.com",
      "带 `*` 的用户航路在 12 小时内优先",
      "全球跑道地图来自 OpenAIP(含 VFR-only 跑道)",
    ],
  },
  "v1.2.1": {
    title: "Track 按钮支持新标签页打开",
    summary: "预览卡 Track 改为真实链接,右键新标签页打开可以正常工作。",
    highlights: ["Track 改为 <Link>"],
  },
  "v1.2.0": {
    title: "主题化跑道进近、机首光束与比例尺",
    summary: "按主题切换进近可视化、暗色机首光束、常驻比例尺和应用主题 toast。",
    highlights: [
      "进近:暗色为发光楔形,亮色为虚线延长中心线",
      "比例尺始终显示,背景模糊跟随主题",
    ],
  },
  "v1.1.0": {
    title: "距离环与地图比例尺",
    summary:
      "机场页同心距离环、进近缩放下自适应比例尺;附近搜索统一为 40 海里。",
    highlights: [
      "机场页:焦点机场每 3 海里一圈,最大 30 海里",
      "进近缩放时左下角显示比例尺",
    ],
  },
  "v1.0.0": {
    title: "持久跟踪会话与上弹导航菜单",
    summary: "刷新后保留航迹、信号丢失覆盖层、新增 /changelog 页面。",
    highlights: [
      "12 小时跟踪会话锚点 + 24 小时本地航迹缓存",
      "信号丢失覆盖层:保留、重试、返回首页",
      "新增 /changelog 页面",
    ],
  },
  "v0.12.0": {
    title: "飞机跟踪页与多形态 explorer",
    summary:
      "/aircraft/[callsign] 路由,多形态侧栏与预览,适配航迹,多数据源 failover。",
    highlights: [
      "/aircraft/[callsign] 复用机场布局",
      "多形态预览卡支持飞机与机场",
      "路由重命名:/[icao] → /airport/[icao]",
    ],
  },
  "v0.11.0": {
    title: "选中飞机航迹与重新验证",
    summary: "焦点飞机实时航迹线、AeroDataBox 重验航路、ADS-B 数据源 failover。",
    highlights: [
      "渐变航迹线 + 淡入标签卡",
      "ADS-B failover:5xx / 429 / timeout",
    ],
  },
  "v0.10.0": {
    title: "全球机场数据与更丰富的飞机轮廓",
    summary: "OpenAIP 提供全球搜索,178 种 ICAO 类型轮廓,首页与机场头部显示国旗。",
    highlights: [
      "OpenAIP 支撑 /api/search 和 /api/airport/[ident]",
      "178 个飞机轮廓随仓库发布",
    ],
  },
  "v0.9.0": {
    title: "海军蓝跟踪控制台重设计",
    summary: "侧栏 + 地图布局、呼号优先交通表、深海军蓝配色、轮廓标记。",
    highlights: [
      "400 px 桌面侧栏 + 全高地图",
      "ICAO 类型驱动的飞机轮廓标记",
    ],
  },
  "v0.8.0": {
    title: "Next.js Vercel 重构",
    summary: "应用从 Vue 3 / Vite 重建为 Next.js App Router 上的 React 应用。",
    highlights: [
      "React on Next.js App Router",
      "通过 Next 集成接入 Vercel Analytics 与 Speed Insights",
    ],
  },
  "v0.7.1": {
    title: "地图和移动端打磨",
    summary: "轮询保护、移动端 sheet 优化、ADS-B 合并修复。",
    highlights: ["坐标加载后才开始飞机轮询"],
  },
  "v0.7.0": {
    title: "飞行航路与交通上下文",
    summary: "机场感知航路标签、航路查询、双范围 ADS-B 轮询。",
    highlights: [
      "机场感知飞行航路标签",
      "双范围轮询:广域 20 海里 + 近距 3 海里",
    ],
  },
  "v0.6.0": {
    title: "Vercel 可观测性与生产路由",
    summary: "Web Analytics、Speed Insights、强化代理与上游日志。",
    highlights: [
      "Vercel Web Analytics + Speed Insights",
      "强化代理解析以防上游 HTML / error",
    ],
  },
  "v0.5.0": {
    title: "Vercel-first Web 架构",
    summary: "Vercel 部署配置、同源代理、移除 Electron 和 Homebrew。",
    highlights: [
      "METAR 与 ADS-B 上游同源代理",
      "移除 Electron 与 Homebrew cask pipeline",
    ],
  },
  "v0.4.0": {
    title: "ADSBao Web 转向",
    summary: "重命名为 ADSBao,重新定位为机场 explorer,移除 LiveATC UI、播放器与转录。",
    highlights: [
      "项目重命名为 ADSBao",
      "移除旧 LiveATC 前端 + 后端",
    ],
  },
};

export const CHANGELOG_HISTORY: ChangelogEntry[] = [
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
  {
    version: "v2.15.2",
    kind: "patch",
    title: {
      en: "Home landscape safe area",
      zh: "主页横屏安全区",
    },
    summary: {
      en: "Home and map pages now keep the sidebar layout consistent on landscape phones with left or right safe-area obstructions.",
      zh: "主页和地图页现在会在手机横屏左右安全区遮挡下保持一致的侧栏布局。",
    },
    highlights: [
      {
        en: "The home sidebar offsets from the active landscape safe-area edge instead of staying pinned to the physical screen edge",
        zh: "主页侧栏横屏时会避开当前 safe-area 边缘，不再贴住物理屏幕边",
      },
      {
        en: "Landscape mobile airport views stay in desktop-sidebar mode instead of occasionally falling into the mobile map-only toolbar state",
        zh: "移动设备横屏机场页会保持桌面侧栏布局，不再偶发落入只有地图和移动工具栏的状态",
      },
    ],
  },
  {
    version: "v2.15.1",
    kind: "patch",
    title: {
      en: "Landscape safe-area polish",
      zh: "横屏安全区打磨",
    },
    summary: {
      en: "Landscape mobile map pages now share the same safe-area handling and use the compact mobile preview when the desktop sidebar is active.",
      zh: "移动设备横屏地图页现在复用同一套安全区处理，并在桌面侧栏布局下改用紧凑移动预览卡。",
    },
    highlights: [
      {
        en: "Airport and flight detail pages offset the sidebar or map controls based on the active left or right safe-area inset",
        zh: "机场页和航班页会按当前左侧或右侧 safe-area inset 偏置侧栏与地图控件",
      },
      {
        en: "Reversed landscape orientation follows the obstruction side instead of assuming the same edge every time",
        zh: "反向横屏时会跟随遮挡所在一侧，不再固定假设同一边",
      },
      {
        en: "Landscape phones keep aircraft previews compact in the lower-right corner instead of opening the taller desktop preview",
        zh: "手机横屏时飞机预览保持右下角紧凑移动卡片，不再打开较高的桌面预览",
      },
    ],
  },
  {
    version: "v2.15.0",
    kind: "feat",
    title: {
      en: "Landscape mobile cockpit",
      zh: "移动设备横屏座舱",
    },
    summary: {
      en: "Airport detail now treats phones and tablets as mobile devices even when their landscape viewport uses the desktop sidebar.",
      zh: "机场详情页现在会按真实设备识别手机和平板，即使横屏视口使用桌面侧栏布局。",
    },
    highlights: [
      {
        en: "Landscape phones with a Dynamic Island or similar cutout shift the airport sidebar away from the safe-area obstruction",
        zh: "带灵动岛或类似遮挡的手机横屏时，机场侧栏会避开 safe-area 遮挡",
      },
      {
        en: "Phone and tablet landscape sidebars scroll as one panel, with the search bar and aircraft table header sticking at the top",
        zh: "手机和平板横屏侧栏改为整面板滚动，搜索栏和飞机表头会在顶部置顶",
      },
      {
        en: "Plane Hunter availability now follows the shared client-device model across preview cards and map settings",
        zh: "拍机入口现在复用统一客户端设备模型，预览卡与地图设置的设备判断保持一致",
      },
    ],
  },
  {
    version: "v2.14.2",
    kind: "patch",
    title: {
      en: "Stable aircraft preview open",
      zh: "飞机预览打开更稳定",
    },
    summary: {
      en: "Opening the first aircraft preview on an airport page no longer blanks the map while the preview module loads.",
      zh: "机场详情页首次点击飞机时，预览模块加载期间不再让地图短暂空白。",
    },
    highlights: [
      {
        en: "Aircraft preview loading is isolated from the airport route shell, so the map and sidebar stay mounted on first click",
        zh: "飞机预览加载与机场页面外壳隔离，首次点击时地图和侧栏保持挂载",
      },
    ],
  },
  {
    version: "v2.14.1",
    kind: "patch",
    title: {
      en: "Runtime cleanup",
      zh: "运行时代码精简",
    },
    summary: {
      en: "Removed old Next-era shims, dead TypeScript server scrapers, and generated aircraft-light ballast after the Railway data-service migration.",
      zh: "清理 Railway data-service 迁移后遗留的 Next 兼容层、旧 TypeScript 服务端抓取代码和飞机灯光生成表。",
    },
    highlights: [
      {
        en: "Aircraft light anchors now resolve from family templates instead of a 21k-line generated map",
        zh: "飞机灯光锚点改为按机型族模板解析，不再依赖 2.1 万行生成表",
      },
      {
        en: "Old TypeScript FlightAware, ADSBDB, and community-route server paths were removed in favor of the active Go data-service providers",
        zh: "移除旧 TypeScript FlightAware、ADSBDB 与社区航线服务端路径，保留当前 Go data-service provider",
      },
      {
        en: "Vite React code now uses React Router and native React lazy loading directly instead of local compatibility wrappers",
        zh: "Vite React 代码直接使用 React Router 与 React lazy，不再经过本地兼容封装",
      },
    ],
  },
  {
    version: "v2.14.0",
    kind: "feat",
    title: {
      en: "Airport surface layers load progressively",
      zh: "机场地面图层分层加载",
    },
    summary: {
      en: "Airport maps now fetch pavement before structures so runway, taxiway, taxilane, and apron detail appears even when building-heavy OpenStreetMap queries are slow or unavailable.",
      zh: "机场地图现在先加载跑道、滑行道、滑行线和停机坪，再加载建筑结构；即使 OpenStreetMap 的建筑查询较慢或失败，关键地面灯光也会先出现。",
    },
    highlights: [
      {
        en: "The surface endpoint is split into `pavement` and `structures` scopes, removing the old inline surface path from airport detail responses",
        zh: "地面图接口拆成 `pavement` 与 `structures` 两个 scope，并移除机场详情响应里的旧 inline surface 路径",
      },
      {
        en: "Large airports such as KJFK now return taxiways and taxilanes from the first pavement request instead of waiting behind terminal and building geometry",
        zh: "KJFK 这类大型机场现在会在首个 pavement 请求中返回滑行道和滑行线，不再被航站楼与建筑几何拖住",
      },
      {
        en: "Structure-layer failures are isolated, so pavement rendering remains available when the secondary buildings query times out",
        zh: "结构层失败被隔离处理，第二阶段建筑查询超时时仍保留已加载的道面渲染",
      },
    ],
  },
  {
    version: "v2.13.1",
    kind: "patch",
    title: {
      en: "Airport night map detail",
      zh: "机场夜间细节图",
    },
    summary: {
      en: "Near airport maps now render tighter, finer runway and taxiway lighting so dense airfields read more like night-light diagrams.",
      zh: "机场近景地图现在使用更近的视图和更细密的跑道、滑行道灯阵，让大型机场更像夜间灯光图。",
    },
    highlights: [
      {
        en: "Near range moves closer with fractional zoom support, matching the 0.5 NM inspection view more closely",
        zh: "近景档位加入 fractional zoom 并推近视图，更贴近 0.5 NM 的检查视角",
      },
      {
        en: "Runway, taxiway, centerline, threshold, and approach lights use smaller micro-dots with reduced halos",
        zh: "跑道、滑行道、中线、入口和进近灯改为更小的微点，并收短光晕",
      },
      {
        en: "Runway ends add subtle red side cues while the underlying surface lines stay thin",
        zh: "跑道端部增加低调红色侧向提示，同时底层道面线保持细线效果",
      },
    ],
  },
  {
    version: "v2.13.0",
    kind: "feat",
    title: {
      en: "Faster first screen",
      zh: "首屏加载提速",
    },
    summary: {
      en: "The first screen now keeps a static brand frame while heavier video and preview modules load after the initial route.",
      zh: "首屏先呈现静态品牌帧，较重的视频与预览模块延后到初始路由之后加载。",
    },
    highlights: [
      {
        en: "The branding MP4 waits until after the first frame and is skipped on small screens or reduced-motion sessions",
        zh: "品牌 MP4 延后到首帧之后加载，并在小屏或减少动态效果时跳过",
      },
      {
        en: "The home airport explorer and aircraft preview card now load on demand, reducing JavaScript pulled into the initial screen",
        zh: "首页机场探索器与飞机预览卡改为按需加载，减少初始屏需要拉取的 JavaScript",
      },
      {
        en: "Unused exports reported by knip were removed or made private so the dependency audit stays actionable",
        zh: "清理或收口 knip 报告的未使用导出，让依赖审计保持可执行",
      },
    ],
  },
  {
    version: "v2.12.2",
    kind: "patch",
    title: {
      en: "Version update toast fix",
      zh: "版本更新提示修复",
    },
    summary: {
      en: "The in-app update toast no longer prompts for downgrades, and the version sync between package.json and the changelog is now documented.",
      zh: "应用内更新提示不再出现降级版本提示，package.json 与 changelog 的版本同步规范已文档化。",
    },
    highlights: [
      {
        en: "Version comparison uses semver ordering instead of strict equality, so the toast only appears when the deployed version is genuinely newer",
        zh: "版本比较改用 semver 排序代替严格相等，升级提示仅在部署版本确实更新时出现",
      },
      {
        en: "The home page branding video now becomes visible even when the browser finishes loading the MP4 before React attaches the loadeddata listener",
        zh: "首页品牌视频即使在 React 绑定 loadeddata 监听前已被浏览器加载完成，也会正确显示",
      },
    ],
  },
  {
    version: "v2.12.0",
    kind: "feat",
    title: {
      en: "Better Stack observability",
      zh: "Better Stack 可观测性",
    },
    summary: {
      en: "The Railway data-service now reports backend metrics and structured logs to Better Stack instead of New Relic.",
      zh: "Railway data-service 现在将后端指标和结构化日志上报到 Better Stack，不再依赖 New Relic。",
    },
    highlights: [
      {
        en: "HTTP requests, external provider calls, database operations, WebSocket activity, scheduler polling, and active channel gauges share the `adsbao.*` metric namespace",
        zh: "HTTP 请求、外部 provider 调用、数据库操作、WebSocket 活动、scheduler 轮询和活跃 channel gauge 都统一使用 `adsbao.*` 指标命名空间",
      },
      {
        en: "Backend logs keep the existing compact message format while adding Better Stack service, environment, provider, status, and latency fields",
        zh: "后端日志保留现有紧凑 message 格式，同时增加 Better Stack 可查询的 service、environment、provider、status 和 latency 字段",
      },
    ],
  },
  {
    version: "v2.12.1",
    kind: "patch",
    title: {
      en: "Better Stack log duration parsing fix",
      zh: "Better Stack 日志 duration 解析修复",
    },
    summary: {
      en: "Fixed Better Stack log tail duration column parsing by switching duration field names from dotted to underscore format.",
      zh: "通过将 duration 字段名从点号格式改为下划线格式，修复 Better Stack 日志尾页 duration 列解析错误。",
    },
    highlights: [
      {
        en: "Duration JSON fields renamed from `duration.ms`/`duration.seconds` to `duration_ms`/`duration_seconds` for Better Stack parser compatibility",
        zh: "duration JSON 字段从 `duration.ms`/`duration.seconds` 改为 `duration_ms`/`duration_seconds`，兼容 Better Stack 解析器",
      },
    ],
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
    highlights: [
      {
        en: "The Vite build emits a no-store version manifest that old tabs can compare against their current bundle",
        zh: "Vite 构建会产出 no-store 版本 manifest，旧页面可用它与当前 bundle 版本比较",
      },
      {
        en: "A localized Sonner toast offers a one-click refresh action and re-checks after tab focus or visibility changes",
        zh: "本地化 Sonner toast 提供一键刷新，并在页面重新聚焦或可见性变化后再次检查",
      },
    ],
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
    highlights: [
      {
        en: "Airport-to-airport transitions keep an immediate seeded profile while the full detail, context, and surface payloads hydrate through shared route queries",
        zh: "机场到机场切换会先保留即时 seed profile，再通过共享 route query 补齐完整详情、上下文与地面 payload",
      },
      {
        en: "Search result opens prefetch the target airport profile before navigation so common airport hops spend less time waiting on the next page",
        zh: "从搜索结果打开机场时会在导航前预取目标机场 profile，常见机场跳转减少下一页等待时间",
      },
      {
        en: "Aircraft photo lookups now reuse the same query cache across preview and aircraft-detail surfaces",
        zh: "飞机照片查询现在在 preview 和飞机详情页面之间复用同一份 query cache",
      },
    ],
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
    highlights: [
      {
        en: "Airport detail now loads as a lightweight payload first, while large context and surface maps hydrate separately and are cached briefly for return transitions",
        zh: "机场详情现在先加载轻量 payload，大型上下文与地面图层会分段补齐，并在短时间内缓存以加速返回切换",
      },
      {
        en: "Airport pages no longer remount the full explorer shell on every airport-to-airport route change",
        zh: "机场页在机场到机场跳转时不再按每个机场强制重建整套 explorer 外壳",
      },
      {
        en: "Route modules and the Plane Hunter studio load on demand, reducing the JavaScript pulled into unrelated airport and aircraft transitions",
        zh: "路由模块与拍机工作室改为按需加载，减少无关机场与飞机切换时需要拉取的 JavaScript",
      },
    ],
  },
  {
    version: "v2.8.2",
    kind: "patch",
    title: {
      en: "Nearby-airport tracking stability",
      zh: "附近机场追踪稳定性修复",
    },
    summary: {
      en: "Airport-to-airport navigation now keeps the URL airport as the page anchor while the next airport detail resolves, preventing stale nearby-airport previews from rendering the previous airport map.",
      zh: "机场到机场的跳转现在会以 URL 中的机场作为页面锚点，等待新机场详情解析时不会再用上一座机场的对象渲染地图。",
    },
    highlights: [
      {
        en: "Nearby airport Track actions no longer reuse the previous airport profile during the route transition",
        zh: "附近机场的追踪操作在路由切换期间不再复用上一座机场的 profile",
      },
      {
        en: "Airport explorer profile resolution ignores stale airport objects that do not match the current route ICAO",
        zh: "机场详情页的 profile 解析会忽略与当前路由 ICAO 不匹配的旧机场对象",
      },
    ],
  },
  {
    version: "v2.8.1",
    kind: "patch",
    title: {
      en: "Selected aircraft trace fallback",
      zh: "选中飞机航迹兜底修复",
    },
    summary: {
      en: "Airport pages now handle successful-but-empty aircraft trace responses more clearly: locally accumulated traffic history can still draw the selected trace, and unavailable traces no longer look like a silent success.",
      zh: "机场页现在会更清楚地处理请求成功但航迹为空的情况：本地积累的交通历史可用于绘制选中飞机航迹，确实不可用时也不再表现得像静默成功。",
    },
    highlights: [
      {
        en: "Selected airport traces merge live, recent, and locally accumulated points, so a remote empty response can still render when the airport feed has enough motion history",
        zh: "机场页选中飞机航迹会合并实时点、远端 recent trace 与本地积累点；远端为空时，只要机场流量已有足够运动历史仍可绘制",
      },
      {
        en: "HTTP 200 trace responses with `traceUnavailable` or fewer than two points are now surfaced as unavailable unless another source provides a drawable trace",
        zh: "HTTP 200 但带有 `traceUnavailable` 或少于两个点的航迹响应，现在会显示为不可用，除非其他数据源补足可绘制航迹",
      },
      {
        en: "Mobile trace status now distinguishes unavailable traces from completed loads instead of briefly showing success with no visible line",
        zh: "移动端航迹状态现在会区分不可用与加载完成，不再短暂显示成功但地图上没有可见航迹",
      },
    ],
  },
  {
    version: "v2.8.0",
    kind: "feat",
    title: {
      en: "Faster map readiness and view controls",
      zh: "更快的地图就绪与视图控制",
    },
    summary: {
      en: "Airport and aircraft detail maps now wait for the first usable visual frame instead of just the Leaflet instance, while the detail toolbar can cycle view ranges with a tap and keep the full menu behind a long press.",
      zh: "机场与飞机详情地图现在会等待首个可用视觉帧，而不只是等待 Leaflet 实例创建；详情页工具栏也支持轻点切换视图范围，长按再打开完整菜单。",
    },
    highlights: [
      {
        en: "Initial loading now gates on base tile readiness plus aircraft markers or traces, with short cutoffs so slow optional visuals do not block the page forever",
        zh: "初始加载现在会等待底图 tile、飞机标记或轨迹就绪，并设置短 cutoff，避免较慢的可选视觉元素永久阻塞页面",
      },
      {
        en: "Aircraft detail pages with no current focal position fall back to a usable map center after a short timeout instead of staying in the full-screen loader",
        zh: "没有当前焦点位置的飞机详情页会在短暂超时后回退到可用地图中心，不再停留在整屏加载动画",
      },
      {
        en: "The view-range toolbar button now cycles far / mid / near on tap, while long press opens the full menu with a subtle progress indicator",
        zh: "视图范围工具栏按钮现在轻点即可在远 / 中 / 近之间循环，长按才打开完整菜单，并显示轻量进度提示",
      },
    ],
  },
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
