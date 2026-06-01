import assert from "node:assert/strict";

import { resolveAirspacePreviewDisplay } from "./airspacePreviewDisplayModel";

{
  const display = resolveAirspacePreviewDisplay({
    name: "NORWOOD CLASS D",
    typeLabel: "Other",
    classLabel: "D",
    lowerLimitLabel: "SFC",
    upperLimitLabel: "2600 ft MSL",
    accessTag: { level: "controlled", label: "Controlled" },
  }, "zh-CN");

  assert.equal(display.type, "其他空域");
  assert.equal(display.access, "管制空域");
  assert.equal(display.classLabel, "D 类");
  assert.equal(display.lowerLimit, "地表");
  assert.equal(display.upperLimit, "海平面以上 2600 ft");
  assert.equal(display.vertical, "地表 - 海平面以上 2600 ft");
  assert.match(display.description, /D 类空域/);
  assert.match(display.description, /双向无线电通信/);
}

{
  const display = resolveAirspacePreviewDisplay({
    typeLabel: "Danger Area",
    classLabel: "Unclassified / SUA",
    lowerLimitLabel: "SFC",
    upperLimitLabel: "14500 ft MSL",
    accessTag: { level: "caution", label: "Caution" },
  }, "zh-CN");

  assert.equal(display.type, "危险区");
  assert.equal(display.access, "避让/谨慎进入");
  assert.equal(display.classLabel, "未分类 / 特殊用途空域");
  assert.match(display.description, /危险区/);
  assert.match(display.description, /民航通常应避让/);
}

{
  const display = resolveAirspacePreviewDisplay({
    typeLabel: "Restricted Area",
    classLabel: "Unclassified / SUA",
    lowerLimitLabel: "SFC",
    upperLimitLabel: "2500 ft MSL",
    accessTag: { level: "restricted", label: "Restricted" },
  }, "en");

  assert.equal(display.type, "Restricted Area");
  assert.equal(display.access, "Restricted");
  assert.equal(display.classLabel, "Unclassified / SUA");
  assert.match(display.description, /Restricted areas/);
}

console.log("airspacePreviewDisplayModel.test.ts ok");
