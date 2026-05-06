export const DEFAULT_PROCEDURE_PHASES = ["final", "runway"];

const normalizePhases = (visiblePhases) => {
  const phases = Array.isArray(visiblePhases)
    ? visiblePhases.filter(Boolean)
    : DEFAULT_PROCEDURE_PHASES;
  return new Set(phases.length ? phases : DEFAULT_PROCEDURE_PHASES);
};

const cloneTransition = (transition, phases) => {
  if (!phases.has("transition")) return null;
  const legs = transition.legs || [];
  return legs.length ? { ...transition, legs } : null;
};

const cloneApproachForPhases = (approach, phases) => ({
  ...approach,
  transitions: (approach.transitions || [])
    .map((transition) => cloneTransition(transition, phases))
    .filter(Boolean),
  final: (approach.final || []).filter((leg) =>
    phases.has(leg.phase || "final"),
  ),
  missed: phases.has("missed") ? approach.missed || [] : [],
});

export function buildRunwayProcedureChoices(runwayProcedures) {
  return (runwayProcedures?.runwayDirections || []).map((runwayDirection) => ({
    runway: runwayDirection.runway,
    runwayPair: runwayDirection.runwayPair,
    approachCount: runwayDirection.approaches?.length || 0,
  }));
}

export function buildProcedureChoiceLabel(procedure) {
  if (!procedure) return "";
  return procedure.procedureCode
    ? `${procedure.procedureCode} · ${procedure.name}`
    : procedure.name;
}

export function buildProcedureChoices(runwayProcedures, selectedRunway) {
  const runwayDirection = (runwayProcedures?.runwayDirections || []).find(
    (item) => item.runway === selectedRunway,
  );
  return (runwayDirection?.approaches || []).map((procedure) => ({
    id: procedure.id,
    procedureCode: procedure.procedureCode,
    name: procedure.name,
    label: buildProcedureChoiceLabel(procedure),
  }));
}

export function buildProcedureInspectorViewModel(runwayProcedures, state = {}) {
  const resolvedState = resolveProcedureInspectorState(runwayProcedures, state);
  return {
    ...resolvedState,
    runwayChoices: buildRunwayProcedureChoices(runwayProcedures),
    procedureChoices: buildProcedureChoices(
      runwayProcedures,
      resolvedState.selectedRunway,
    ),
  };
}

export function resolveProcedureInspectorState(runwayProcedures, state = {}) {
  const runwayDirection = (runwayProcedures?.runwayDirections || []).find(
    (item) => item.runway === state.selectedRunway,
  );
  if (!runwayDirection) {
    return {
      selectedRunway: "",
      selectedProcedureCode: "",
    };
  }

  const selectedProcedure =
    runwayDirection.approaches?.find(
      (approach) => approach.procedureCode === state.selectedProcedureCode,
    ) || runwayDirection.approaches?.[0];

  return {
    selectedRunway: runwayDirection.runway,
    selectedProcedureCode: selectedProcedure?.procedureCode || "",
  };
}

export function buildVisibleProcedurePayload(runwayProcedures, state = {}) {
  const phases = normalizePhases(state.visiblePhases);
  const basePayload = {
    airport: runwayProcedures?.airport || "",
    source: runwayProcedures?.source || "FAA CIFP",
    cycle: runwayProcedures?.cycle || "",
    runwayDirections: [],
  };

  if (!runwayProcedures?.runwayDirections?.length) return basePayload;

  if (state.allProceduresDebug) {
    return {
      ...basePayload,
      runwayDirections: runwayProcedures.runwayDirections
        .map((runwayDirection) => ({
          ...runwayDirection,
          approaches: (runwayDirection.approaches || []).map((approach) =>
            cloneApproachForPhases(approach, phases),
          ),
        }))
        .filter((runwayDirection) => runwayDirection.approaches.length > 0),
    };
  }

  const resolvedState = resolveProcedureInspectorState(runwayProcedures, state);
  if (!resolvedState.selectedRunway || !resolvedState.selectedProcedureCode) {
    return basePayload;
  }

  const runwayDirection = runwayProcedures.runwayDirections.find(
    (item) => item.runway === resolvedState.selectedRunway,
  );
  const approach = runwayDirection?.approaches?.find(
    (item) => item.procedureCode === resolvedState.selectedProcedureCode,
  );
  if (!runwayDirection || !approach) return basePayload;

  return {
    ...basePayload,
    runwayDirections: [
      {
        ...runwayDirection,
        approaches: [cloneApproachForPhases(approach, phases)],
      },
    ],
  };
}
