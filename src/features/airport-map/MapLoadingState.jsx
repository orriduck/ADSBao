"use client";

export default function MapLoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-atc-card">
      <div className="font-mono text-[11px] tracking-widest text-atc-faint">
        LOADING MAP...
      </div>
    </div>
  );
}
