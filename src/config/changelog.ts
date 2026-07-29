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
export const CHANGELOG_TOTAL_COUNT = 69;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.3.4",
    kind: "feat",
    title: {
      en: "Airport loading now resolves through an ASCII radar spiral",
      zh: "机场加载改为 ASCII 雷达螺旋显影",
    },
    summary: {
      en: "Airport maps now load through a centred field of rotating aircraft-data characters and dots. A radial scan reveals the map, then a light recurring wave passes through the spiral before the whole layer fades away.",
      zh: "机场地图现在通过以中心为原点的航空数据字符与点阵旋涡加载。径向扫描显影地图,随后轻量波纹穿过旋涡,最后整个图层淡出。",
    },
    highlights: [
      {
        en: "Replaced the previous single SVG text path with a spaced, canvas-rendered ASCII ring field that stays centred on the usable map area.",
        zh: "用留有呼吸空间的 canvas ASCII 环场替换旧的单条 SVG 文本路径,并始终以可用地图区域中心为原点。",
      },
      {
        en: "The reveal and recurring three-second scan convert local character bands into dots, then return them to the live map without keeping animation work alive after exit.",
        zh: "首屏显影与每三秒扫描会将局部字符带转为点阵,随后回到实时地图;退出后不再保留动画计算。",
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
