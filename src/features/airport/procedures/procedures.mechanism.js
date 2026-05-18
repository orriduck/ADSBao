import {
  buildLiveAirportProcedurePayload,
  buildLiveAirportRunwayProcedurePayload,
} from "./procedureSourceClient.js";

import { ProcedureNotFoundError } from "./procedures.models.js";

export async function getAirportProcedures({ icao } = {}) {
  const payload = await buildLiveAirportProcedurePayload({ airport: icao });

  if (!payload.index.approaches.length) {
    throw new ProcedureNotFoundError(`No FAA CIFP airport data found for ${icao}`);
  }

  return payload;
}

export async function getAirportRunwayProcedures({ icao } = {}) {
  const payload = await buildLiveAirportRunwayProcedurePayload({ airport: icao });

  if (!payload.runwayDirections.length) {
    throw new ProcedureNotFoundError(
      `No FAA CIFP runway procedures found for ${icao}`,
    );
  }

  return payload;
}
