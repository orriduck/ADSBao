// Thin wrapper over the browser Notification API. Kept separate from the
// permission hook so the "is this even usable" checks are testable without
// mocking React.

export type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return window.Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const result = await window.Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    return getNotificationPermission();
  }
}

export interface ShowNotificationOptions {
  title: string;
  body?: string;
  tag?: string;
  icon?: string;
}

// Fires a system notification when permission is already granted. Silently
// no-ops otherwise — callers gate on permission state before wiring up the
// proximity watchers, so this is a last-line defensive check, not the
// primary gate.
export function showBrowserNotification({
  title,
  body,
  tag,
  icon = "/icon.png",
}: ShowNotificationOptions) {
  if (getNotificationPermission() !== "granted") return null;
  try {
    return new window.Notification(title, { body, tag, icon });
  } catch {
    // Some browsers (notably mobile Chrome) reject direct construction in
    // certain contexts even with permission granted — never let a
    // notification failure break the surrounding proximity watcher.
    return null;
  }
}
