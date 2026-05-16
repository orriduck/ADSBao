import { promises as fs } from "node:fs";
import { join } from "node:path";

import { isKnownAircraftIconName } from "../../../utils/aircraftIcon.js";

import {
  AIRCRAFT_ICON_FALLBACK_NAME,
  AIRCRAFT_ICON_FALLBACK_SVG,
  AIRCRAFT_ICON_MAX_BYTES,
} from "./aircraftIcons.models.js";
import { AIRCRAFT_ICON_DIR } from "./aircraftIcons.utils.js";

const readIconFile = async (name) => {
  try {
    const buffer = await fs.readFile(join(AIRCRAFT_ICON_DIR, `${name}.svg`));
    if (buffer.byteLength > AIRCRAFT_ICON_MAX_BYTES) return null;
    return buffer;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

export const getAircraftIcon = async ({ name } = {}) => {
  const requested = isKnownAircraftIconName(name) ? name : null;
  let body = requested ? await readIconFile(requested) : null;
  let servedName = requested;

  if (!body) {
    body = await readIconFile(AIRCRAFT_ICON_FALLBACK_NAME);
    servedName = AIRCRAFT_ICON_FALLBACK_NAME;
  }

  if (!body) {
    body = AIRCRAFT_ICON_FALLBACK_SVG;
    servedName = "inline-arrow";
  }

  return {
    body,
    servedName,
    requested: requested || "",
  };
};
