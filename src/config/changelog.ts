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
export const CHANGELOG_TOTAL_COUNT = 57;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.33.1",
    kind: "feat",
    title: {
      en: "Canvas aircraft rendering",
      zh: "Canvas 飞机渲染",
    },
    summary: {
      en: "Every aircraft on the map now draws into a single <canvas> overlay in one loop, replacing the old per-plane DOM markers (one React component + composited layer each). A busy airport collapses from ~80 composited layers to one, which frees the GPU so the map stays smooth while you scroll the sidebar list. Live extrapolated positions, selection, click-to-track, filtering, and the per-target frame-rate are all preserved; the glyph itself is a cleaner flat silhouette (heading, colour, label, one drop-shadow) without the old 3D bank/pitch tilt or dark-theme light effects.",
      zh: "地图上的每架飞机现在都在一个绘制循环里画进同一块 <canvas> 叠加层,取代旧的每架一个 DOM marker(各自一个 React 组件 + 合成层)。繁忙机场从约 80 个合成层收敛为一个,把 GPU 解放出来,让你滚动侧栏列表时地图保持顺滑。实时外推位置、选中、点击追踪、筛选和按目标的帧率都保留;字形改为更干净的扁平剪影(航向、颜色、标签、一层投影),去掉旧的 3D 倾斜与暗色光效。",
    },
    highlights: [
      {
        en: "One canvas overlay (an L.Renderer subclass) draws all planes in layer coordinates, so a map pan needs no redraw and there's zero per-marker React or forced layout. Draw cost on a full JFK is ~1ms/frame.",
        zh: "一块 canvas 叠加层(L.Renderer 子类)用图层坐标画出全部飞机,平移地图无需重画,也没有逐 marker 的 React 或强制布局。满载 JFK 的绘制开销约每帧 1ms。",
      },
      {
        en: "Silhouette sprites are rasterised once, tinted to the plane colour with a baked static drop-shadow, and reused every frame; heading eases smoothly and an inferred position keeps its source/quality. The whole layer shares one zoom-aware cadence (focal target at 30fps, coarser as you zoom out).",
        zh: "剪影 sprite 只栅格化一次,着色为飞机颜色并烘焙一层静态投影,之后每帧复用;航向平滑过渡,推算位置仍保留来源/质量。整层共用一套随缩放自适应的节流(焦点目标 30fps,越远越粗)。",
      },
      {
        en: "Clicking a plane on the map still selects it (canvas hit-testing replaces the per-marker DOM target), the pointer cursor still appears over a plane, and the selected aircraft's trace is unchanged. The old AircraftPosition marker, its label, the 3D-attitude and headlight models, and their CSS are removed.",
        zh: "在地图上点击飞机仍可选中(canvas 命中测试取代逐 marker 的 DOM 目标),悬停飞机仍显示手型光标,选中飞机的航迹保持不变。旧的 AircraftPosition marker、它的标签、3D 姿态与航行灯模型及相关 CSS 一并移除。",
      },
      {
        en: "v2.33.1 polish + a realtime fix: the focal flight drops its selection ring, global type weight steps up, map clicks prioritise aircraft over airspace, the hero stat label aligns to the grid, and the flight search box adopts the home airport-search style. The realtime WebSocket is now held warm across page navigation so routes (WS-only, no fallback) don't blank on every view change.",
        zh: "v2.33.1 打磨 + 一处实时修复:焦点航班去掉选中圈,全局字重上调,地图点击优先飞机而非空域,hero 统计标签与下方网格对齐,航班搜索框改用首屏机场搜索样式。实时 WebSocket 现在跨页导航保持温热,避免航路(仅走 WS、无兜底)每次切页变空。",
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
