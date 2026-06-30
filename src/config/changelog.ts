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
export const CHANGELOG_TOTAL_COUNT = 65;

export const CHANGELOG_RECENT: ChangelogEntry[] = [
  {
    version: "v2.42.1",
    kind: "feat",
    title: {
      en: "A zoom slider for the map, and clearer building footprints",
      zh: "地图缩放滑条 + 更清晰的建筑轮廓",
    },
    summary: {
      en: "The map's Far / Medium / Near zoom menu became a single compact viewfinder button that frames the current level (e.g. 13) and opens a slider — drag from 10x to 15x, snapping at each whole step, while the map stays centred on the airport instead of jumping between three fixed levels. The button stays the same compact size as the rest of the toolbar. On the flight-tracking page the full-trace and all-points view toggles fold into that same submenu so the toolbar stays short. Separately, building footprints on the standard map now read with more contrast, so the surrounding city stays legible at neighbourhood zoom.",
      zh: "地图的 远 / 中 / 近 三档缩放菜单,变成一个把当前倍数(如 13)框在取景框里的紧凑按钮,点开是一根滑条——从 10x 拖到 15x、每一级吸附,缩放时地图始终以机场为中心,不再在三个固定档位间跳。按钮与工具栏其他按钮一样紧凑等宽。飞机追踪页的「完整航迹 / 所有记录点」也收进同一个子菜单,工具栏更短。另外,标准地图的建筑轮廓提高了对比度,放大到街区级时周边城市更清晰。",
    },
    highlights: [
      {
        en: "Zoom is a slider now (10x–15x, snaps each step) on a compact viewfinder button that frames the current level — replacing the three fixed Far / Medium / Near presets.",
        zh: "缩放改成滑条(10x–15x、逐级吸附),紧凑的取景框按钮里显示当前倍数——取代原来的 远 / 中 / 近 三档。",
      },
      {
        en: "Zooming keeps the airport centred; the map no longer jumps between fixed levels.",
        zh: "缩放时机场始终居中,不再在固定档位间跳变。",
      },
      {
        en: "Flight page: the full-trace / all-points toggles fold into the same zoom submenu, shortening the toolbar.",
        zh: "飞机页:完整航迹 / 所有记录点 收进同一个缩放子菜单,工具栏更短。",
      },
      {
        en: "Standard-map building footprints get more contrast for legibility at neighbourhood zoom.",
        zh: "标准地图建筑轮廓提高对比度,街区级缩放更清晰。",
      },
    ],
  },
  {
    version: "v2.41.3",
    kind: "feat",
    title: {
      en: "Plane Hunter: live templates, a compass, and one-tap capture",
      zh: "拍机工作室:实时套模板 + 罗盘指向 + 一键拍照分享",
    },
    summary: {
      en: "Plane Hunter is now one screen. The overlay template renders live on the viewfinder as you frame — pick a preset and the shot updates instantly — so what you see is exactly what you save. The top of the frame became a compass ribbon: a heading tape with degree ticks, cardinals, and an aircraft marker driven by the device compass and the plane's bearing, so you can see whether to pan left or right; it reads out the offset (e.g. L 15°) and turns green and snaps to centre once you're aligned. The shutter freezes the shot straight to a Retake / Share pair (no settings step), the template presets collapse to a single tap-to-cycle button, and the whole flow works in portrait and landscape. The two templates were redesigned around our own data: a boarding-pass Card (callsign hero, flight data, an orange aircraft-type block bled into the corner) and a departure-board Brief (a single flush-bottom strip), both in Manrope with the design-system signal-orange accent.",
      zh: "拍机工作室合并成一屏。取景时模板就实时渲染在画面上——切预设即时更新——所见即所得。顶部变成一条罗盘带:带刻度、东西南北和飞机 marker 的航向尺,由设备指南针 + 你到飞机的方位角驱动,告诉你该往左还是往右转;它读出偏移角(如 L 15°),对准时变绿并归中。快门把画面冻结后直接进重拍/分享(没有设置步骤),模板预设收成一个点按循环的按钮,整套流程横竖屏都支持。两个模板按我们自己的数据重做:登机牌式 Card(航班号主体 + 飞航数据 + 贴角的橙色机型块)和离港牌式 Brief(贴底单条),都用 Manrope 字体 + 设计系统的信号橙主色。",
    },
    highlights: [
      {
        en: "Live template overlay on the viewfinder — the framing you see is the framing you save; capture composites the exact capture area and shares it.",
        zh: "取景器上实时套模板——看到的就是保存的;拍照合成的正是取景区并直接分享。",
      },
      {
        en: "Compass ribbon up top: heading tape + degree readout + aircraft marker that points you left/right and turns green when the plane is centred.",
        zh: "顶部罗盘带:航向尺 + 度数读数 + 飞机 marker,指引你左右,飞机居中时变绿。",
      },
      {
        en: "Shutter → Retake / Share, a single tap-to-cycle template button, and full portrait + landscape support.",
        zh: "快门 → 重拍/分享,单个点按循环的模板按钮,横竖屏完整支持。",
      },
      {
        en: "Redesigned Card (boarding-pass) and Brief (departure-board) templates in Manrope with the design-system orange accent; legacy settings/compose UI removed.",
        zh: "重做的 Card(登机牌)与 Brief(离港牌)模板,Manrope 字体 + 设计系统橙色;移除了旧的设置/编辑界面。",
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
