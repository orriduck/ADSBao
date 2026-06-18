import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_UNIT_PREFERENCES,
  mergeUnitPreferences,
  normalizeUnitPreferences,
  type UnitPreferences,
} from "./unitPreferencesModel";
import {
  readStoredUnitPreferences,
  writeStoredUnitPreferences,
} from "./unitPreferencesStorage";

interface UnitPreferencesContextValue {
  preferences: UnitPreferences;
  setPreferences: (patch: Partial<UnitPreferences>) => void;
  hydrated: boolean;
}

const DEFAULT_CONTEXT: UnitPreferencesContextValue = {
  preferences: DEFAULT_UNIT_PREFERENCES,
  setPreferences: () => {},
  hydrated: false,
};

const UnitPreferencesContext =
  createContext<UnitPreferencesContextValue>(DEFAULT_CONTEXT);

export function UnitPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<UnitPreferences>(
    DEFAULT_UNIT_PREFERENCES,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredUnitPreferences();
    if (stored) setPreferencesState(stored);
    setHydrated(true);
  }, []);

  const setPreferences = useCallback((patch: Partial<UnitPreferences>) => {
    setPreferencesState((current) => {
      const next = mergeUnitPreferences(current, patch);
      writeStoredUnitPreferences(next);
      return next;
    });
  }, []);

  // Normalize only when the raw preferences change, not when `hydrated`
  // flips — keeps the context value stable across the one-time hydration.
  const normalized = useMemo(
    () => normalizeUnitPreferences(preferences),
    [preferences],
  );

  const value = useMemo(
    () => ({
      preferences: normalized,
      setPreferences,
      hydrated,
    }),
    [normalized, setPreferences, hydrated],
  );

  return (
    <UnitPreferencesContext.Provider value={value}>
      {children}
    </UnitPreferencesContext.Provider>
  );
}

export function useUnitPreferences() {
  return useContext(UnitPreferencesContext);
}
