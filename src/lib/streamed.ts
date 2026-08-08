export type StreamedMatch = {
  id: string;
  title: string;
  category?: string;
  date?: number; // milliseconds
  teams?: {
    home: { name: string; badge: string }; // badge is a string ID or empty
    away: { name: string; badge: string };
  };
  sources?: Array<{
    source: string; // e.g., "admin", "echo", "delta"
    id: string; // stream identifier
  }>;
};

export type StreamedStream = {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers?: number;
};

const MATCHES_URL = 'https://streamed.pk/api/matches/football';

function normalizeMatchesPayload(payload: unknown): StreamedMatch[] {
  if (Array.isArray(payload)) {
    return payload as StreamedMatch[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidates = [record.data, record.matches, record.results, record.items];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as StreamedMatch[];
      }
    }
  }

  return [];
}

export async function fetchFootballMatches(): Promise<StreamedMatch[]> {
  const response = await fetch(MATCHES_URL, {
    next: { revalidate: 30 },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch football matches: ${response.status}`);
  }

  const text = await response.text();
  let data: unknown = [];

  try {
    data = JSON.parse(text);
  } catch (error) {
    console.warn('Unable to parse streamed matches payload:', error);
  }

  return normalizeMatchesPayload(data);
}

export async function fetchMatchById(id: string): Promise<StreamedMatch | null> {
  try {
    const matches = await fetchFootballMatches();
    return matches.find((match) => match.id === id) || null;
  } catch (error) {
    console.error(`Failed to fetch match ${id}:`, error);
    return null;
  }
}

export async function fetchMatchStreams(match: StreamedMatch): Promise<StreamedStream[]> {
  const sources = match.sources || [];
  const streams: StreamedStream[] = [];

  for (const source of sources) {
    const url = `https://streamed.pk/api/stream/${encodeURIComponent(source.source)}/${encodeURIComponent(source.id)}`;

    try {
      const response = await fetch(url, {
        next: { revalidate: 30 },
        cache: 'no-store'
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const parsedStreams = Array.isArray(payload) ? (payload as StreamedStream[]) : [];

      if (parsedStreams.length > 0) {
        console.log(`[Streamed] stream payload for ${match.id}`, JSON.stringify(parsedStreams, null, 2));
      } else {
        console.log(`[Streamed] no streams found for ${match.id} from ${source.source}`);
      }

      streams.push(...parsedStreams);
    } catch (error) {
      console.error(`Failed to fetch streams for ${match.id} from ${source.source}:`, error);
    }
  }

  return streams;
}
