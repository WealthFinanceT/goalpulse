'use client';

import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const DISMISS_KEY = 'goal-pulse-install-dismissed';

function isStandalone() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  return ios && safari && !isStandalone();
}

export default function PwaInstall() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installError, setInstallError] = useState('');

  useEffect(() => {
    const standalone = isStandalone();
    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(standalone || wasDismissed);
    if (standalone) window.localStorage.setItem(DISMISS_KEY, 'true');

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
        console.error('Goal Pulse service worker registration failed.', error);
      });
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const installed = () => {
      window.localStorage.setItem(DISMISS_KEY, 'true');
      setInstallEvent(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', capturePrompt); window.removeEventListener('appinstalled', installed); };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
    setShowIosHelp(false);
  }

  async function install() {
    if (installEvent) {
      setInstallError('');
      try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        setInstallEvent(null);
        if (choice.outcome === 'dismissed') dismiss();
        else {
          window.localStorage.setItem(DISMISS_KEY, 'true');
          setDismissed(true);
        }
      } catch (error) {
        console.error('Goal Pulse installation prompt failed.', error);
        setInstallError('Installation could not be started. Please try again.');
      }
      return;
    }
    if (isIosSafari()) setShowIosHelp(true);
  }

  if (dismissed || (!installEvent && !isIosSafari())) return null;
  return (
    <div
      aria-live="polite"
      className="safe-area-floating-panel fixed z-[90] mx-auto max-w-sm rounded-2xl border border-emerald-400/25 bg-[#071018]/95 p-3 shadow-[0_18px_45px_rgba(2,6,23,0.65)] backdrop-blur-xl"
    >
      {showIosHelp ? (
        <div className="pr-6 text-sm leading-5 text-slate-200">
          <p className="font-semibold text-white">Install Goal Pulse</p>
          <p className="mt-1">
            In Safari, tap <Share2 className="mx-0.5 inline h-4 w-4 text-emerald-300" aria-hidden="true" /> Share,
            then choose <strong>Add to Home Screen</strong>.
          </p>
        </div>
      ) : (
        <button type="button" onClick={install} className="flex w-full items-center gap-3 text-left">
          <Image src="/icon-192.png?v=b7d32ecd308c" alt="" aria-hidden="true" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          <span>
            <span className="block text-sm font-semibold text-white">Install Goal Pulse</span>
            <span className="flex items-center gap-1 text-xs text-slate-400"><Download size={12} aria-hidden="true" /> Add Goal Pulse to your phone.</span>
          </span>
        </button>
      )}
      {installError ? <p className="mt-2 text-xs text-rose-300">{installError}</p> : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
