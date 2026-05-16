"use client";

import { Bug, MapPinned, Tags } from "lucide-react";
import { buildProcedureInspectorViewModel } from "./procedureInspectorModel.js";

const toggleClass = (active) =>
  `procedure-inspector-toggle${active ? " procedure-inspector-toggle--active" : ""}`;

export default function ProcedureInspectorControls({
  runwayProcedures,
  selectedRunway = "",
  selectedProcedureCode = "",
  showTransitions = false,
  showMissed = false,
  showFixLabels = false,
  allProceduresDebug = false,
  onSelectRunway,
  onSelectProcedure,
  onToggleTransitions,
  onToggleMissed,
  onToggleFixLabels,
  onToggleAllProceduresDebug,
}) {
  const viewModel = buildProcedureInspectorViewModel(runwayProcedures, {
    selectedRunway,
    selectedProcedureCode,
  });

  if (!viewModel.runwayChoices.length) return null;

  const showProcedurePicker =
    viewModel.selectedRunway && viewModel.procedureChoices.length > 1;

  return (
    <section
      className="procedure-inspector"
      aria-label="Runway procedure inspector"
    >
      <div className="procedure-inspector-header">
        <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
        <span>RUNWAYS</span>
      </div>

      <div className="procedure-inspector-runways" aria-label="Runway directions">
        {viewModel.runwayChoices.map((choice) => {
          const active = choice.runway === viewModel.selectedRunway;
          return (
            <button
              key={choice.runway}
              type="button"
              className={`procedure-inspector-runway${active ? " procedure-inspector-runway--active" : ""}`}
              aria-pressed={active}
              onClick={() => onSelectRunway?.(choice.runway)}
            >
              <span>{choice.runway}</span>
              <small>{choice.approachCount}</small>
            </button>
          );
        })}
      </div>

      {showProcedurePicker && (
        <label className="procedure-inspector-select-wrap">
          <span>
            <Tags className="h-3.5 w-3.5" aria-hidden="true" />
            PROC
          </span>
          <select
            className="procedure-inspector-select"
            value={viewModel.selectedProcedureCode}
            onChange={(event) => onSelectProcedure?.(event.target.value)}
          >
            {viewModel.procedureChoices.map((procedure) => (
              <option key={procedure.procedureCode} value={procedure.procedureCode}>
                {procedure.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="procedure-inspector-toggles" aria-label="Procedure overlays">
        <button
          type="button"
          className={toggleClass(showTransitions)}
          aria-pressed={showTransitions}
          onClick={onToggleTransitions}
        >
          TRANS
        </button>
        <button
          type="button"
          className={toggleClass(showMissed)}
          aria-pressed={showMissed}
          onClick={onToggleMissed}
        >
          MISSED
        </button>
        <button
          type="button"
          className={toggleClass(showFixLabels)}
          aria-pressed={showFixLabels}
          onClick={onToggleFixLabels}
        >
          FIX
        </button>
        <button
          type="button"
          className={toggleClass(allProceduresDebug)}
          aria-pressed={allProceduresDebug}
          onClick={onToggleAllProceduresDebug}
        >
          <Bug className="h-3 w-3" aria-hidden="true" />
          ALL
        </button>
      </div>
    </section>
  );
}
