import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const stylePath = fileURLToPath(new URL("../../style.css", import.meta.url));
const uiFiles = [
  "Toolbar.tsx",
  "MetricCard.tsx",
  "FilterCard.tsx",
  "MenuPanel.tsx",
  "select.tsx",
  "button.tsx",
];

const styleSource = readFileSync(stylePath, "utf8");
const uiSource = uiFiles
  .map((file) => readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8"))
  .join("\n");

for (const token of [
  "--atc-control-surface",
  "--atc-control-surface-muted",
  "--atc-control-hover-bg",
  "--atc-control-active-shadow",
  "--atc-menu-panel-shadow",
  "--atc-toolbar-cell-size",
  "--atc-toolbar-shell-min-height",
]) {
  assert.match(styleSource, new RegExp(`${token}:`), `${token} should be defined in the global design-token layer`);
  assert.match(uiSource, new RegExp(`var\\(${token}\\)`), `${token} should be consumed by shared UI primitives`);
}

for (const overTokenizedPrefix of [
  "--atc-motion-",
  "--atc-menu-row-",
  "--atc-menu-count-",
  "--atc-metric-",
  "--atc-filter-",
]) {
  assert.equal(
    styleSource.includes(overTokenizedPrefix),
    false,
    `${overTokenizedPrefix} tokens duplicate Tailwind's default scale and should stay as utilities`,
  );
}

for (const repeatedLiteral of [
  "color-mix(in_oklab,var(--atc-elev)_55%,transparent)",
  "color-mix(in_oklab,var(--atc-elev)_72%,transparent)",
  "color-mix(in_oklab,var(--atc-click-fg)_7%,transparent)",
  "color-mix(in_oklab,var(--atc-bg)_60%,transparent)",
  "min-h-[42px]",
]) {
  assert.equal(
    uiSource.includes(repeatedLiteral),
    false,
    `${repeatedLiteral} should be expressed through a shared design token in UI primitives`,
  );
}

for (const migratedGlobalClass of [".map-action-drawer", ".map-source-status"]) {
  assert.equal(
    styleSource.includes(migratedGlobalClass),
    false,
    `${migratedGlobalClass} is owned by Tailwind classes in its component, not global CSS`,
  );
}

console.log("designTokens.test.ts ok");
