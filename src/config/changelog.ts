// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Keep entries terse — the long-form story
// belongs in the PR.
//
// ONE ENTRY PER MINOR. Don't add a new entry for every patch. Fold each patch
// into the current minor's single rolling entry (update its `summary` and bump
// its `version` to the new patch number, e.g. v2.30.16 -> v2.30.17). The
// `version` keeps a patch digit ON PURPOSE: it must match `package.json` so the
// AppUpdateToast's semver compare still fires on every release. Start a fresh
// entry only when the minor digit changes (a real feature / milestone).

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

export const CHANGELOG_INITIAL_LIMIT = 1;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 56;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.32.11",
    kind: "feat",
    title: {
      en: "Animated flight-rule glyph in the weather briefing",
      zh: "天气简报中加入飞行规则动效图标",
    },
    summary: {
      en: "The METAR weather view's flight-rules hero now draws a little category glyph on the right of the VFR/MVFR/IFR/LIFR badge — eyes over a runway for the visual rules, graduating to a cockpit instrument for the instrument rules — and the level bar fills in to the current category right after it draws. Each category keeps its own color (mint → blue → red → magenta), and the whole entrance plays once and respects reduced-motion.",
      zh: "METAR 天气视图的飞行规则主卡现在会在 VFR/MVFR/IFR/LIFR 标识右侧绘制一枚分类图标——目视规则是跑道上方的眼睛,逐级过渡到仪表规则的座舱仪表——图标绘制完成后,等级条随即填充到当前分类。每个分类保留自己的颜色(薄荷绿 → 蓝 → 红 → 品红),整段入场动画只播放一次,并遵循减弱动效设置。",
    },
    highlights: [
      {
        en: "New <FlightRuleGlyph> component: inline SVG with a stroke-dashoffset draw-on, sitting on the same row as the category abbreviation. Color is inherited, so it tracks the existing data-driven flight-rule color (never the orange signal accent).",
        zh: "新增 <FlightRuleGlyph> 组件:内联 SVG,采用 stroke-dashoffset 描边绘制动画,与分类缩写同行排布。颜色继承自父级,因此沿用既有的数据驱动飞行规则配色(绝不使用橙色信号强调色)。",
      },
      {
        en: "The flat category rail became a progress bar that fills segment-by-segment up to the current rule, with a VFR/MVFR/IFR/LIFR label row beneath it and the active label lit.",
        zh: "原本扁平的分类轨道升级为进度条,逐段填充至当前规则,下方配有 VFR/MVFR/IFR/LIFR 标签行,并点亮当前分类标签。",
      },
      {
        en: "Preview polish: aircraft photos that 404 or fail to decode now hide cleanly instead of leaving a broken-image frame, and the realtime feed's reconnecting state shows a tiny spinner in place of the wide RECONNECTING/CONNECTING label that used to flicker and crowd the status row.",
        zh: "预览细节优化:飞机照片在 404 或解码失败时直接隐藏,不再留下破图占位;实时数据流重连状态改用一个极小的旋转图标,取代过去那段会闪烁、又挤占状态行排版的 RECONNECTING/CONNECTING 文字。",
      },
      {
        en: "Unified the sticky sidebar logo row across every glass sidebar (home, desktop explorer, mobile detail). Its resting surface now comes from one token-driven rule instead of three per-panel overrides that had drifted apart — the live backdrop-blur that smeared scrolling rows into a band is gone, replaced by the panel's own tint plus a clean fade-out scrim, so content disappears under the wordmark without a seam or bleed-through.",
        zh: "统一了各个玻璃侧边栏(首页、桌面浏览、移动详情)顶部吸附的 Logo 行。它的静止态外观改由单一 token 规则驱动,取代此前已各自漂移的三份按面板覆盖样式——会把滚动行糊成一条带子的实时背景模糊被移除,改用面板自身的色调加一层干净的渐隐遮罩,内容滚到 Logo 下方自然消失,不再有接缝或透字。",
      },
      {
        en: "Live-map performance: aircraft markers no longer rebuild their silhouette SVG + label on every position tick. The portal content is split into a content component memoized on a quantized visual key, so a position-only update (the common case) skips the React/SVG reconcile while the marker keeps animating imperatively — markers and the focal-flight detail page stay smooth under a full airport's worth of traffic. Peak main-thread hitch on a busy airport dropped from ~82ms to ~59ms. The visual key also drops the dark-only headlight inputs (speed/altitude) in light theme, so climbing and accelerating traffic stop re-rendering for state the map isn't even drawing.",
        zh: "实时地图性能:飞机 marker 不再每个位置 tick 都重建剪影 SVG + 标签。portal 内容拆成一个按量化视觉键 memo 的子组件,仅位置变化(最常见的情况)时跳过 React/SVG reconcile,而 marker 仍由运动循环命令式平滑移动——满载机场流量下 marker 与焦点航班详情页都更顺。繁忙机场的主线程卡顿峰值从约 82ms 降到约 59ms。视觉键在亮色主题下还会去掉仅暗色头灯才用的速度/高度输入,这样爬升、加速的飞机不再为地图根本没绘制的状态而重渲染。",
      },
      {
        en: "Here mode (your location, not an airport) no longer shows the departures/arrivals split — that classification needs an airport anchor, so off-airport it was always 0/0 and opened empty views. Those two cells now read out your own motion from GPS instead: ground speed and altitude. Speed is a pedestrian/driver readout — never knots — that defaults to your own metric/imperial setting (km/h or mph) and flips to the other on tap; altitude follows your altitude unit. When the device reports no speed/altitude (common indoors or while still) the cell shows an em dash.",
        zh: "Here 模式(你的位置,不是机场)不再显示起飞/到达拆分——这个分类需要机场作为锚点,离开机场时它永远是 0/0,点进去也是空视图。这两格现在改为读出你自己的 GPS 运动数据:地速与海拔。速度是给行人/驾车看的——绝不用航空的节(kt)——默认跟随你自己的米制/英制设置(km/h 或 mph),点击切换到另一种;海拔则跟随你的海拔单位。当设备没有上报速度/海拔时(室内或静止时常见),该格显示破折号。",
      },
      {
        en: "The tracked-flight telemetry grid (speed / altitude / vertical speed / track / phase) now shares one stat-tile primitive with the airport and here-mode hero stats. Its numbers drop to regular weight like everywhere else in the frosted UI — hierarchy comes from size and luminance, not bold — and the selected metric now shows the same orange top-rail used across the app instead of a one-off inset bar.",
        zh: "被追踪航班的遥测面板(速度 / 高度 / 升降率 / 航向 / 阶段)现在与机场、here 模式的 hero 统计共用同一个 stat-tile 原语。数字改为与 frosted 界面其余部分一致的常规字重——层级靠字号与明度,而非加粗——选中的指标也改用全 app 统一的橙色顶条,取代原先一次性的 inset 边条。",
      },
      {
        en: "Sidebar scroll performance: the desktop airport/flight sidebar dropped its live backdrop-filter blur for an opaque frosted tint. The sidebar IS the scroll container, so scrolling a long aircraft list under a live blur forced the GPU compositor to re-rasterize the whole panel every frame — a production trace showed ~86% of frames dropped while the main thread sat ~87% idle (the cost was entirely GPU compositing, not JS or React). The opaque tint keeps the frosted material read at zero per-frame GPU cost, so a busy airport's list scrolls smoothly again.",
        zh: "侧栏滚动性能:桌面机场/航班侧栏去掉了实时 backdrop-filter 毛玻璃,改用不透明磨砂底色。侧栏本身就是滚动容器,长长的飞机列表在实时模糊下滚动会迫使 GPU 合成器每帧重新光栅整块面板——一段生产 trace 显示约 86% 的帧被丢弃,而主线程约 87% 时间是空闲的(成本全在 GPU 合成,不是 JS/React)。不透明磨砂保留了磨砂质感、每帧零 GPU 成本,繁忙机场的列表重新顺滑滚动。",
      },
      {
        en: "Aircraft marker motion is now rate-limited instead of moving every animation frame. Each marker is its own composited layer, so animating a busy map at 60fps kept the GPU compositor near saturation — leaving no headroom when the sidebar also needed to composite a scroll. Markers now move at most 30fps, and slower as you zoom out (markers barely move on-screen when far: ~10fps near, ~2fps mid, ~1fps far), while the focal / selected aircraft you're tracking keeps the full 30fps. The inferred/extrapolated positions are unchanged — only how often the marker is repainted.",
        zh: "飞机 marker 的运动现在限频,不再每个动画帧都移动。每个 marker 都是独立的合成层,满载地图 60fps 动画会把 GPU 合成器压到接近满载——侧栏要合成滚动时就没有余量了。marker 现在最高 30fps 移动,且越缩小越慢(缩到最远时几乎不动:近 ~10fps、中 ~2fps、远 ~1fps),而你正在追踪的焦点/选中飞机仍保持满 30fps。推算/外推位置本身不变——只是 marker 重绘的频率降了。",
      },
      {
        en: "Sidebar scroll, take two: a production trace showed the real cost wasn't CPU or GPU (both mostly idle) but a stalled render pipeline — forced synchronous layout (reading clientWidth / getBoundingClientRect every scroll frame) thrashing against the scroll. Two sources were removed: the aircraft motion loop now rate-limits BEFORE reading the map bounds (so a throttled frame does zero layout), and the nearby list virtualizes at a measured fixed row height instead of attaching a per-row ResizeObserver that re-measured on every scroll frame.",
        zh: "侧栏滚动第二弹:一段生产 trace 显示真正的成本既不在 CPU 也不在 GPU(两者大都空闲),而是渲染流水线被卡住——每个滚动帧都在读 clientWidth / getBoundingClientRect(强制同步布局),与滚动相互踩踏。移除了两个来源:飞机运动循环现在在读取地图 bounds **之前**就限频(被限的帧零布局开销),附近列表改用测得的定长行高做虚拟化,不再为每行挂一个会在每个滚动帧重新测量的 ResizeObserver。",
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
