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
export const CHANGELOG_TOTAL_COUNT = 64;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.40.1",
    kind: "feat",
    title: {
      en: "Aircraft cards reveal the city behind each airport code",
      zh: "飞机卡片在机场代码旁轮播出发/到达城市",
    },
    summary: {
      en: "Tap an aircraft and its route line now crossfades between the airport codes (e.g. PHL — BOS) and the cities they serve (🇺🇸 Philadelphia — 🇺🇸 Boston), so you can read a flight's route without knowing every code. The city + country come from a built-in OurAirports lookup keyed by airport identifier, so it's the airport's actual served city (PHL → Philadelphia) rather than the township the runway physically sits in. Works on both the desktop and mobile preview cards, respects reduced-motion (no carousel, just the codes), and adds no network calls — the lookup ships with the app.",
      zh: "点开一架飞机,航线行现在会在机场代码(如 PHL — BOS)和它们服务的城市(🇺🇸 Philadelphia — 🇺🇸 Boston)之间淡入淡出轮播,不用记住每个代码也能读懂航线。城市+国家来自内置的 OurAirports 机场表(按机场代码查),给的是机场真正服务的城市(PHL → Philadelphia),而不是跑道物理所在的乡镇。桌面和移动端预览卡都生效,尊重系统的减少动态设置(不轮播、只显示代码),且不增加任何网络请求——查表随应用一起打包。",
    },
    highlights: [
      {
        en: "Preview-card route line crossfades between airport codes and 🇺🇸 City place labels every few seconds, on both desktop and mobile.",
        zh: "预览卡航线行每隔几秒在机场代码与 🇺🇸 城市标签之间淡入淡出,桌面与移动端均生效。",
      },
      {
        en: "Served city comes from a bundled OurAirports ICAO→city table (~8.7k airports), lazy-loaded only when a route card opens — accurate (PHL → Philadelphia) with no extra requests or database dependency.",
        zh: "服务城市来自打包的 OurAirports ICAO→城市表(约 8700 个机场),仅在打开航线卡片时懒加载——准确(PHL → Philadelphia)且不增加请求或数据库依赖。",
      },
      {
        en: "Reduced-motion users see the static airport codes with no carousel; routes without a known city stay code-only.",
        zh: "开启减少动态的用户只看到静态机场代码、不轮播;查不到城市的航线保持只显示代码。",
      },
      {
        en: "Fixed an intermittent case where an aircraft visible on the map showed “no broadcast position” on its tracking page: the detail page now falls back to the aircraft's ICAO24 (hex) feed when the callsign feed lags, and the data-service resolves callsign→hex from recent snapshots — so a flight you can see on the map reliably shows its position when you open it.",
        zh: "修复了一个偶发问题:地图上明明能看到的飞机,点进追踪页却显示「没有广播位置」。详情页现在会在呼号源滞后时回落到该机的 ICAO24(hex)源,数据服务也会从近期快照里把呼号解析成 hex——这样在地图上能看到的航班,点开后能稳定显示位置。",
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
