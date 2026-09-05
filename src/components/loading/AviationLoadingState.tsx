import MatrixLoader from "./MatrixLoader";

type AviationLoadingStateProps = {
  ariaLabel: string;
  label?: string;
};

type AviationLoadingIndicatorProps = {
  label?: string;
};

export function AviationLoadingIndicator({
  label,
}: AviationLoadingIndicatorProps) {
  return (
    <div className="app-loading-indicator">
      <MatrixLoader className="matrix-loader--large" />
      {label ? (
        <div className="adsb-loading-overlay__label relative z-[1] flex items-center gap-2 px-6 text-center text-[12px] text-atc-dim">
          <span key={label} className="soft-status-reveal">{label}</span>
        </div>
      ) : null}
    </div>
  );
}

export function AviationLoadingState({ ariaLabel, label }: AviationLoadingStateProps) {
  return (
    <main
      className="relative flex min-h-dvh bg-atc-bg text-atc-text"
      role="status"
      aria-label={ariaLabel}
    >
      <div className="adsb-loading-overlay adsb-loading-overlay--flight">
        <AviationLoadingIndicator label={label} />
      </div>
    </main>
  );
}
