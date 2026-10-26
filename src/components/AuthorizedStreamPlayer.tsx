'use client';

import { CircleAlert, Radio } from 'lucide-react';
import MobileStreamPlayer from '@/components/MobileStreamPlayer';
import type { StreamConfiguration } from '@/lib/streaming/config';

export default function AuthorizedStreamPlayer({
  configuration,
  title,
  playbackId,
}: {
  configuration: StreamConfiguration;
  title: string;
  playbackId: string;
}) {
  const { source, error } = configuration;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#071018]/95 shadow-[0_18px_48px_rgba(0,0,0,0.24)] sm:rounded-2xl">
      {source ? (
        <MobileStreamPlayer
          src={source.src}
          title={title}
          streamKind={source.kind}
          matchId={playbackId}
          isLive
        />
      ) : (
        <div
          role={error ? 'alert' : 'status'}
          className="flex aspect-video min-h-52 items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_60%),#030609] p-5 sm:min-h-72"
        >
          <div className="max-w-md text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
              {error ? <CircleAlert size={24} aria-hidden="true" /> : <Radio size={24} aria-hidden="true" />}
            </span>
            <p className="mt-4 text-base font-semibold text-white">
              {error ? 'Stream configuration issue' : 'Stream unavailable'}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {error || 'No authorized stream is configured for this event yet.'}
            </p>
          </div>
        </div>
      )}
      <p role="status" aria-live="polite" className="border-t border-white/8 px-4 py-3 text-xs leading-5 text-slate-400 sm:px-5">
        Playback is provided by the configured source. Browsers may not expose playback failures from cross-origin iframe embeds; check provider permissions and availability if playback does not start.
      </p>
    </div>
  );
}
