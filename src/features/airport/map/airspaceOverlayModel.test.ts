import assert from "node:assert/strict";

import {
  buildAirspaceOverlayAnimationPlan,
  buildAirspaceOverlayFeatures,
  resolveAirspaceInitialOpacity,
  resolveAirspaceInteriorPattern,
  resolveAirspaceOverlayFocusStyle,
  resolveAirspaceOverlayStyle,
} from "./airspaceOverlayModel";

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [100.7, 13.6],
      [100.9, 13.6],
      [100.9, 13.8],
      [100.7, 13.6],
    ],
  ],
};

{
  const features = buildAirspaceOverlayFeatures([
    {
      id: "danger-1",
      name: "VTD20 HUA HIN",
      typeLabel: "Danger Area",
      classLabel: "B",
      lowerLimitLabel: "SFC",
      upperLimitLabel: "11000 ft MSL",
      accessTag: { level: "caution", shortLabel: "Caution" },
      geometry: polygon,
    },
    {
      id: "missing-geometry",
      name: "No Geometry",
      accessTag: { level: "controlled", shortLabel: "Controlled" },
    },
  ]);

  assert.equal(features.length, 1);
  assert.equal(features[0].type, "Feature");
  assert.equal(features[0].properties.name, "VTD20 HUA HIN");
  assert.equal(features[0].properties.classLabel, "B");
  assert.equal(features[0].properties.accessLevel, "caution");
  assert.equal(features[0].properties.upperLimitLabel, "11000 ft MSL");
  assert.equal(features[0].properties.verticalLimit, "SFC - 11000 ft MSL");
}

{
  const largePolygon = {
    type: "Polygon",
    coordinates: [[
      [100, 13],
      [103, 13],
      [103, 16],
      [100, 13],
    ]],
  };
  const smallPolygon = {
    type: "Polygon",
    coordinates: [[
      [100.7, 13.6],
      [100.8, 13.6],
      [100.8, 13.7],
      [100.7, 13.6],
    ]],
  };
  const orderedFeatures = buildAirspaceOverlayFeatures([
    {
      id: "small",
      name: "Small Top Airspace",
      accessTag: { level: "controlled", shortLabel: "Controlled" },
      geometry: smallPolygon,
    },
    {
      id: "large",
      name: "Large Base Airspace",
      accessTag: { level: "controlled", shortLabel: "Controlled" },
      geometry: largePolygon,
    },
  ]);

  assert.equal(orderedFeatures[0].properties.id, "large");
  assert.equal(orderedFeatures[1].properties.id, "small");
}

{
  const enterPlan = buildAirspaceOverlayAnimationPlan([{}, {}, {}], "enter");
  assert.deepEqual(
    enterPlan.steps.map((step) => [step.index, step.delayMs]),
    [
      [0, 0],
      [1, 32],
      [2, 64],
    ],
  );
  assert.equal(enterPlan.itemDurationMs, 220);

  const exitPlan = buildAirspaceOverlayAnimationPlan([{}, {}, {}], "exit");
  assert.deepEqual(
    exitPlan.steps.map((step) => [step.index, step.delayMs]),
    [
      [2, 0],
      [1, 32],
      [0, 64],
    ],
  );

  const densePlan = buildAirspaceOverlayAnimationPlan(Array.from({ length: 80 }), "enter");
  assert.equal(Math.max(...densePlan.steps.map((step) => step.delayMs)), 420);
  assert.equal(densePlan.totalDurationMs, 640);

  const reducedPlan = buildAirspaceOverlayAnimationPlan([{}, {}], "enter", {
    reducedMotion: true,
  });
  assert.equal(reducedPlan.itemDurationMs, 0);
  assert.equal(reducedPlan.totalDurationMs, 0);
  assert.deepEqual(reducedPlan.steps.map((step) => step.delayMs), [0, 0]);
}

{
  assert.equal(
    resolveAirspaceInitialOpacity({ visible: true, animateInitialEnter: true }),
    0,
  );
  assert.equal(
    resolveAirspaceInitialOpacity({ visible: true, animateInitialEnter: false }),
    1,
  );
  assert.equal(
    resolveAirspaceInitialOpacity({ visible: false, animateInitialEnter: true }),
    0,
  );
}

{
  const cautionStyle = resolveAirspaceOverlayStyle({
    properties: { accessLevel: "caution" },
  });
  assert.equal(cautionStyle.color, "var(--airspace-destructive-stroke)");
  assert.equal(cautionStyle.fillColor, "var(--airspace-destructive-fill)");
  assert.equal(cautionStyle.fillOpacity, 0.32);
  assert.equal(cautionStyle.dashArray, undefined);

  const controlledStyle = resolveAirspaceOverlayStyle({
    properties: { accessLevel: "controlled" },
  });
  assert.equal(controlledStyle.color, "var(--airspace-controlled-stroke)");
  assert.equal(controlledStyle.fillColor, "var(--airspace-controlled-fill)");
  assert.equal(controlledStyle.dashArray, "1 6");
  const restrictedStyle = resolveAirspaceOverlayStyle({
    properties: { accessLevel: "restricted" },
  });
  assert.equal(restrictedStyle.dashArray, "1 5");

  const focusedControlledStyle = resolveAirspaceOverlayFocusStyle({
    properties: { accessLevel: "controlled" },
  });
  assert.equal(focusedControlledStyle.fillColor, "var(--airspace-controlled-focus-fill)");
  assert.equal(focusedControlledStyle.fillOpacity, 1);
  assert.equal(focusedControlledStyle.opacity, 1);
  assert.equal(focusedControlledStyle.weight, Number(controlledStyle.weight) + 0.8);
}

{
  const blockedPattern = resolveAirspaceInteriorPattern({
    properties: { accessLevel: "blocked" },
  });
  assert.deepEqual(blockedPattern, {
    enabled: true,
    color: "var(--airspace-blocked-stroke)",
    opacity: 0.7,
  });

  const restrictedPattern = resolveAirspaceInteriorPattern({
    properties: { accessLevel: "restricted" },
  });
  assert.deepEqual(restrictedPattern, {
    enabled: true,
    color: "var(--airspace-restricted-stroke)",
    opacity: 0.64,
  });

  assert.equal(
    resolveAirspaceInteriorPattern({
      properties: { accessLevel: "controlled" },
    }).enabled,
    false,
  );
}

console.log("airspaceOverlayModel.test.ts ok");
