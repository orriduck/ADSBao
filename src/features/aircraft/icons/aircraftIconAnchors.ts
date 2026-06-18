import { isKnownAircraftIconName } from "@/utils/aircraftIcon";

type AircraftIconFamily =
  | "jet"
  | "propeller"
  | "rotorcraft"
  | "balloon"
  | "unknown";

type AircraftIconAnchorPoint = {
  x: number;
  y: number;
};

export type AircraftIconAnchorRecord = {
  family: AircraftIconFamily;
  anchors: Record<string, AircraftIconAnchorPoint>;
};

const ROTORCRAFT = new Set([
  "as32", "as65", "ec20", "ec35", "ec45", "gazl", "h47", "h60", "h64",
  "lynx", "mi24", "nh90", "r44", "s61", "uh1",
]);

const PROPELLER = new Set([
  "a400", "an12", "an26", "at45", "at75", "b190", "bn2p", "c130",
  "c160", "c172", "c208", "c295", "cn35", "d228", "d328", "da42",
  "dc3", "dh8c", "dh8d", "do27", "do28", "e300", "f406", "p1",
  "p180", "p28a", "p3", "pa46", "pc12", "pc6t", "pc9", "sc7",
  "sf25", "sf34", "st75",
]);

const point = (x: number, y: number): AircraftIconAnchorPoint => ({ x, y });

const poweredAnchors = {
  nose: point(0.5, 0.02),
  tail: point(0.5, 0.96),
  fuselageCenter: point(0.5, 0.52),
  belly: point(0.5, 0.78),
  leftWingTip: point(0.04, 0.52),
  rightWingTip: point(0.96, 0.52),
  noseUnderside: point(0.5, 0.16),
  tailLight: point(0.5, 0.96),
  antiCollisionBeacon: point(0.5, 0.5),
  contrailLeft: point(0.43, 0.98),
  contrailRight: point(0.57, 0.98),
  topBeacon: point(0.5, 0.22),
  bottomBeacon: point(0.5, 0.78),
  landingLight: point(0.5, 0.1),
  taxiLight: point(0.5, 0.06),
  logoLight: point(0.5, 0.92),
};

const RECORDS: Record<AircraftIconFamily, AircraftIconAnchorRecord> = {
  jet: {
    family: "jet",
    anchors: {
      ...poweredAnchors,
      leftEngine: point(0.35, 0.57),
      rightEngine: point(0.65, 0.57),
    },
  },
  propeller: {
    family: "propeller",
    anchors: {
      ...poweredAnchors,
      propeller: point(0.5, 0.03),
      leftEngine: point(0.35, 0.5),
      rightEngine: point(0.65, 0.5),
    },
  },
  rotorcraft: {
    family: "rotorcraft",
    anchors: {
      ...poweredAnchors,
      topBeacon: point(0.5, 0.18),
      rotorHub: point(0.5, 0.5),
      rotorLeftTip: point(0.08, 0.5),
      rotorRightTip: point(0.92, 0.5),
      tailRotor: point(0.5, 0.95),
    },
  },
  balloon: {
    family: "balloon",
    anchors: {
      envelopeCenter: point(0.5, 0.38),
      basketCenter: point(0.5, 0.88),
      antiCollisionBeacon: point(0.5, 0.84),
      bottomBeacon: point(0.5, 0.84),
    },
  },
  unknown: {
    family: "unknown",
    anchors: poweredAnchors,
  },
};

export function resolveAircraftIconAnchorRecord(
  iconName: unknown,
): AircraftIconAnchorRecord | null {
  const name = String(iconName || "").trim().toLowerCase();
  if (!isKnownAircraftIconName(name)) return null;
  if (ROTORCRAFT.has(name)) return RECORDS.rotorcraft;
  if (PROPELLER.has(name)) return RECORDS.propeller;
  if (name === "ball") return RECORDS.balloon;
  if (name === "unidentified") return RECORDS.unknown;
  return RECORDS.jet;
}
