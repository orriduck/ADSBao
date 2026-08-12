type SidebarLoadingSkeletonProps = {
  variant?: "airport" | "flight";
  section?: "header" | "content";
};

function Placeholder({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`sidebar-loading-skeleton__bar ${className}`}
    />
  );
}

function Rail({ tone = "neutral" }: { tone?: "neutral" | "primary" | "secondary" }) {
  return (
    <span className="sidebar-loading-skeleton__rail" data-tone={tone}>
      <Placeholder className="sidebar-loading-skeleton__icon" />
    </span>
  );
}

function MetricPlaceholder({ wide = false }: { wide?: boolean }) {
  return (
    <div className="sidebar-loading-skeleton__metric">
      <Rail />
      <span className="sidebar-loading-skeleton__metric-copy">
        <Placeholder className={wide ? "w-16" : "w-11"} />
        <Placeholder className={wide ? "h-5 w-20" : "h-5 w-12"} />
      </span>
    </div>
  );
}

export function SidebarLoadingHeader({
  variant = "airport",
}: Omit<SidebarLoadingSkeletonProps, "section">) {
  return (
    <div
      aria-hidden="true"
      className="sidebar-loading-skeleton sidebar-loading-skeleton--header"
      data-variant={variant}
    >
      <div className="sidebar-loading-skeleton__identity">
        <Rail tone="primary" />
        <span className="sidebar-loading-skeleton__identity-copy">
          <Placeholder className={variant === "flight" ? "h-6 w-24" : "h-6 w-32"} />
          <Placeholder className="w-44" />
          <Placeholder className="w-36" />
        </span>
      </div>

      <div className="sidebar-loading-skeleton__metrics">
        <MetricPlaceholder />
        <MetricPlaceholder wide />
        <MetricPlaceholder wide />
        <MetricPlaceholder />
      </div>

      <div className="sidebar-loading-skeleton__secondary-row">
        <Rail tone="secondary" />
        <span className="sidebar-loading-skeleton__secondary-copy">
          <Placeholder className="w-24" />
          <Placeholder className="ml-auto w-16" />
        </span>
      </div>
    </div>
  );
}

function FilterPlaceholder({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="sidebar-loading-skeleton__filter">
      <Rail />
      <span className="sidebar-loading-skeleton__filter-copy">
        <Placeholder className="w-10" />
        <Placeholder className={`h-4 ${valueWidth}`} />
      </span>
    </div>
  );
}

export function SidebarLoadingContent() {
  return (
    <div
      aria-hidden="true"
      className="sidebar-loading-skeleton sidebar-loading-skeleton--content"
    >
      <div className="sidebar-loading-skeleton__section-head">
        <Placeholder className="w-12" />
        <Placeholder className="ml-auto w-14" />
      </div>

      <div className="sidebar-loading-skeleton__search">
        <Rail />
        <span className="sidebar-loading-skeleton__search-copy">
          <Placeholder className="w-40" />
        </span>
      </div>

      <div className="sidebar-loading-skeleton__filters">
        <FilterPlaceholder valueWidth="w-14" />
        <FilterPlaceholder valueWidth="w-10" />
        <FilterPlaceholder valueWidth="w-12" />
        <FilterPlaceholder valueWidth="w-16" />
      </div>

      <div className="sidebar-loading-skeleton__rows">
        {Array.from({ length: 9 }, (_, index) => (
          <div className="sidebar-loading-skeleton__row" key={index}>
            <Rail />
            <span className="sidebar-loading-skeleton__row-copy">
              <Placeholder className={index % 3 === 0 ? "w-16" : "w-20"} />
              <Placeholder className="ml-auto w-10" />
              <Placeholder className="w-11" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SidebarLoadingSkeleton({
  variant = "airport",
  section,
}: SidebarLoadingSkeletonProps) {
  if (section === "header") return <SidebarLoadingHeader variant={variant} />;
  if (section === "content") return <SidebarLoadingContent />;
  return (
    <>
      <SidebarLoadingHeader variant={variant} />
      <SidebarLoadingContent />
    </>
  );
}
