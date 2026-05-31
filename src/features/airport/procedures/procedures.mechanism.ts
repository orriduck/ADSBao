import {
  buildLiveAirportProcedurePayload,
  buildLiveAirportRunwayProcedurePayload,
} from "./procedureSourceClient";

import { ProcedureNotFoundError } from "./procedures.models";

export async function getAirportProcedures({ icao }: Record<string, any> = {}) {
  const payload = await buildLiveAirportProcedurePayload({ airport: icao });

  if (!payload.index.approaches.length) {
    throw new ProcedureNotFoundError(`No FAA CIFP airport data found for ${icao}`);
  }

  return payload;
}

export async function getAirportRunwayProcedures({ icao }: Record<string, any> = {}) {
  const payload = await buildLiveAirportRunwayProcedurePayload({ airport: icao });

  if (!payload.runwayDirections.length) {
    throw new ProcedureNotFoundError(
      `No FAA CIFP runway procedures found for ${icao}`,
    );
  }

  return payload;
}
