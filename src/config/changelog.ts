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
export const CHANGELOG_TOTAL_COUNT = 55;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.31.8",
    kind: "feat",
    title: {
      en: "Flight route badges in the nearby list",
      zh: "邻近列表加入航路徽章",
    },
    summary: {
      en: "Routed aircraft in the nearby list now carry a compact route badge — origin → destination in a frosted pill, with the airline's logo fading in at the left when one is available. Aircraft with no known route show no subline (the registration is no longer shown there).",
      zh: "邻近列表中有航路的飞机现在带一枚紧凑的航路徽章——磨砂胶囊里显示起点 → 终点,有航司 logo 时在左侧淡入。没有已知航路的飞机不显示副标题(不再显示注册号)。",
    },
    highlights: [
      {
        en: "Nearby-list motion: when the list re-sorts, each row stays in place and its content cross-fades to the new aircraft (instead of rows sliding around), and a route badge eases in when its route resolves. Light, scroll-safe, and keeps the list's real-time feel.",
        zh: "邻近列表动效:列表重新排序时每一行位置不动、内容就地交叉淡入切到新飞机(而非整行滑动),航路解析出来时徽章淡入登场。轻量、滚动安全,保持列表的实时手感。",
      },
      {
        en: "Airport sidebar polish: the Flights metric now eases open and closed (height + count) instead of snapping, the logo row blends into the frosted panel — now on mobile and the home panel too, where it had read as a separate band — and the Flights tile gets the same orange active state as the others.",
        zh: "机场侧边栏细节:Flights 指标现在平滑展开/收起(高度与数字)而非生硬切换;logo 行融入磨砂面板——现在移动端和首页面板也一样(之前那里会显出一条分隔的色带);Flights 磁贴也获得与其它磁贴一致的橙色激活态。",
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
