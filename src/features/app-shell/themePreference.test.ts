import assert from "node:assert/strict";

import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
} from "../../utils/theme";
import { getThemeIconKey, getThemeTitle } from "./themePreference";

assert.equal(getThemeTitle(THEME_LIGHT), "Theme: Light (click to switch)");
assert.equal(getThemeTitle(THEME_DARK), "Theme: Dark (click to switch)");
assert.equal(getThemeTitle(THEME_SYSTEM), "Theme: System (click to switch)");
assert.equal(getThemeTitle("sunrise"), "Theme: System (click to switch)");
assert.equal(getThemeTitle("sunset"), "Theme: System (click to switch)");

assert.equal(getThemeIconKey(THEME_LIGHT), "sun");
assert.equal(getThemeIconKey(THEME_DARK), "moon");
assert.equal(getThemeIconKey(THEME_SYSTEM), "monitor");
assert.equal(getThemeIconKey("sunrise"), "monitor");
assert.equal(getThemeIconKey("sunset"), "monitor");

console.log("theme preference tests passed");
