// Product release history rendered by `/changelog`. Keep new releases in
// `CHANGELOG_RECENT`; older entries live in `changelogHistory.ts` so the
// PWA shell can cache the condensed recent release set. Each release has a `kind`
// ("feat" | "patch" | "breaking"), a one-line `summary`, and a small set of
// high-level `highlights` bullets. Patch-only followups can be folded into the
// latest representative entry. Keep entries terse — the long-form story belongs
// in the PR.

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
export const CHANGELOG_TOTAL_COUNT = 97;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.6",
    kind: "patch",
    title: {
      en: "Mobile preview card — compact collapsed row",
      zh: "移动预览卡片——更紧凑的收起态",
    },
    summary: {
      en: "The collapsed mobile aircraft card tightens to a single glance: thumbnail, callsign + type, route, an inline orange Track button, and one telemetry line. The photo and secondary actions move into the expanded sheet.",
      zh: "移动端飞机卡片的收起态收紧为一眼可读：缩略图、呼号 + 机型、航路、内联橙色 Track 按钮，以及一行参数。照片与次要操作移入展开层。",
    },
    highlights: [
      {
        en: "Collapsed row: [thumbnail] [callsign + TYPE / CATEGORY · ORIGIN → DEST] [inline Track], over a 'speed · alt · ↑V/S' line with the vertical-speed in the accent",
        zh: "收起行：[缩略图] [呼号 + 机型 / 类别 · 起 → 降] [内联 Track]，下方为「速度 · 高度 · ↑垂直速度」一行，垂直速度用强调色",
      },
      {
        en: "Drag the grabber down to reveal a modest photo plus the camera / suggest-correction actions; the dense HEX / Track / Distance rows are left off mobile",
        zh: "向下拖动把手即可展开适中的照片，以及相机 / 建议纠正操作；移动端不再堆叠 HEX / 航向 / 距离等密集信息",
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
