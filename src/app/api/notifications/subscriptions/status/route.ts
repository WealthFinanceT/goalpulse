import { defaultNotificationPreferences, hasSameOrigin, parsePushSubscription, readJsonBody, requestBodyTooLarge, subscriptionId } from '@/lib/notifications/validation';
import { getSubscription } from '@/lib/notifications/storage';
import { enforceRateLimit, isJsonRequest, jsonResponse } from '@/lib/notifications/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const MAX_REQUEST_BYTES = 4096;

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return jsonResponse({ error: 'Requests must come from this site.' }, 403);
  if (!isJsonRequest(request)) return jsonResponse({ error: 'Expected an application/json request.' }, 415);
  if (requestBodyTooLarge(request.headers.get('content-length'), MAX_REQUEST_BYTES)) {
    return jsonResponse({ error: 'The request body is too large.' }, 413);
  }

  try {
    if (!(await enforceRateLimit(request, 'subscription-status', 120))) {
      return jsonResponse({ error: 'Too many notification requests. Please try again shortly.' }, 429);
    }
    const body = await readJsonBody(request, MAX_REQUEST_BYTES) as Record<string, unknown>;
    const subscription = parsePushSubscription(body?.subscription);
    if (!subscription) return jsonResponse({ error: 'A valid push subscription is required.' }, 400);

    const record = await getSubscription(subscriptionId(subscription.endpoint));
    if (
      !record ||
      record.subscription.endpoint !== subscription.endpoint ||
      record.subscription.keys.p256dh !== subscription.keys.p256dh ||
      record.subscription.keys.auth !== subscription.keys.auth
    ) {
      return jsonResponse({ enabled: false, preferences: defaultNotificationPreferences() });
    }
    return jsonResponse({ enabled: true, preferences: record.preferences });
  } catch (error) {
    if (error instanceof RangeError) return jsonResponse({ error: 'The request body is too large.' }, 413);
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return jsonResponse({ error: 'The request body must contain valid JSON.' }, 400);
    }
    console.error('Unable to retrieve Web Push preferences.', error);
    return jsonResponse({ error: 'Unable to load notification preferences.' }, 503);
  }
}
