export const resolveZoomOption = (activeZoom, options = []) =>
  options.find((option) => option.value === activeZoom) ||
  options[1] ||
  options[0] ||
  null;

export const getNextZoomValue = (activeZoom, options = []) => {
  if (!options.length) return activeZoom;
  const currentIndex = options.findIndex((option) => option.value === activeZoom);
  const nextIndex = (currentIndex + 1) % options.length;
  return options[nextIndex].value;
};
