import { Profiler, type ReactNode } from "react";
import { perfProbeEnabled, recordCommit } from "@/features/devtools/perfProbe";

// Wraps a subtree in a React Profiler that reports commit cost to the dev perf
// probe — but ONLY when the probe is enabled (?perf=1). When off it returns the
// children untouched, so production and normal dev pay nothing.
export function PerfBoundary({ id, children }: { id: string; children: ReactNode }) {
  if (!perfProbeEnabled()) return <>{children}</>;
  return (
    <Profiler id={id} onRender={(profilerId, _phase, actualDuration) => recordCommit(profilerId, actualDuration)}>
      {children}
    </Profiler>
  );
}
