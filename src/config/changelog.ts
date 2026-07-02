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
export const CHANGELOG_TOTAL_COUNT = 67;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.43.0",
    kind: "feat",
    title: {
      en: "Steadier tracking: current-leg traces, routes that survive navigation, resilient feeds",
      zh: "更稳的追踪:当前航段航迹、跨页不丢的航线、更抗故障的数据流",
    },
    summary: {
      en: "The three core tracking mechanisms got a stability pass. Traces: the flight page now clips history to the current leg — earlier legs and yesterday's same-callsign trail no longer bleed in, while transoceanic coverage holes at cruise are correctly kept (the 'all recorded points' view still shows everything); the watched session's real position fixes are now genuinely saved (a starved debounce meant they often weren't), and a failed or rate-limited background trace refresh keeps what you already have instead of wiping the trail. Routes: resolved origin/destination pairs persist in the browser, so opening a flight's detail page reuses the route the map already fetched instead of re-asking upstream. Positions: when the realtime socket falls back to polling, repeated upstream failures now back off exponentially instead of hammering every 3 seconds.",
      zh: "对三大核心追踪机制做了一轮稳定性改造。航迹:飞机页历史现在按当前航段裁剪——更早的航段和昨天同呼号的旧航迹不再混入,而巡航高度上的跨洋覆盖空洞会被正确保留(「所有记录点」视图仍可看全部);追踪期间的真实位置点现在会切实存下来(原先的防抖被持续更新饿死,经常根本没写入),后台航迹刷新失败或被限流时保留已有数据,不再清空轨迹。航线:已解析的出发/到达在浏览器本地持久化,打开航班详情页直接复用地图页已取到的航线,不再重复请求上游。位置:实时连接退化为轮询时,上游连续失败会指数退避,不再每 3 秒硬砸。",
    },
    highlights: [
      {
        en: "Flight traces clip to the current leg by default — multi-leg days and yesterday's flight under the same callsign stay out; cruise-altitude ocean gaps are kept, so transatlantic traces stay whole.",
        zh: "航迹默认按当前航段裁剪——同日多段和昨天同呼号的航班不再混入;巡航高度的海洋空洞会保留,跨洋航迹保持完整。",
      },
      {
        en: "Real live fixes are appended and persisted while you watch; the inferred marker head stays display-only.",
        zh: "追踪时真实位置点持续入轨并持久化;推断的视觉头仅用于显示。",
      },
      {
        en: "A failed/empty trace refresh never wipes points you already have, and the recent trace re-pulls every ~3 minutes so upstream corrections land.",
        zh: "航迹刷新失败/为空不再清掉已有点;最近航迹每约 3 分钟静默补拉,上游修正能落地。",
      },
      {
        en: "Routes persist across page navigations (provider-partitioned, hits only), so detail pages show origin/destination instantly.",
        zh: "航线跨页持久化(按提供方分区、只存命中),详情页即时显示出发/到达。",
      },
      {
        en: "Position polling backs off exponentially (3s → 30s) on repeated upstream failures.",
        zh: "位置轮询在上游连续失败时指数退避(3s → 30s)。",
      },
      {
        en: "Fixed: readsb trace flags were misread as 'on ground', which broke leg detection right at oceanic coverage holes.",
        zh: "修复:readsb 航迹 flags 位被误读为「在地面」,恰好在跨洋空洞处破坏航段判定。",
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
