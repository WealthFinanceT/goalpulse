'use client';

import { useCallback, useState } from 'react';
import { CircleAlert, ExternalLink } from 'lucide-react';
import MobileStreamPlayer from '@/components/MobileStreamPlayer';
import type { StreamedStream } from '@/lib/streamed';

export default function StreamSelector({ streams, title }: { streams: StreamedStream[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [failedIndexes, setFailedIndexes] = useState<number[]>([]);
  const [allSourcesFailed, setAllSourcesFailed] = useState(false);
  const selectedStream = streams[selectedIndex] || streams[0];

  const handlePlaybackError = useCallback((_message: string) => {
    setFailedIndexes((current) => current.includes(selectedIndex) ? current : [...current, selectedIndex]);
    const nextIndex = [...streams.keys()].find((index) => index !== selectedIndex && !failedIndexes.includes(index) && index > selectedIndex)
      ?? [...streams.keys()].find((index) => index !== selectedIndex && !failedIndexes.includes(index));
    if (nextIndex !== undefined) {
      setSelectedIndex(nextIndex);
      return;
    }
    setAllSourcesFailed(true);
  }, [failedIndexes, selectedIndex, streams]);

  if (!selectedStream) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white"><CircleAlert size={16} aria-hidden="true" />Stream unavailable</p>
        <p className="mt-2 text-sm text-muted">This stream source is currently unavailable. Try another available source.</p>
      </div>
    );
  }

  function selectStream(index: number) {
    setAllSourcesFailed(false);
    setSelectedIndex(index);
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <MobileStreamPlayer src={selectedStream.embedUrl} title={title} streamKind={selectedStream.kind} onPlaybackError={handlePlaybackError} />
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Available streams</p>
        {streams.map((stream, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div key={`${stream.source}-${stream.id}-${index}`} className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${isSelected ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/10 bg-white/5'}`}>
              <button type="button" onClick={() => selectStream(index)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border ${isSelected ? 'border-emerald-300 bg-emerald-300' : 'border-slate-500'}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold capitalize text-white">{stream.language || 'Unknown language'} · {stream.hd ? 'HD' : 'SD'}</span>
                  <span className="mt-1 block text-xs capitalize text-muted">Source {stream.source}</span>
                </span>
              </button>
              <a href={stream.embedUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${stream.source} stream`} className="shrink-0 text-slate-400 transition hover:text-white">
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </div>
          );
        })}
      </div>
      {allSourcesFailed ? <p className="mt-3 text-center text-sm text-slate-400">All available stream sources failed. The provider may be blocking mobile playback or the streams may have expired.</p> : null}
    </>
  );
}