"use client";

export default function PanelHeading({
  kicker,
  title,
  action = null,
  pill = null,
  className = "",
}) {
  return (
    <div className={["panel-heading", className].filter(Boolean).join(" ")}>
      <div>
        <div className="panel-kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
      {pill ? <span className="panel-pill">{pill}</span> : action}
    </div>
  );
}
