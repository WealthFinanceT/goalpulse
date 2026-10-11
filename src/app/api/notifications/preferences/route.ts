import { hasSameOrigin, normalizePushEndpoint, parseNotificationPreferences, parsePushSubscription, readJsonBody, requestBodyTooLarge, subscriptionId } from '@/lib/notifications/validation';
import { getSubscription, updateSubscriptionPreferences } from '@/lib/notifications/storage';
import { enforceRateLimit, isJsonRequest, jsonResponse } from '@/lib/notifications/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const MAX_REQUEST_BYTES = 8192;

export async function PUT(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return jsonResponse({ error: 'Requests must come from this site.' }, 403);
  if (!isJsonRequest(request)) return jsonResponse({ error: 'Expected an application/json request.' }, 415);
  if (requestBodyTooLarge(request.headers.get('content-length'), MAX_REQUEST_BYTES)) {
    return jsonResponse({ error: 'The request body is too large.' }, 413);
  }

  try {
    if (!(await enforceRateLimit(request, 'preferences', 60))) {
      return jsonResponse({ error: 'Too many preference changes. Please try again shortly.' }, 429);
    }
    const body = await readJsonBody(request, MAX_REQUEST_BYTES) as Record<string, unknown>;
    const endpoint = normalizePushEndpoint(body?.endpoint);
    const subscription = parsePushSubscription(body?.subscription);
    const preferences = parseNotificationPreferences(body?.preferences);
    if (!endpoint || !subscription || subscription.endpoint !== endpoint || !preferences) {
      return jsonResponse({ error: 'The subscription or notification preferences are invalid.' }, 400);
    }

    const record = await getSubscription(subscriptionId(endpoint));
    if (
      !record ||
      record.subscription.endpoint !== endpoint ||
      record.subscription.keys.p256dh !== subscription.keys.p256dh ||
      record.subscription.keys.auth !== subscription.keys.auth
    ) {
      return jsonResponse({ error: 'Subscribe to notifications before updating preferences.' }, 404);
    }

    const updated = await updateSubscriptionPreferences(record, preferences, Date.now());
    if (!updated) return jsonResponse({ error: 'This device subscription was removed. Enable notifications again.' }, 404);
    return jsonResponse({ enabled: true, preferences });
  } catch (error) {
    if (error instanceof RangeError) return jsonResponse({ error: 'The request body is too large.' }, 413);
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return jsonResponse({ error: 'The request body must contain valid JSON.' }, 400);
    }
    console.error('Unable to update Web Push preferences.', error);
    return jsonResponse({ error: 'Unable to update notification preferences.' }, 503);
  }
}
