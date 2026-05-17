"use client";

// Two-column metric grid used at the top of every sidebar. Renders rows
// of stat-card cells (label, value, unit). The airport sidebar uses it
// as a tab strip (WEATHER / FLIGHTS, interactive); the flight sidebar
// uses it to display the focal aircraft's telemetry as static cells.
//
// Divider lines are applied automatically:
//   - Every "even" cell (the right column) gets a left border so the
//     vertical seam between the two columns is consistent.
//   - Cells past the first row get a top border so multi-row grids
//     still read as a panel of cards.

export function SidebarMetricGrid({ children, label = "Metrics" }) {
  return (
    <div className="sidebar-metric-grid" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function SidebarMetricCard({
  label,
  value,
  unit = "",
  active = false,
  onClick,
}) {
  const className = [
    "sidebar-metric-card",
    active ? "sidebar-metric-card--active" : "",
    onClick ? "sidebar-metric-card--interactive" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="sidebar-metric-card__label">{label}</span>
      <strong className="sidebar-metric-card__value airport-sidebar-display-mono airport-sidebar-display-mono--metric">
        {value}
      </strong>
      {unit ? (
        <small className="sidebar-metric-card__unit">{unit}</small>
      ) : (
        <small className="sidebar-metric-card__unit" aria-hidden="true">
          &nbsp;
        </small>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className={className}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
