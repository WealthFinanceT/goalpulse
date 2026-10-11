import { getVapidConfiguration } from '@/lib/notifications/config';
import { jsonResponse } from '@/lib/notifications/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(): Response {
  try {
    return jsonResponse({ publicKey: getVapidConfiguration().publicKey });
  } catch (error) {
    console.error('Web Push public key is unavailable.', error);
    return jsonResponse({ error: 'Web Push is not configured on this server.' }, 503);
  }
}
