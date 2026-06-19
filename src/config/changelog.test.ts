import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ADSBAO_LATEST_CHANGELOG_VERSION,
  CHANGELOG_INITIAL_LIMIT,
  CHANGELOG_RECENT,
  CHANGELOG_TOTAL_COUNT,
} from "./changelog";
import { CHANGELOG_HISTORY } from "./changelogHistory";

const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version?: string };
const allVersions = [
  ...CHANGELOG_RECENT.map((release) => release.version),
  ...CHANGELOG_HISTORY.map((release) => release.version),
];

assert.equal(CHANGELOG_RECENT.length, CHANGELOG_INITIAL_LIMIT);
assert.equal(CHANGELOG_RECENT[0]?.version, `v${packageJson.version}`);
assert.equal(ADSBAO_LATEST_CHANGELOG_VERSION, CHANGELOG_RECENT[0]?.version);
assert.equal(allVersions.length, CHANGELOG_TOTAL_COUNT);
assert.equal(new Set(allVersions).size, CHANGELOG_TOTAL_COUNT);
