'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Smartphone } from 'lucide-react';

export default function MobileStreamPlayer({ src, title }: { src: string; title: string }) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [orientationNotice, setOrientationNotice] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supportsMatchMedia = typeof window.matchMedia === 'function';
    const isMobileDevice = supportsMatchMedia
      ? window.matchMedia('(pointer: coarse)').matches
      : /Android|iPhone|iPad|iPod/i.test(window.navigator?.userAgent || '');

    setMobile(isMobileDevice || /Android|iPhone|iPad|iPod/i.test(window.navigator?.userAgent || ''));

    function handleFullscreenChange() {
      if (typeof document === 'undefined') return;
      const fullscreen = document.fullscreenElement === playerRef.current;
      setIsFullscreen(fullscreen);

      if (fullscreen) {
        void lockLandscape();
      } else {
        unlockOrientation();
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
      unlockOrientation();
    };
  }, []);

  async function lockLandscape() {
    if (typeof window === 'undefined') return;

    try {
      const orientation = window.screen?.orientation as (ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      }) | undefined;

      if (!orientation || typeof orientation.lock !== 'function') return;

      await orientation.lock('landscape');
      setOrientationNotice('Landscape mode enabled');
    } catch {
      setOrientationNotice('Fullscreen active. Landscape rotation may depend on device settings.');
    }
  }

  function unlockOrientation() {
    if (typeof window === 'undefined') {
      setOrientationNotice('');
      return;
    }

    try {
      const orientation = window.screen?.orientation;
      if (orientation && typeof orientation.unlock === 'function') {
        void Promise.resolve(orientation.unlock()).catch(() => undefined);
      }
    } catch {
      // Some mobile browsers expose the API but reject unlock calls.
    }

    setOrientationNotice('');
  }

  async function toggleFullscreen() {
    if (typeof document === 'undefined' || !playerRef.current) return;

    const element = playerRef.current as HTMLDivElement & {
      requestFullscreen?: () => Promise<void>;
    };

    if (typeof element.requestFullscreen !== 'function') {
      setOrientationNotice('Fullscreen is unavailable in this browser.');
      return;
    }

    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
        return;
      }

      await element.requestFullscreen();
      await lockLandscape();
    } catch {
      setOrientationNotice('Fullscreen is unavailable in this browser.');
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!mobile || !playerRef.current || document.fullscreenElement) return;

    const element = playerRef.current as HTMLDivElement & {
      requestFullscreen?: () => Promise<void>;
    };

    if (typeof element.requestFullscreen !== 'function') {
      setOrientationNotice('Tap the fullscreen button to start landscape viewing.');
      return;
    }

    element.requestFullscreen()
      .then(() => lockLandscape())
      .catch(() => {
        setOrientationNotice('Tap the fullscreen button to start landscape viewing.');
      });
  }, [mobile]);

  return (
    <div ref={playerRef} className="group relative aspect-video w-full overflow-hidden bg-black md:aspect-auto md:h-[420px]">
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
        className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white opacity-100 transition hover:border-emerald-300 hover:bg-black/90"
      >
        {isFullscreen ? <Minimize2 size={18} strokeWidth={1.8} aria-hidden="true" /> : <Maximize2 size={18} strokeWidth={1.8} aria-hidden="true" />}
      </button>
      {mobile && orientationNotice ? <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] items-center gap-2 rounded-full border border-white/15 bg-black/75 px-3 py-2 text-xs text-white"><Smartphone size={14} strokeWidth={1.8} aria-hidden="true" />{orientationNotice}</div> : null}
    </div>
  );
}
