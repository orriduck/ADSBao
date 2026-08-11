import assert from "node:assert/strict";
import {
  shouldResetNearMeRefreshContent,
  shouldShowNearMeSidebarLoading,
} from "./nearMeRefreshModel";

assert.equal(
  shouldResetNearMeRefreshContent({
    preservePrevious: true,
    hasSettledContent: true,
  }),
  false,
);

assert.equal(
  shouldResetNearMeRefreshContent({
    preservePrevious: true,
    hasSettledContent: false,
  }),
  true,
);

assert.equal(
  shouldShowNearMeSidebarLoading({
    nearMe: true,
    hasHydratedSidebar: true,
    shellLoading: true,
  }),
  false,
);

assert.equal(
  shouldShowNearMeSidebarLoading({
    nearMe: true,
    hasHydratedSidebar: false,
    shellLoading: true,
  }),
  true,
);

assert.equal(
  shouldShowNearMeSidebarLoading({
    nearMe: false,
    hasHydratedSidebar: true,
    shellLoading: true,
  }),
  true,
);

assert.equal(
  shouldResetNearMeRefreshContent({
    preservePrevious: false,
    hasSettledContent: true,
  }),
  true,
);

console.log("nearMeRefreshModel.test.ts ok");
