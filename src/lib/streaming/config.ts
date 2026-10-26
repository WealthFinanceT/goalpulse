import type { StreamKind } from '@/lib/streaming/types';

const STREAM_KINDS: StreamKind[] = ['iframe', 'hls', 'dash', 'mp4'];

function isStreamKind(value: string): value is StreamKind {
  return STREAM_KINDS.some((kind) => kind === value);
}

export type AuthorizedStreamSource = {
  src: string;
  kind: StreamKind;
};

export type StreamConfiguration = {
  source: AuthorizedStreamSource | null;
  error: string | null;
};

export function resolveAuthorizedStreamSource(urlValue?: string, kindValue?: string): StreamConfiguration {
  if (!urlValue?.trim() && !kindValue?.trim()) {
    return { source: null, error: null };
  }

  if (!urlValue?.trim() || !kindValue?.trim()) {
    return {
      source: null,
      error: 'Both the authorized stream URL and its explicit media type must be configured.',
    };
  }

  if (!isStreamKind(kindValue)) {
    return {
      source: null,
      error: 'The configured stream media type is unsupported. Use iframe, hls, dash, or mp4.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlValue);
  } catch {
    return { source: null, error: 'The configured stream URL is invalid.' };
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
    return { source: null, error: 'The configured stream URL must use HTTPS and cannot contain credentials.' };
  }

  return {
    source: { src: parsedUrl.toString(), kind: kindValue },
    error: null,
  };
}

export function getBallonDorStreamConfiguration(): StreamConfiguration {
  return resolveAuthorizedStreamSource(
    process.env.BALLON_DOR_STREAM_URL,
    process.env.BALLON_DOR_STREAM_KIND,
  );
}
