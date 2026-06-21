// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Patch-only followups can be folded into the
// latest representative entry. Keep entries terse — the long-form story belongs
// in the PR.

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

export const CHANGELOG_INITIAL_LIMIT = 6;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 60;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
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
