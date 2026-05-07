"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMapInstance } from "./MapContext.js";
import {
  buildRunwayApproachBeamCollection,
  buildRunwayCenterlineCollection,
  buildRunwayEndLabels,
} from "../../features/airport-map/runwayAnnotationModel.js";

const RUNWAY_LINE_STYLES = {
  dark: {
    color: "#8fb7d6",
    weight: 2,
    opacity: 0.82,
  },
  light: {
    color: "#244164",
    weight: 2,
    opacity: 0.76,
  },
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const runwayLineStyle = (theme) => RUNWAY_LINE_STYLES[theme] || RUNWAY_LINE_STYLES.dark;

const runwayBeamColor = (theme) => (theme === "light" ? "#8b6f47" : "#d8bd83");

const SVG_NS = "http://www.w3.org/2000/svg";

let runwayBeamGradientSequence = 0;

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

const createRunwayBeamGradientController = ({ map, beamLayer, theme }) => {
  const svg = map.getPanes().overlayPane.querySelector("svg");
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

    appendGradientStop(gradient, "0%", color, Math.min(beamOpacity, 0.42));
    appendGradientStop(gradient, "34%", color, beamOpacity * 0.7);
    appendGradientStop(gradient, "72%", color, beamOpacity * 0.2);
    appendGradientStop(gradient, "100%", color, 0);
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
};

const runwayLabelIcon = (ident, theme) =>
  L.divIcon({
    className: `runway-end-label runway-end-label--${theme}`,
    html: `<span>${escapeHtml(ident)}</span>`,
    iconSize: [34, 18],
    iconAnchor: [17, 9],
  });

export default function RunwayAnnotationLayer({
  runwayMap,
  theme = "dark",
  zoom,
}) {
  const map = useMapInstance();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !runwayMap?.runways?.length) return undefined;

    const beams = buildRunwayApproachBeamCollection(runwayMap, { zoom });
    const centerlines = buildRunwayCenterlineCollection(runwayMap);
    const labels = buildRunwayEndLabels(runwayMap, { zoom });
    if (!beams.features.length && !centerlines.features.length && !labels.length) {
      return undefined;
    }

    const beamLayer = L.geoJSON(beams, {
      interactive: false,
      style() {
        return {
          className: "runway-approach-beam",
          fill: true,
          fillColor: runwayBeamColor(theme),
          fillOpacity: 1,
          opacity: 0,
          stroke: false,
        };
      },
    });
    const lineLayer = L.geoJSON(centerlines, {
      interactive: false,
      style() {
        return {
          ...runwayLineStyle(theme),
          lineCap: "butt",
          lineJoin: "round",
        };
      },
    });
    const labelLayer = L.layerGroup(
      labels.map((label) =>
        L.marker([label.lat, label.lon], {
          interactive: false,
          keyboard: false,
          icon: runwayLabelIcon(label.ident, theme),
          zIndexOffset: 460,
        }),
      ),
    );
    const layer = L.layerGroup([beamLayer, lineLayer, labelLayer]).addTo(map);
    const removeGradients = createRunwayBeamGradientController({
      map,
      beamLayer,
      theme,
    });
    layerRef.current = layer;

    return () => {
      removeGradients();
      layer.remove();
      layerRef.current = null;
    };
  }, [map, runwayMap, theme, zoom]);

  return null;
}
