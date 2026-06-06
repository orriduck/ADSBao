"use client";

import DitherPageShell from "@/components/app-shell/DitherPageShell";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { CHANGELOG } from "@/config/changelog";

// Sidebar-scoped changelog. Reuses DitherPageShell so the page reads as
// a sibling of Home and About — same brand block, same footer, same
// dither background. Each release is a compact text row: version,
// optional current marker, summary, then short highlights.

const CHINESE_RELEASE_COPY = {
  "v2.0.0": {
    title: "拍机正式上线",
    summary:
      "拍机功能正式发布给所有登录用户:在飞机预览卡片点击「开始拍机」,会弹出一个小弹窗,可以调系统相机拍一张,也可以直接从相册选,挑完一张就进入套模板界面,把模板烘到分享用的 PNG 里。新增「地图」模板,在照片上叠一张以你为中心、约 1 海里范围的 OpenStreetMap 拼贴;飞机若就在这个窗口里,会以航向旋转的飞机符号叠上去。",
    highlights: [
      "极简入口 — 点开始拍机弹出选择器,「拍照」走系统相机,「从相册选择」走系统相册,每次只挑一张,挑完直接进套模板界面",
      "不再在网页里打开摄像头视频流,全部交给 iOS Safari / Android Chrome 的原生拍照与相册体验",
      "新增「地图」模板 — 拼贴你周围约 1 海里的 OSM 瓦片,自己位置是菱形「I'm here」标记;如果飞机也在视野内,会按航向叠一个飞机符号,角落位置可在设置里挑",
      "套模板面板沿用地图设置的视觉风格 — 控件 chip 带 ink 填充和底部高光的激活态,所有四种模板可以一排放下",
      "拍机功能转正 — feature flag 移除,触发按钮中文标签固定为「开始拍机」",
      "修复:iOS Safari 在机场 / 飞行详情页的橡皮筋滚动 — 全视口地图壳不会再被拖出屏幕",
    ],
  },
  "v1.13.1": {
    title: "工具栏不透明度打磨与地图设置错误日志加强",
    summary:
      "所有浮动工具栏 pill(首页 dock、侧栏覆盖层、地图控制条)现在采用更不透明的表面,在亮暗主题繁忙的地图与点阵背景下都更易读。服务端地图设置读取失败也从 warn 升级为 error,schema 漂移会立刻在日志里暴露,不再像\"从未保存过\"那样静默。",
    highlights: [
      "Toolbar 表面 token 从 88% 提升到 96% card 不透明度,影响所有 Toolbar 调用方(首页 dock、侧栏移动端覆盖层、地图控制条)在亮暗主题下的表现",
      "Map-settings DAO 读取错误改为 console.error 而非 console.warn,缺失 device 列(以及未来任何 schema 漂移)会立刻在服务端日志里可见",
    ],
  },
  "v1.13.0": {
    title: "移动端底部浮动工具栏与设备感知设置",
    summary:
      "移动端现在在所有页面都使用同一个底部固定的工具栏 pill,静态页改为整页文档滚动,登录用户可以分别保存桌面端和移动端的地图偏好。进近高度遮罩规则也不再隐藏高空过境航班。",
    highlights: [
      "移动端工具栏在首页、关于、机制、changelog 和机场/飞行侧栏覆盖层都浮动在底部居中",
      "桌面端静态页把导航 dock 移到右上角,和详情页地图工具栏对齐",
      "静态页(首页、关于、机制、changelog)在移动端按单一文档滚动,底部留出浮动工具栏空间",
      "进近层级飞机隐藏现在还会判断与机场的高度差,高空过境航班保留可见",
      "登录用户的桌面端和移动端地图设置独立保存,会根据当前设备自动选取",
      "关于页版本现在从 changelog 读取,以后每次发布只需要改一处 changelog",
    ],
  },
  "v1.12.0": {
    title: "地图可读性与 badge 打磨",
    summary:
      "机场、导航台和空域表面统一使用更安静的地形配色、带碰撞检测的统一 badge 体系,以及对重叠图层更友好的点击处理。",
    highlights: [
      "可读地形把地形栅格换成分层 hillshade,亮暗主题都采用更平静的灰阶配色",
      "地图 badge 共享一套带碰撞检测的布局,机场、附近机场和导航台标签重叠时会自动避让并连出引线",
      "导航台标签采用机场 badge 的设计,字体、选中态和缩放行为保持一致",
      "附近机场 pill 把距离后缀改为更小、底部对齐的字号以增强层级",
      "空域点击会优先解析为可见的重叠多边形,连续点击会在多层空域间循环切换",
    ],
  },
  "v1.11.1": {
    title: "地图 UI 细节打磨",
    summary:
      "地图模式和侧栏 UI 细节现在优化了空域可读性、全航迹视野、移动端页面滚动和紧凑 metric card。",
    highlights: [
      "空域图层增加沿边缘向内的标记,同时保留现有 access 颜色语义",
      "全航迹模式保留空域上下文,但隐藏容易拥挤的边界文字",
      "全航迹适配会围绕推断的焦点飞机位置重新居中,地图移动更平滑",
      "移动端 Home、About、Mechanism 页面只在面板内部滚动,不再触发整页双滚动条",
      "桌面地图侧栏 metric card 对 Airborne / 空中等紧凑状态值不再裁切",
    ],
  },
  "v1.11.0": {
    title: "全航迹地图上下文计数",
    summary:
      "全航迹飞机地图现在会在低缩放层级把密集导航台标签替换为缓存的 NAV 计数 badge,长距离航线更容易阅读。",
    highlights: [
      "低缩放全航迹地图改为请求聚合导航台计数 tile,不再一次渲染大量单个标签",
      "NAV 计数 badge 在每个地图 tile 中心显示总数,并带有简短的入场动画",
      "放大到当前细节阈值后仍显示完整导航台标签",
      "计数 API 复用航空上下文 tile 的长期缓存策略",
    ],
  },
  "v1.10.0": {
    title: "机场设施数据与侧栏打磨",
    summary:
      "机场详情页现在在 OpenAIP 基础上恢复 Supabase 托管的 OurAirports 设施数据,补齐 ATC 频率和附近导航台覆盖,侧栏呈现也更紧凑。",
    highlights: [
      "OurAirports 机场频率和导航台通过独立 Supabase 表与导入脚本恢复",
      "OpenAIP 仍作为主机场目录,详情页会合并恢复后的设施数据",
      "ATC 频率改为固定宽度频率 badge,source chip 更紧凑,LiveATC 搜索入口放到列表上方",
      "机场侧栏加入独立 ATC 与拍机点面板,和 metric grid 保持对齐",
      "移动端拍机点预览优先显示真实点位名,距离与 OSM attribution 合并为一行",
    ],
  },
  "v1.9.0": {
    title: "看客模式候选拍机点",
    summary:
      "看客模式现在会基于 OSM 数据为焦点机场生成并显示候选拍机点,使用与跑道朝向对齐的静态数据,并配合保守的预览文案。",
    highlights: [
      "看客模式 / Watcher Mode 默认开启候选拍机点,其他地图模式默认关闭",
      "KBOS 和 JFK 的候选拍机点从根据跑道朝向与公开 OpenStreetMap 数据生成的静态 JSON 加载",
      "进近和机场缩放级别在焦点机场 badge 上显示 PHOTO SPOT 数量,细节级显示可点击的相机标记",
      "选中的候选点复用通用预览卡表面,带 OSM attribution 和保守的地图推导免责声明",
      "候选标记、badge 和预览过渡至少持续 300ms 并尊重 reduced-motion 偏好",
    ],
  },
  "v1.8.4": {
    title: "机场缩放层级减噪",
    summary:
      "机场地图的缩放层级现在共用一张 feature 配置表,统一控制跑道标签、距离圈文字、附近机场跑道和机场地面附近飞机隐藏。",
    highlights: [
      "机场级继续隐藏跑道端点标签,只在细节级显示",
      "进近级隐藏机场 3 海里内飞机,机场级缩小到 0.5 海里",
      "缩放相关地图功能集中到同一配置表维护",
    ],
  },
  "v1.8.3": {
    title: "机制页与导航细节",
    summary:
      "机制页现在回到和首页、关于页一致的点阵页面壳,展开内容改为更清楚的段落说明,顶部导航也会保留当前语言。",
    highlights: [
      "机制页不再使用合成机场地图,改回 Home / About 同款点阵背景",
      "机制列表沿用 About 的 row 结构,展开后用多段正文解释系统机制",
      "顶部导航在 Home、About、Mechanism、Changelog 之间跳转时保留当前 locale",
      "点阵页面标题使用更安全的行高,Changelog 标题不再被裁切",
    ],
  },
  "v1.8.1": {
    title: "机型名称与空域初始动画",
    summary:
      "飞机预览和筛选现在优先显示更容易识别的机型名称,默认开启的空域图层也会在首次加载时依次淡入。",
    highlights: [
      "飞机预览卡显示友好的机型名称,ICAO 机型码降为辅助信息",
      "机型筛选共用同一套机型解析逻辑,搜索同时匹配友好名称和 ICAO 码",
      "只有 A1/A2/A3 分类、没有具体机型的数据会显示为 Unknown,筛选中归为 All Unclassified",
      "默认开启空域图层时,首次加载完成也会播放分层淡入动画",
    ],
  },
  "v1.8.0": {
    title: "机场空域图层",
    summary:
      "机场地图现在直接渲染 OpenAIP 空域,包含透明填充、边界文字、点击预览卡和可持久化的图层开关。",
    highlights: [
      "机场地图加入接近 OpenAIP 风格的空域覆盖层,支持 focus 样式和小空域优先点选",
      "危险区、限制区、管制空域、信息类空域和未知空域使用随主题变化的 design token",
      "桌面和移动端空域预览卡显示本地化的类型、进入规则、等级和上下限高度",
      "地名、跑道灯、导航台和空域图层开关会缓存到浏览器",
      "侧栏 metric 和筛选 tile 在亮暗主题下保持可见的未选中边框",
    ],
  },
  "v1.7.0": {
    title: "OpenAIP 机场目录迁移",
    summary:
      "机场搜索与详情上下文现在以 OpenAIP 作为主航空目录,跑道阈值几何仍由 Supabase 缓存的数据提供,以保证地图叠加层的准确性。",
    highlights: [
      "机场搜索、详情、频率、附近机场、导航台、报告点、空域和障碍物全部迁移到 OpenAIP",
      "跑道中心线使用导入的 OurAirports 阈值坐标,不再用 OpenAIP 形心合成的几何",
      "OpenAIP 搜索结果中不符合常规 ICAO 机场代码的条目会在展示前过滤掉",
      "关于页与架构文档同步标注 OpenAIP 和有限范围的 OurAirports 跑道几何来源",
    ],
  },
  "v1.6.0": {
    title: "附近列表虚拟化与数据层接入",
    summary:
      "侧栏附近列表改为窗口化滚动,距离与高度采用数字滚动呈现;页面层 z-index 统一为命名 token;TanStack Query 开始接管客户端数据获取。",
    highlights: [
      "附近列表(飞机 + 机场)用 TanStack Virtual 实现窗口化,距离与高度每次轮询通过 NumberFlow 数字滚动",
      "新行有细微淡入动画,尊重 prefers-reduced-motion",
      "置顶飞机槽位采用 metric tile 选中风格(深色底 + 由下至上的边缘辉光)",
      "首页与详情页的工具栏 / sidebar 几何对齐,都以内容区域居中",
      "页面层 z-index 改成命名 tier token,修复了桌面端与移动端的 Leaflet pane 冲突",
      "TanStack Query + DevTools 接入应用骨架,useAirportWiki 作为样板迁移,后续数据 hook 按需替换",
      "小型叶子组件迁移到 inline Tailwind,style.css 体积减少约 15%",
    ],
  },
  "v1.5.0": {
    title: "跟踪稳定性与地图标签优化",
    summary:
      "飞行跟踪现在会区分实时、兜底、陈旧和缺失位置状态,航路线与地图标签也会在不同主题和语言下保持更清晰。",
    highlights: [
      "跟踪航班使用明确的位置状态,不再把每个 callsign 匹配都当作实时位置",
      "兜底位置会继续显示,不会误触发信号丢失提示",
      "终端状态航班会保留最后已知位置,并停止重复航路查询",
      "预测航路以虚线显示,包括底层 glow 线",
      "地图地名会跟随当前界面语言",
    ],
  },
  "v1.4.0": {
    title: "账号登录与更安静的信号丢失处理",
    summary:
      "现在可以从地图工具栏或导航菜单登录 ADSBao 账号；跟踪航班丢失信号时，弹窗会保留当前视图并在后台静默重试，不再要求手动重试。",
    highlights: [
      "飞行和机场地图工具栏加入头像入口,Home / About / Changelog 导航菜单也可登录或注册",
      "信号丢失弹窗简化为两个动作: 保留当前视图或返回首页,后台继续静默轮询",
      "数据源恢复后实时位置会自动续上,无需手动重试",
    ],
  },
  "v1.3.0": {
    title: "adsbdb 航路、社区反馈与完整跑道地图",
    summary:
      "航路查询迁移到 api.adsbdb.com,用户可提交临时航路修正,机场跑道地图现在从 OpenAIP 渲染所有跑道。",
    highlights: [
      "公开航路数据源从 VRS standing-data 切换到 api.adsbdb.com",
      "社区反馈覆盖: 带 `*` 标记的用户航路在 12 小时内优先",
      "预览卡: 桌面端内联表单,移动端弹窗,区分建议正确航路与建议修正",
      "飞行跟踪页现在会拉取并显示航路,也提供同样的反馈入口",
      "KBOS 类修复: VFR-only 跑道重新显示,全球跑道图来自 OpenAIP",
      "移动端飞行侧栏支持纵向滚动",
    ],
  },
  "v1.2.1": {
    title: "Track 按钮支持新标签页打开",
    summary: "预览卡 Track 操作改为链接,右键新标签页打开可以正常工作。",
    highlights: [
      "AircraftPreviewMetadataCard Track 改为 next/link <Link>",
      "AirportPreviewMetadataCard Track 改为 next/link <Link>",
      "共享按钮样式兼容链接元素",
      "恢复 Type 与 Alt 筛选卡之间缺失的分隔线",
    ],
  },
  "v1.2.0": {
    title: "主题化跑道进近、飞机机首光束和比例尺优化",
    summary: "按主题切换进近可视化、暗色飞机机首光束、常驻比例尺和应用主题 toast。",
    highlights: [
      "跑道进近抽象: 暗色为发光楔形,亮色为虚线延长中心线",
      "暗色主题下飞机轮廓增加柔和前向机首光束",
      "比例尺始终显示,并带有随主题变化的背景模糊",
      "地图缩放预设调整为 10 / 11 / 13",
      "Toast 层下移到地图工具栏下方并匹配应用主题",
    ],
  },
  "v1.1.0": {
    title: "距离环与地图比例尺",
    summary: "机场页加入同心距离环、进近缩放下的自适应比例尺,附近搜索统一为 40 海里半径。",
    highlights: [
      "所有附近交通和附近机场搜索统一到 40 海里",
      "机场页: 焦点机场每 3 海里一圈,最大 30 海里",
      "机场页: 附近机场每 3 海里一圈,最大 10 海里",
      "飞行页: 每个附近机场只显示 5 海里接近圈,隐藏焦点飞机距离环",
      "机场和详情缩放级别显示每圈距离标签",
      "进近缩放时左下角显示比例尺",
      "每第三圈略加粗作为视觉锚点",
    ],
  },
  "v1.0.0": {
    title: "持久跟踪会话与上弹导航菜单",
    summary: "刷新后保留航迹、信号丢失覆盖层、/changelog 页面和统一 sibling-page 导航菜单。",
    highlights: [
      "12 小时跟踪会话锚点和 24 小时本地航迹缓存",
      "完整、近期、实时航迹按明确优先级合并",
      "信号丢失覆盖层: 保留、重试、返回首页",
      "适配航迹后回到相同缩放预设",
      "侧栏附近列表改用静态数字以提升帧率",
      "Home / About / Changelog 共享上弹导航菜单",
      "新增 /changelog 页面,数据从 CHANGELOG.md 移到 JS",
    ],
  },
  "v0.12.0": {
    title: "飞机跟踪页与多形态 explorer",
    summary: "/aircraft/[callsign] 路由、多形态侧栏和预览、适配航迹、多数据源 failover。",
    highlights: [
      "/aircraft/[callsign] 页面复用机场布局",
      "多形态预览卡支持飞机和机场",
      "多形态侧栏列表加入显示筛选",
      "适配航迹地图控制",
      "ADS-B 呼号数据源竞速与 failover",
      "Cookie 驱动主题,移除 React 19 警告",
      "路由重命名: /[icao] 改为 /airport/[icao]",
    ],
  },
  "v0.11.0": {
    title: "选中飞机航迹与重新验证",
    summary: "焦点飞机实时航迹线、通过 AeroDataBox 重新验证航路、分类修复。",
    highlights: [
      "带渐变和淡入标签卡的航迹线",
      "尾迹颜色跟随离场/进场强调色",
      "点击焦点标记重新验证航路",
      "无标签航路归类为 UNKNOWN",
      "ADS-B 数据源 failover: 5xx、429、timeout",
    ],
  },
  "v0.10.0": {
    title: "全球机场数据与更丰富的飞机轮廓",
    summary: "OpenAIP 提供全球搜索、178 种 ICAO 类型轮廓和国家旗帜。",
    highlights: [
      "OpenAIP 支撑 /api/search 和 /api/airport/[ident]",
      "全球 OpenAIP 跑道标注",
      "178 个飞机轮廓随仓库发布",
      "推荐机场更多样: JFK、LHR、HND 等",
      "首页行和机场头部显示国家旗帜与名称",
    ],
  },
  "v0.9.0": {
    title: "海军蓝跟踪控制台重设计",
    summary: "侧栏加地图布局、呼号优先交通表、深海军蓝配色和轮廓标记。",
    highlights: [
      "常驻顶部导航包含 ADSBao / Search / About",
      "400px 桌面侧栏搭配全高地图",
      "呼号优先交通表和航路状态徽标",
      "飞机轮廓标记支持 ICAO 类型和发射器类别",
      "尾流等级尺寸微调: A1 为 0.90x,A5 为 1.10x",
    ],
  },
  "v0.8.0": {
    title: "Next.js Vercel 重构",
    summary: "应用从 Vue 3/Vite 重建为 Next.js App Router 上的 React 应用。",
    highlights: [
      "React on Next.js App Router",
      "保留 Tailwind CSS v4 和 DaisyUI",
      "通过 Next 集成接入 Vercel Analytics 和 Speed Insights",
      "Vue composables 迁移为 React hooks",
      "飞行航路查询迁移到 Route Handler",
    ],
  },
  "v0.7.1": {
    title: "地图和移动端打磨",
    summary: "轮询保护、移动端 sheet 优化和 ADS-B 合并修复。",
    highlights: [
      "坐标加载后才开始飞机轮询",
      "优化移动端机场卡片 sheet",
      "改进近距和广域 ADS-B 合并",
    ],
  },
  "v0.7.0": {
    title: "飞行航路与交通上下文",
    summary: "机场感知航路标签、航路查询和双范围 ADS-B 轮询。",
    highlights: [
      "机场感知飞行航路标签",
      "通过 Vercel function 查询飞行航路",
      "双范围轮询: 广域 20 海里加近距 3 海里",
      "机场上下文叠加和地面过滤",
    ],
  },
  "v0.6.0": {
    title: "Vercel 可观测性与生产路由",
    summary: "Web Analytics、Speed Insights、强化代理和上游日志。",
    highlights: [
      "Vercel Web Analytics 和 Speed Insights",
      "上游数据请求运行时日志",
      "恢复生产安全的代理 rewrite",
      "强化代理解析以防上游 HTML/error",
    ],
  },
  "v0.5.0": {
    title: "Vercel-first Web 架构",
    summary: "Vercel 部署配置、同源代理、移除 Electron 和 Homebrew。",
    highlights: [
      "Vercel 部署配置",
      "浏览器优先的机场目录和客户端缓存",
      "METAR 与 ADS-B 上游同源代理路径",
      "移除 Electron 和 Homebrew cask pipeline",
    ],
  },
  "v0.4.0": {
    title: "ADSBao Web 转向",
    summary: "重命名为 ADSBao,移除 LiveATC UI、播放器和转录范围。",
    highlights: [
      "项目重命名为 ADSBao",
      "移除旧 LiveATC 前端和后端",
      "重新定位为机场 explorer",
    ],
  },
};

export default function ChangelogPanel() {
  const { locale, t } = useI18n();
  const current = CHANGELOG[0]?.version || "";

  return (
    <DitherPageShell
      className="changelog-screen"
      title={t("changelog.title")}
      description={
        current
          ? t("changelog.description", { version: current })
          : t("changelog.descriptionFallback")
      }
    >
      <div className="dither-section-header flex-none px-6 pt-6 pb-3">
        <div className="endf-section-head">
          <span className="endf-label">{t("changelog.releases")}</span>
          <span className="endf-section-head__count">
            {t("changelog.total", { count: CHANGELOG.length })}
          </span>
        </div>
      </div>

      <ol className="dither-list flex-1 overflow-y-auto px-6 pb-6">
        {CHANGELOG.map((release, index) => (
          <ChangelogEntry
            key={release.version}
            release={release}
            locale={locale}
            isLatest={index === 0}
          />
        ))}
      </ol>
    </DitherPageShell>
  );
}

function ChangelogEntry({ release, isLatest, locale }) {
  const { t } = useI18n();
  const localizedRelease =
    locale === "zh-CN" ? CHINESE_RELEASE_COPY[release.version] : null;
  const title = localizedRelease?.title || release.title;
  const summary = localizedRelease?.summary || release.summary;
  const highlights = localizedRelease?.highlights || release.highlights;
  return (
    <li className="changelog-entry last:border-b-0">
      <div className="changelog-entry__header">
        {isLatest ? (
          <span className="endf-tab">
            <span>{release.version}</span>
          </span>
        ) : (
          <span className="endf-tab endf-tab--outline">
            <span>{release.version}</span>
          </span>
        )}
        {isLatest && (
          <span className="endf-chip">
            <span>{t("changelog.current")}</span>
          </span>
        )}
      </div>
      {title ? (
        <p className="changelog-entry__title">
          {title}
        </p>
      ) : null}
      {summary ? (
        <p className="changelog-entry__summary">
          {summary}
        </p>
      ) : null}
      {Array.isArray(highlights) && highlights.length > 0 ? (
        <ul className="changelog-entry__highlights">
          {highlights.map((item, index) => (
            <li key={index}>
              <span aria-hidden="true" className="endf-diamond endf-diamond--muted mt-0.5" />
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
