"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

// Single source of truth for the currently-hovered aircraft in the sidebar.
// Rows fire `setPreviewedAircraft(aircraft)` on mouse-enter; the list-level
// container clears it on mouse-leave so that fast row-to-row traversal does
// not flicker (no row's mouse-leave clears the state — only leaving the list
// area does).

const AircraftPreviewContext = createContext({
  previewedAircraft: null,
  setPreviewedAircraft: () => {},
  clearPreviewedAircraft: () => {},
});

export function AircraftPreviewProvider({ children }) {
  const [previewedAircraft, setPreviewedAircraft] = useState(null);
  const clearPreviewedAircraft = useCallback(() => {
    setPreviewedAircraft(null);
  }, []);

  const value = useMemo(
    () => ({
      previewedAircraft,
      setPreviewedAircraft,
      clearPreviewedAircraft,
    }),
    [previewedAircraft, clearPreviewedAircraft],
  );

  return (
    <AircraftPreviewContext.Provider value={value}>
      {children}
    </AircraftPreviewContext.Provider>
  );
}

export function useAircraftPreview() {
  return useContext(AircraftPreviewContext);
}
