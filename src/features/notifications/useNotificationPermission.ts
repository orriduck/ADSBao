import { useCallback, useEffect, useState } from "react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from "./browserNotificationModel";

// Tracks the live browser Notification permission and exposes a request
// function. Re-reads on window focus so a permission grant/revoke made in
// browser settings (in another tab, or via the site-info panel) while this
// tab was backgrounded is picked up without a reload.
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => getNotificationPermission(),
  );

  useEffect(() => {
    const refresh = () => setPermission(getNotificationPermission());
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const request = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, request };
}
