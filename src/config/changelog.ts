// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking") and one concise user-facing summary. Keep
// detailed implementation notes in the PR, not the product UI.
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
export const CHANGELOG_TOTAL_COUNT = 73;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.10.24",
    kind: "feat",
    title: {
      en: "Airport exploration, stable flight tracking, and clearer saved settings",
      zh: "机场探索、更稳定的航班追踪与更清晰的设置保存提示",
    },
    summary: {
      en: "Tracked flights now begin from one dedicated, no-store current-position query instead of reusing an airport-list coordinate. Strict Mode's repeated effect mount now shares that one in-flight request instead of cancelling the paid first fix and waiting for the next 15-second stream poll. Realtime coordinate frames are never replayed from cache: reconnects remain pending until a new frame arrives, stale/error frames cannot enter the recorded trace, and older fixes cannot pull a tracked marker backward. The tracked callsign then remains on one healthy free source until that source fails, while regional traffic uses its own recovery gate. The map status now names the successful position provider; a compact Cached tag appears only when the frame is stale. Airport maps retain aircraft and nearby airports within an 80 NM airport-centred area, while the map can pan within a 120 NM square and recenter from Map range. Airspace previews use numbered, tap-to-select markers rather than swipe navigation. Flight and airport sidebars link directly to their matching FlightRadar24 pages in a green-backed extension beneath the independently rounded metrics surface. Route loading now renders the complete inset sidebar shell, and its neutral skeleton joins the metrics and link rows without an extra lower corner. Flight loading and no-position messages are centred in the unobstructed map area beside the open sidebar. Flight tracking locks its live map view, keeps the watched aircraft's full current-leg trail visible, and keeps its trace, aircraft marker, route-to-destination line, and centre anchored to the same inferred position for a full minute during a brief feed gap. Selected airport runway previews remain open while nearby context refreshes. Completed map-setting saves appear as full, unobstructed notices. Blocking map loading stays in the visible map plane with matching sidebar skeletons; its centred line glyph now cycles aircraft, tower, and runway instead of the former wave animation. The map-range control now uses a clear map icon rather than a magnification read-out. ADSBao now uses a precise four-plane direction mark across the app and PWA, with a light or dark tile that follows the selected theme.",
      zh: "航班追踪页现在会用一次专属、无缓存的当前定位查询开始，不再复用机场列表中带来的坐标。Strict Mode 重复挂载 effect 时会共享同一个在途请求，不再取消付费首帧后被迫等待下一轮 15 秒流轮询。实时坐标不会再从缓存回放：重连会保持等待直到收到新帧，过期或错误帧不会写入记录航迹，较早的 fix 也不能把被追踪的飞机标记拉回去。随后该航班会固定使用一个健康的免费来源，直至它不可用；区域流量则使用独立的兜底闸门。地图状态现在会显示成功返回定位的 provider；只有帧过期时，provider 名前才会显示紧凑的“缓存”标签。机场地图会保留以机场为中心、80 海里范围内的飞机与附近机场；地图则可在 120 海里的正方形范围内移动，并从地图范围菜单回到机场中心。空域预览改为可点击切换的数字标记，不再支持滑动切换。航班和机场侧栏会直接链接到相应的 FlightRadar24 页面，并作为主 metrics 卡独立圆角表面下方的绿色扩展层。路由加载现在会渲染完整且保持边距的侧栏外壳；中性的骨架把 metrics 与外链行连成一体，不再额外显示主卡下圆角。航班加载与无位置提示现在会在打开侧栏右边、不受遮挡的地图区域内居中。航班追踪页锁定实时地图视图，始终保留被追踪飞机当前航段的完整轨迹，并在短暂数据缺口中让航迹、飞机标记、到目的地的路径和地图中心继续锚定于同一推断位置一分钟。附近上下文刷新时，已选机场的跑道预览也会保持打开。地图设置保存完成后则以完整、不被遮挡的提示显示。阻塞地图加载会留在可见地图区，侧栏显示对应骨架；居中的线稿图标会在飞机、塔台和跑道之间循环，取代旧的波形动画。地图范围控件现在使用清晰的地图图标，而非放大倍率读数。ADSBao 现已在应用和 PWA 中采用精确的四折面航向标识，浅色或深色底板会随所选主题切换。",
    },
    highlights: [],
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
