"use client";

export default function PanelHeading({
  kicker,
  title,
  action = null,
  pill = null,
  className = "",
}) {
  return (
    <div
      className={[
        "relative flex items-start justify-between gap-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        <div className="text-[10px] uppercase text-atc-faint">{kicker}</div>
        <h2 className="mt-1 mb-0 text-[16px] font-extrabold leading-tight text-atc-text">
          {title}
        </h2>
      </div>
      {pill ? (
        <span className="shrink-0 rounded-full border border-atc-line-strong px-[9px] py-[5px] text-[10px] text-atc-dim">
          {pill}
        </span>
      ) : (
        action
      )}
    </div>
  );
}
