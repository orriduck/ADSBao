export const resolveZoomOption = (activeZoom, options = []) =>
  options.find((option) => option.value === activeZoom) ||
  options[1] ||
  options[0] ||
  null;
