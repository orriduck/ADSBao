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
export const CHANGELOG_TOTAL_COUNT = 63;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.39.1",
    kind: "feat",
    title: {
      en: "Faster, more complete trace & route on busy airports",
      zh: "繁忙机场的航迹与航线更快、更全",
    },
    summary: {
      en: "Returning to a flight you just left is quicker, and busy airports now show far more routes. The data-service keeps a short-lived (5-minute) shared cache of each flight's recent trace and route, so revisiting a flight (detail-page navigation fully reloads the page) serves them straight from the cache instead of re-fetching from the rate-limited upstreams (adsb.lol traces, adsbdb / FlightAware routes); a just-expired entry is shown instantly and refreshed in the background. We also fixed a cause of missing routes on busy airports: a FlightAware route scrape can take 5–10s under a burst of many simultaneous lookups, and the data-service was cutting them off at 7s — dropping a large share of valid commercial routes. Route lookups now get a longer timeout, so they complete instead of being killed. Live aircraft position is unaffected and stays real-time.",
      zh: "刚离开又点回来的航班加载更快了,繁忙机场也能显示出多得多的航线。数据服务为每个航班的最近航迹和航线保留一份短时(5 分钟)共享缓存,重访航班(详情页跳转是整页重载)时直接从缓存返回,而不再向限流上游(adsb.lol 航迹、adsbdb / FlightAware 航线)重拉;刚过期的条目会立即返回并在后台刷新。同时修了繁忙机场漏航线的一个成因:一次性大量并发查询时,单次 FlightAware 航线抓取要 5–10 秒,而数据服务在 7 秒处就把它掐断,丢掉了一大批有效的商业航线。现在航线查询有了更长的超时,能跑完而不被提前掐断。飞机实时位置不受影响,仍保持实时。",
    },
    highlights: [
      {
        en: "Recent trace and route are cached server-side for 5 minutes and shared across users, so returning to a flight within that window doesn't re-hit the upstream.",
        zh: "最近航迹与航线在服务端缓存 5 分钟且跨用户共享,在此窗口内重访航班不再重打上游。",
      },
      {
        en: "Stale-while-revalidate: a just-expired entry is served instantly and refreshed in the background; multi-MB full traces are never cached (they stay client-side).",
        zh: "Stale-while-revalidate:刚过期的条目即时返回并在后台刷新;多兆字节的完整航迹不进缓存(仍留在客户端)。",
      },
      {
        en: "FlightAware and adsbdb routes are cached separately and never mixed, and the cache falls back to direct fetches when the database is unavailable.",
        zh: "FlightAware 与 adsbdb 航线分开缓存、绝不混用;数据库不可用时自动回退为直连上游。",
      },
      {
        en: "Busy airports show more routes: slow FlightAware route scrapes (5–10s under load) are no longer cut off at 7s, so valid commercial routes that used to silently drop now resolve.",
        zh: "繁忙机场显示更多航线:慢的 FlightAware 航线抓取(高并发下 5–10 秒)不再被 7 秒掐断,以前会悄悄丢掉的商业航线现在能解析出来。",
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
