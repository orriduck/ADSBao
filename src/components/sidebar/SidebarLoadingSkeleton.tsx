type SidebarLoadingSkeletonProps = {
  variant?: "airport" | "flight";
  section?: "header" | "content";
};

function Placeholder({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`sidebar-loading-skeleton__bar ${className}`} />;
}

export function SidebarLoadingHeader({
  variant = "airport",
}: Omit<SidebarLoadingSkeletonProps, "section">) {
  return (
    <div aria-hidden="true" className="sidebar-loading-skeleton sidebar-loading-skeleton--header">
      <div className="sidebar-loading-skeleton__identity">
        <Placeholder className="w-10" />
        <Placeholder className="mt-3 h-5 w-28" />
        <Placeholder className="mt-2 w-44" />
        <Placeholder className="mt-1 w-36" />
      </div>
      {variant === "flight" ? (
        <div className="sidebar-loading-skeleton__flight-metrics">
          <Placeholder className="h-14 w-full" />
          <div className="grid grid-cols-2 gap-px">
            <Placeholder className="h-12 w-full" />
            <Placeholder className="h-12 w-full" />
            <Placeholder className="h-12 w-full" />
            <Placeholder className="h-12 w-full" />
          </div>
        </div>
      ) : (
        <div className="sidebar-loading-skeleton__airport-metrics">
          <Placeholder className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-px">
            <Placeholder className="h-12 w-full" />
            <Placeholder className="h-12 w-full" />
            <Placeholder className="h-12 w-full" />
            <Placeholder className="h-12 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarLoadingContent() {
  return (
    <div aria-hidden="true" className="sidebar-loading-skeleton sidebar-loading-skeleton--content">
      <div className="sidebar-loading-skeleton__search">
        <Placeholder className="h-9 w-full" />
      </div>
      <div className="sidebar-loading-skeleton__filters grid grid-cols-2 gap-px">
        <Placeholder className="h-14 w-full" />
        <Placeholder className="h-14 w-full" />
        <Placeholder className="h-14 w-full" />
        <Placeholder className="h-14 w-full" />
      </div>
      <div className="sidebar-loading-skeleton__rows">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="sidebar-loading-skeleton__row" key={index}>
            <Placeholder className="h-3.5 w-3.5 rounded-[3px]" />
            <Placeholder className="h-3 w-[34%]" />
            <Placeholder className="ml-auto h-3 w-[22%]" />
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
