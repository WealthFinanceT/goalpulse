import { randomUUID } from 'node:crypto';
import webpush, { type PushSubscription } from 'web-push';
import type { StreamedMatch } from '@/lib/streamed';
import { fetchFootballMatches } from '@/lib/streamed';
import { getVapidConfiguration } from './config';
import { detectMatchEvents, enqueueDetectedEvents, isEventEnabledForPreferences, isKickoffEventStillValid } from './events';
import {
  acquireJobLock,
  deleteSubscription,
  enqueueEvent,
  finishEvent,
  getActiveKickoffReminderOptions,
  getAudiencePage,
  getDueEvents,
  getFailedCount,
  getFailedSubscriptionIds,
  getPendingEvent,
  getSnapshots,
  getSubscriptionsByIds,
  markDelivered,
  markDeliveryFailed,
  releaseJobLock,
  removeExpiredSubscription,
  savePendingEvent,
  saveSnapshots
} from './storage';
import type {
  MatchSnapshot,
  NotificationEvent,
  NotificationPreferences,
  PendingNotificationEvent,
  StoredSubscription
} from './types';
import { KICKOFF_REMINDER_OPTIONS } from './types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';
import { preferenceIndex } from './storage';

const LOCK_DURATION_SECONDS = 120;
const PAGE_SIZE = 40;
const SUBSCRIPTION_CONCURRENCY = 8;
const EVENT_CONCURRENCY = 4;
const MAX_EVENTS_PER_RUN = 40;
const MAX_DELIVERY_RETRY_MS = 60 * 60_000;
const EVENT_RETENTION_MS = 24 * 60 * 60_000;
const PUSH_REQUEST_TIMEOUT_MS = 5000;
const PUSH_PAYLOAD_MAX_BYTES = 3000;

type DeliveryResult = 'delivered' | 'expired' | 'retry';

async function forEachConcurrent<T>(
  values: T[],
  concurrency: number,
  callback: (value: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      await callback(values[index]);
    }
  });
  await Promise.all(workers);
}

function pushTopic(eventId: string): string {
  return eventId.slice(0, 32);
}

function safeNotificationImage(value: string | undefined): string | undefined {
  if (!value || value.length > 500) return undefined;
  try {
    const image = new URL(value);
    return image.protocol === 'https:' ? image.href : undefined;
  } catch {
    return undefined;
  }
}

function isExpiredPushError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    ((error as { statusCode?: unknown }).statusCode === 404 ||
      (error as { statusCode?: unknown }).statusCode === 410)
  );
}

async function sendPush(
  record: StoredSubscription,
  event: NotificationEvent
): Promise<DeliveryResult> {
  const payload = JSON.stringify({
    id: event.id,
    kind: event.kind,
    title: event.matchTitle,
    body: event.body,
    url: event.url,
    icon: '/icon-192.png?v=b7d32ecd308c',
    image: safeNotificationImage(event.image),
    tag: event.id
  });
  if (Buffer.byteLength(payload, 'utf8') > PUSH_PAYLOAD_MAX_BYTES) {
    throw new Error('Web Push payload exceeds the configured size limit.');
  }

  const vapid = getVapidConfiguration();
  try {
    await webpush.sendNotification(
      record.subscription as PushSubscription,
      payload,
      {
        vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
        TTL: 60 * 60,
        urgency: event.kind === 'goal' ? 'high' : 'normal',
        topic: pushTopic(event.id),
        timeout: PUSH_REQUEST_TIMEOUT_MS
      }
    );
    return 'delivered';
  } catch (error) {
    if (isExpiredPushError(error)) return 'expired';
    const statusCode = error && typeof error === 'object' && 'statusCode' in error &&
      typeof error.statusCode === 'number' ? error.statusCode : undefined;
    console.warn('Web Push delivery failed; the event will be retried.', { statusCode });
    return 'retry';
  }
}

function initialPreferences(reminderMinutes: number[]): NotificationPreferences[] {
  return reminderMinutes.map((kickoffReminderMinutes) => ({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    goals: false,
    kickoffs: true,
    masterEnabled: true,
    majorMatches: true,
    fullTime: false,
    kickoffReminderMinutes: kickoffReminderMinutes as NotificationPreferences['kickoffReminderMinutes']
  }));
}

async function retryFailedDeliveries(state: PendingNotificationEvent, now: number): Promise<boolean> {
  const failedIds = await getFailedSubscriptionIds(state.event.id);
  if (failedIds.length === 0) return true;

  const records = await getSubscriptionsByIds(failedIds.slice(0, PAGE_SIZE));
  const validIds = new Set(records.map((record) => record.id));
  for (const id of failedIds.slice(0, PAGE_SIZE)) {
    if (!validIds.has(id)) await markDelivered(state.event.id, id);
  }

  let failedThisPage = false;
  await forEachConcurrent(records, SUBSCRIPTION_CONCURRENCY, async (record) => {
    if (!isEventEnabledForPreferences(record.preferences, state.event)) {
      await markDelivered(state.event.id, record.id);
      return;
    }

    const result = await sendPush(record, state.event);
    if (result === 'delivered') {
      await markDelivered(state.event.id, record.id);
    } else if (result === 'expired') {
      await removeExpiredSubscription(record);
      await markDelivered(state.event.id, record.id);
    } else {
      failedThisPage = true;
      await markDeliveryFailed(state.event.id, record.id);
    }
  });

  if (failedThisPage || (await getFailedCount(state.event.id)) > 0) {
    state.attempt += 1;
    const delay = Math.min(60_000 * 2 ** Math.min(state.attempt - 1, 6), MAX_DELIVERY_RETRY_MS);
    await savePendingEvent(state, now + delay);
    return false;
  }

  return true;
}

async function deliverEvent(
  id: string,
  currentMatches: Map<string, StreamedMatch>,
  now: number
): Promise<void> {
  const state = await getPendingEvent(id);
  if (!state) {
    await finishEvent(id);
    return;
  }
  if (now - state.event.createdAt >= EVENT_RETENTION_MS) {
    await finishEvent(id);
    return;
  }

  const currentMatch = currentMatches.get(state.event.matchId);
  if (!isKickoffEventStillValid(state.event, currentMatch, now)) {
    await finishEvent(id);
    return;
  }

  if (state.cursor === '0' && (await getFailedCount(id)) > 0) {
    const retriesComplete = await retryFailedDeliveries(state, now);
    if (!retriesComplete) return;
  }

  const index = preferenceIndex(
    {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    goals: state.event.kind === 'goal',
    fullTime: state.event.kind === 'full-time',
    halfTime: state.event.kind === 'half-time',
    redCards: state.event.kind === 'red-card',
    kickoffs: state.event.kind === 'kickoff',
    masterEnabled: true,
    majorMatches: true,
    kickoffReminderMinutes: state.event.reminderMinutes || 15
    },
    state.event.kind
  );
  const page = await getAudiencePage(index, state.cursor, id, PAGE_SIZE);
  await forEachConcurrent(page.subscriptions, SUBSCRIPTION_CONCURRENCY, async (record) => {
    if (!isEventEnabledForPreferences(record.preferences, state.event)) {
      await markDelivered(id, record.id);
      return;
    }
    const result = await sendPush(record, state.event);
    if (result === 'delivered') {
      await markDelivered(id, record.id);
    } else if (result === 'expired') {
      await removeExpiredSubscription(record);
      await markDelivered(id, record.id);
    } else {
      await markDeliveryFailed(id, record.id);
    }
  });

  state.cursor = page.cursor;
  if (state.cursor !== '0') {
    await savePendingEvent(state, now + 60_000);
    return;
  }

  if ((await getFailedCount(id)) > 0) {
    state.attempt += 1;
    state.cursor = '0';
    const delay = Math.min(60_000 * 2 ** Math.min(state.attempt - 1, 6), MAX_DELIVERY_RETRY_MS);
    await savePendingEvent(state, now + delay);
    return;
  }

  await finishEvent(id);
}

export async function runNotificationMonitor(now = Date.now()): Promise<{
  skipped: boolean;
  observedMatches: number;
  detectedEvents: number;
  processedEvents: number;
}> {
  const lockToken = randomUUID();
  if (!(await acquireJobLock(lockToken, LOCK_DURATION_SECONDS))) {
    return { skipped: true, observedMatches: 0, detectedEvents: 0, processedEvents: 0 };
  }

  try {
    const matches = await fetchFootballMatches({ fresh: true });
    if (matches.length === 0) throw new Error('The football provider returned no matches; snapshots were not updated.');

    const [snapshots, activeReminderMinutes] = await Promise.all([
      getSnapshots(),
      getActiveKickoffReminderOptions(KICKOFF_REMINDER_OPTIONS)
    ]);
    const events = detectMatchEvents(matches, snapshots, initialPreferences(activeReminderMinutes), now);
    await enqueueDetectedEvents(events, enqueueEvent);

    const newSnapshots: MatchSnapshot[] = matches.map((match) => ({
      match: {
        id: match.id,
        title: match.title,
        status: match.status,
        statusSource: match.statusSource,
        kickoffTime: match.kickoffTime,
        timezone: match.timezone,
        score: match.score,
        teams: match.teams,
        competition: match.competition
      },
      observedAt: now
    }));
    await saveSnapshots(newSnapshots);

    const dueIds = await getDueEvents(now, MAX_EVENTS_PER_RUN);
    const currentMatches = new Map(matches.map((match) => [match.id, match]));
    let processedEvents = 0;
    await forEachConcurrent(dueIds, EVENT_CONCURRENCY, async (id) => {
      try {
        await deliverEvent(id, currentMatches, now);
        processedEvents += 1;
      } catch (error) {
        console.error(`Unable to process queued notification event ${id}.`, error);
        throw error;
      }
    });

    return { skipped: false, observedMatches: matches.length, detectedEvents: events.length, processedEvents };
  } finally {
    await releaseJobLock(lockToken);
  }
}

export const notificationMonitorLimits = {
  lockSeconds: LOCK_DURATION_SECONDS,
  pageSize: PAGE_SIZE,
  subscriptionConcurrency: SUBSCRIPTION_CONCURRENCY,
  eventConcurrency: EVENT_CONCURRENCY,
  maxEventsPerRun: MAX_EVENTS_PER_RUN,
  retryDelayMaxMs: MAX_DELIVERY_RETRY_MS
};
