import { timingSafeEqual } from 'node:crypto';
import { jsonResponse } from '@/lib/notifications/api';
import { runNotificationMonitor } from '@/lib/notifications/monitor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const authorization = request.headers.get('authorization') || '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return jsonResponse({ error: 'Unauthorized.' }, 401);

  try {
    return jsonResponse(await runNotificationMonitor());
  } catch (error) {
    console.error('Goal Pulse notification monitoring failed.', error);
    return jsonResponse({ error: 'Notification monitoring failed. See server logs for details.' }, 500);
  }
}
