import { THREE_OSM_ACCEPTANCE_MIN_DURATION_MS } from "./threeOsmAcceptanceModel";

export const THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS = 8_000;

export function canAssessThreeOsmAcceptanceThermal(elapsedMs: unknown) {
  const elapsed = Number(elapsedMs);
  return (
    Number.isFinite(elapsed) &&
    elapsed >= THREE_OSM_ACCEPTANCE_MIN_DURATION_MS
  );
}

export function resolveThreeOsmAcceptanceResetAction(input: {
  armedAtMs: number | null;
  nowMs: number;
}) {
  const armedAtMs = Number(input.armedAtMs);
  const nowMs = Number(input.nowMs);
  const elapsedSinceArm = nowMs - armedAtMs;
  const canConfirm =
    input.armedAtMs != null &&
    Number.isFinite(armedAtMs) &&
    Number.isFinite(nowMs) &&
    elapsedSinceArm >= 0 &&
    elapsedSinceArm <= THREE_OSM_ACCEPTANCE_RESET_CONFIRM_WINDOW_MS;

  return canConfirm
    ? ({ action: "reset", armedAtMs: null } as const)
    : ({ action: "arm", armedAtMs: nowMs } as const);
}
