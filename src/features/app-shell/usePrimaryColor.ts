"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PRIMARIES,
  PRIMARY_YELLOW,
  applyPrimaryPreference,
  readStoredPrimary,
  writeStoredPrimary,
} from "@/utils/primaryColor";

// Reads / writes the user's chosen primary color (yellow / teal). The
// resolved value is applied to <html data-primary="..."> so all of the
// CSS tokens that derive from --primary-bright / --primary-deep follow
// automatically.
export function usePrimaryColor() {
  const [primary, setPrimaryState] = useState(PRIMARY_YELLOW);

  useEffect(() => {
    const stored = readStoredPrimary();
    setPrimaryState(stored);
    applyPrimaryPreference({ primary: stored });
  }, []);

  const setPrimary = useCallback((next) => {
    const { primary: resolved } = applyPrimaryPreference({ primary: next });
    writeStoredPrimary(resolved);
    setPrimaryState(resolved);
  }, []);

  return { primary, setPrimary, options: PRIMARIES };
}
