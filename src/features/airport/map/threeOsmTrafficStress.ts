import { getAircraftIdentity } from "@/features/airport/context/airportContextUiModel";

export const THREE_OSM_AIRCRAFT_CAPACITY = 250;

export type ThreeOsmTrafficRenderSource = {
  aircraft: Record<string, any>;
  renderKey: string;
  selectionId: string;
  synthetic: boolean;
};

export function parseThreeOsmTrafficStressTarget(
  value: string | null | undefined,
) {
  return value === String(THREE_OSM_AIRCRAFT_CAPACITY)
    ? THREE_OSM_AIRCRAFT_CAPACITY
    : null;
}

function buildRealSources(aircraft: Array<Record<string, any>>) {
  return aircraft.slice(0, THREE_OSM_AIRCRAFT_CAPACITY).map((item, index) => ({
    aircraft: item,
    renderKey: `real:${getAircraftIdentity(item) || "anonymous"}:${index}`,
    selectionId: getAircraftIdentity(item),
    synthetic: false,
  }));
}

export function buildThreeOsmTrafficRenderSources(input: {
  aircraft: Array<Record<string, any>>;
  center: { lat: number; lon: number };
  stressTarget?: number | null;
}): ThreeOsmTrafficRenderSource[] {
  const realSources = buildRealSources(input.aircraft);
  if (
    input.stressTarget !== THREE_OSM_AIRCRAFT_CAPACITY ||
    realSources.length >= THREE_OSM_AIRCRAFT_CAPACITY
  ) {
    return realSources;
  }

  const cloneSources = realSources.filter((source) => source.selectionId);
  if (
    cloneSources.length === 0 ||
    !Number.isFinite(input.center.lat) ||
    !Number.isFinite(input.center.lon)
  ) {
    return realSources;
  }

  const result = [...realSources];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const cosLatitude = Math.max(
    0.2,
    Math.cos((input.center.lat * Math.PI) / 180),
  );
  while (result.length < THREE_OSM_AIRCRAFT_CAPACITY) {
    const cloneIndex = result.length - realSources.length;
    const source = cloneSources[cloneIndex % cloneSources.length];
    const progress = (cloneIndex + 1) /
      (THREE_OSM_AIRCRAFT_CAPACITY - realSources.length + 1);
    const radiusNm = 0.15 + Math.sqrt(progress) * 1.65;
    const angle = cloneIndex * goldenAngle;
    const lat = input.center.lat + (Math.sin(angle) * radiusNm) / 60;
    const lon = input.center.lon +
      (Math.cos(angle) * radiusNm) / (60 * cosLatitude);
    result.push({
      aircraft: {
        ...source.aircraft,
        lat,
        lon,
      },
      renderKey: `stress:${source.selectionId}:${cloneIndex}`,
      selectionId: source.selectionId,
      synthetic: true,
    });
  }
  return result;
}
