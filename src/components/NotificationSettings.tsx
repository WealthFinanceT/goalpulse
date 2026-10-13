'use client';

import { useEffect, useState } from 'react';
import { AlarmClock, Bell, CircleCheck, CircleX, Goal } from 'lucide-react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  KICKOFF_REMINDER_OPTIONS,
  type NotificationPreferences
} from '@/lib/notifications/types';
import { NOTIFICATION_COMPETITIONS, PRIORITY_CLUBS } from '@/lib/notifications/catalog';
import {
  notificationPermissionMessage,
  type NotificationPermissionState
} from '@/lib/notifications/browser';

type BrowserPushSubscription = PushSubscription;

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandaloneApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function decodeApplicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function getResponseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    return typeof body.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermissionState>('unsupported');
  const [preferences, setPreferences] = useState<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [subscription, setSubscription] = useState<BrowserPushSubscription | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [iosInstallRequired, setIosInstallRequired] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadSubscription() {
      const supported = 'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
      if (!supported) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);
      const iosNeedsInstall = isIosDevice() && !isStandaloneApp();
      setIosInstallRequired(iosNeedsInstall);
      if (iosNeedsInstall) {
        setLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const currentSubscription = await registration.pushManager.getSubscription();
        if (!active) return;
        setSubscription(currentSubscription);
        if (!currentSubscription) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/notifications/subscriptions/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: currentSubscription.toJSON() })
        });
        if (!response.ok) throw new Error(await getResponseError(response, 'Could not load notification settings.'));
        const result = await response.json() as { enabled: boolean; preferences?: NotificationPreferences };
        if (!active) return;
        setEnabled(result.enabled);
        if (result.preferences) setPreferences(result.preferences);
      } catch (loadError) {
        if (active) {
          console.error('Unable to load Goal Pulse notification settings.', loadError);
          setError(loadError instanceof Error ? loadError.message : 'Could not load notification settings.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSubscription();
    return () => { active = false; };
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setError('');
    setMessage('');
    let createdSubscription: BrowserPushSubscription | null = null;
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPermission('unsupported');
        setError(notificationPermissionMessage('unsupported'));
        return;
      }

      if (isIosDevice() && !isStandaloneApp()) {
        setIosInstallRequired(true);
        setError('Add Goal Pulse to your Home Screen, open the installed app, and enable notifications there.');
        return;
      }

      let nextPermission = Notification.permission;
      if (nextPermission === 'default') nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission === 'denied') {
        setError(notificationPermissionMessage('denied'));
        return;
      }
      if (nextPermission !== 'granted') {
        setError('Notification permission was not granted.');
        return;
      }

      const keyResponse = await fetch('/api/notifications/vapid-key', { cache: 'no-store' });
      if (!keyResponse.ok) throw new Error(await getResponseError(keyResponse, 'Web Push is not configured on the server.'));
      const { publicKey } = await keyResponse.json() as { publicKey?: string };
      if (!publicKey) throw new Error('The server did not provide a Web Push public key.');

      const registration = await navigator.serviceWorker.ready;
      let currentSubscription = await registration.pushManager.getSubscription();
      if (!currentSubscription) {
        currentSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey)
        });
        createdSubscription = currentSubscription;
      }

      const response = await fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: currentSubscription.toJSON(), preferences })
      });
      if (!response.ok) throw new Error(await getResponseError(response, 'Could not enable notifications.'));

      setSubscription(currentSubscription);
      setEnabled(true);
      setPermission('granted');
      setMessage('This device is subscribed. Alert delivery depends on the server monitoring schedule and push service.');
    } catch (enableError) {
      console.error('Unable to enable Goal Pulse notifications.', enableError);
      if (createdSubscription) {
        try {
          await createdSubscription.unsubscribe();
        } catch (unsubscribeError) {
          console.error('Unable to roll back an unregistered push subscription.', unsubscribeError);
        }
      }
      setError(enableError instanceof Error ? enableError.message : 'Unable to enable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function disableNotifications() {
    if (!subscription) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/notifications/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
      if (!response.ok) throw new Error(await getResponseError(response, 'Could not disable notifications.'));
      setSubscription(null);
      setEnabled(false);
      await subscription.unsubscribe();
      setMessage('Notifications have been disabled on this device.');
    } catch (disableError) {
      console.error('Unable to disable Goal Pulse notifications.', disableError);
      setError(disableError instanceof Error ? disableError.message : 'Unable to disable notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function updatePreferences(nextPreferences: NotificationPreferences) {
    const previousPreferences = preferences;
    setPreferences(nextPreferences);
    setError('');
    if (!enabled || !subscription) return;

    setBusy(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON(),
          preferences: nextPreferences
        })
      });
      if (!response.ok) throw new Error(await getResponseError(response, 'Could not save notification preferences.'));
      setMessage('Notification preferences saved.');
    } catch (preferenceError) {
      console.error('Unable to save Goal Pulse notification preferences.', preferenceError);
      setPreferences(previousPreferences);
      setError(preferenceError instanceof Error ? preferenceError.message : 'Could not save notification preferences.');
    } finally {
      setBusy(false);
    }
  }

  const available = permission !== 'unsupported' && !iosInstallRequired;
  const canDisable = enabled || Boolean(subscription && permission === 'denied');
  const permissionLabel = iosInstallRequired
    ? 'Install required'
    : permission === 'unsupported'
      ? 'Unsupported'
      : permission === 'denied'
        ? 'Blocked'
        : enabled
          ? preferences.masterEnabled ? 'Enabled' : 'Paused'
          : 'Not enabled';

  return (
    <section id="notifications" className="scroll-mt-6 rounded-[24px] border border-emerald-400/20 bg-[#071018]/95 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            <Bell size={15} aria-hidden="true" /> Notifications
          </p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">Match alerts, your way</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Choose the updates for this device. Alert delivery requires server-side Web Push, persistent storage, and scheduled monitoring to be configured.
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          permissionLabel === 'Enabled'
            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
            : permissionLabel === 'Blocked'
              ? 'border-rose-400/25 bg-rose-500/10 text-rose-200'
              : 'border-white/10 bg-white/[0.04] text-slate-300'
        }`}>
          {permissionLabel === 'Enabled' ? <CircleCheck size={14} aria-hidden="true" /> : null}
          {permissionLabel}
        </span>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-[#0a1320] p-4">
        <input
          type="checkbox"
          checked={preferences.masterEnabled}
          disabled={loading || busy || !available}
          onChange={(event) => void updatePreferences({ ...preferences, masterEnabled: event.target.checked })}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">All notifications</span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">Pause or resume every alert on this device without removing its subscription.</span>
        </span>
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {([
          { key: 'goals', title: 'Goal alerts', description: 'When a live match score increases.', icon: Goal },
          { key: 'kickoffs', title: 'Kickoff reminders', description: 'A reminder before a scheduled match.', icon: AlarmClock },
          { key: 'halfTime', title: 'Half-time', description: 'When the provider explicitly reports the half-time break.', icon: CircleCheck },
          { key: 'fullTime', title: 'Full-time results', description: 'When the provider confirms full time.', icon: CircleCheck },
          { key: 'majorMatches', title: 'Major-match alerts', description: 'Include selected priority clubs below.', icon: Bell }
        ] as const).map(({ key, title, description, icon: Icon }) => (
          <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-[#0a1320] p-4 transition hover:border-emerald-400/30 ${busy ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              checked={preferences[key]}
              disabled={loading || busy || !available}
              onChange={(event) => void updatePreferences({ ...preferences, [key]: event.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-white"><Icon size={16} className="text-emerald-300" aria-hidden="true" />{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            </span>
          </label>
        ))}
        <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#0a1320] p-4 opacity-70">
          <input type="checkbox" checked={preferences.redCards} disabled aria-label="Red-card alerts unavailable" className="mt-1 h-4 w-4 shrink-0 accent-emerald-400" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">Red cards</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">Unavailable: the current football feed does not provide a match event timeline.</span>
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-[#0a1320] p-4">
        <h3 className="text-sm font-semibold text-white">Priority clubs</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Choose which major-club matches can trigger alerts. At least one selected club must be playing unless you follow a competition below.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PRIORITY_CLUBS.map((club) => {
            const checked = preferences.followedClubs.includes(club.id);
            return (
              <label key={club.id} className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-white/5 px-2.5 py-2 text-xs text-slate-200 hover:border-emerald-400/25">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={loading || busy || !available}
                  onChange={() => void updatePreferences({
                    ...preferences,
                    followedClubs: checked
                      ? preferences.followedClubs.filter((id) => id !== club.id)
                      : [...preferences.followedClubs, club.id]
                  })}
                  className="h-4 w-4 shrink-0 accent-emerald-400"
                />
                <span className="truncate">{club.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-[#0a1320] p-4">
        <h3 className="text-sm font-semibold text-white">Follow competitions</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Competition alerts are matched only when the provider identifies the competition reliably.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {NOTIFICATION_COMPETITIONS.map((competition) => {
            const checked = preferences.followedCompetitions.includes(competition.id);
            return (
              <label key={competition.id} className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-white/5 px-2.5 py-2 text-xs text-slate-200 hover:border-emerald-400/25">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={loading || busy || !available}
                  onChange={() => void updatePreferences({
                    ...preferences,
                    followedCompetitions: checked
                      ? preferences.followedCompetitions.filter((id) => id !== competition.id)
                      : [...preferences.followedCompetitions, competition.id]
                  })}
                  className="h-4 w-4 shrink-0 accent-emerald-400"
                />
                <span className="truncate">{competition.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#0a1320] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="kickoff-reminder-minutes" className="text-sm font-semibold text-white">Kickoff reminder time</label>
          <p className="mt-1 text-xs text-slate-400">The default reminder is 15 minutes before kickoff.</p>
        </div>
        <select
          id="kickoff-reminder-minutes"
          value={preferences.kickoffReminderMinutes}
          disabled={loading || busy || !available}
          onChange={(event) => void updatePreferences({
            ...preferences,
            kickoffReminderMinutes: Number(event.target.value) as NotificationPreferences['kickoffReminderMinutes']
          })}
          className="rounded-xl border border-white/10 bg-[#071018] px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {KICKOFF_REMINDER_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>{minutes} minutes</option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {canDisable ? (
          <button
            type="button"
            onClick={() => void disableNotifications()}
            disabled={busy || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-wait disabled:opacity-60"
          >
            <CircleX size={17} aria-hidden="true" /> {busy ? 'Updating…' : 'Disable and unsubscribe'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void enableNotifications()}
            disabled={busy || loading || !available}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-[#04150d] shadow-[0_10px_25px_rgba(0,232,152,0.18)] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
          >
            <Bell size={17} aria-hidden="true" /> {busy ? 'Enabling…' : loading ? 'Checking device…' : 'Enable Notifications'}
          </button>
        )}
        <p className="text-xs leading-5 text-slate-400" role="status">
          {iosInstallRequired
            ? 'On iPhone or iPad, add Goal Pulse to your Home Screen and open the installed app to enable Web Push (iOS/iPadOS 16.4 or later).'
            : permission === 'denied'
              ? notificationPermissionMessage(permission)
              : !available
                ? notificationPermissionMessage(permission)
                : notificationPermissionMessage(permission)}
        </p>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Browser, operating-system, Focus, and battery settings can override website preferences. Kickoff alerts use provider kickoff times; delivery timing depends on the scheduled monitoring job and push service.
      </p>
      {message ? <p role="status" className="mt-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
