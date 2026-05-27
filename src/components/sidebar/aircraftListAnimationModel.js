export function getAircraftListAnimationState({
  prevKeys = [],
  currentKeys = [],
  resetKeyChanged = false,
} = {}) {
  const disableSwap =
    resetKeyChanged || didListMembershipChange(prevKeys, currentKeys);
  let cascadeCursor = 0;
  const cascadeOrders = currentKeys.map((cur, index) => {
    const prev = prevKeys[index];
    if (disableSwap) return -1;
    return prev !== undefined && prev !== cur ? cascadeCursor++ : -1;
  });

  return { cascadeOrders, disableSwap };
}

function didListMembershipChange(prevKeys, currentKeys) {
  if (prevKeys.length === 0) return false;
  if (prevKeys.length !== currentKeys.length) return true;

  const previousSet = new Set(prevKeys);
  const currentSet = new Set(currentKeys);
  return (
    currentKeys.some((key) => !previousSet.has(key)) ||
    prevKeys.some((key) => !currentSet.has(key))
  );
}
