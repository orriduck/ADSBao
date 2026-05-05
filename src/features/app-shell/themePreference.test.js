import assert from "node:assert/strict";

import {
  getThemeIconKey,
  getThemeTitle,
} from "./themePreference.js";
import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
} from "../../utils/theme.js";

assert.equal(getThemeTitle(THEME_LIGHT), "Theme: Light (click to switch)");
assert.equal(getThemeTitle(THEME_DARK), "Theme: Dark (click to switch)");
assert.equal(getThemeTitle(THEME_SYSTEM), "Theme: System (click to switch)");
assert.equal(getThemeTitle("invalid"), "Theme: System (click to switch)");

assert.equal(getThemeIconKey(THEME_LIGHT), "sun");
assert.equal(getThemeIconKey(THEME_DARK), "moon");
assert.equal(getThemeIconKey(THEME_SYSTEM), "monitor");
assert.equal(getThemeIconKey("invalid"), "monitor");
