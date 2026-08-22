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
// The version-update indicator's semver compare still fires on every release. Start a fresh
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

export const CHANGELOG_INITIAL_LIMIT = 2;
export const CHANGELOG_PAGE_SIZE = 20;
export const CHANGELOG_TOTAL_COUNT = 76;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.15.1",
    kind: "feat",
    title: {
      en: "Wayfinding clarity",
      zh: "导视清晰度",
    },
    summary: {
      en: "A grayscale-and-yellow wayfinding refresh sharpens aircraft, stabilizes nearby lists, and gives Plane Studio a calmer iOS-style camera interface.",
      zh: "灰黄导视更新提升飞机清晰度、稳定附近列表，并为 Plane Studio 带来更克制的 iOS 相机式界面。",
    },
    highlights: [],
  },
  {
    version: "v3.14.3",
    kind: "feat",
    title: {
      en: "Cloudflare-native ADSBao",
      zh: "Cloudflare 原生 ADSBao",
    },
    summary: {
      en: "Cloudflare serves the site and API with free live traffic and airport context. The interface now pairs a grayscale wayfinding system with yellow reserved for airport identity and the primary Track action, color photography, one calm typeface, clearer hierarchy, continuous full-height rails with a restrained glass finish, white provider marks on a compact deep-blue sign, a quieter airport directory, and complete airport identities.",
      zh: "Cloudflare 承载站点与 API，并提供免费实时流量与机场上下文；界面现采用灰度导视系统，仅以黄色标记机场身份和主 Track 操作，并结合彩色摄影、单一字体、清晰字阶、带克制玻璃质感的连续全高 rail、紧凑深蓝导视条上的白色服务商标识、更安静的机场目录和完整的机场身份信息建立层级。",
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
