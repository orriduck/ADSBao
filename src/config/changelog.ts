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
export const CHANGELOG_TOTAL_COUNT = 65;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
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
    highlights: [
      {
        en: "Heading beam rotates reliably on mobile",
        zh: "罗盘光束在移动端可靠旋转",
      },
      {
        en: "DeviceOrientation requested proactively on airport entry",
        zh: "进入机场时主动请求 DeviceOrientation 权限",
      },
      {
        en: "Location status always visible in map settings",
        zh: "地图设置中始终显示位置状态",
      },
    ],
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
    highlights: [
      {
        en: "Live location and compass heading status in map settings",
        zh: "地图设置中实时显示位置与罗盘朝向状态",
      },
      {
        en: "Force re-acquire location when position is not ready or permission was denied",
        zh: "位置未就绪或权限被拒绝时可强制重新获取",
      },
    ],
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
    highlights: [
      {
        en: "Spotting dots at far zoom now match the badge foreground color per theme",
        zh: "最远缩放下的拍机小点现在按主题匹配 badge 前景色",
      },
    ],
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
    highlights: [
      {
        en: "Re-request button shows in map settings when location toggle is on but permission is denied",
        zh: "当「我的位置」开关开启但权限被拒绝时,地图设置中显示重新请求按钮",
      },
      {
        en: "Cleaned up unused preset mode labels from map settings",
        zh: "清理了地图设置中已废弃的预设模式标签",
      },
    ],
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
    highlights: [
      {
        en: "The farthest airport zoom uses small white point markers for photo locations",
        zh: "最远机场缩放下拍机点只显示小白点",
      },
      {
        en: "Middle and near airport zooms use the shared airport/navaid badge style for photo locations",
        zh: "中间和近景机场缩放下拍机点使用机场/导航台同款 badge",
      },
      {
        en: "Clicking the spotting metric card opens the spotting panel without changing the current map zoom",
        zh: "点击拍机点指标卡只打开拍机点面板,不会改变当前地图缩放",
      },
    ],
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
