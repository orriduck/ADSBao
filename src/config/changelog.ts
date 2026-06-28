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
export const CHANGELOG_TOTAL_COUNT = 61;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.37.0",
    kind: "feat",
    title: {
      en: "Lighter Explorer re-renders",
      zh: "更轻的 Explorer 重渲染",
    },
    summary: {
      en: "The airport Explorer's UI state used to live in one large context object: any change — selecting an aircraft, panning, zooming, toggling a map layer — produced a new object and re-rendered every consumer, including the busy aircraft list. The context is now split into focused slices so a component can subscribe to just what it reads (the aircraft list subscribes only to the list filters), and the list itself is memoized. High-frequency updates that the list doesn't care about — zooming and map-layer toggles — no longer re-run the list's rendering work, while genuine changes (new traffic data, selecting a row) still update only what changed.",
      zh: "机场 Explorer 的 UI 状态过去集中在一个大 context 对象里:任何变化——选中飞机、平移、缩放、切换地图图层——都会生成新对象并重渲染所有消费者,包括繁忙的航班列表。现在 context 拆成聚焦切片,组件只订阅自己读取的部分(航班列表只订阅列表筛选项),列表本身也做了 memo 化。列表不关心的高频更新——缩放、图层开关——不再触发列表的渲染工作;而真正的变化(新流量数据、选中某行)仍只更新发生变化的部分。",
    },
    highlights: [
      {
        en: "ExplorerUiContext is split into focused slices (filters, selection) alongside the full aggregate, so consumers re-render on their slice rather than on every unrelated field.",
        zh: "ExplorerUiContext 在保留完整聚合的同时拆出聚焦切片(filters、selection),消费者只在自己的切片变化时重渲染,而非任何无关字段。",
      },
      {
        en: "The aircraft list is memoized and subscribes only to the list filters: zooming and map-layer toggles no longer re-render it (≈3× fewer list re-renders during a zoom versus a full-context consumer).",
        zh: "航班列表 memo 化并只订阅列表筛选项:缩放和图层开关不再触发它重渲染(缩放期间列表重渲染约为全量 context 消费者的 1/3)。",
      },
      {
        en: "Selecting an aircraft still updates only the changed rows, not the whole list (existing per-row memoization), and the map canvas continues to own per-frame aircraft motion — no per-frame React work was added.",
        zh: "选中飞机仍只更新变化的行、而非整列表(沿用既有逐行 memo);逐帧的飞机运动依旧由地图 canvas 负责——没有新增任何逐帧 React 工作。",
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
