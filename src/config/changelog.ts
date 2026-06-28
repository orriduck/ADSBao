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
export const CHANGELOG_TOTAL_COUNT = 59;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
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
