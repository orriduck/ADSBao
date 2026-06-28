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
    version: "v2.23.5",
    kind: "feat",
    title: {
      en: "Plane Hunter lenses and photo-spot map",
      zh: "拍机镜头与拍机点地图",
    },
    summary: {
      en: "Plane Hunter's live camera exposes lens selection when the browser provides multiple cameras, with clearer zoom guidance and the magnification capped to practical 1x, 2x, and 4x. Airport photo locations stay visible across zoom levels — quiet dots at the farthest view, theme-correct badges and a simpler navigation chooser closer in. Map settings also regain a permission re-request button when location is denied.",
      zh: "拍机实时相机会在浏览器暴露多个镜头时提供镜头选择,倍率说明更清楚,并收敛到实用的 1x、2x、4x。机场拍机点在各级缩放下保持显示——最远视图为安静小点,靠近后切换为主题正确的 badge 与更精简的导航选择。位置被拒绝时,地图设置也恢复重新请求权限的按钮。",
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
