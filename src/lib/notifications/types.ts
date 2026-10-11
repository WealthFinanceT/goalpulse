import type { PushSubscription } from 'web-push';

export const KICKOFF_REMINDER_OPTIONS = [5, 10, 15, 30, 60] as const;

export type KickoffReminderMinutes = (typeof KICKOFF_REMINDER_OPTIONS)[number];

export type NotificationPreferences = {
  goals: boolean;
  kickoffs: boolean;
  fullTime: boolean;
  kickoffReminderMinutes: KickoffReminderMinutes;
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
    teams?: { home?: { name?: string }; away?: { name?: string } };
  };
  observedAt: number;
};

export type NotificationEventKind = 'goal' | 'kickoff' | 'full-time';

export type NotificationEvent = {
  id: string;
  kind: NotificationEventKind;
  matchId: string;
  matchTitle: string;
  body: string;
  url: string;
  kickoffTime?: number;
  reminderMinutes?: KickoffReminderMinutes;
  createdAt: number;
};

export type PendingNotificationEvent = {
  event: NotificationEvent;
  cursor: string;
  retryIds: string[];
  attempt: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  goals: true,
  kickoffs: true,
  fullTime: true,
  kickoffReminderMinutes: 15
};
