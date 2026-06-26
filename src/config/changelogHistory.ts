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
    kind: "patch",
    title: {
      en: "Nearby list performance — desktop sidebar virtualizes again",
      zh: "邻近列表性能——桌面侧栏恢复虚拟化",
    },
    summary: {
      en: "On desktop the whole sidebar used to scroll, which left the nearby traffic list unbounded and defeated its virtualizer — every airport/flight page mounted all 80–100+ rows at once. Now the brand, identity, and filters stay fixed and only the list scrolls internally (matching the mobile layout), so it windows ~20 rows. Selecting a row no longer re-renders or re-measures the whole list.",
      zh: "桌面端此前是整条侧栏一起滚动,导致邻近列表高度不受限、虚拟化被架空——每个机场/航班页都会一次性挂载全部 80–100+ 行。现在品牌、标识、筛选固定不动,只有列表内部滚动(与移动端一致),因此只渲染约 20 行。选中某行也不再重渲染或重新测量整张列表。",
    },
    highlights: [],
  },
  {
    version: "v2.28.7",
    kind: "patch",
    title: {
      en: "Preview cards — airport / navaid / airspace match the aircraft card",
      zh: "预览卡片——机场 / 导航台 / 空域与飞机卡片统一",
    },
    summary: {
      en: "The airport, navaid, reporting-point, airspace, and watching-spot preview cards adopt the aircraft card's typography on both desktop and mobile — a mono identity with a secondary on the right, the shared metadata rows, and an orange Track button.",
      zh: "机场、导航台、报告点、空域、拍机点预览卡片在桌面和移动端都沿用飞机卡片的排版——等宽标识 + 右侧次级、共享的元数据行、橙色 Track 按钮。",
    },
    highlights: [],
  },
  {
    version: "v2.28.6",
    kind: "patch",
    title: {
      en: "Mobile preview card — compact collapsed row",
      zh: "移动预览卡片——更紧凑的收起态",
    },
    summary: {
      en: "The collapsed mobile aircraft card tightens to a single glance: thumbnail, callsign + type, route, an inline orange Track button, and one telemetry line. The photo and secondary actions move into the expanded sheet.",
      zh: "移动端飞机卡片的收起态收紧为一眼可读：缩略图、呼号 + 机型、航路、内联橙色 Track 按钮，以及一行参数。照片与次要操作移入展开层。",
    },
    highlights: [],
  },
  {
    version: "v2.28.5",
    kind: "patch",
    title: {
      en: "Aircraft preview card — clearer selection state",
      zh: "飞机预览卡片——更清晰的选中态",
    },
    summary: {
      en: "Tapping an aircraft now opens a refreshed frosted preview card on desktop and a drag-to-expand sheet on mobile, with one signal accent and no rainbow button.",
      zh: "点选飞机后，桌面端打开焕新的磨砂预览卡片，移动端为可下拉展开的卡片；统一单一信号强调色，去掉彩虹按钮。",
    },
    highlights: [],
  },
  {
    version: "v2.28.4",
    kind: "patch",
    title: {
      en: "Mechanism redesign + Changelog type scale",
      zh: "机制页重设计 + 更新日志字号统一",
    },
    summary: {
      en: "The Mechanism page adopts the Explorer/About design system, and the Changelog aligns to the same type scale. Both join the first-screen family with serif group labels and the accent title tick.",
      zh: "机制页沿用机场探索 / 关于页的设计语言，更新日志对齐同一套字号。两页都归入首屏家族，配衬线分组标签与强调标题短线。",
    },
    highlights: [],
  },
  {
    version: "v2.28.3",
    kind: "patch",
    title: {
      en: "About page — same code chips and serif labels as Explorer",
      zh: "关于页——与机场探索一致的代号芯片与衬线标签",
    },
    summary: {
      en: "The About sidebar adopts the Explorer design system. The build meta stacks label-over-value, and the data sources reuse the Explorer row with monospace category chips and serif group labels.",
      zh: "关于页侧栏沿用机场探索的设计语言：构建信息改为标签在上、值在下的堆叠式，数据来源复用机场探索的行样式，配等宽分类芯片与衬线分组标签。",
    },
    highlights: [],
  },
  {
    version: "v2.28.2",
    kind: "patch",
    title: {
      en: "Explorer sidebar — code chips, serif group labels",
      zh: "机场探索侧栏——代号芯片、衬线分组标签",
    },
    summary: {
      en: "The home Explorer list trades flat gray text for real design: monospace ICAO chips, an upright serif for group labels, and one orange near-me CTA. Hierarchy comes from size and luminance, never weight.",
      zh: "首页机场探索列表从扁平灰字升级为真正的设计语言：等宽 ICAO 代号芯片、衬线分组标签，以及唯一的橙色「附近」入口。层次来自字号与明度，而非字重。",
    },
    highlights: [],
  },
  {
    version: "v2.28.1",
    kind: "patch",
    title: {
      en: "Material fidelity — flatter glass, quieter accent",
      zh: "材质回正——更平的玻璃、更克制的强调色",
    },
    summary: {
      en: "A correction pass on the v2.28 surfaces: frosted panels go back to flat translucent tints instead of painted gradients, the orange signal is reserved for selection again, and the left-column hierarchy reads cleaner over a busy map.",
      zh: "对 v2.28 表面的一次回正：磨砂面板回到平整的半透明色调而非渐变涂层，橙色信号色重新只用于选择态，左栏层次在繁忙地图上更清爽。",
    },
    highlights: [],
  },
  {
    version: "v2.28.0",
    kind: "feat",
    title: {
      en: "Designed, not aligned — system pass",
      zh: "为「设计感」而非「对齐」打磨",
    },
    summary: {
      en: "A page-by-page pass applying ADSBao's existing material system with intentional hierarchy, density rhythm, and surface separation. Opens with a typographic foundation: hierarchy now comes from size and luminance, never weight.",
      zh: "逐页打磨，让 ADSBao 既有的材质系统以更有层次、更有节奏、更分面的方式呈现。首先落地排版基线：层次来自字号与明度，而非字重。",
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
    kind: "patch",
    title: {
      en: "Quieter about source rails",
      zh: "关于页来源 rail 降噪",
    },
    summary: {
      en: "The about page data-source list now reads as aligned source rails instead of repeated badge rows.",
      zh: "关于页数据来源列表现在以对齐 source rail 阅读，不再依赖重复的 badge 行。",
    },
    highlights: [],
  },
  {
    version: "v2.26.16",
    kind: "patch",
    title: {
      en: "Tighter home list rails",
      zh: "首页列表 rail 精修",
    },
    summary: {
      en: "Home airport sections now share the same text axis as the search input and airport row names.",
      zh: "首页机场分组现在与搜索输入文字和机场行名称共用同一条文字轴。",
    },
    highlights: [],
  },
  {
    version: "v2.26.15",
    kind: "patch",
    title: {
      en: "Quieter mechanism rows",
      zh: "机制页展开行降噪",
    },
    summary: {
      en: "The mechanism page now treats expanded rows as inline explanation instead of full selected cards.",
      zh: "机制页现在把展开行处理成内联说明，而不是整块选中卡片。",
    },
    highlights: [],
  },
  {
    version: "v2.26.14",
    kind: "patch",
    title: {
      en: "Linear map settings controls",
      zh: "地图设置控件线性化",
    },
    summary: {
      en: "Map settings now use lighter inline rows and compact unit controls so the panel reads by alignment instead of heavy capsules.",
      zh: "地图设置现在使用更轻的内联行和紧凑单位控件，让面板主要依靠对齐而不是厚重胶囊建立秩序。",
    },
    highlights: [],
  },
  {
    version: "v2.26.13",
    kind: "patch",
    title: {
      en: "Cleaner airport sidebar filters",
      zh: "机场侧栏过滤区精简",
    },
    summary: {
      en: "The airport sidebar filter strip now relies on aligned controls instead of an enclosing grid box, and short landscape viewports use a tighter identity header.",
      zh: "机场侧栏过滤区现在依靠控件对齐而不是外层网格盒子，短横屏视口也使用更紧凑的机场身份头部。",
    },
    highlights: [],
  },
  {
    version: "v2.26.12",
    kind: "patch",
    title: {
      en: "Aligned home airport rows",
      zh: "首页机场列表对齐",
    },
    summary: {
      en: "The home airport list now aligns row titles with the search input rail on mobile and desktop.",
      zh: "首页机场列表现在让机场名在移动端和桌面端都与搜索输入文字同轴。",
    },
    highlights: [],
  },
  {
    version: "v2.26.11",
    kind: "patch",
    title: {
      en: "Toolbar grouping by spacing",
      zh: "工具栏分组改为空距",
    },
    summary: {
      en: "Floating toolbars now separate icon groups with spacing instead of visible vertical rules, keeping the chrome quieter.",
      zh: "浮动工具栏现在用空距区分图标组，不再绘制可见竖向分隔线，让工具栏更安静。",
    },
    highlights: [],
  },
  {
    version: "v2.26.10",
    kind: "patch",
    title: {
      en: "Quieter airport traffic list",
      zh: "机场航班列表去表格线",
    },
    summary: {
      en: "The airport sidebar traffic list now relies on aligned columns instead of full-width divider lines, making the dense sidebar quieter.",
      zh: "机场侧栏航班列表改为依靠列对齐建立秩序，不再使用贯穿式分隔线，让密集侧栏更安静。",
    },
    highlights: [],
  },
  {
    version: "v2.26.9",
    kind: "patch",
    title: {
      en: "Compact mechanism flow rows",
      zh: "机制页流程行压缩",
    },
    summary: {
      en: "The mechanism page now renders flow steps as compact inline chips instead of a vertical timeline, keeping the static page more open.",
      zh: "机制页流程步骤改为紧凑行内 chip，不再使用垂直时间线，让静态页保持更开放。",
    },
    highlights: [],
  },
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
  },
  {
    version: "v2.23.5",
    kind: "patch",
    title: {
      en: "Spot dot theme color fix",
      zh: "拍机点远视图标颜色修复",
    },
    summary: {
      en: "Far-zoom spotting dots now use the same badge color: black in light theme, white in dark theme.",
      zh: "最远缩放下的拍机点圆点现在使用与 badge 一致的主题色:亮色主题为黑,暗色主题为白。",
    },
    highlights: [],
  },
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    highlights: [],
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
    kind: "patch",
    title: {
      en: "Static shell media and sidebar polish",
      zh: "静态壳媒体与侧栏打磨",
    },
    summary: {
      en: "Static pages feel cleaner through refreshed brand media, steadier sidebar spacing, and quieter page chrome.",
      zh: "静态页面通过新版品牌媒体、更稳定的侧栏留白和更安静的页面外观变得更干净。",
    },
    highlights: [],
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
    highlights: [],
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
