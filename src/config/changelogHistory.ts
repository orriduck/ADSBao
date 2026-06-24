import type { ChangelogEntry, ChangelogLocalizedReleaseCopy } from "./changelog";

export const CHANGELOG_HISTORY_ZH_COPY: Record<string, ChangelogLocalizedReleaseCopy> = {
  "v2.6.0": {
    title: "Railway 单服务与可观测性",
    summary:
      "这一版线把应用收敛到 Railway 单服务，并补齐后端可观测性与迁移后的地图修复。",
    highlights: [
      "前端、API、WebSocket 和实时数据收敛到同一个 Railway 服务",
      "机场地图、跑道灯和飞机预览在迁移后恢复稳定",
      "后端日志和指标更容易排查",
    ],
  },
  "v2.5.0": {
    title: "Realtime 数据服务与工具栏打磨",
    summary:
      "实时交通切到 ADSBao 自有数据服务，地图工具栏与跟踪流程也一起收紧。",
    highlights: [
      "机场与附近视图改用自有 realtime 服务",
      "应用持久化迁移到自有数据库",
      "地图工具栏和精确航班跟踪更一致",
    ],
  },
  "v2.4.0": {
    title: "液态玻璃视觉系统",
    summary:
      "应用界面重建为液态玻璃视觉系统，并统一了浏览列表、工具栏、字体和机场名称显示。",
    highlights: [
      "浮层、卡片和工具栏统一到两套玻璃材质",
      "首页、关于、机制和更新日志的浏览列表更一致",
      "字体与机场名称显示更完整清晰",
    ],
  },
  "v2.3.0": {
    title: "屏幕常亮与追踪稳定性",
    summary:
      "地图页加入屏幕常亮控制，同时改善状态栏、加载稳定性和飞行跟踪韧性。",
    highlights: [
      "长时间看图时可以保持屏幕常亮",
      "状态栏和列表反馈更清晰",
      "飞行跟踪遇到慢数据源时更稳",
    ],
  },
  "v2.2.0": {
    title: "天气、地图细节与动效",
    summary:
      "天气卡片、我的位置体验、标准地图细节和全站动效一起升级。",
    highlights: [
      "本地天气增加逐时预报和明日摘要",
      "我的位置页面更轻、更聚焦",
      "标准底图和页面动效更有层次",
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
      "细节修复 — 预览卡按方向滑入、长机型不再压到 callsign 上、航路只在上下文完整时显示",
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
      "入口限制移除,所有登录用户都能使用",
    ],
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
  "v1.8.0": {
    title: "机场空域与导航细节",
    summary:
      "机场地图加入 OpenAIP 空域，并补齐机型名称、导航细节和缩放层级减噪。",
    highlights: [
      "空域可在机场地图上直接查看和预览",
      "机型名称与跨页导航更友好",
      "机场缩放层级更安静",
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
    version: "v2.23.4",
    kind: "patch",
    title: {
      en: "Location permission re-request",
      zh: "定位权限重新请求",
    },
    summary: {
      en: "When map location is enabled but browser permission is denied, a re-request button now appears in map settings.",
      zh: "开启地图定位但浏览器权限被拒绝时,地图设置中现在会显示重新请求权限的按钮。",
    },
    highlights: [
      {
        en: "Re-request button shows in map settings when location toggle is on but permission is denied",
        zh: "当「我的位置」开关开启但权限被拒绝时,地图设置中显示重新请求按钮",
      },
      {
        en: "Cleaned up unused preset mode labels from map settings",
        zh: "清理了地图设置中已废弃的预设模式标签",
      },
    ],
  },
  {
    version: "v2.23.3",
    kind: "patch",
    title: {
      en: "Photo spot zoom behavior",
      zh: "拍机点缩放行为",
    },
    summary: {
      en: "Photo locations now stay quieter at the farthest airport view, then switch to map badges at closer zoom levels without the sidebar metric changing zoom.",
      zh: "拍机点现在会在最远机场视图只显示小点,靠近后切换为地图 badge,侧栏拍机点卡片也不再改变缩放。",
    },
    highlights: [
      {
        en: "The farthest airport zoom uses small white point markers for photo locations",
        zh: "最远机场缩放下拍机点只显示小白点",
      },
      {
        en: "Middle and near airport zooms use the shared airport/navaid badge style for photo locations",
        zh: "中间和近景机场缩放下拍机点使用机场/导航台同款 badge",
      },
      {
        en: "Clicking the spotting metric card opens the spotting panel without changing the current map zoom",
        zh: "点击拍机点指标卡只打开拍机点面板,不会改变当前地图缩放",
      },
    ],
  },
  {
    version: "v2.23.2",
    kind: "patch",
    title: {
      en: "Photo spot map polish",
      zh: "拍机点地图修正",
    },
    summary: {
      en: "Airport photo locations now stay visible across map zoom levels, with compact map badges at the farthest view and a simpler navigation chooser.",
      zh: "机场拍机点现在会在各级地图缩放中保持显示,最远视图使用更紧凑的地图 badge,导航选择也更精简。",
    },
    highlights: [
      {
        en: "Photo locations render as compact map badges at the farthest zoom and as direct camera markers when zoomed closer",
        zh: "拍机点在最远缩放下以紧凑地图 badge 呈现,靠近后恢复为直接的相机点",
      },
      {
        en: "The map-navigation modal now keeps only the spot name and icon-based map choices, without exposing coordinates",
        zh: "地图导航弹窗现在只保留点名和图标化地图入口,不再展示坐标",
      },
    ],
  },
  {
    version: "v2.23.1",
    kind: "patch",
    title: {
      en: "Plane Hunter zoom cap",
      zh: "拍机倍率收敛",
    },
    summary: {
      en: "Plane Hunter camera zoom now stays within practical 1x, 2x, and 4x controls instead of surfacing excessive digital magnification.",
      zh: "拍机相机倍率现在收敛到更实用的 1x、2x、4x,不再把过高的数码放大作为主控制。",
    },
    highlights: [
      {
        en: "The live camera zoom shortcuts and slider now cap at 4x even when the browser reports a larger camera zoom range",
        zh: "即使浏览器报告更大的相机缩放范围,实时相机的快捷倍率和滑杆也会限制在 4x",
      },
    ],
  },
  {
    version: "v2.23.0",
    kind: "feat",
    title: {
      en: "Plane Hunter lens controls",
      zh: "拍机镜头控制",
    },
    summary: {
      en: "Plane Hunter's live camera now exposes camera selection when the browser provides multiple lenses, with clearer guidance about how zoom is applied.",
      zh: "拍机实时相机现在会在浏览器暴露多个镜头时提供镜头选择,并更清楚说明倍率如何作用在当前镜头上。",
    },
    highlights: [
      {
        en: "Added a lens picker next to camera zoom for browsers that expose ultra-wide, wide, or telephoto inputs",
        zh: "在相机倍率旁加入镜头选择,支持浏览器暴露的超广角、广角或长焦输入",
      },
      {
        en: "Zoom controls now explain that magnification is based on the selected camera and may become digital crop when no separate lens is exposed",
        zh: "倍率控件会说明倍率基于当前镜头,没有独立镜头可切时高倍率可能是数码裁切",
      },
    ],
  },
  {
    version: "v2.22.18",
    kind: "patch",
    title: {
      en: "Location permission flow cleanup",
      zh: "位置权限流程整理",
    },
    summary: {
      en: "Here mode now owns its location and compass prompt directly, while airport and flight detail maps wait for saved map settings before requesting my location.",
      zh: "here 模式现在自己请求位置和罗盘,机场与飞机详情地图会先等地图设置,只有我的位置开启后才请求定位。",
    },
    highlights: [
      {
        en: "Entering /here requests location and compass without reading or saving the map setting",
        zh: "进入 /here 会请求位置和罗盘,不读取也不保存地图里的我的位置设置",
      },
      {
        en: "Airport and flight detail pages request location only after hydrated settings enable the layer",
        zh: "机场和飞机详情页只会在设置加载完成且我的位置开启后请求定位",
      },
      {
        en: "Turning my location on from map settings immediately saves the setting and starts the location plus compass request",
        zh: "在地图设置里打开我的位置会立即保存设置,并开始请求定位和罗盘",
      },
    ],
  },
  {
    version: "v2.22.17",
    kind: "patch",
    title: {
      en: "My-location heading everywhere",
      zh: "我的位置朝向全局即时更新",
    },
    summary: {
      en: "Any map view that can show my location now keeps the marker coordinates and compass heading live, not only /here.",
      zh: "任何能显示我的位置的地图视图现在都会即时更新定位点坐标和罗盘朝向,不再只限于 /here。",
    },
    highlights: [
      {
        en: "Airport maps reuse the same live compass heading path as here mode when my location is visible",
        zh: "机场地图在显示我的位置时会复用 here 模式同一套实时罗盘朝向",
      },
      {
        en: "GPS coordinate updates still arrive through the existing watchPosition flow",
        zh: "GPS 坐标更新仍沿用现有 watchPosition 流程",
      },
      {
        en: "Turning my location off now also stops the extra heading listener",
        zh: "关闭我的位置时也会一起停止额外的朝向监听",
      },
    ],
  },
  {
    version: "v2.22.16",
    kind: "patch",
    title: {
      en: "Here view and mechanism notes",
      zh: "我的位置视图与机制说明",
    },
    summary: {
      en: "The /here map keeps following the device live, and the mechanism and architecture notes now explain the current WebSocket, tracking, here-mode, and nearby-list model.",
      zh: "/here 地图继续实时跟随设备,机制与架构说明也更新为当前 WebSocket、追踪、here 模式和附近列表模型。",
    },
    highlights: [
      {
        en: "Map position, GPS marker, and heading remain driven by the device feed",
        zh: "地图位置、GPS 标记和朝向继续由设备实时驱动",
      },
      {
        en: "Sidebar place lookup and nearby distance anchors refresh only after meaningful movement",
        zh: "侧栏区域识别和附近距离锚点只在有明显移动后重新确定",
      },
      {
        en: "Visual-traffic text no longer fades just because the viewing direction changes",
        zh: "视距内状态文字不会再因为视角变化而触发淡入淡出",
      },
      {
        en: "The mechanism and architecture pages now focus on WebSocket delivery, parallel pipelines, tracking anchors, here mode, and nearby-list rendering",
        zh: "机制与架构页现在聚焦 WebSocket 传递、并行管线、追踪锚点、here 模式和附近列表渲染",
      },
    ],
  },
  {
    version: "v2.22.15",
    kind: "patch",
    title: {
      en: "Here view resume recovery",
      zh: "我的位置视图恢复修正",
    },
    summary: {
      en: "The /here map now recovers more reliably after the browser has been hidden for a while.",
      zh: "/here 地图在浏览器长时间后台后会更可靠地恢复实时连接和底图。",
    },
    highlights: [
      {
        en: "Realtime sockets that stay stuck while connecting are now replaced automatically",
        zh: "卡在连接中的实时 socket 现在会自动替换",
      },
      {
        en: "Returning from a long background pause refreshes and rebuilds the MapLibre tile layer",
        zh: "长时间后台后返回会刷新并重建 MapLibre 底图层",
      },
      {
        en: "Here-mode recovery is covered by focused realtime tests and local browser validation",
        zh: "here 模式恢复已通过聚焦实时连接测试和本地浏览器验证",
      },
    ],
  },
  {
    version: "v2.22.14",
    kind: "patch",
    title: {
      en: "Phone compass heading for here view",
      zh: "我的位置视图手机罗盘朝向",
    },
    summary: {
      en: "The /here heading arc now follows the phone compass instead of relying only on movement direction.",
      zh: "/here 的视角圆弧现在会跟随手机罗盘方向，不再只依赖移动方向。",
    },
    highlights: [
      {
        en: "Phone rotation updates the current-location heading arc while standing still",
        zh: "原地转动手机时，当前位置的视角圆弧会同步变化",
      },
      {
        en: "iOS compass permission is requested from the here-view entry flow when available",
        zh: "支持时会在进入 here 视图时请求 iOS 罗盘方向权限",
      },
      {
        en: "GPS heading remains as a fallback when compass orientation is unavailable",
        zh: "无法获得罗盘方向时，仍保留 GPS 移动航向作为兜底",
      },
    ],
  },
  {
    version: "v2.22.13",
    kind: "patch",
    title: {
      en: "Here view heading refresh",
      zh: "我的位置视角刷新",
    },
    summary: {
      en: "The /here view now keeps the current-location heading arc in sync while using a tighter position filter.",
      zh: "/here 现在会让当前位置的视角圆弧跟随转身实时刷新，并使用更灵敏的位置防抖。",
    },
    highlights: [
      {
        en: "The heading arc updates whenever the device heading changes",
        zh: "设备朝向变化时，视角圆弧会同步转动",
      },
      {
        en: "Here-mode position filtering now uses a 0.05 nm movement threshold",
        zh: "here 模式的位置防抖阈值调整为 0.05 海里",
      },
      {
        en: "The here-mode location refresh logic is covered by focused tests",
        zh: "here 模式的位置刷新逻辑已补上聚焦测试",
      },
    ],
  },
  {
    version: "v2.22.12",
    kind: "patch",
    title: {
      en: "Here view location marker fix",
      zh: "我的位置视图定位点修正",
    },
    summary: {
      en: "The /here view now shows its own current-location marker and heading independently of the map settings layer.",
      zh: "/here 现在会独立显示自己的当前位置点和朝向,不再依赖地图设置里的位置图层。",
    },
    highlights: [
      {
        en: "Here mode uses the location it already requested as the map marker source",
        zh: "here 模式直接使用自己已获取的位置作为地图定位点来源",
      },
      {
        en: "The map settings user-location toggle no longer decides whether /here shows the user marker",
        zh: "地图设置里的我的位置开关不再决定 /here 是否显示自己的定位点",
      },
      {
        en: "Nearby visual-traffic status lines use the same here-mode location source",
        zh: "视距内飞机状态行也使用同一份 here 模式位置来源",
      },
    ],
  },
  {
    version: "v2.22.11",
    kind: "patch",
    title: {
      en: "Altitude bands and visual traffic polish",
      zh: "高度分层与视距内飞机状态打磨",
    },
    summary: {
      en: "Sidebar altitude filtering is now multi-select, while my-location traffic status reads more clearly around nearby aircraft.",
      zh: "侧栏高度筛选改为多选，我的位置周边飞机状态也更清晰。",
    },
    highlights: [
      {
        en: "Altitude filtering now uses four selectable bands, defaulting to traffic below 20,000 ft",
        zh: "高度筛选现在使用四个可多选高度层，默认显示 20000 ft 以下飞机",
      },
      {
        en: "The altitude trigger shows all, one selected band, or a multiple-bands state",
        zh: "高度选项框会显示全部、单个高度层或多个高度层状态",
      },
      {
        en: "My-location heading and visual-traffic status lines are steadier after the previous patch",
        zh: "上一个补丁中的我的位置航向与视距内飞机状态行更稳定",
      },
    ],
  },
  {
    version: "v2.22.10",
    kind: "patch",
    title: {
      en: "Tracking, airspace, and route patch rollup",
      zh: "追踪、空域与航路补丁汇总",
    },
    summary: {
      en: "Tracking, airspace previews, sidebar gestures, route lookups, and photo-location navigation are steadier as a group.",
      zh: "追踪、空域预览、侧栏手势、航路查询和拍机点导航整体更稳定。",
    },
    highlights: [
      {
        en: "Tracking pages feel steadier while live routes, traces, and focused flights update",
        zh: "追踪页在实时航线、轨迹和焦点航班更新时更稳定",
      },
      {
        en: "Airspace previews and sidebar gestures are clearer on compact screens",
        zh: "紧凑屏幕上的空域预览和侧栏手势更清晰",
      },
      {
        en: "Route lookups and photo-location directions behave more predictably",
        zh: "航路查询和拍机点导航行为更可预期",
      },
    ],
  },
  {
    version: "v2.22.0",
    kind: "feat",
    title: {
      en: "Route lookup boundary",
      zh: "航路查询边界",
    },
    summary: {
      en: "Route lookup and aircraft metadata flows now go through a protected backend boundary instead of browser-side upstream calls.",
      zh: "航路查询和飞机元数据现在走受保护的后端边界,不再由浏览器直接访问上游。",
    },
    highlights: [
      {
        en: "Provider-specific work is isolated behind one backend boundary",
        zh: "特定来源的工作统一收敛到后端边界",
      },
      {
        en: "The public app keeps a single normalized route and metadata contract",
        zh: "公共应用只保留归一化后的航路和元数据契约",
      },
    ],
  },
  {
    version: "v2.21.0",
    kind: "feat",
    title: {
      en: "Curated photo locations and navigation",
      zh: "机场拍机点与导航",
    },
    summary: {
      en: "Watcher Mode now uses curated airport photo locations, with a preview-first flow and direct handoff to map navigation.",
      zh: "看客模式现在使用精选机场拍机点，并提供先预览、再跳转地图导航的流程。",
    },
    highlights: [
      {
        en: "Photo locations come from curated airport data instead of browser-side candidate files",
        zh: "拍机点来自精选机场数据，不再依赖浏览器侧候选文件",
      },
      {
        en: "Desktop and mobile users can preview a spot before choosing a navigation app",
        zh: "桌面端和移动端都可以先预览拍机点，再选择导航应用",
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
        en: "ICAO, IATA, OurAirports, and OpenAIP identifiers resolve through one shared airport identity model",
        zh: "ICAO、IATA、OurAirports 和 OpenAIP 标识统一通过同一套机场身份模型解析",
      },
      {
        en: "Names, runways, frequencies, and related airport data now agree on the same place",
        zh: "机场名称、跑道、频率和相关数据现在会指向同一座机场",
      },
    ],
  },
  {
    version: "v2.19.6",
    kind: "patch",
    title: {
      en: "Static shell media and sidebar polish",
      zh: "静态壳媒体与侧栏打磨",
    },
    summary: {
      en: "Static pages feel cleaner through refreshed brand media, steadier sidebar spacing, and quieter page chrome.",
      zh: "静态页面通过新版品牌媒体、更稳定的侧栏留白和更安静的页面外观变得更干净。",
    },
    highlights: [
      {
        en: "Static pages use refreshed brand media with a lighter feel",
        zh: "静态页面使用更轻盈的新版品牌媒体",
      },
      {
        en: "Mobile sidebars have more consistent bottom breathing room",
        zh: "移动端侧栏底部留白更一致",
      },
      {
        en: "Home, About, Mechanism, and Changelog read cleaner as a group",
        zh: "首页、关于、机制与更新日志整体更干净统一",
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
        en: "Reporting points can be enabled when they are useful for airport context",
        zh: "需要机场上下文时可以开启报告点",
      },
      {
        en: "They get distinct map treatment and matching previews on desktop and mobile",
        zh: "它们有独立的地图呈现，并在桌面端和移动端提供对应预览",
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
    highlights: [
      {
        en: "Recent releases stay fast to open",
        zh: "近期发布记录打开更快",
      },
      {
        en: "Older release history loads progressively",
        zh: "更早发布历史渐进加载",
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
      en: "Static pages gained an offline shell and the mobile app handoff became steadier across updates and rotation.",
      zh: "静态页面加入离线壳，移动端在更新接管和旋转恢复上也更稳定。",
    },
    highlights: [
      {
        en: "Home, About, Mechanism, and Changelog can reopen from the local shell",
        zh: "首页、关于、机制和更新日志可从本地壳重新打开",
      },
      {
        en: "Live aviation data stays online-only",
        zh: "实时航空数据仍保持只走网络",
      },
      {
        en: "Mobile static pages recover more cleanly after updates, scrolling, and rotation",
        zh: "移动端静态页在更新、滚动和旋转后恢复更干净",
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
      en: "Sidebars became more consistent across map and static pages, while common map controls felt faster and less jumpy.",
      zh: "地图页和静态页侧栏变得更一致，常用地图控件也更快、更少跳动。",
    },
    highlights: [
      {
        en: "Airport, flight, Plane Hunter, and static-page sidebars share a tighter interaction model",
        zh: "机场、航班、拍机入口和静态页面侧栏共享更紧凑的交互模型",
      },
      {
        en: "Map selections and range controls respond with fewer surprise movements",
        zh: "地图选择和视野控制减少了意外移动",
      },
      {
        en: "Route behavior and static-page chrome were tightened in the same release line",
        zh: "航路行为和静态页外观也在这一版线中收紧",
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
      en: "Mobile landscape layouts became more reliable across safe areas, rotation recovery, previews, and shared device behavior.",
      zh: "移动横屏布局在安全区、旋转恢复、预览卡和共享设备判断上更可靠。",
    },
    highlights: [
      {
        en: "Landscape phones and tablets get a more reliable cockpit layout",
        zh: "手机和平板横屏获得更可靠的座舱布局",
      },
      {
        en: "Rotation and safe-area recovery became steadier across airport, flight, and home surfaces",
        zh: "机场、航班和首页在旋转与安全区恢复上更稳定",
      },
      {
        en: "Preview cards, Plane Hunter, and layout decisions now follow one device model",
        zh: "预览卡、拍机入口和布局判断现在跟随同一套设备模型",
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
      en: "Airport surface maps became more resilient, and older runtime paths were cleaned up around the active Railway data-service.",
      zh: "机场地面图层更有韧性，同时围绕当前 Railway data-service 清理了旧运行时代码。",
    },
    highlights: [
      {
        en: "Runway, taxiway, and apron detail appears sooner on large airports",
        zh: "大型机场的跑道、滑行道和停机坪细节出现更快",
      },
      {
        en: "Preview loading became less disruptive",
        zh: "预览加载不再那么打断地图体验",
      },
      {
        en: "Legacy runtime code was removed from the active app path",
        zh: "旧运行时代码从当前应用路径中移除",
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
      en: "The first screen and near-airport map detail became lighter, faster, and easier to read.",
      zh: "首屏和近场机场地图细节变得更轻、更快，也更容易读。",
    },
    highlights: [
      {
        en: "Heavy visual modules wait until the main route is usable",
        zh: "较重的视觉模块会等主路由可用后再加载",
      },
      {
        en: "Airport night-map detail became more legible",
        zh: "机场夜间细节图更清晰",
      },
      {
        en: "Routine cleanup kept the release lean",
        zh: "常规清理让这一版保持轻量",
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
      en: "Backend observability moved to Better Stack, and the in-app version prompt became less noisy.",
      zh: "后端可观测性迁移到 Better Stack，应用内版本提示也减少了误报。",
    },
    highlights: [
      {
        en: "Railway data-service health is easier to inspect",
        zh: "Railway data-service 状态更容易排查",
      },
      {
        en: "Log and metric fields are friendlier to dashboards",
        zh: "日志和指标字段更适合仪表盘使用",
      },
      {
        en: "Refresh prompts now avoid false downgrade messages",
        zh: "刷新提示会避免错误的降级提示",
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
    highlights: [
      {
        en: "Map loading waits for useful visual context without blocking too long",
        zh: "地图加载会等待有用的视觉上下文，但不会卡太久",
      },
      {
        en: "Trace and airport transitions report uncertainty more clearly",
        zh: "航迹和机场跳转的不确定状态更清楚",
      },
      {
        en: "View controls are faster for common range changes",
        zh: "常用视野切换更快",
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
      en: "The app shed legacy client code, made the changelog bilingual, and improved runway, taxiway, and aircraft-light visuals.",
      zh: "应用清理了旧客户端代码，更新日志变为双语，并增强了跑道、滑行道和飞机灯光表现。",
    },
    highlights: [
      {
        en: "Old client-side data paths were removed",
        zh: "旧的客户端数据路径已移除",
      },
      {
        en: "Runway and taxiway lighting became richer",
        zh: "跑道与滑行道灯光更丰富",
      },
      {
        en: "Aircraft icons gained clearer exterior-light treatment",
        zh: "飞机图标加入更清晰的外部灯光表现",
      },
    ],
  },
  {
    version: "v2.6.0",
    kind: "feat",
    title: "Railway single-service and observability",
    summary:
      "The app converged on a Railway single-service architecture, with observability and migration polish folded into one release line.",
    highlights: [
      "Frontend, API, WebSocket, and realtime data moved onto one Railway service",
      "Airport maps, runway lights, and aircraft previews recovered after the migration",
      "Backend logs and metrics became easier to inspect",
    ],
  },
  {
    version: "v2.5.0",
    kind: "feat",
    title: "Realtime data service and toolbar polish",
    summary:
      "Live traffic moved to ADSBao's own realtime service, while map toolbars and tracking flows became more consistent.",
    highlights: [
      "Airport and nearby traffic now use the app-owned realtime path",
      "Persistence moved into the app-owned database",
      "Map controls and precise callsign tracking became steadier",
    ],
  },
  {
    version: "v2.4.0",
    kind: "feat",
    title: "Liquid glass visual system",
    summary:
      "The interface moved to a liquid-glass visual system, with cleaner browse lists, toolbar treatment, typography, and airport names.",
    highlights: [
      "Cards, controls, and toolbars share the same glass material language",
      "Static-page browse lists and page toolbars became more consistent",
      "Typography and full airport-name display were cleaned up",
    ],
  },
  {
    version: "v2.3.0",
    kind: "feat",
    title: "Screen wake lock and tracking stability",
    summary:
      "The map gained a keep-awake control, while loading states, list feedback, and flight tracking became sturdier.",
    highlights: [
      "Long watching sessions can keep the screen awake",
      "Status and list feedback became clearer",
      "Flight tracking handles slow providers more gracefully",
    ],
  },
  {
    version: "v2.2.0",
    kind: "feat",
    title: "Weather, map detail, and motion polish",
    summary:
      "Weather cards, near-me behavior, standard map detail, and app-wide motion all became richer.",
    highlights: [
      "Local weather added hourly and tomorrow views",
      "Near-me weather became more focused",
      "Standard maps and page motion gained more depth",
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
      "Misc UI fixes — preview card slides in directionally, long aircraft types no longer overlap the callsign, route line only appears when route context is complete",
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
      "Entry restriction removed — Plane Hunter is on for every signed-in user",
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
    version: "v1.8.0",
    kind: "feat",
    title: "Airport airspace and navigation polish",
    summary:
      "Airport maps gained OpenAIP airspace overlays, friendlier aircraft labels, navigation fixes, and quieter zoom behavior.",
    highlights: [
      "Airspaces can be viewed and previewed directly on airport maps",
      "Aircraft labels and static-page navigation became friendlier",
      "Airport zoom levels became less noisy",
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
