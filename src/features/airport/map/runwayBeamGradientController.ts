import { RUNWAY_ANNOTATION_STYLE_CONFIG } from "../../../config/airportMap";

const SVG_NS = "http://www.w3.org/2000/svg";

let runwayBeamGradientSequence = 0;

const runwayBeamColor = (theme) =>
  RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors[theme] ||
  RUNWAY_ANNOTATION_STYLE_CONFIG.beamColors.dark;

const pointForCoordinate = (pathLayer, coordinate) => {
  const [lon, lat] = coordinate || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const point = pathLayer._map.latLngToLayerPoint([lat, lon]);
  const rendererOrigin = pathLayer._renderer?._bounds?.min;
  return rendererOrigin ? point.subtract(rendererOrigin) : point;
};

const pointFromPathPart = (pathLayer, index) => {
  const point = pathLayer._parts?.[0]?.[index];
  if (!point) return null;
  return {
    x: point.x,
    y: point.y,
  };
};

const centerPoint = (left, right) => {
  if (!left || !right) return null;
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };
};

const averagePoint = (points) => {
  const validPoints = (points || []).filter(
    (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y),
  );
  if (!validPoints.length) return null;

  return {
    x: validPoints.reduce((sum, point) => sum + point.x, 0) / validPoints.length,
    y: validPoints.reduce((sum, point) => sum + point.y, 0) / validPoints.length,
  };
};

const beamGradientPoints = (pathLayer, feature) => {
  const pathPoints = pathLayer._parts?.[0] || [];
  if (pathPoints.length >= 4) {
    return {
      start: centerPoint(pathPoints[0], pathPoints[1]),
      end: averagePoint(pathPoints.slice(2)),
    };
  }

  const gradientStart = pointForCoordinate(
    pathLayer,
    feature?.properties?.gradientStart,
  );
  const gradientEnd = pointForCoordinate(pathLayer, feature?.properties?.gradientEnd);
  if (gradientStart && gradientEnd) {
    return {
      start: gradientStart,
      end: gradientEnd,
    };
  }

  const ring = feature?.geometry?.coordinates?.[0] || [];
  return {
    start: centerPoint(
      pointFromPathPart(pathLayer, 0) || pointForCoordinate(pathLayer, ring[0]),
      pointFromPathPart(pathLayer, 1) || pointForCoordinate(pathLayer, ring[1]),
    ),
    end: centerPoint(
      pointFromPathPart(pathLayer, 2) || pointForCoordinate(pathLayer, ring[2]),
      pointFromPathPart(pathLayer, 3) || pointForCoordinate(pathLayer, ring[3]),
    ),
  };
};

const appendGradientStop = (gradient, offset, color, opacity) => {
  const stop = document.createElementNS(SVG_NS, "stop");
  stop.setAttribute("offset", offset);
  stop.setAttribute("stop-color", color);
  stop.setAttribute("stop-opacity", String(opacity));
  gradient.append(stop);
};

const appendBeamGradientStops = (gradient, color, beamOpacity) => {
  for (const stop of RUNWAY_ANNOTATION_STYLE_CONFIG.beamGradientStops) {
    appendGradientStop(
      gradient,
      stop.offset,
      color,
      Math.min(beamOpacity * stop.opacityScale, stop.maxOpacity ?? 1),
    );
  }
};

export function createRunwayBeamGradientController({ map, beamLayer, theme }) {
  // Prefer the beam layer's own renderer SVG so that gradient coordinates
  // are in the same coordinate space as the beam paths. The beam layer uses
  // a custom SVG renderer with extra padding; its SVG may not be the first
  // one returned by querySelector when multiple renderers share the pane.
  let svg = null;
  beamLayer.eachLayer((pathLayer) => {
    if (!svg) svg = pathLayer._renderer?._container ?? null;
  });
  if (!svg) svg = map.getPanes().overlayPane.querySelector("svg");
  if (!svg) return () => {};

  const defs = document.createElementNS(SVG_NS, "defs");
  defs.setAttribute("data-runway-beam-gradients", "");
  svg.prepend(defs);

  const color = runwayBeamColor(theme);
  const gradientPrefix = `runway-beam-gradient-${runwayBeamGradientSequence++}`;
  const gradientEntries = [];
  let rafId = 0;

  beamLayer.eachLayer((pathLayer) => {
    const element = pathLayer.getElement?.();
    const feature = pathLayer.feature;
    if (!element || !feature) return;

    const gradient = document.createElementNS(SVG_NS, "linearGradient");
    const gradientId = `${gradientPrefix}-${feature.properties?.runwayEnd || "end"}`;
    const beamOpacity = feature.properties?.beamOpacity ?? 0.08;
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
    appendBeamGradientStops(gradient, color, beamOpacity);
    defs.append(gradient);

    element.setAttribute("fill", `url(#${gradientId})`);
    element.setAttribute("fill-opacity", "1");
    gradientEntries.push({
      element,
      feature,
      gradient,
      gradientId,
      pathLayer,
    });
  });

  const updateGradients = () => {
    for (const entry of gradientEntries) {
      const { start, end } = beamGradientPoints(entry.pathLayer, entry.feature);
      if (!start || !end) continue;

      entry.gradient.setAttribute("x1", String(start.x));
      entry.gradient.setAttribute("y1", String(start.y));
      entry.gradient.setAttribute("x2", String(end.x));
      entry.gradient.setAttribute("y2", String(end.y));
      entry.element.setAttribute("fill", `url(#${entry.gradientId})`);
      entry.element.setAttribute("fill-opacity", "1");
    }
  };

  const scheduleUpdate = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateGradients();
      rafId = requestAnimationFrame(updateGradients);
    });
  };

  updateGradients();
  scheduleUpdate();
  map.on("moveend resize viewreset zoomend", scheduleUpdate);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    map.off("moveend resize viewreset zoomend", scheduleUpdate);
    defs.remove();
  };
}
