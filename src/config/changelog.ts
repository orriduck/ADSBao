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
    version: "v2.39.4",
    kind: "feat",
    title: {
      en: "Faster, more complete trace & route on busy airports",
      zh: "繁忙机场的航迹与航线更快、更全",
    },
    summary: {
      en: "Returning to a flight you just left is quicker, and busy airports now show far more routes. The data-service keeps a short-lived (5-minute) shared cache of each flight's recent trace and route, so revisiting a flight (detail-page navigation fully reloads the page) serves them straight from the cache instead of re-fetching from the rate-limited upstreams (adsb.lol traces, adsbdb / FlightAware routes); a just-expired entry is shown instantly and refreshed in the background. We also fixed a cause of missing routes on busy airports: a FlightAware route scrape is fast on its own (~0.6s) but balloons to 5–10s when dozens fire at once, and those were being cut off at 7s — dropping a large share of valid commercial routes. We now cap how many FlightAware lookups run at once (so each stays fast) and give the rest a longer timeout, so valid routes complete instead of being dropped. Live aircraft position is unaffected and stays real-time.",
      zh: "刚离开又点回来的航班加载更快了,繁忙机场也能显示出多得多的航线。数据服务为每个航班的最近航迹和航线保留一份短时(5 分钟)共享缓存,重访航班(详情页跳转是整页重载)时直接从缓存返回,而不再向限流上游(adsb.lol 航迹、adsbdb / FlightAware 航线)重拉;刚过期的条目会立即返回并在后台刷新。同时修了繁忙机场漏航线的一个成因:单次 FlightAware 航线抓取本身很快(~0.6 秒),但几十个一起打就会膨胀到 5–10 秒,这些会在 7 秒处被掐断,丢掉一大批有效的商业航线。现在我们给 FlightAware 查询限制了并发(让每次都保持快),其余的也给了更长的超时,有效航线能跑完而不被丢弃。飞机实时位置不受影响,仍保持实时。",
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
        en: "Busy airports show more routes: FlightAware lookups are now concurrency-bounded so each stays ~fast instead of ballooning to 5–10s under a burst, with a longer timeout and a few quick retries as backstops — valid commercial routes that used to silently drop now resolve.",
        zh: "繁忙机场显示更多航线:FlightAware 查询现在限制了并发,每次都保持较快,不再在突发下膨胀到 5–10 秒,并以更长超时和几次快速重试兜底——以前会悄悄丢掉的商业航线现在能解析出来。",
      },
      {
        en: "Here-mode weather no longer flickers: the local-weather card now refreshes only when you move into a new place (city/area) instead of on every GPS micro-update.",
        zh: "Here 模式天气不再频繁闪烁:本地天气卡现在只在你移动到新的地点(城市/地区)时才刷新,而不是每次 GPS 微小抖动都重新请求。",
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
