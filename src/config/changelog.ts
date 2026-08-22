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
export const CHANGELOG_TOTAL_COUNT = 77;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.16.0",
    kind: "feat",
    title: {
      en: "Tracking interface refinement",
      zh: "追踪界面精修",
    },
    summary: {
      en: "Layered map labels, aligned security-glass wayfinding, and clearer Plane Studio controls refine airport tracking.",
      zh: "分级地图标签、统一的安检玻璃导视和更清晰的 Plane Studio 控件进一步完善机场追踪体验。",
    },
    highlights: [],
  },
  {
    version: "v3.15.2",
    kind: "feat",
    title: {
      en: "Wayfinding clarity",
      zh: "导视清晰度",
    },
    summary: {
      en: "A grayscale-and-yellow wayfinding refresh sharpens aircraft, stabilizes nearby lists, and gives Plane Studio a calmer camera and capture-review interface.",
      zh: "灰黄导视更新提升飞机清晰度、稳定附近列表，并让 Plane Studio 的拍摄与成片审核界面更清晰克制。",
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
