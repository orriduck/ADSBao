export function getAircraftPreviewTypeDisplay(aircraft) {
  const type = (aircraft?.type || "").trim().toUpperCase();
  const category = (aircraft?.category || "").trim().toUpperCase();

  return {
    primary: type || category || "N/A",
    secondary: type && category ? category : null,
  };
}
