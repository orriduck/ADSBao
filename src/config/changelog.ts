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
export const CHANGELOG_TOTAL_COUNT = 66;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v3.1.2",
    kind: "feat",
    title: {
      en: "Proximity alerts: airport nearby (Here mode) and aircraft closing in",
      zh: "接近提醒:附近机场(我的位置模式)与飞机接近",
    },
    summary: {
      en: "A new Notifications section in map settings adds two opt-in system-notification alerts, both off by default. In Here mode, turning on the airport alert pings you once — with the airport's name and distance — the first time you wander within your chosen range (3/5/10/20 NM); it goes quiet after that until you toggle it off and back on. The aircraft alert works everywhere (Here mode and airport pages) and fires per plane, with its callsign and aircraft type, each time one crosses into your chosen range (2/5/10/20 NM) — not on every refresh while it lingers, and it fires again if it leaves and comes back. Both need the browser's notification permission; the settings sheet shows a clear note if that's blocked or unsupported.",
      zh: "地图设置新增「通知」分区,两个默认关闭的可选系统通知。在「我的位置」模式下打开机场提醒后,第一次进入你设定的范围(3/5/10/20 海里)会弹出一条提醒(机场名称 + 距离),之后保持安静,直到你关闭再重新打开。飞机提醒在任何模式下都生效(我的位置和机场详情页),每架飞机每次进入你设定的范围(2/5/10/20 海里)都会带着呼号和机型提醒一次——停留期间不会反复提醒,离开后再次接近会重新提醒。两者都需要浏览器的系统通知权限;权限被拒绝或浏览器不支持时,设置面板会给出明确提示。",
    },
    highlights: [
      {
        en: "Here-mode airport alert: one system notification with the airport's name and distance the first time you're within range; quiet after that until re-enabled.",
        zh: "「我的位置」机场提醒:进入范围后弹出一次机场名称 + 距离的系统通知,之后保持安静,直到重新开启。",
      },
      {
        en: "Aircraft alert (all modes): a system notification per aircraft — callsign and type — on each new approach into range, never repeating while it just lingers nearby.",
        zh: "飞机提醒(全部模式):每架飞机每次新进入范围都弹一次呼号 + 机型的系统通知,停留附近期间不会重复。",
      },
      {
        en: "Both alerts default OFF and each has its own adjustable range preset; a clear note appears if the browser's notification permission is blocked or unsupported.",
        zh: "两个提醒默认关闭,各自有独立可调的范围预设;浏览器通知权限被拒绝或不支持时,会显示明确提示。",
      },
      {
        en: "Aircraft preview card: the Plane Hunter camera button is now the same size as Track (both primary), leaving only the suggest-correction button as a small icon button.",
        zh: "飞机预览卡片:拍机相机按钮现在和追踪按钮同大小(都是 primary 样式),只有反馈建议按钮保留为小图标按钮。",
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
