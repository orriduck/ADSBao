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
    version: "v2.39.0",
    kind: "feat",
    title: {
      en: "Faster trace & route when you revisit a flight",
      zh: "重访航班时航迹与航线加载更快",
    },
    summary: {
      en: "Returning to a flight you just left is quicker. The data-service now keeps a short-lived (5-minute) shared cache of each flight's recent trace and route. Because navigating between detail pages fully reloads the page, the trace and route used to be re-fetched from the upstream providers every single time you came back; now they're served straight from the cache, so they appear faster and the rate-limited upstreams (adsb.lol traces, adsbdb / FlightAware routes) are hit far less. The cache is stale-while-revalidate: a just-expired entry is shown instantly and refreshed in the background, and if an upstream is briefly down the last known route is still shown. Live aircraft position is unaffected and stays real-time.",
      zh: "刚离开又点回来的航班加载更快了。数据服务现在为每个航班的最近航迹和航线保留一份短时(5 分钟)共享缓存。由于详情页之间跳转是整页重载,以前每次回来都要重新向上游重拉航迹和航线;现在直接从缓存返回,显示更快,也大幅减少对限流上游(adsb.lol 航迹、adsbdb / FlightAware 航线)的请求。缓存采用 stale-while-revalidate:刚过期的条目会立即返回并在后台刷新;上游短暂不可用时仍会显示最后一次已知的航线。飞机实时位置不受影响,仍保持实时。",
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
