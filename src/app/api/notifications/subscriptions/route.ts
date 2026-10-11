import type { NotificationPreferences, StoredSubscription } from '@/lib/notifications/types';
import { defaultNotificationPreferences, hasSameOrigin, parseNotificationPreferences, parsePushSubscription, readJsonBody, requestBodyTooLarge, subscriptionId } from '@/lib/notifications/validation';
import { deleteSubscription, getSubscription, saveSubscription } from '@/lib/notifications/storage';
import { enforceRateLimit, isJsonRequest, jsonResponse } from '@/lib/notifications/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const MAX_REQUEST_BYTES = 8192;

function preferencesOrDefault(value: unknown): NotificationPreferences | null {
  return value === undefined ? defaultNotificationPreferences() : parseNotificationPreferences(value);
}

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return jsonResponse({ error: 'Requests must come from this site.' }, 403);
  if (!isJsonRequest(request)) return jsonResponse({ error: 'Expected an application/json request.' }, 415);
  if (requestBodyTooLarge(request.headers.get('content-length'), MAX_REQUEST_BYTES)) {
    return jsonResponse({ error: 'The request body is too large.' }, 413);
  }

  try {
    if (!(await enforceRateLimit(request, 'subscriptions', 20))) {
      return jsonResponse({ error: 'Too many notification requests. Please try again shortly.' }, 429);
    }
    const body = await readJsonBody(request, MAX_REQUEST_BYTES) as Record<string, unknown>;
    const subscription = parsePushSubscription(body?.subscription);
    const preferences = preferencesOrDefault(body?.preferences);
    if (!subscription || !preferences) {
      return jsonResponse({ error: 'The subscription or notification preferences are invalid.' }, 400);
    }

    const id = subscriptionId(subscription.endpoint);
    const existing = await getSubscription(id);
    if (
      existing &&
      (existing.subscription.keys.p256dh !== subscription.keys.p256dh ||
        existing.subscription.keys.auth !== subscription.keys.auth)
    ) {
      return jsonResponse({ error: 'This endpoint is already registered with different subscription keys. Unsubscribe before registering it again.' }, 409);
    }
    if (!existing && !(await enforceRateLimit(request, 'new-subscriptions', 25, 60 * 60))) {
      return jsonResponse({ error: 'Too many new device subscriptions from this connection. Try again later.' }, 429);
    }
    const now = Date.now();
    const record: StoredSubscription = {
      id,
      subscription,
      preferences,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    if (!(await saveSubscription(record))) {
      return jsonResponse({ error: 'This endpoint is already registered with different subscription keys. Unsubscribe before registering it again.' }, 409);
    }
    return jsonResponse({ enabled: true, preferences: record.preferences });
  } catch (error) {
    if (error instanceof RangeError) return jsonResponse({ error: 'The request body is too large.' }, 413);
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return jsonResponse({ error: 'The request body must contain valid JSON.' }, 400);
    }
    console.error('Unable to save Web Push subscription.', error);
    return jsonResponse({ error: 'Unable to save this notification subscription.' }, 503);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return jsonResponse({ error: 'Requests must come from this site.' }, 403);
  if (!isJsonRequest(request)) return jsonResponse({ error: 'Expected an application/json request.' }, 415);
  if (requestBodyTooLarge(request.headers.get('content-length'), MAX_REQUEST_BYTES)) {
    return jsonResponse({ error: 'The request body is too large.' }, 413);
  }

  try {
    if (!(await enforceRateLimit(request, 'subscriptions', 20))) {
      return jsonResponse({ error: 'Too many notification requests. Please try again shortly.' }, 429);
    }
    const body = await readJsonBody(request, MAX_REQUEST_BYTES) as Record<string, unknown>;
    const subscription = parsePushSubscription(body?.subscription);
    if (!subscription) return jsonResponse({ error: 'A valid push subscription is required.' }, 400);

    const id = subscriptionId(subscription.endpoint);
    const removed = await deleteSubscription(id, subscription);
    return jsonResponse({ enabled: false, removed });
  } catch (error) {
    if (error instanceof RangeError) return jsonResponse({ error: 'The request body is too large.' }, 413);
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return jsonResponse({ error: 'The request body must contain valid JSON.' }, 400);
    }
    console.error('Unable to remove Web Push subscription.', error);
    return jsonResponse({ error: 'Unable to disable this notification subscription.' }, 503);
  }
}
