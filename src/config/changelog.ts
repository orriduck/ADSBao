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
export const CHANGELOG_TOTAL_COUNT = 60;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.36.0",
    kind: "feat",
    title: {
      en: "Steadier realtime aircraft subscriptions",
      zh: "更稳的实时航空器订阅",
    },
    summary: {
      en: "The realtime aircraft pipeline now resists subscription churn end-to-end. Rapidly opening and closing an aircraft detail no longer tears down and rebuilds its WebSocket subscription (and, for FlightAware, re-authenticates) on every toggle: the client holds callsign/aircraft subscriptions for a short grace window and reuses them if you come back, and the Go data-service mirrors that with a configurable idle grace before it stops a channel's polling loop — so a returning subscriber keeps the same warm loop with no rebuild or re-fetch spike. Switching between aircraft also stops flickering: the previous aircraft's data stays on screen until the new channel delivers instead of blanking instantly.",
      zh: "实时航空器数据管线现在端到端地抵抗订阅抖动。快速开关某架飞机详情,不再每次都拆掉并重建它的 WebSocket 订阅(FlightAware 还要重新鉴权):客户端会把 callsign/aircraft 订阅保留一个短的 grace 窗口,期间再次进入则原地复用;Go 数据服务以一个可配置的 idle grace 镜像同样行为——最后一个订阅者离开后延迟停止该频道的轮询循环,于是 grace 窗口内返回的订阅者续用同一个热循环,无重建、无重取尖峰。切换不同飞机也不再闪烁:上一架的数据会保留到新频道送来数据,而不是瞬间清空。",
    },
    highlights: [
      {
        en: "Opening/closing the same aircraft repeatedly now sends at most one subscribe and one unsubscribe (after the grace), instead of a churn of teardown/rebuild messages.",
        zh: "反复开关同一架飞机,现在最多发出一次 subscribe、一次 unsubscribe(grace 之后),而不再是一连串拆除/重建消息。",
      },
      {
        en: "Switching between aircraft details no longer blanks the view — the previous aircraft stays until the new channel delivers, killing the detail-switch flicker.",
        zh: "在不同飞机详情间切换不再清空视图——上一架会保留到新频道送达,消除了切换闪烁。",
      },
      {
        en: "Backend symmetry: the data-service keeps a channel's polling loop alive for a configurable idle grace (CHANNEL_IDLE_GRACE_PERIOD_MS) after the last unsubscribe, while still guaranteeing the loop stops once the grace expires.",
        zh: "前后端对称:数据服务在最后退订后,会按可配置的 idle grace(CHANNEL_IDLE_GRACE_PERIOD_MS)保留频道的轮询循环;grace 到期后仍保证循环停止。",
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
