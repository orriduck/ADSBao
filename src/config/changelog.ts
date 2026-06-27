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
    version: "v2.32.3",
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
        en: "Live-map performance: aircraft markers no longer rebuild their silhouette SVG + label on every position tick. The portal content is split into a content component memoized on a quantized visual key, so a position-only update (the common case) skips the React/SVG reconcile while the marker keeps animating imperatively — markers and the focal-flight detail page stay smooth under a full airport's worth of traffic. Peak main-thread hitch on a busy airport dropped from ~82ms to ~59ms.",
        zh: "实时地图性能:飞机 marker 不再每个位置 tick 都重建剪影 SVG + 标签。portal 内容拆成一个按量化视觉键 memo 的子组件,仅位置变化(最常见的情况)时跳过 React/SVG reconcile,而 marker 仍由运动循环命令式平滑移动——满载机场流量下 marker 与焦点航班详情页都更顺。繁忙机场的主线程卡顿峰值从约 82ms 降到约 59ms。",
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
