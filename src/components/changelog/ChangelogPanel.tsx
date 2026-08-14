import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CircleDot } from "lucide-react";
import { useI18n } from "@/features/app-shell/i18n/useI18n";
import {
  CHANGELOG_PAGE_SIZE,
  CHANGELOG_RECENT,
  CHANGELOG_TOTAL_COUNT,
  loadChangelogHistory,
  resolveChangelogText,
  type ChangelogEntry as ProductChangelogEntry,
  type ChangelogLocalizedReleaseCopy,
} from "@/config/changelog";

// Sidebar-scoped changelog. Reuses DitherPageShell so the page reads as
// a sibling of Home and About: same brand block, same footer, same
// dither background. Each release is a compact rail row: version/status on the
// left, release copy on one stable content axis.

export default function ChangelogPanel() {
  const { locale, t } = useI18n();
  const [historyReleases, setHistoryReleases] = useState<
    ProductChangelogEntry[]
  >([]);
  const [historyReleaseCopy, setHistoryReleaseCopy] = useState<
    Record<string, ChangelogLocalizedReleaseCopy>
  >({});
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CHANGELOG_RECENT.length);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const historyRequestRef = useRef<Promise<unknown> | null>(null);
  const visibleReleases = [...CHANGELOG_RECENT, ...historyReleases].slice(
    0,
    visibleCount,
  );
  const hasMoreReleases = visibleCount < CHANGELOG_TOTAL_COUNT;

  const loadNextPage = useCallback(() => {
    const loadedCount = CHANGELOG_RECENT.length + historyReleases.length;
    if (visibleCount < loadedCount) {
      setVisibleCount((current) =>
        Math.min(
          current + CHANGELOG_PAGE_SIZE,
          loadedCount,
          CHANGELOG_TOTAL_COUNT,
        ),
      );
      return;
    }

    if (
      historyLoadFailed ||
      historyReleases.length > 0 ||
      historyRequestRef.current
    ) {
      return;
    }

    const request = loadChangelogHistory()
      .then((history) => {
        setHistoryReleases(history.releases);
        setHistoryReleaseCopy(history.localizedReleaseCopy);
        setVisibleCount((current) =>
          Math.min(
            current + CHANGELOG_PAGE_SIZE,
            CHANGELOG_RECENT.length + history.releases.length,
            CHANGELOG_TOTAL_COUNT,
          ),
        );
      })
      .catch(() => {
        setHistoryLoadFailed(true);
      })
      .finally(() => {
        historyRequestRef.current = null;
      });

    historyRequestRef.current = request;
  }, [historyLoadFailed, historyReleases.length, visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMoreReleases) return;

    if (typeof IntersectionObserver === "undefined") {
      loadNextPage();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadNextPage();
      },
      { root: null, rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreReleases, loadNextPage]);

  return (
    <div className="changelog-wayfinding flex flex-none flex-col pb-5">
      <ol className="dither-list flex flex-none flex-col">
        {visibleReleases.map((release, index) => (
          <ChangelogEntry
            key={release.version}
            release={release}
            locale={locale}
            isLatest={index === 0}
            motionOrder={Math.min(index, 7)}
            localizedCopy={historyReleaseCopy[release.version]}
          />
        ))}
        {hasMoreReleases ? (
          <li ref={sentinelRef} aria-hidden="true" className="h-px" />
        ) : null}
      </ol>
    </div>
  );
}

function ChangelogEntry({
  release,
  isLatest,
  locale,
  localizedCopy,
  motionOrder,
}: {
  release: ProductChangelogEntry;
  isLatest: boolean;
  locale: string;
  localizedCopy?: ChangelogLocalizedReleaseCopy;
  motionOrder: number;
}) {
  const { t } = useI18n();
  const localizedRelease = locale === "zh-CN" ? localizedCopy : null;
  const title =
    localizedRelease?.title || resolveChangelogText(release.title, locale);
  const summary =
    localizedRelease?.summary || resolveChangelogText(release.summary, locale);
  const highlights =
    localizedRelease?.highlights ||
    release.highlights.map((item) => resolveChangelogText(item, locale));
  return (
    <li
      className="changelog-entry"
      data-current={isLatest ? "true" : undefined}
    >
      <div
        data-motion-kind="status"
        data-motion-rail="true"
        className="changelog-entry__rail"
        style={{
          "--rail-motion-delay": `${46 + motionOrder * 18}ms`,
        } as CSSProperties}
      >
        <CircleDot className="wayfinding-rail-glyph" aria-hidden="true" />
      </div>
      <div className="changelog-entry__body">
        <div className="changelog-entry__meta">
          <span className="changelog-entry__version">{release.version}</span>
          {release.kind ? <span>{release.kind.toUpperCase()}</span> : null}
          {isLatest ? <span>{t("changelog.current")}</span> : null}
        </div>
        {title ? (
          <p className="changelog-entry__title">
            {title}
          </p>
        ) : null}
        {summary ? (
          <p className="changelog-entry__summary">
            {summary}
          </p>
        ) : null}
        {Array.isArray(highlights) && highlights.length > 0 ? (
          <ul className="changelog-entry__highlights">
            {highlights.map((item, index) => (
              <li key={index}>
                <span
                  aria-hidden="true"
                  className="changelog-entry__highlight-index"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
