import { createHash } from 'node:crypto';
import type { StreamedMatch } from '@/lib/streamed';
import type { MatchSnapshot, NotificationEvent, NotificationPreferences } from './types';
import { KICKOFF_REMINDER_OPTIONS } from './types';
import { matchPriorityClubIds, matchSelectedCompetitionIds } from './catalog';

const MAX_SCORE = 100;
const MAX_KICKOFF_DAYS_AHEAD = 120;
const MAX_SNAPSHOT_AGE_MS = 3 * 60_000;

function validScore(score: StreamedMatch['score']): score is { home: number; away: number } {
  return Boolean(
    score &&
    Number.isSafeInteger(score.home) &&
    Number.isSafeInteger(score.away) &&
    score.home! >= 0 &&
    score.away! >= 0 &&
    score.home! <= MAX_SCORE &&
    score.away! <= MAX_SCORE
  );
}

function stableMatchId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,100}$/.test(id);
}

function notificationId(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

function safeMatchTitle(match: StreamedMatch): string {
  return match.title.trim().slice(0, 160) || 'Football match';
}

function formatScore(match: StreamedMatch, home: number, away: number): string {
  const homeName = match.teams?.home?.name?.trim().slice(0, 60) || 'Home';
  const awayName = match.teams?.away?.name?.trim().slice(0, 60) || 'Away';
  return `${homeName} ${home}–${away} ${awayName}`;
}

export function isEventEnabledForPreferences(
  preferences: NotificationPreferences,
  event: NotificationEvent
): boolean {
  if (!preferences.masterEnabled) return false;
  const kindEnabled = event.kind === 'goal'
    ? preferences.goals
    : event.kind === 'full-time'
      ? preferences.fullTime
      : event.kind === 'half-time'
        ? preferences.halfTime
        : event.kind === 'red-card'
          ? preferences.redCards
          : preferences.kickoffs && preferences.kickoffReminderMinutes === event.reminderMinutes;
  if (!kindEnabled) return false;
  if (!event.clubIds && !event.competitionIds) return true;
  return (preferences.majorMatches && (event.clubIds || []).some((id) => preferences.followedClubs.includes(id))) ||
    (event.competitionIds || []).some((id) => preferences.followedCompetitions.includes(id));
}

function createEvent(
  kind: NotificationEvent['kind'],
  match: StreamedMatch,
  body: string,
  now: number,
  extra: Pick<NotificationEvent, 'kickoffTime' | 'reminderMinutes'> = {}
): NotificationEvent {
  const discriminator = kind === 'goal'
    ? `${match.score?.home}-${match.score?.away}`
    : kind === 'kickoff'
      ? `${extra.kickoffTime}-${extra.reminderMinutes}`
      : kind === 'half-time'
        ? 'provider-half-time'
      : `${match.score?.home}-${match.score?.away}`;

  return {
    id: notificationId(`${kind}:${match.id}:${discriminator}`),
    kind,
    matchId: match.id,
    matchTitle: safeMatchTitle(match),
    body: body.slice(0, 200),
    url: `/match/${encodeURIComponent(match.id)}`,
    image: match.teams?.home?.badge || undefined,
    clubIds: matchPriorityClubIds(match),
    competitionIds: matchSelectedCompetitionIds(match),
    createdAt: now,
    ...extra
  };
}

export function detectMatchEvents(
  matches: StreamedMatch[],
  previousSnapshots: Record<string, MatchSnapshot>,
  preferences: NotificationPreferences[],
  now: number
): NotificationEvent[] {
  const events: NotificationEvent[] = [];
  const maxKickoffTime = now + MAX_KICKOFF_DAYS_AHEAD * 24 * 60 * 60_000;
  const reminderWindows = new Set(
    preferences
      .filter((preference) => preference.masterEnabled && preference.kickoffs)
      .map((preference) => preference.kickoffReminderMinutes)
      .filter((minutes) => KICKOFF_REMINDER_OPTIONS.includes(minutes))
  );

  for (const match of matches) {
    if (!stableMatchId(match.id)) continue;

    const previous = previousSnapshots[match.id];
    const previousMatch = previous?.match;
    const previousIsFresh = previous !== undefined &&
      Number.isSafeInteger(previous.observedAt) &&
      previous.observedAt <= now &&
      now - previous.observedAt <= MAX_SNAPSHOT_AGE_MS;
    const score = validScore(match.score) ? match.score : undefined;
    if (
      previousIsFresh &&
      previousMatch &&
      previousMatch.status !== 'halftime' &&
      match.status === 'halftime' &&
      match.statusSource === 'provider'
    ) {
      events.push(createEvent('half-time', match, `Half-time: ${safeMatchTitle(match)}${score ? ` (${score.home}–${score.away})` : ''}.`, now));
    }

    if (
      score &&
      previousIsFresh &&
      previousMatch &&
      (match.status === 'live' || match.status === 'halftime') &&
      (match.statusSource === 'provider' || match.statusSource === 'live-feed') &&
      validScore(previousMatch.score) &&
      score.home >= previousMatch.score.home &&
      score.away >= previousMatch.score.away &&
      (score.home > previousMatch.score.home || score.away > previousMatch.score.away)
    ) {
      events.push(createEvent('goal', match, formatScore(match, score.home, score.away), now));
    }

    if (
      score &&
      previousIsFresh &&
      previousMatch &&
      (previousMatch.status === 'live' || previousMatch.status === 'halftime') &&
      (previousMatch.statusSource === 'provider' || previousMatch.statusSource === 'live-feed') &&
      match.status === 'finished' &&
      match.statusSource === 'provider' &&
      validScore(previousMatch.score) &&
      score.home >= previousMatch.score.home &&
      score.away >= previousMatch.score.away
    ) {
      events.push(createEvent('full-time', match, `Full time: ${formatScore(match, score.home, score.away)}`, now));
    }

    const kickoffTime = match.kickoffTime;
    if (
      match.status !== 'scheduled' ||
      (match.statusSource !== 'provider' && match.statusSource !== 'inferred') ||
      match.timezone !== 'UTC' ||
      !Number.isSafeInteger(kickoffTime) ||
      kickoffTime! <= now ||
      kickoffTime! > maxKickoffTime
    ) continue;

    for (const minutes of reminderWindows) {
      const reminderTime = kickoffTime! - minutes * 60_000;
      if (now < reminderTime) continue;
      const minutesUntilKickoff = Math.max(1, Math.ceil((kickoffTime! - now) / 60_000));
      events.push(createEvent(
        'kickoff',
        match,
        `${safeMatchTitle(match)} kicks off in ${minutesUntilKickoff} minutes.`,
        now,
        { kickoffTime, reminderMinutes: minutes }
      ));
    }
  }

  return events;
}

export function isKickoffEventStillValid(
  event: NotificationEvent,
  match: StreamedMatch | undefined,
  now: number
): boolean {
  return event.kind !== 'kickoff' || Boolean(
    match &&
    match.status === 'scheduled' &&
    (match.statusSource === 'provider' || match.statusSource === 'inferred') &&
    match.timezone === 'UTC' &&
    match.kickoffTime === event.kickoffTime &&
    typeof event.kickoffTime === 'number' &&
    event.kickoffTime > now
  );
}

export async function enqueueDetectedEvents(
  events: NotificationEvent[],
  enqueue: (event: NotificationEvent) => Promise<boolean>
): Promise<number> {
  let added = 0;
  for (const event of events) {
    if (await enqueue(event)) added += 1;
  }
  return added;
}
