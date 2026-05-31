import { join } from "node:path";
import process from "node:process";

export const AIRCRAFT_ICON_DIR = join(
  process.cwd(),
  "public",
  "icons",
  "aircraft",
);
