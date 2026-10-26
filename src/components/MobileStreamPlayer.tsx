'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react';
import type Hls from 'hls.js';
import type { MediaPlayerClass } from 'dashjs';
import { getSavedPlaybackPosition, getPlaybackPositionKey } from '@/lib/stream-player-state';
import { supportsPictureInPicture } from '@/lib/media-capabilities';
import type { StreamKind } from '@/lib/streaming/types';

export type { StreamKind } from '@/lib/streaming/types';

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

export default function MobileStreamPlayer({ src, title, streamKind, matchId, isLive, onPlaybackError }: { src: string; title: string; streamKind?: StreamKind; matchId: string; isLive: boolean; onPlaybackError?: (message: string) => void }) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<MediaPlayerClass | null>(null);
  const playbackErrorRef = useRef(onPlaybackError);
  const recoveryCountRef = useRef(0);
  const iframeTimerRef = useRef<number | null>(null);
  const iframeTimeoutRemainingRef = useRef(15_000);
  const iframeTimerStartedAtRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPictureSupported, setIsPictureInPictureSupported] = useState(false);
  const [isPictureInPictureActive, setIsPictureInPictureActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [fullscreenMessage, setFullscreenMessage] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const resolvedStreamKind = streamKind || detectStreamKind(src);
  playbackErrorRef.current = onPlaybackError;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    }
    function handleNativeFullscreenChange(event: Event) {
      setIsFullscreen(event.type === 'webkitbeginfullscreen');
    }

    const video = videoRef.current;
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    }
    video?.addEventListener('webkitbeginfullscreen', handleNativeFullscreenChange);
    video?.addEventListener('webkitendfullscreen', handleNativeFullscreenChange);

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
      video?.removeEventListener('webkitbeginfullscreen', handleNativeFullscreenChange);
      video?.removeEventListener('webkitendfullscreen', handleNativeFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const isSupported = resolvedStreamKind !== 'iframe'
      && supportsPictureInPicture(document.pictureInPictureEnabled, video?.requestPictureInPicture);
    setIsPictureInPictureSupported(isSupported);
    if (!video || !isSupported) {
      setIsPictureInPictureActive(false);
      return;
    }

    const updatePictureInPictureState = () => {
      setIsPictureInPictureActive(document.pictureInPictureElement === video);
    };
    video.addEventListener('enterpictureinpicture', updatePictureInPictureState);
    video.addEventListener('leavepictureinpicture', updatePictureInPictureState);
    updatePictureInPictureState();

    return () => {
      video.removeEventListener('enterpictureinpicture', updatePictureInPictureState);
      video.removeEventListener('leavepictureinpicture', updatePictureInPictureState);
    };
  }, [resolvedStreamKind]);

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    dashRef.current?.reset();
    dashRef.current = null;
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
      iframeTimeoutRemainingRef.current = 15_000;
      iframeTimerStartedAtRef.current = null;

      const stopIframeTimer = () => {
        if (iframeTimerRef.current === null) return;
        window.clearTimeout(iframeTimerRef.current);
        iframeTimerRef.current = null;
        if (iframeTimerStartedAtRef.current !== null) {
          iframeTimeoutRemainingRef.current = Math.max(
            0,
            iframeTimeoutRemainingRef.current - (Date.now() - iframeTimerStartedAtRef.current)
          );
          iframeTimerStartedAtRef.current = null;
        }
      };
      const startIframeTimer = () => {
        if (iframeTimerRef.current !== null || iframeTimeoutRemainingRef.current <= 0 || document.visibilityState === 'hidden') return;
        iframeTimerStartedAtRef.current = Date.now();
        iframeTimerRef.current = window.setTimeout(() => {
          iframeTimerRef.current = null;
          iframeTimerStartedAtRef.current = null;
          iframeTimeoutRemainingRef.current = 0;
          reportError('The stream embed did not respond. The provider may be blocking this browser or the source may have expired.');
        }, iframeTimeoutRemainingRef.current);
      };
      const suspendIframeTimer = () => stopIframeTimer();
      const resumeIframeTimer = () => startIframeTimer();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') suspendIframeTimer();
        else resumeIframeTimer();
      };

      startIframeTimer();
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', suspendIframeTimer);
      window.addEventListener('pageshow', resumeIframeTimer);
      window.addEventListener('blur', suspendIframeTimer);
      window.addEventListener('focus', resumeIframeTimer);

      return () => {
        cancelled = true;
        stopIframeTimer();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', suspendIframeTimer);
        window.removeEventListener('pageshow', resumeIframeTimer);
        window.removeEventListener('blur', suspendIframeTimer);
        window.removeEventListener('focus', resumeIframeTimer);
      };
    }

    if (!video) return;

    if (resolvedStreamKind === 'mp4' || (resolvedStreamKind === 'hls' && video.canPlayType('application/vnd.apple.mpegurl'))) {
      video.src = src;
      return () => {
        cancelled = true;
        dashRef.current?.reset();
        dashRef.current = null;
        video.removeAttribute('src');
        video.load();
      };
    }

    if (resolvedStreamKind === 'dash') {
      void import('dashjs').then(({ MediaPlayer, supportsMediaSource }) => {
        if (cancelled) return;
        if (!supportsMediaSource()) {
          reportError('This browser cannot play DASH streams.');
          return;
        }

        const player = MediaPlayer().create();
        dashRef.current = player;
        player.on(MediaPlayer.events.ERROR, () => {
          reportError('The DASH stream failed. It may be unavailable, expired, or blocked by the provider.');
        });
        player.initialize(video, src, false);
      }).catch(() => reportError('The DASH player could not be loaded. Try again later.'));

      return () => {
        cancelled = true;
        dashRef.current?.reset();
        dashRef.current = null;
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
      dashRef.current?.reset();
      dashRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [retryToken, resolvedStreamKind, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || resolvedStreamKind === 'iframe') return;

    const positionKey = getPlaybackPositionKey(matchId, src);
    let lastSavedPosition = -1;

    const savePlaybackPosition = () => {
      if (isLive || !Number.isFinite(video.duration) || video.duration <= 0 || !Number.isFinite(video.currentTime)) return;
      const position = Math.floor(video.currentTime);
      if (position <= 0 || position === lastSavedPosition) return;
      try {
        window.localStorage.setItem(positionKey, String(position));
        lastSavedPosition = position;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] could not save video position', error);
      }
    };
    const restorePlaybackPosition = () => {
      if (isLive || !Number.isFinite(video.duration) || video.duration <= 0) return;
      let savedPosition: number | null;
      try {
        savedPosition = getSavedPlaybackPosition(window.localStorage.getItem(positionKey));
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] could not read video position', error);
        return;
      }
      if (savedPosition === null || savedPosition <= 0 || savedPosition >= video.duration) return;
      try {
        video.currentTime = savedPosition;
        lastSavedPosition = savedPosition;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] could not restore video position', error);
      }
    };
    const refreshMediaPosition = () => {
      if (isLive || !Number.isFinite(video.duration) || video.duration <= 0 || !('mediaSession' in navigator)) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: video.duration,
          playbackRate: video.playbackRate,
          position: Math.min(video.currentTime, video.duration)
        });
      } catch {
        // Some browsers expose Media Session without supporting position state.
      }
    };
    const handleHidden = () => savePlaybackPosition();
    const handleVisibleAgain = () => refreshMediaPosition();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleHidden();
      else handleVisibleAgain();
    };

    video.addEventListener('loadedmetadata', restorePlaybackPosition);
    video.addEventListener('timeupdate', savePlaybackPosition);
    video.addEventListener('seeked', savePlaybackPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleHidden);
    window.addEventListener('pageshow', handleVisibleAgain);
    window.addEventListener('blur', handleHidden);
    window.addEventListener('focus', handleVisibleAgain);

    const mediaSession = 'mediaSession' in navigator ? navigator.mediaSession : null;
    let mediaSessionPlaybackStateAssigned = false;
    const syncMediaSessionPlaybackState = () => {
      if (!mediaSession) return;
      try {
        mediaSession.playbackState = !video.currentSrc
          ? 'none'
          : video.paused || video.ended
            ? 'paused'
            : 'playing';
        mediaSessionPlaybackStateAssigned = true;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] could not update media session playback state', error);
      }
    };
    video.addEventListener('play', syncMediaSessionPlaybackState);
    video.addEventListener('pause', syncMediaSessionPlaybackState);
    video.addEventListener('ended', syncMediaSessionPlaybackState);
    syncMediaSessionPlaybackState();

    const metadata = typeof MediaMetadata !== 'undefined' ? new MediaMetadata({ title }) : null;
    let metadataAssigned = false;
    if (mediaSession && metadata) {
      try {
        mediaSession.metadata = metadata;
        metadataAssigned = true;
      } catch {
        // Some browsers expose Media Session without supporting metadata.
      }
    }

    const mediaActions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => { void video.play().catch((error: unknown) => {
        if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] media session play action failed', error);
      }); }],
      ['pause', () => video.pause()]
    ];
    if (!isLive) {
      mediaActions.push(
        ['seekbackward', (details) => {
          if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, video.currentTime - (details.seekOffset || 10));
        }],
        ['seekforward', (details) => {
          if (Number.isFinite(video.duration)) video.currentTime = Math.min(video.duration, video.currentTime + (details.seekOffset || 10));
        }],
        ['seekto', (details) => {
          if (typeof details.seekTime === 'number' && Number.isFinite(details.seekTime) && Number.isFinite(video.duration)) {
            video.currentTime = Math.max(0, Math.min(video.duration, details.seekTime));
          }
        }]
      );
    }
    const registeredActions: MediaSessionAction[] = [];
    if (mediaSession) {
      for (const [action, handler] of mediaActions) {
        try {
          mediaSession.setActionHandler(action, handler);
          registeredActions.push(action);
        } catch {
          // Individual actions are optional and vary by browser.
        }
      }
    }

    return () => {
      savePlaybackPosition();
      video.removeEventListener('loadedmetadata', restorePlaybackPosition);
      video.removeEventListener('timeupdate', savePlaybackPosition);
      video.removeEventListener('seeked', savePlaybackPosition);
      video.removeEventListener('play', syncMediaSessionPlaybackState);
      video.removeEventListener('pause', syncMediaSessionPlaybackState);
      video.removeEventListener('ended', syncMediaSessionPlaybackState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleHidden);
      window.removeEventListener('pageshow', handleVisibleAgain);
      window.removeEventListener('blur', handleHidden);
      window.removeEventListener('focus', handleVisibleAgain);
      for (const action of registeredActions) {
        try {
          mediaSession?.setActionHandler(action, null);
        } catch {
          // The action may no longer be supported when this player is removed.
        }
      }
      if (metadataAssigned && mediaSession?.metadata === metadata) {
        try {
          mediaSession.metadata = null;
        } catch {
          if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] could not clear media session state');
        }
      }
      if (mediaSession && mediaSessionPlaybackStateAssigned) {
        try {
          mediaSession.playbackState = 'none';
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] could not clear media session playback state', error);
        }
      }
    };
  }, [isLive, matchId, resolvedStreamKind, src, title]);

  function retryStream() {
    setErrorMessage('');
    setRetryToken((token) => token + 1);
  }

  async function toggleFullscreen() {
    if (typeof document === 'undefined' || !playerRef.current) return;
    setFullscreenMessage('');

    const video = videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitExitFullscreen?: () => void } | null;
    if (isFullscreen && video?.webkitExitFullscreen) {
      try {
        video.webkitExitFullscreen();
      } catch {
        setFullscreenMessage('Fullscreen could not be closed. Use the player’s exit control instead.');
      }
      return;
    }
    if (video?.webkitEnterFullscreen) {
      try {
        video.webkitEnterFullscreen();
      } catch {
        setFullscreenMessage('Fullscreen is unavailable. Use your browser’s fullscreen controls instead.');
      }
      return;
    }
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      await document.exitFullscreen();
      return;
    }

    const element = playerRef.current as HTMLDivElement & {
      requestFullscreen?: () => Promise<void>;
    };

    if (typeof element.requestFullscreen !== 'function') {
      setFullscreenMessage('Fullscreen is unavailable. Use your browser’s fullscreen controls instead.');
      return;
    }
    try {
      await element.requestFullscreen();
    } catch {
      setFullscreenMessage('Fullscreen could not be started. Check your browser permissions and try again.');
    }
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video || !isPictureInPictureSupported) return;

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
      setFullscreenMessage('');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.warn('[Goal Pulse] picture-in-picture request failed', error);
      setFullscreenMessage('Picture-in-picture is unavailable. Use your browser’s video controls if supported.');
    }
  }

  return (
    <div ref={playerRef} className="stream-player group relative aspect-video w-full overflow-hidden bg-black">
      {resolvedStreamKind === 'iframe' ? (
        <iframe
          src={src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          onLoad={() => {
            if (iframeTimerRef.current !== null) window.clearTimeout(iframeTimerRef.current);
            iframeTimerRef.current = null;
            iframeTimerStartedAtRef.current = null;
            iframeTimeoutRemainingRef.current = 0;
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
          webkit-playsinline=""
          disablePictureInPicture={false}
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
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#05070d] px-5 text-center">
          <p className="text-sm text-slate-200">{errorMessage}</p>
          <button type="button" onClick={retryStream} className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200">Retry stream</button>
        </div>
      ) : null}
      {isPictureInPictureSupported ? (
        <button
          type="button"
          onClick={() => { void togglePictureInPicture(); }}
          aria-label={isPictureInPictureActive ? 'Exit picture-in-picture' : 'Watch in picture-in-picture'}
          title={isPictureInPictureActive ? 'Exit picture-in-picture' : 'Watch in picture-in-picture'}
          className="absolute right-16 top-3 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white transition hover:border-emerald-300 hover:bg-black/90"
        >
          <PictureInPicture2 size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}
      <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Watch in fullscreen'}
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white opacity-100 transition hover:border-emerald-300 hover:bg-black/90"
        >
          {isFullscreen ? <Minimize2 size={18} strokeWidth={1.8} aria-hidden="true" /> : <Maximize2 size={18} strokeWidth={1.8} aria-hidden="true" />}
      </button>
      {fullscreenMessage ? <p role="status" className="absolute inset-x-3 bottom-3 rounded-lg border border-white/10 bg-black/85 px-3 py-2 text-center text-xs text-white">{fullscreenMessage}</p> : null}
    </div>
  );
}
