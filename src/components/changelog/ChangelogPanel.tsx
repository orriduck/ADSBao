"use client";

import { useI18n } from "@/features/app-shell/i18n/useI18n";
import { CHANGELOG } from "@/config/changelog";

// Sidebar-scoped changelog. Reuses DitherPageShell so the page reads as
// a sibling of Home and About — same brand block, same footer, same
// dither background. Each release is a compact text row: version,
// optional current marker, summary, then short highlights.

const CHINESE_RELEASE_COPY = {
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
      "用 GSAP StatusSpan 替换 EndfieldValueSwap，文字切换更流畅",
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
      "跑道阈值几何继续由 Supabase 缓存的数据提供",
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

export default function ChangelogPanel() {
  const { locale, t } = useI18n();

  return (
    <>
      <div className="dither-section-header flex-none px-6 pt-6 pb-3">
        <div className="endf-section-head">
          <span className="endf-label">{t("changelog.releases")}</span>
          <span className="endf-section-head__count">
            {t("changelog.total", { count: CHANGELOG.length })}
          </span>
        </div>
      </div>

      <ol className="dither-list flex flex-1 flex-col gap-2 overflow-y-auto px-6 pb-6">
        {CHANGELOG.map((release, index) => (
          <ChangelogEntry
            key={release.version}
            release={release}
            locale={locale}
            isLatest={index === 0}
          />
        ))}
      </ol>
    </>
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
    <li className="changelog-entry">
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
