import { Profiler, type ReactNode } from "react";
import { recordCommit } from "@/features/devtools/perfProbe";

// In dev, always wrap in a Profiler so the probe can be toggled at runtime
// (window.__adsbaoPerf.enable()) without remounting the subtree — recordCommit
// is a no-op until the probe is enabled, so an idle Profiler is the only cost.
// In production the whole branch is statically dropped (import.meta.env.DEV).
export function PerfBoundary({ id, children }: { id: string; children: ReactNode }) {
  if (!import.meta.env.DEV) return <>{children}</>;
  return (
    <Profiler id={id} onRender={(profilerId, _phase, actualDuration) => recordCommit(profilerId, actualDuration)}>
      {children}
    </Profiler>
  );
}
