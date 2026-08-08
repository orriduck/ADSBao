import assert from "node:assert/strict";

import {
  resolveDocumentChromeColor,
  syncDocumentThemeColor,
} from "./documentThemeColor";

const meta = { content: "#000000" };
const documentRef = {
  documentElement: {},
  querySelector(selector: string) {
    return selector === 'meta[name="theme-color"]' ? meta : null;
  },
} as unknown as Document;
const getComputedStyleFn = (() => ({
  getPropertyValue(token: string) {
    return token === "--app-page-chrome-bg" ? "  rgb(28 28 30)  " : "";
  },
})) as unknown as typeof window.getComputedStyle;

assert.equal(
  resolveDocumentChromeColor({ documentRef, getComputedStyleFn }),
  "rgb(28 28 30)",
);
assert.equal(
  syncDocumentThemeColor({ documentRef, getComputedStyleFn }),
  "rgb(28 28 30)",
);
assert.equal(meta.content, "rgb(28 28 30)");

console.log("documentThemeColor.test.ts ok");
