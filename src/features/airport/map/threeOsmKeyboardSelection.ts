const FORWARD_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const BACKWARD_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

export function resolveThreeOsmKeyboardSelection({
  key,
  aircraftIds,
  selectedAircraftId = "",
}: {
  key: string;
  aircraftIds: string[];
  selectedAircraftId?: string;
}) {
  const ids = aircraftIds.filter(Boolean);
  if (!ids.length) return "";
  const selectedIndex = ids.indexOf(selectedAircraftId);

  if (key === "Home") return ids[0];
  if (key === "End") return ids.at(-1) || "";
  if (key === "Enter" || key === " ") {
    return selectedIndex >= 0 ? ids[selectedIndex] : ids[0];
  }
  if (FORWARD_KEYS.has(key)) {
    return ids[selectedIndex < 0 ? 0 : (selectedIndex + 1) % ids.length];
  }
  if (BACKWARD_KEYS.has(key)) {
    return ids[
      selectedIndex < 0
        ? ids.length - 1
        : (selectedIndex - 1 + ids.length) % ids.length
    ];
  }
  return "";
}
