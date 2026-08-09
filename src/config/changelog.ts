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
    version: "v3.10.15",
    kind: "feat",
    title: {
      en: "80 NM airport exploration, stable flight tracking, and clearer saved settings",
      zh: "80 海里机场探索、更稳定的航班追踪与更清晰的设置保存提示",
    },
    summary: {
      en: "Airport maps retain aircraft and nearby airports within an 80 NM airport-centred area, where you can pan within the boundary and recenter from Map range. Flight tracking locks its live map view, keeps the watched aircraft's full current-leg trail visible, and keeps its trace, aircraft marker, route-to-destination line, and centre anchored to the same inferred position for a full minute during a brief feed gap. Replayed or late airborne fixes no longer reset that prediction anchor: the watched aircraft advances continuously through a source correction instead of briefly moving backward and then jumping ahead. While that correction is still in progress, the visible trace tail now ends at the same inferred aircraft position instead of drawing a false forward-and-back hook through the raw fix. Position-source cooldowns now isolate tracked-flight lookups from airport traffic. Regional traffic refreshes every three seconds: eligible sources race once, the first usable snapshot stays pinned for stable aircraft positions, and a new race occurs only if that source becomes unavailable. A service-wide three-second traffic lane prevents overlapping maps from rate-limiting that pinned source. Selected airport runway previews remain open while nearby context refreshes. Completed map-setting saves appear as full, unobstructed notices. Blocking map loading now stays in the main content area, with matching sidebar skeletons and a restrained aircraft-in-transit signal in place of the former wave animation.",
      zh: "机场地图会保留以机场为中心、80 海里范围内的飞机与附近机场；你可以在该范围内移动视野，并从地图范围菜单回到机场中心。航班追踪页锁定实时地图视图，始终保留被追踪飞机当前航段的完整轨迹，并在短暂数据缺口中让航迹、飞机标记、到目的地的路径和地图中心继续锚定于同一推断位置一分钟。重复或延迟到达的空中位置修正不会再重置这一推断锚点：被追踪的飞机会连续地通过一次来源修正，而不再短暂回退后突然前冲。在该修正尚未完成时，可见航迹的末端现在会停在同一推断位置，而不会经由原始 fix 画出错误的前冲再回钩。位置源冷却现在会与航班追踪查询隔离。区域流量每三秒刷新：可用来源只在首次竞速，最先返回的有效快照会被固定使用以保持飞机位置稳定；只有该来源不可用时才会重新竞速。服务级的三秒流量通道会阻止多个地图重叠时把固定来源推入限流。附近上下文刷新时，已选机场的跑道预览也会保持打开。地图设置保存完成后则以完整、不被遮挡的提示显示。阻塞地图加载现在仅留在主内容区，侧栏会显示对应骨架，旧的波形动画改为克制的飞机航线通行信号。",
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
