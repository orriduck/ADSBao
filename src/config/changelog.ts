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
export const CHANGELOG_TOTAL_COUNT = 49;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
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
  {
    version: "v2.21.0",
    kind: "feat",
    title: {
      en: "Curated photo locations and navigation",
      zh: "机场拍机点与导航",
    },
    summary: {
      en: "Watcher Mode now uses curated airport photo locations, with a preview-first flow and direct handoff to map navigation.",
      zh: "看客模式现在使用精选机场拍机点，并提供先预览、再跳转地图导航的流程。",
    },
    highlights: [
      {
        en: "Photo locations come from curated airport data instead of browser-side candidate files",
        zh: "拍机点来自精选机场数据，不再依赖浏览器侧候选文件",
      },
      {
        en: "Desktop and mobile users can preview a spot before choosing a navigation app",
        zh: "桌面端和移动端都可以先预览拍机点，再选择导航应用",
      },
    ],
  },
  {
    version: "v2.20.0",
    kind: "feat",
    title: {
      en: "Canonical airport identity",
      zh: "机场身份统一层",
    },
    summary: {
      en: "Airport lookups now resolve ICAO, IATA, OurAirports, and OpenAIP aliases through a shared canonical identity layer before reading source-specific data.",
      zh: "机场查询现在先通过共享的 canonical identity 层解析 ICAO、IATA、OurAirports 与 OpenAIP 别名，再读取各来源数据。",
    },
    highlights: [
      {
        en: "ICAO, IATA, OurAirports, and OpenAIP identifiers resolve through one shared airport identity model",
        zh: "ICAO、IATA、OurAirports 和 OpenAIP 标识统一通过同一套机场身份模型解析",
      },
      {
        en: "Names, runways, frequencies, and related airport data now agree on the same place",
        zh: "机场名称、跑道、频率和相关数据现在会指向同一座机场",
      },
    ],
  },
  {
    version: "v2.19.6",
    kind: "patch",
    title: {
      en: "Static shell media and sidebar polish",
      zh: "静态壳媒体与侧栏打磨",
    },
    summary: {
      en: "Static pages feel cleaner through refreshed brand media, steadier sidebar spacing, and quieter page chrome.",
      zh: "静态页面通过新版品牌媒体、更稳定的侧栏留白和更安静的页面外观变得更干净。",
    },
    highlights: [
      {
        en: "Static pages use refreshed brand media with a lighter feel",
        zh: "静态页面使用更轻盈的新版品牌媒体",
      },
      {
        en: "Mobile sidebars have more consistent bottom breathing room",
        zh: "移动端侧栏底部留白更一致",
      },
      {
        en: "Home, About, Mechanism, and Changelog read cleaner as a group",
        zh: "首页、关于、机制与更新日志整体更干净统一",
      },
    ],
  },
  {
    version: "v2.19.1",
    kind: "feat",
    title: {
      en: "Reporting point previews",
      zh: "报告点预览",
    },
    summary: {
      en: "Airport maps can optionally show OpenAIP reporting points with their own icon treatment and desktop/mobile preview cards.",
      zh: "机场地图现在可按设置显示 OpenAIP 报告点，并使用独立图标样式与桌面端/移动端预览卡。",
    },
    highlights: [
      {
        en: "Reporting points can be enabled when they are useful for airport context",
        zh: "需要机场上下文时可以开启报告点",
      },
      {
        en: "They get distinct map treatment and matching previews on desktop and mobile",
        zh: "它们有独立的地图呈现，并在桌面端和移动端提供对应预览",
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
