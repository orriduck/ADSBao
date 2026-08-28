export function shouldResetNearMeRefreshContent({
  preservePrevious = false,
  hasSettledContent = false,
}: {
  preservePrevious?: boolean;
  hasSettledContent?: boolean;
} = {}) {
  return !(preservePrevious && hasSettledContent);
}

export function shouldShowNearMeSidebarLoading({
  nearMe = false,
  hasHydratedSidebar = false,
  shellLoading = false,
}: {
  nearMe?: boolean;
  hasHydratedSidebar?: boolean;
  shellLoading?: boolean;
} = {}) {
  if (!nearMe) return false;
  // Here continues to refresh its data source as the device crosses location
  // cells. Once the sidebar has rendered a complete snapshot, those background
  // refreshes must never replace it with a cold-start skeleton again.
  if (hasHydratedSidebar) return false;
  return shellLoading;
}
