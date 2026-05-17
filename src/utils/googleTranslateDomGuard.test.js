import assert from "node:assert/strict";
import { isGoogleTranslateDomNotFoundError } from "./googleTranslateDomGuard.js";

const notFound = new DOMException(
  "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
  "NotFoundError",
);

assert.equal(isGoogleTranslateDomNotFoundError(notFound), true);
assert.equal(isGoogleTranslateDomNotFoundError(new DOMException("boom", "NotFoundError")), false);
assert.equal(isGoogleTranslateDomNotFoundError(new Error("not a child of this node")), false);
