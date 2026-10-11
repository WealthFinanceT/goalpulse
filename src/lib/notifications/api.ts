import { createHash } from 'node:crypto';
import { consumeRateLimit } from './storage';

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  });
}

export function getRemoteAddress(request: Request): string {
  const remoteAddress = request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
    'unknown';
  return createHash('sha256').update(remoteAddress.slice(0, 128)).digest('hex');
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60
): Promise<boolean> {
  return consumeRateLimit(scope, getRemoteAddress(request), Date.now(), limit, windowSeconds);
}

export function isJsonRequest(request: Request): boolean {
  return request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() === 'application/json';
}
