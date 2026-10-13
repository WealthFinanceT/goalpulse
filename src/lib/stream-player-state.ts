import type { StreamedStream } from '@/lib/streamed';

type SavedStreamSelection = Pick<StreamedStream, 'id' | 'source' | 'embedUrl'>;

export function getStreamSelectionKey(matchId: string): string {
  return `goal-pulse-stream-selection:${matchId}`;
}

export function getPlaybackPositionKey(matchId: string, src: string): string {
  return `goal-pulse-playback-position:${matchId}:${src}`;
}

export function serializeStreamSelection(stream: StreamedStream): string {
  const selection: SavedStreamSelection = {
    id: stream.id,
    source: stream.source,
    embedUrl: stream.embedUrl
  };
  return JSON.stringify(selection);
}

export function resolveSavedStreamIndex(streams: StreamedStream[], serialized: string | null): number | null {
  if (!serialized) return null;

  let selection: SavedStreamSelection;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('id' in parsed) ||
      typeof parsed.id !== 'string' ||
      !('source' in parsed) ||
      typeof parsed.source !== 'string' ||
      !('embedUrl' in parsed) ||
      typeof parsed.embedUrl !== 'string'
    ) return null;
    selection = { id: parsed.id, source: parsed.source, embedUrl: parsed.embedUrl };
  } catch {
    return null;
  }

  const matchingSource = streams.findIndex((stream) => stream.id === selection.id && stream.source === selection.source);
  if (matchingSource >= 0) return matchingSource;
  const matchingUrl = streams.findIndex((stream) => stream.embedUrl === selection.embedUrl);
  return matchingUrl >= 0 ? matchingUrl : null;
}

export function getSavedPlaybackPosition(value: string | null): number | null {
  if (value === null) return null;
  const position = Number(value);
  return Number.isFinite(position) && position >= 0 ? position : null;
}
