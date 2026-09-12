'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type Hls from 'hls.js';

type StreamKind = 'iframe' | 'hls' | 'mp4';

function detectStreamKind(src: string): StreamKind {
  try {
    const url = new URL(src);
    const value = `${url.pathname}${url.search}`;
    if (/\.m3u8(?:$|[?#])/i.test(value) || /(?:^|[?&])(?:format|type)=hls(?:&|$)/i.test(value)) return 'hls';
    if (/\.mp4(?:$|[?#])/i.test(value)) return 'mp4';
    if (url.pathname.includes('/embed/')) return 'iframe';
  } catch {}
  return 'iframe';
}

export default function MobileStreamPlayer({ src, title, streamKind, onPlaybackError }: { src: string; title: string; streamKind?: StreamKind; onPlaybackError?: (message: string) => void }) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playbackErrorRef = useRef(onPlaybackError);
  const recoveryCountRef = useRef(0);
  const iframeTimerRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const resolvedStreamKind = streamKind || detectStreamKind(src);
  playbackErrorRef.current = onPlaybackError;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
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

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    if (iframeTimerRef.current !== null) window.clearTimeout(iframeTimerRef.current);
    setIsLoading(true);
    setErrorMessage('');
    recoveryCountRef.current = 0;

    const reportError = (message: string) => {
      if (cancelled) return;
      if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] stream playback error', { kind: resolvedStreamKind, src, message });
      setIsLoading(false);
      setErrorMessage(message);
      playbackErrorRef.current?.(message);
    };

    if (resolvedStreamKind === 'iframe') {
      iframeTimerRef.current = window.setTimeout(() => reportError('The stream embed did not respond. The provider may be blocking this browser or the source may have expired.'), 15_000);
      return () => {
        cancelled = true;
        if (iframeTimerRef.current !== null) window.clearTimeout(iframeTimerRef.current);
      };
    }

    if (!video) return;

    if (resolvedStreamKind === 'mp4' || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return () => {
        cancelled = true;
        video.removeAttribute('src');
        video.load();
      };
    }

    let hls: Hls | null = null;
    void import('hls.js').then(({ default: HlsPlayer }) => {
      if (cancelled) return;
      if (!HlsPlayer.isSupported()) {
        reportError('This browser cannot play this HLS stream. Try another source.');
        return;
      }

      hls = new HlsPlayer({
        enableWorker: true,
        backBufferLength: 30,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 2
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
        if (cancelled || !data.fatal) return;
        if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] HLS error', { kind: resolvedStreamKind, src, type: data.type, details: data.details });
        if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR && recoveryCountRef.current < 1) {
          recoveryCountRef.current += 1;
          hls?.recoverMediaError();
          return;
        }
        if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR && recoveryCountRef.current < 2) {
          recoveryCountRef.current += 1;
          hls?.startLoad();
          return;
        }
        reportError('The HLS stream failed. It may be unavailable, expired, or blocked by the provider.');
      });
    }).catch(() => reportError('The HLS player could not be loaded. Try another source.'));

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [retryToken, resolvedStreamKind, src]);

  function retryStream() {
    setErrorMessage('');
    setRetryToken((token) => token + 1);
  }

  async function toggleFullscreen() {
    if (typeof document === 'undefined' || !playerRef.current) return;

    const video = videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void } | null;
    if (video?.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen();
      return;
    }

    const element = playerRef.current as HTMLDivElement & {
      requestFullscreen?: () => Promise<void>;
    };

    if (typeof element.requestFullscreen !== 'function') return;
    try {
      await element.requestFullscreen();
    } catch {}
  }

  return (
    <div ref={playerRef} className="group relative aspect-video w-full overflow-hidden bg-black">
      {resolvedStreamKind === 'iframe' ? (
        <iframe
          key={src}
          src={src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => {
            if (iframeTimerRef.current !== null) window.clearTimeout(iframeTimerRef.current);
            setIsLoading(false);
          }}
          className="h-full w-full border-0"
        />
      ) : (
        <video
          ref={videoRef}
          title={title}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
          onLoadedData={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            const message = 'The stream could not be played. It may be unavailable, expired, or blocked by the provider.';
            if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] native video error', { kind: resolvedStreamKind, src, code: videoRef.current?.error?.code });
            setErrorMessage(message);
            playbackErrorRef.current?.(message);
          }}
        />
      )}
      {isLoading && !errorMessage ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 px-4 text-center text-sm text-slate-200">Loading stream...</div> : null}
      {errorMessage ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#05070d] px-5 text-center">
          <p className="text-sm text-slate-200">{errorMessage}</p>
          <button type="button" onClick={retryStream} className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200">Retry stream</button>
        </div>
      ) : null}
      <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white opacity-100 transition hover:border-emerald-300 hover:bg-black/90"
        >
          {isFullscreen ? <Minimize2 size={18} strokeWidth={1.8} aria-hidden="true" /> : <Maximize2 size={18} strokeWidth={1.8} aria-hidden="true" />}
      </button>
    </div>
  );
}
