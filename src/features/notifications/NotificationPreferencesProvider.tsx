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
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
  normalizeNotificationPreferences,
  type NotificationPreferences,
} from "./notificationPreferencesModel";
import {
  readStoredNotificationPreferences,
  writeStoredNotificationPreferences,
} from "./notificationPreferencesStorage";

interface NotificationPreferencesContextValue {
  preferences: NotificationPreferences;
  setPreferences: (patch: Partial<NotificationPreferences>) => void;
  hydrated: boolean;
}

const DEFAULT_CONTEXT: NotificationPreferencesContextValue = {
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  setPreferences: () => {},
  hydrated: false,
};

const NotificationPreferencesContext =
  createContext<NotificationPreferencesContextValue>(DEFAULT_CONTEXT);

export function NotificationPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferencesState] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredNotificationPreferences();
    if (stored) setPreferencesState(stored);
    setHydrated(true);
  }, []);

  const setPreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      setPreferencesState((current) => {
        const next = mergeNotificationPreferences(current, patch);
        writeStoredNotificationPreferences(next);
        return next;
      });
    },
    [],
  );

  const normalized = useMemo(
    () => normalizeNotificationPreferences(preferences),
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
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  return useContext(NotificationPreferencesContext);
}
