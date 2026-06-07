import assert from "node:assert/strict";

import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_SYSTEM,
} from "../../utils/theme";
import { getThemeIconKey } from "./themePreference";

assert.equal(getThemeIconKey(THEME_LIGHT), "sun");
assert.equal(getThemeIconKey(THEME_DARK), "moon");
assert.equal(getThemeIconKey(THEME_SYSTEM), "monitor");
assert.equal(getThemeIconKey("removed-theme"), "monitor");

console.log("theme preference tests passed");
