import { getRedis, notificationKeys } from './config';
import type {
  MatchSnapshot,
  NotificationEvent,
  NotificationPreferences,
  PendingNotificationEvent,
  StoredSubscription
} from './types';
import { KICKOFF_REMINDER_OPTIONS } from './types';
import { normalizeStoredSubscription } from './validation';

const SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60_000;
const PROCESSED_EVENT_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const PENDING_EVENT_RETENTION_SECONDS = 24 * 60 * 60;
const SUBSCRIPTION_STORAGE_KEYS = [
  notificationKeys.subscriptions,
  notificationKeys.goals,
  notificationKeys.fullTime,
  ...KICKOFF_REMINDER_OPTIONS.map(notificationKeys.kickoffs)
];
const SUBSCRIPTION_UPSERT = `
local previous = redis.call('GET', KEYS[1])
if previous then
  local old = cjson.decode(previous)
  local updated = cjson.decode(ARGV[2])
  if old.subscription.endpoint ~= updated.subscription.endpoint or
     old.subscription.keys.p256dh ~= updated.subscription.keys.p256dh or
     old.subscription.keys.auth ~= updated.subscription.keys.auth then return 0 end
  redis.call('SREM', KEYS[2], ARGV[1])
  redis.call('SREM', KEYS[3], ARGV[1])
  redis.call('SREM', KEYS[4], ARGV[1])
  for index = 5, 9 do redis.call('SREM', KEYS[index], ARGV[1]) end
end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SADD', KEYS[2], ARGV[1])
local record = cjson.decode(ARGV[2])
if record.preferences.goals then redis.call('SADD', KEYS[3], ARGV[1]) end
if record.preferences.fullTime then redis.call('SADD', KEYS[4], ARGV[1]) end
if record.preferences.kickoffs then
  local kickoffMinutes = tonumber(record.preferences.kickoffReminderMinutes)
  local kickoffIndex = 5
  if kickoffMinutes == 10 then kickoffIndex = 6
  elseif kickoffMinutes == 15 then kickoffIndex = 7
  elseif kickoffMinutes == 30 then kickoffIndex = 8
  elseif kickoffMinutes == 60 then kickoffIndex = 9 end
  redis.call('SADD', KEYS[kickoffIndex], ARGV[1])
end
return 1
`;
const SUBSCRIPTION_DELETE = `
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local record = cjson.decode(value)
if record.subscription.endpoint ~= ARGV[1] or
   record.subscription.keys.p256dh ~= ARGV[2] or
   record.subscription.keys.auth ~= ARGV[3] then return 0 end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[2])
redis.call('SREM', KEYS[3], ARGV[2])
redis.call('SREM', KEYS[4], ARGV[2])
for index = 5, 9 do redis.call('SREM', KEYS[index], ARGV[2]) end
return 1
`;
const SUBSCRIPTION_PREFERENCES_UPDATE = `
local value = redis.call('GET', KEYS[1])
if not value then return 0 end
local record = cjson.decode(value)
if record.subscription.endpoint ~= ARGV[1] or
   record.subscription.keys.p256dh ~= ARGV[2] or
   record.subscription.keys.auth ~= ARGV[3] then return 0 end
redis.call('SREM', KEYS[2], ARGV[6])
redis.call('SREM', KEYS[3], ARGV[6])
redis.call('SREM', KEYS[4], ARGV[6])
for index = 5, 9 do redis.call('SREM', KEYS[index], ARGV[6]) end
record.preferences = cjson.decode(ARGV[4])
record.updatedAt = tonumber(ARGV[5])
redis.call('SET', KEYS[1], cjson.encode(record))
redis.call('SADD', KEYS[2], ARGV[6])
if record.preferences.goals then redis.call('SADD', KEYS[3], ARGV[6]) end
if record.preferences.fullTime then redis.call('SADD', KEYS[4], ARGV[6]) end
if record.preferences.kickoffs then
  local kickoffMinutes = tonumber(record.preferences.kickoffReminderMinutes)
  local kickoffIndex = 5
  if kickoffMinutes == 10 then kickoffIndex = 6
  elseif kickoffMinutes == 15 then kickoffIndex = 7
  elseif kickoffMinutes == 30 then kickoffIndex = 8
  elseif kickoffMinutes == 60 then kickoffIndex = 9 end
  redis.call('SADD', KEYS[kickoffIndex], ARGV[6])
end
return 1
`;
const ENQUEUE_EVENT = `
local created = redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[3])
if not created then return 0 end
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[4])
redis.call('ZADD', KEYS[3], ARGV[2], ARGV[5])
return 1
`;
const RATE_LIMIT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;
const RELEASE_LOCK = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export async function getSnapshots(): Promise<Record<string, MatchSnapshot>> {
  const value = await getRedis().hgetall<Record<string, MatchSnapshot>>(notificationKeys.snapshots);
  return value || {};
}

export async function saveSnapshots(matches: MatchSnapshot[]): Promise<void> {
  const redis = getRedis();
  const now = Date.now();
  const snapshotMap = Object.fromEntries(matches.map((snapshot) => [snapshot.match.id, snapshot]));
  if (Object.keys(snapshotMap).length > 0) {
    await redis.hset(notificationKeys.snapshots, snapshotMap);
    await redis.expire(notificationKeys.snapshots, Math.ceil(SNAPSHOT_RETENTION_MS / 1000));
  }

  const existing = await redis.hgetall<Record<string, MatchSnapshot>>(notificationKeys.snapshots);
  const staleIds = Object.entries(existing || {})
    .filter(([, snapshot]) => !snapshot || typeof snapshot.observedAt !== 'number' || now - snapshot.observedAt > SNAPSHOT_RETENTION_MS)
    .map(([id]) => id);
  if (staleIds.length > 0) await redis.hdel(notificationKeys.snapshots, ...staleIds);
}

export async function saveSubscription(record: StoredSubscription): Promise<boolean> {
  const result = await getRedis().eval(
    SUBSCRIPTION_UPSERT,
    [notificationKeys.subscription(record.id), ...SUBSCRIPTION_STORAGE_KEYS],
    [
      record.id,
      JSON.stringify(record),
    ]
  );
  return Number(result) === 1;
}

export async function getSubscription(id: string): Promise<StoredSubscription | null> {
  const value = await getRedis().get<unknown>(notificationKeys.subscription(id));
  return normalizeStoredSubscription(value);
}

export async function deleteSubscription(
  id: string,
  subscription: StoredSubscription['subscription']
): Promise<boolean> {
  const result = await getRedis().eval(
    SUBSCRIPTION_DELETE,
    [notificationKeys.subscription(id), ...SUBSCRIPTION_STORAGE_KEYS],
    [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );
  return Number(result) === 1;
}

export async function updateSubscriptionPreferences(
  record: StoredSubscription,
  preferences: NotificationPreferences,
  updatedAt: number
): Promise<boolean> {
  const result = await getRedis().eval(
    SUBSCRIPTION_PREFERENCES_UPDATE,
    [notificationKeys.subscription(record.id), ...SUBSCRIPTION_STORAGE_KEYS],
    [
      record.subscription.endpoint,
      record.subscription.keys.p256dh,
      record.subscription.keys.auth,
      JSON.stringify(preferences),
      String(updatedAt),
      record.id
    ]
  );
  return Number(result) === 1;
}

export async function getActiveKickoffReminderOptions(options: readonly number[]): Promise<number[]> {
  const redis = getRedis();
  const counts = await Promise.all(options.map((minutes) => redis.scard(notificationKeys.kickoffs(minutes))));
  return options.filter((_, index) => counts[index] > 0);
}

export async function enqueueEvent(event: NotificationEvent): Promise<boolean> {
  const result = await getRedis().eval(
    ENQUEUE_EVENT,
    [notificationKeys.processed(event.id), notificationKeys.event(event.id), notificationKeys.outbox],
    [
      JSON.stringify({ event, cursor: '0', retryIds: [], attempt: 0 } satisfies PendingNotificationEvent),
      String(event.createdAt),
      String(PROCESSED_EVENT_RETENTION_SECONDS),
      String(PENDING_EVENT_RETENTION_SECONDS),
      event.id
    ]
  );
  return Number(result) === 1;
}

export async function getDueEvents(now: number, limit: number): Promise<string[]> {
  return getRedis().zrange<string[]>(notificationKeys.outbox, 0, now, {
    byScore: true,
    offset: 0,
    count: limit
  });
}

export async function getPendingEvent(id: string): Promise<PendingNotificationEvent | null> {
  return getRedis().get<PendingNotificationEvent>(notificationKeys.event(id));
}

export async function savePendingEvent(state: PendingNotificationEvent, dueAt: number): Promise<void> {
  const redis = getRedis();
  await redis.set(notificationKeys.event(state.event.id), state, { ex: PENDING_EVENT_RETENTION_SECONDS });
  await redis.zadd(notificationKeys.outbox, { score: dueAt, member: state.event.id });
}

export async function getAudiencePage(
  index: string,
  cursor: string,
  eventId: string,
  limit: number
): Promise<{ cursor: string; subscriptions: StoredSubscription[] }> {
  const redis = getRedis();
  const [nextCursor, ids] = await redis.sscan(index, cursor, { count: limit });
  const normalizedIds = ids.map(String);
  if (normalizedIds.length === 0) return { cursor: nextCursor, subscriptions: [] };

  const [delivered, values] = await Promise.all([
    redis.smismember(notificationKeys.delivered(eventId), normalizedIds),
    redis.mget<unknown[]>(...normalizedIds.map(notificationKeys.subscription))
  ]);

  const subscriptions: StoredSubscription[] = [];
  for (let index = 0; index < normalizedIds.length; index += 1) {
    if (delivered[index] === 1) continue;
    const record = normalizeStoredSubscription(values[index]);
    if (record && record.id === normalizedIds[index]) subscriptions.push(record);
  }
  return { cursor: nextCursor, subscriptions };
}

export async function getFailedSubscriptionIds(eventId: string): Promise<string[]> {
  return getRedis().smembers(notificationKeys.failed(eventId));
}

export async function getSubscriptionsByIds(ids: string[]): Promise<StoredSubscription[]> {
  if (ids.length === 0) return [];
  const values = await getRedis().mget<unknown[]>(...ids.map(notificationKeys.subscription));
  return values
    .map(normalizeStoredSubscription)
    .filter((record): record is StoredSubscription => record !== null);
}

export async function markDelivered(eventId: string, id: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd(notificationKeys.delivered(eventId), id);
  await redis.expire(notificationKeys.delivered(eventId), PENDING_EVENT_RETENTION_SECONDS);
  await redis.srem(notificationKeys.failed(eventId), id);
}

export async function markDeliveryFailed(eventId: string, id: string): Promise<void> {
  await getRedis().sadd(notificationKeys.failed(eventId), id);
}

export async function removeExpiredSubscription(record: StoredSubscription): Promise<void> {
  await deleteSubscription(record.id, record.subscription);
}

export async function getFailedCount(eventId: string): Promise<number> {
  return getRedis().scard(notificationKeys.failed(eventId));
}

export async function finishEvent(eventId: string): Promise<void> {
  const redis = getRedis();
  await Promise.all([
    redis.del(notificationKeys.event(eventId)),
    redis.del(notificationKeys.delivered(eventId)),
    redis.del(notificationKeys.failed(eventId)),
    redis.zrem(notificationKeys.outbox, eventId)
  ]);
}

export async function acquireJobLock(token: string, seconds: number): Promise<boolean> {
  const result = await getRedis().set(notificationKeys.lock, token, { nx: true, ex: seconds });
  return result === 'OK';
}

export async function releaseJobLock(token: string): Promise<void> {
  await getRedis().eval(RELEASE_LOCK, [notificationKeys.lock], [token]);
}

export async function consumeRateLimit(
  scope: string,
  addressHash: string,
  now: number,
  limit: number,
  windowSeconds = 60
): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(now / windowMs);
  const count = await getRedis().eval(
    RATE_LIMIT,
    [notificationKeys.rateLimit(scope, addressHash, bucket)],
    [String(windowSeconds * 2)]
  );
  return Number(count) <= limit;
}

export function preferenceIndex(preferences: NotificationPreferences, kind: NotificationEvent['kind']): string {
  if (kind === 'goal') return notificationKeys.goals;
  if (kind === 'full-time') return notificationKeys.fullTime;
  return notificationKeys.kickoffs(preferences.kickoffReminderMinutes);
}
