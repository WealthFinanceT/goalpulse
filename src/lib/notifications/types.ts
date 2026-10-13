import type { PushSubscription } from 'web-push';
import { PRIORITY_CLUBS } from './catalog';

export const KICKOFF_REMINDER_OPTIONS = [5, 10, 15, 30, 60] as const;

export type KickoffReminderMinutes = (typeof KICKOFF_REMINDER_OPTIONS)[number];

export type NotificationPreferences = {
  masterEnabled: boolean;
  goals: boolean;
  kickoffs: boolean;
  redCards: boolean;
  halfTime: boolean;
  fullTime: boolean;
  majorMatches: boolean;
  kickoffReminderMinutes: KickoffReminderMinutes;
  followedClubs: string[];
  followedCompetitions: string[];
};

export type StoredSubscription = {
  id: string;
  subscription: PushSubscription;
  preferences: NotificationPreferences;
  createdAt: number;
  updatedAt: number;
};

export type MatchSnapshot = {
  match: {
    id: string;
    title: string;
    status: string;
    statusSource: string;
    kickoffTime?: number;
    timezone?: string;
    score?: { home?: number; away?: number };
    competition?: { id: string; name: string };
    teams?: { home?: { id?: string; name?: string; badge?: string }; away?: { id?: string; name?: string; badge?: string } };
  };
  observedAt: number;
};

export type NotificationEventKind = 'goal' | 'kickoff' | 'red-card' | 'half-time' | 'full-time';

export type NotificationEvent = {
  id: string;
  kind: NotificationEventKind;
  matchId: string;
  matchTitle: string;
  body: string;
  url: string;
  kickoffTime?: number;
  reminderMinutes?: KickoffReminderMinutes;
  image?: string;
  clubIds?: string[];
  competitionIds?: string[];
  createdAt: number;
};

export type PendingNotificationEvent = {
  event: NotificationEvent;
  cursor: string;
  retryIds: string[];
  attempt: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  masterEnabled: true,
  goals: true,
  kickoffs: true,
  redCards: false,
  halfTime: true,
  fullTime: true,
  majorMatches: true,
  kickoffReminderMinutes: 15,
  followedClubs: PRIORITY_CLUBS.map((club) => club.id),
  followedCompetitions: []
};
