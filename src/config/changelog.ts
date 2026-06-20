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
export const CHANGELOG_TOTAL_COUNT = 53;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
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
    highlights: [
      {
        en: "Phone rotation updates the current-location heading arc while standing still",
        zh: "原地转动手机时，当前位置的视角圆弧会同步变化",
      },
      {
        en: "iOS compass permission is requested from the here-view entry flow when available",
        zh: "支持时会在进入 here 视图时请求 iOS 罗盘方向权限",
      },
      {
        en: "GPS heading remains as a fallback when compass orientation is unavailable",
        zh: "无法获得罗盘方向时，仍保留 GPS 移动航向作为兜底",
      },
    ],
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
    highlights: [
      {
        en: "The heading arc updates whenever the device heading changes",
        zh: "设备朝向变化时，视角圆弧会同步转动",
      },
      {
        en: "Here-mode position filtering now uses a 0.05 nm movement threshold",
        zh: "here 模式的位置防抖阈值调整为 0.05 海里",
      },
      {
        en: "The here-mode location refresh logic is covered by focused tests",
        zh: "here 模式的位置刷新逻辑已补上聚焦测试",
      },
    ],
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
    highlights: [
      {
        en: "Here mode uses the location it already requested as the map marker source",
        zh: "here 模式直接使用自己已获取的位置作为地图定位点来源",
      },
      {
        en: "The map settings user-location toggle no longer decides whether /here shows the user marker",
        zh: "地图设置里的我的位置开关不再决定 /here 是否显示自己的定位点",
      },
      {
        en: "Nearby visual-traffic status lines use the same here-mode location source",
        zh: "视距内飞机状态行也使用同一份 here 模式位置来源",
      },
    ],
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
    highlights: [
      {
        en: "Altitude filtering now uses four selectable bands, defaulting to traffic below 20,000 ft",
        zh: "高度筛选现在使用四个可多选高度层，默认显示 20000 ft 以下飞机",
      },
      {
        en: "The altitude trigger shows all, one selected band, or a multiple-bands state",
        zh: "高度选项框会显示全部、单个高度层或多个高度层状态",
      },
      {
        en: "My-location heading and visual-traffic status lines are steadier after the previous patch",
        zh: "上一个补丁中的我的位置航向与视距内飞机状态行更稳定",
      },
    ],
  },
  {
    version: "v2.22.10",
    kind: "patch",
    title: {
      en: "Tracking, airspace, and FlightAware patch rollup",
      zh: "追踪、空域与 FlightAware 补丁汇总",
    },
    summary: {
      en: "Tracking, airspace previews, sidebar gestures, FlightAware-backed flows, and photo-location navigation are steadier as a group.",
      zh: "追踪、空域预览、侧栏手势、FlightAware 相关流程和拍机点导航整体更稳定。",
    },
    highlights: [
      {
        en: "Tracking pages feel steadier while live routes, traces, and focused flights update",
        zh: "追踪页在实时航线、轨迹和焦点航班更新时更稳定",
      },
      {
        en: "Airspace previews and sidebar gestures are clearer on compact screens",
        zh: "紧凑屏幕上的空域预览和侧栏手势更清晰",
      },
      {
        en: "FlightAware-backed lookups and photo-location directions behave more predictably",
        zh: "FlightAware 相关查询和拍机点导航行为更可预期",
      },
    ],
  },
  {
    version: "v2.22.0",
    kind: "feat",
    title: {
      en: "Private FlightAware service",
      zh: "FlightAware 私有服务",
    },
    summary: {
      en: "FlightAware-backed lookups now go through a private Railway service instead of public ADSBao code.",
      zh: "FlightAware 相关查询现在走私有 Railway 服务，不再由公共 ADSBao 代码直接访问上游。",
    },
    highlights: [
      {
        en: "FlightAware-only work now sits behind one private boundary",
        zh: "FlightAware 专属工作统一放在一个私有边界后",
      },
      {
        en: "The public app keeps only the feature-gated integration path",
        zh: "公共应用只保留受功能开关控制的接入路径",
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
