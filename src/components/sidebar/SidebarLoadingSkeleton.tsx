import WayfindingMetric from "@/components/ui/WayfindingMetric";

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

function Rail({ className = "" }: { className?: string }) {
  return (
    <span className={`sidebar-loading-skeleton__rail ${className}`.trim()}>
      <Placeholder className="sidebar-loading-skeleton__icon" />
    </span>
  );
}

function MetricPlaceholder({
  wide = false,
  compact = false,
}: {
  wide?: boolean;
  compact?: boolean;
}) {
  return (
    <WayfindingMetric
      title={<Placeholder className="sidebar-loading-skeleton__metric-label w-11" />}
      value={<Placeholder className={wide ? "sidebar-loading-skeleton__value w-20" : "sidebar-loading-skeleton__value w-12"} />}
      icon={<Placeholder className="sidebar-loading-skeleton__icon" />}
      className={compact ? "wayfinding-metric--compact" : ""}
      readOnly
    />
  );
}

export function SidebarLoadingHeader({
  variant = "airport",
}: Omit<SidebarLoadingSkeletonProps, "section">) {
  const isAirport = variant === "airport";
  const identityClassName = isAirport
    ? "airport-wayfinding-identity"
    : "flight-wayfinding-identity";
  const identityContentClassName = isAirport
    ? "airport-wayfinding-identity__content"
    : "flight-wayfinding-identity__content";

  return (
    <div
      aria-hidden="true"
      className="sidebar-loading-skeleton sidebar-loading-skeleton--header"
      data-variant={variant}
    >
      <div
        className={`sidebar-loading-skeleton__identity ${identityClassName}`}
      >
        <Rail className="wayfinding-rail" />
        <span
          className={`sidebar-loading-skeleton__identity-copy ${identityContentClassName}`}
        >
          <Placeholder className="sidebar-loading-skeleton__identity-code" />
          <Placeholder className="sidebar-loading-skeleton__identity-name" />
          <Placeholder className="sidebar-loading-skeleton__identity-meta" />
          <Placeholder className="sidebar-loading-skeleton__identity-detail" />
        </span>
      </div>

      <div className={isAirport ? "airport-wayfinding-summary" : "flight-wayfinding-summary"}>
        <div className={`${isAirport ? "wayfinding-metrics-grid" : "flight-wayfinding-metrics"} grid grid-cols-2`}>
          <MetricPlaceholder />
          <MetricPlaceholder wide />
          <MetricPlaceholder wide />
          <MetricPlaceholder />
        </div>
        {isAirport && (
          <div className="wayfinding-secondary-view-grid grid grid-cols-2">
            <MetricPlaceholder compact wide />
            <MetricPlaceholder compact />
          </div>
        )}
        <div className="sidebar-wayfinding-provider">
          <div className="provider-link-row">
            <span className="provider-link-row__content">
              <Placeholder className="w-24" />
              <Placeholder className="ml-auto w-16" />
            </span>
          </div>
        </div>
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

      <div className="sidebar-loading-skeleton__section-head aircraft-table-controls-header">
        <span aria-hidden="true" className="aircraft-table-controls-header__rail" />
        <span className="sidebar-loading-skeleton__section-head-copy aircraft-table-controls-header__content">
          <Placeholder className="w-12" />
          <Placeholder className="ml-auto w-14" />
        </span>
      </div>

      <LoadingRows />
    </div>
  );
}

function LoadingRows() {
  return (
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
  );
}

export function SidebarLoadingRows() {
  return (
    <div
      aria-hidden="true"
      className="sidebar-loading-skeleton sidebar-loading-skeleton--content"
    >
      <LoadingRows />
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
