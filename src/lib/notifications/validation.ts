import { createHash } from 'node:crypto';
import type { PushSubscription } from 'web-push';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  KICKOFF_REMINDER_OPTIONS,
  type NotificationPreferences,
  type StoredSubscription
} from './types';

const MAX_SUBSCRIPTION_BYTES = 4096;
const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com'
];

export function normalizePushEndpoint(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const endpoint = new URL(value);
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      (endpoint.port && endpoint.port !== '443') ||
      !ALLOWED_PUSH_HOSTS.includes(endpoint.hostname)
    ) return null;
    return endpoint.toString();
  } catch {
    return null;
  }
}

export function parseNotificationPreferences(value: unknown): NotificationPreferences | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const preferences = value as Record<string, unknown>;
  if (
    typeof preferences.goals !== 'boolean' ||
    typeof preferences.kickoffs !== 'boolean' ||
    typeof preferences.fullTime !== 'boolean' ||
    !KICKOFF_REMINDER_OPTIONS.includes(preferences.kickoffReminderMinutes as 5 | 10 | 15 | 30 | 60)
  ) return null;

  return {
    goals: preferences.goals,
    kickoffs: preferences.kickoffs,
    fullTime: preferences.fullTime,
    kickoffReminderMinutes: preferences.kickoffReminderMinutes as NotificationPreferences['kickoffReminderMinutes']
  };
}

export function parsePushSubscription(value: unknown): PushSubscription | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const subscription = value as Record<string, unknown>;
  const endpoint = normalizePushEndpoint(subscription.endpoint);
  if (!endpoint) return null;

  if (!subscription.keys || typeof subscription.keys !== 'object' || Array.isArray(subscription.keys)) return null;
  const keys = subscription.keys as Record<string, unknown>;
  if (
    typeof keys.p256dh !== 'string' ||
    typeof keys.auth !== 'string' ||
    !/^[A-Za-z0-9_-]{43,200}$/.test(keys.p256dh) ||
    !/^[A-Za-z0-9_-]{16,100}$/.test(keys.auth)
  ) return null;

  const normalized: PushSubscription = {
    endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth }
  };

  if (subscription.expirationTime === null || typeof subscription.expirationTime === 'number') {
    normalized.expirationTime = subscription.expirationTime;
  }
  if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') > MAX_SUBSCRIPTION_BYTES) return null;
  return normalized;
}

export function subscriptionId(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function normalizeStoredSubscription(value: unknown): StoredSubscription | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const subscription = parsePushSubscription(record.subscription);
  const preferences = parseNotificationPreferences(record.preferences);
  if (
    typeof record.id !== 'string' ||
    !subscription ||
    !preferences ||
    record.id !== subscriptionId(subscription.endpoint) ||
    typeof record.createdAt !== 'number' ||
    typeof record.updatedAt !== 'number'
  ) return null;

  return {
    id: record.id,
    subscription,
    preferences,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function defaultNotificationPreferences(): NotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function requestBodyTooLarge(contentLength: string | null, maxBytes = 8192): boolean {
  if (contentLength === null) return false;
  const length = Number(contentLength);
  return !Number.isSafeInteger(length) || length < 0 || length > maxBytes;
}

export async function readJsonBody(request: Request, maxBytes = 8192): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('A JSON request body is required.');

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new RangeError('The request body is too large.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
