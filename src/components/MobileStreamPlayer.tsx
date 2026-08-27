'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export default function MobileStreamPlayer({ src, title }: { src: string; title: string }) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator?.userAgent || '';
    setIsIOS(/iPhone|iPad|iPod/i.test(userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent)));

    function handleFullscreenChange() {
      if (typeof document === 'undefined') return;
      const fullscreen = document.fullscreenElement === playerRef.current;
      setIsFullscreen(fullscreen);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
    };
  }, []);

  async function toggleFullscreen() {
    if (typeof document === 'undefined' || !playerRef.current) return;

    const element = playerRef.current as HTMLDivElement & {
      requestFullscreen?: () => Promise<void>;
    };

    if (typeof element.requestFullscreen !== 'function') return;

    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
        return;
      }

      await element.requestFullscreen();
    } catch {}
  }

  return (
    <div ref={playerRef} className="group relative aspect-video w-full overflow-hidden bg-black md:aspect-auto md:h-[420px]">
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
      {!isIOS ? (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
          className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white opacity-100 transition hover:border-emerald-300 hover:bg-black/90"
        >
          {isFullscreen ? <Minimize2 size={18} strokeWidth={1.8} aria-hidden="true" /> : <Maximize2 size={18} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}
