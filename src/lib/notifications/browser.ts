export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function notificationPermissionMessage(permission: NotificationPermissionState): string {
  if (permission === 'denied') {
    return 'Notifications are blocked by your browser. Allow them in this site’s browser settings, then try again.';
  }
  if (permission === 'unsupported') {
    return 'This browser or device does not support Web Push notifications.';
  }
  if (permission === 'default') {
    return 'Notifications stay off until you choose Enable Notifications.';
  }
  return 'Browser or device notification settings can override these preferences.';
}
