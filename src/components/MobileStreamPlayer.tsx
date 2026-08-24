'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Smartphone } from 'lucide-react';

export default function MobileStreamPlayer({ src, title }: { src: string; title: string }) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [orientationNotice, setOrientationNotice] = useState('');

  useEffect(() => {
    const isMobileDevice = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setMobile(isMobileDevice);

    function handleFullscreenChange() {
      const fullscreen = document.fullscreenElement === playerRef.current;
      setIsFullscreen(fullscreen);
      if (fullscreen) {
        lockLandscape();
      } else {
        unlockOrientation();
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      unlockOrientation();
    };
  }, []);

  async function lockLandscape() {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      };
      if (orientation.lock) {
        await orientation.lock('landscape');
        setOrientationNotice('Landscape mode enabled');
      }
    } catch {
      setOrientationNotice('Fullscreen active. Landscape rotation may depend on device settings.');
    }
  }

  function unlockOrientation() {
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Some iOS browsers expose orientation APIs but reject unlock calls.
    }
    setOrientationNotice('');
  }

  async function toggleFullscreen() {
    if (!playerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await playerRef.current.requestFullscreen();
      await lockLandscape();
    } catch {
      setOrientationNotice('Fullscreen is unavailable in this browser.');
    }
  }

  useEffect(() => {
    if (!mobile || !playerRef.current || document.fullscreenElement) return;

    playerRef.current.requestFullscreen().then(lockLandscape).catch(() => {
      setOrientationNotice('Tap the fullscreen button to start landscape viewing.');
    });
  }, [mobile]);

  return (
    <div ref={playerRef} className="group relative aspect-video w-full overflow-hidden bg-black md:aspect-auto md:h-[420px]">
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; orientation-lock"
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
