import assert from 'node:assert/strict';
import test from 'node:test';
import type { StreamedMatch } from '@/lib/streamed';
import { notificationPermissionMessage } from '@/lib/notifications/browser';
import { detectMatchEvents, enqueueDetectedEvents, isEventEnabledForPreferences, isKickoffEventStillValid } from '@/lib/notifications/events';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type MatchSnapshot,
  type NotificationEvent
} from '@/lib/notifications/types';
import {
  normalizePushEndpoint,
  parseNotificationPreferences,
  parsePushSubscription
} from '@/lib/notifications/validation';
import { matchPriorityClubIds } from '@/lib/notifications/catalog';

const now = Date.UTC(2026, 9, 11, 12, 0);

function match(overrides: Partial<StreamedMatch> = {}): StreamedMatch {
  return {
    id: 'fixture-123',
    title: 'Home FC vs Away FC',
    category: 'football',
    timezone: 'UTC',
    status: 'live',
    statusSource: 'provider',
    score: { home: 0, away: 0 },
    teams: { home: { name: 'Home FC', badge: '' }, away: { name: 'Away FC', badge: '' } },
    ...overrides
  };
}

function snapshots(previous: StreamedMatch, observedAt = now - 60_000): Record<string, MatchSnapshot> {
  return { [previous.id]: { match: previous, observedAt } };
}

const goalsAndResultsEnabled = [{ ...DEFAULT_NOTIFICATION_PREFERENCES }];

test('detects a valid score increase while a match is live', () => {
  const events = detectMatchEvents(
    [match({ score: { home: 1, away: 0 } })],
    snapshots(match()),
    goalsAndResultsEnabled,
    now
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'goal');
  assert.equal(events[0].body, 'Home FC 1–0 Away FC');
  assert.equal(events[0].url, '/match/fixture-123');
});

test('detects a score increase on the first live snapshot after a scheduled snapshot', () => {
  const previous = match({ status: 'scheduled', score: { home: 0, away: 0 } });
  const current = match({ score: { home: 0, away: 1 } });
  assert.equal(detectMatchEvents([current], snapshots(previous), goalsAndResultsEnabled, now)[0].kind, 'goal');
});

test('does not notify for unchanged or missing scores', () => {
  assert.equal(
    detectMatchEvents([match()], snapshots(match()), goalsAndResultsEnabled, now).length,
    0
  );
  assert.equal(
    detectMatchEvents(
      [match({ score: { home: 1, away: 0 } })],
      snapshots(match({ score: undefined })),
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
  assert.equal(
    detectMatchEvents([match({ score: undefined })], snapshots(match()), goalsAndResultsEnabled, now).length,
    0
  );
});

test('ignores score changes after a missing or stale previous snapshot', () => {
  const current = match({ score: { home: 1, away: 0 } });
  assert.equal(detectMatchEvents([current], {}, goalsAndResultsEnabled, now).length, 0);
  assert.equal(
    detectMatchEvents([current], snapshots(match(), now - 10 * 60_000), goalsAndResultsEnabled, now).length,
    0
  );
});

test('does not notify on score regressions or non-live matches', () => {
  assert.equal(
    detectMatchEvents(
      [match({ score: { home: 0, away: 1 } })],
      snapshots(match({ score: { home: 1, away: 0 } })),
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
  assert.equal(
    detectMatchEvents(
      [match({ status: 'scheduled', score: { home: 1, away: 0 } })],
      snapshots(match()),
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
});

test('does not enqueue the same detected event on a duplicate job run', async () => {
  const current = match({ score: { home: 1, away: 0 } });
  const events = detectMatchEvents([current], snapshots(match()), goalsAndResultsEnabled, now);
  const processedIds = new Set<string>();
  const enqueue = async (event: NotificationEvent) => {
    if (processedIds.has(event.id)) return false;
    processedIds.add(event.id);
    return true;
  };

  assert.equal(await enqueueDetectedEvents(events, enqueue), 1);
  assert.equal(await enqueueDetectedEvents(events, enqueue), 0);
  assert.equal(processedIds.size, 1);
});

test('notifies full time only for an explicit provider status and valid non-regressing final score', () => {
  const previous = match();
  const finished = match({ status: 'finished', score: { home: 2, away: 1 } });
  const events = detectMatchEvents([finished], snapshots(previous), goalsAndResultsEnabled, now);
  assert.deepEqual(events.map((event) => event.kind), ['full-time']);

  assert.equal(
    detectMatchEvents(
      [match({ status: 'finished', statusSource: 'inferred', score: { home: 2, away: 1 } })],
      snapshots(previous),
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
  assert.equal(
    detectMatchEvents(
      [match({ status: 'finished', score: undefined })],
      snapshots(previous),
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
  assert.equal(
    detectMatchEvents(
      [match({ status: 'finished', score: { home: 2, away: 0 } })],
      snapshots(match({ score: { home: 2, away: 1 } })),
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
});

test('detects provider-confirmed half-time once and includes available match context', () => {
  const current = match({
    status: 'halftime',
    score: { home: 1, away: 0 },
    teams: {
      home: { name: 'Arsenal', badge: 'https://example.com/arsenal.png' },
      away: { name: 'Chelsea', badge: 'https://example.com/chelsea.png' }
    }
  });
  const first = detectMatchEvents([current], snapshots(match()), goalsAndResultsEnabled, now);
  assert.equal(first.some((event) => event.kind === 'half-time'), true);
  assert.deepEqual(first.find((event) => event.kind === 'half-time')?.clubIds, ['arsenal', 'chelsea']);
  assert.equal(
    detectMatchEvents([current], snapshots(current), goalsAndResultsEnabled, now)
      .some((event) => event.kind === 'half-time'),
    false
  );
});

test('matches priority clubs through normalized aliases without duplicating a fixture', () => {
  const fixture = match({
    teams: {
      home: { name: 'Man. City', badge: '' },
      away: { name: 'Manchester City FC', badge: '' }
    }
  });
  assert.deepEqual(matchPriorityClubIds(fixture), ['manchester-city']);
});

test('filters events by master, event type, priority club, and selected competition', () => {
  const event: NotificationEvent = {
    id: 'event',
    kind: 'goal',
    matchId: 'fixture-123',
    matchTitle: 'Arsenal vs Chelsea',
    body: 'Arsenal 1–0 Chelsea',
    url: '/match/fixture-123',
    clubIds: ['arsenal', 'chelsea'],
    competitionIds: ['premier-league'],
    createdAt: now
  };
  const defaults = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  assert.equal(isEventEnabledForPreferences(defaults, event), true);
  assert.equal(isEventEnabledForPreferences({ ...defaults, masterEnabled: false }, event), false);
  assert.equal(isEventEnabledForPreferences({ ...defaults, goals: false }, event), false);
  assert.equal(isEventEnabledForPreferences({ ...defaults, majorMatches: false, followedClubs: [] }, event), false);
  assert.equal(isEventEnabledForPreferences({
    ...defaults,
    majorMatches: false,
    followedClubs: [],
    followedCompetitions: ['premier-league']
  }, event), true);
});

test('schedules a kickoff reminder when due and reports the accurate time for late discovery', () => {
  const kickoffTime = now + 8 * 60_000;
  const preferences = [{ ...DEFAULT_NOTIFICATION_PREFERENCES, kickoffReminderMinutes: 15 as const }];
  const events = detectMatchEvents(
    [match({ status: 'scheduled', statusSource: 'provider', kickoffTime })],
    {},
    preferences,
    now
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'kickoff');
  assert.equal(events[0].reminderMinutes, 15);
  assert.equal(events[0].body, 'Home FC vs Away FC kicks off in 8 minutes.');
});

test('does not schedule reminders for postponed matches or invalid kickoff times', () => {
  const kickoffTime = now + 5 * 60_000;
  for (const status of ['postponed', 'cancelled', 'finished'] as const) {
    assert.equal(
      detectMatchEvents(
        [match({ status, statusSource: 'provider', kickoffTime })],
        {},
        goalsAndResultsEnabled,
        now
      ).length,
      0
    );
  }
  assert.equal(
    detectMatchEvents(
      [match({ status: 'scheduled', statusSource: 'provider', kickoffTime: Number.NaN })],
      {},
      goalsAndResultsEnabled,
      now
    ).length,
    0
  );
});

test('allows normalized scheduled fixtures with a valid inferred status', () => {
  const events = detectMatchEvents(
    [match({ status: 'scheduled', statusSource: 'inferred', kickoffTime: now + 5 * 60_000 })],
    {},
    goalsAndResultsEnabled,
    now
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'kickoff');
});

test('cancels a queued kickoff notification after a postponement or changed time', () => {
  const event = detectMatchEvents(
    [match({ status: 'scheduled', statusSource: 'provider', kickoffTime: now + 5 * 60_000 })],
    {},
    goalsAndResultsEnabled,
    now
  )[0];
  assert.equal(isKickoffEventStillValid(event, match({ status: 'postponed' }), now), false);
  assert.equal(isKickoffEventStillValid(event, match({ status: 'scheduled', kickoffTime: now + 10 * 60_000 }), now), false);
});

test('rejects invalid subscription endpoints and malformed keys', () => {
  assert.equal(normalizePushEndpoint('http://fcm.googleapis.com/fcm/send/token'), null);
  assert.equal(normalizePushEndpoint('https://attacker.fcm.googleapis.com/fcm/send/token'), null);
  assert.equal(normalizePushEndpoint('https://127.0.0.1/private'), null);
  assert.equal(parsePushSubscription({
    endpoint: 'https://fcm.googleapis.com/fcm/send/token',
    keys: { p256dh: 'invalid', auth: 'invalid' }
  }), null);
  assert.equal(parseNotificationPreferences({ goals: true, kickoffs: true, fullTime: true, kickoffReminderMinutes: 1 }), null);
});

test('migrates legacy preference records to default priority-club coverage', () => {
  const parsed = parseNotificationPreferences({
    goals: true,
    kickoffs: true,
    fullTime: true,
    kickoffReminderMinutes: 15
  });
  assert.deepEqual(parsed?.followedClubs, DEFAULT_NOTIFICATION_PREFERENCES.followedClubs);
  assert.equal(parsed?.masterEnabled, true);
  assert.equal(parsed?.halfTime, false);
});

test('accepts an HTTPS push-service endpoint with valid subscription keys', () => {
  const subscription = parsePushSubscription({
    endpoint: 'https://fcm.googleapis.com/fcm/send/token',
    keys: {
      p256dh: 'A'.repeat(87),
      auth: 'B'.repeat(22)
    }
  });
  assert.ok(subscription);
});

test('explains when notification permission has been denied', () => {
  assert.match(notificationPermissionMessage('denied'), /blocked by your browser/i);
  assert.match(notificationPermissionMessage('unsupported'), /does not support Web Push/i);
});
