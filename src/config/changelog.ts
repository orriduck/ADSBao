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
export const CHANGELOG_TOTAL_COUNT = 96;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.28.5",
    kind: "patch",
    title: {
      en: "Aircraft preview card — clearer selection state",
      zh: "飞机预览卡片——更清晰的选中态",
    },
    summary: {
      en: "Tapping an aircraft now opens a refreshed frosted preview card on desktop and a drag-to-expand sheet on mobile, with one signal accent and no rainbow button.",
      zh: "点选飞机后，桌面端打开焕新的磨砂预览卡片，移动端为可下拉展开的卡片；统一单一信号强调色，去掉彩虹按钮。",
    },
    highlights: [
      {
        en: "Desktop card: a photo header with a 'tracking' pill, callsign + TYPE / CATEGORY (no registration), an ORIGIN ——✈—— DEST route line, accent vertical-speed, HEX / Track / Distance, and a Track button beside camera + suggest-correction icon buttons",
        zh: "桌面卡片：带「追踪」徽标的照片头、呼号 + 机型 / 类别（不再显示注册号）、ORIGIN ——✈—— DEST 航路线、强调色垂直速度、HEX / 航向 / 距离，以及 Track 按钮搭配相机 + 建议纠正图标按钮",
      },
      {
        en: "Mobile: a top-anchored drag-to-expand sheet (drag the grabber down) — collapsed shows callsign / type / telemetry / actions; expanded reveals the photo and identity rows. Landscape anchors to the bottom and expands up",
        zh: "移动端：顶部吸附、可下拉展开的卡片（向下拖动把手）——收起时显示呼号 / 机型 / 参数 / 操作，展开后显示照片与身份信息；横屏改为底部吸附、向上展开",
      },
      {
        en: "The list-row selection (orange wash + accent rail + accent glyph) and the single signal accent are reused throughout; the multicolour Plane Hunter button is gone",
        zh: "沿用列表行选中态（橙色底色 + 强调导轨 + 强调图标）与单一信号强调色；移除多彩的拍机按钮",
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
