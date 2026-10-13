'use client';

import Image from 'next/image';
import { Bell, CircleCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences
} from '@/lib/notifications/types';

type BrowserPushSubscription = PushSubscription;
const DISMISS_KEY = 'goal-pulse-notifications-prompt-dismissed';

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandaloneApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
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

export default function MobileNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const supported = window.isSecureContext
      && 'Notification' in window
      && 'serviceWorker' in navigator
      && 'PushManager' in window;

    if (!isMobile || !supported || Notification.permission !== 'default') return;
    if (isIosDevice() && !isStandaloneApp()) return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  }

  async function enableNotifications() {
    setBusy(true);
    setError('');
    let createdSubscription: BrowserPushSubscription | null = null;

    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by this browser.');
      }

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');

      const keyResponse = await fetch('/api/notifications/vapid-key', { cache: 'no-store' });
      if (!keyResponse.ok) throw new Error(await getResponseError(keyResponse, 'Web Push is not configured on the server.'));
      const { publicKey } = await keyResponse.json() as { publicKey?: string };
      if (!publicKey) throw new Error('The server did not provide a Web Push public key.');

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(publicKey)
        });
        createdSubscription = subscription;
      }

      const response = await fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES } satisfies NotificationPreferences
        })
      });
      if (!response.ok) throw new Error(await getResponseError(response, 'Could not enable notifications.'));

      window.localStorage.setItem(DISMISS_KEY, 'enabled');
      setEnabled(true);
      setVisible(false);
    } catch (enableError) {
      console.error('Unable to enable Goal Pulse notifications from the mobile prompt.', enableError);
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

  if (enabled) {
    return (
      <div role="status" className="safe-area-status-banner fixed z-[110] mx-auto flex max-w-sm items-center gap-2 rounded-xl border border-emerald-400/25 bg-[#071018]/95 p-3 text-sm font-medium text-emerald-200 shadow-xl">
        <CircleCheck size={17} aria-hidden="true" /> Match alerts are enabled on this device.
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className="safe-area-overlay fixed inset-0 z-[110] flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="mobile-notification-title" className="relative w-full max-w-sm rounded-2xl border border-emerald-400/25 bg-[#0d1713] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.65)] sm:p-6">
        <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white">
          <X size={18} aria-hidden="true" />
        </button>
        <Image src="/icon-192.png" alt="" aria-hidden="true" width={52} height={52} className="h-[52px] w-[52px] rounded-xl object-cover" priority />
        <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-300">Matchday, covered</p>
        <h2 id="mobile-notification-title" className="mt-2 pr-7 text-xl font-bold tracking-tight text-white">Turn on match alerts</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Get goal updates, kickoff reminders and full-time results on your phone.
        </p>
        {error ? <p role="alert" className="mt-3 text-sm leading-5 text-rose-300">{error}</p> : null}
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={() => void enableNotifications()} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-[#03160d] transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
            <Bell size={17} aria-hidden="true" />{busy ? 'Enabling alerts…' : 'Enable notifications'}
          </button>
          <button type="button" onClick={dismiss} className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            Not now
          </button>
        </div>
        <p className="mt-3 text-center text-[0.68rem] leading-5 text-slate-500">You can change your alert preferences any time in Settings.</p>
      </section>
    </div>
  );
}
