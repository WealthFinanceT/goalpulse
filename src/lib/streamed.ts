export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled' | 'abandoned' | 'suspended' | 'unknown';

export type StreamedMatch = {
  id: string;
  title: string;
  category?: string;
  date?: number; // UTC epoch milliseconds
  kickoffTime?: number; // UTC epoch milliseconds; retained as the normalized alias
  timezone: 'UTC';
  status: MatchStatus;
  statusShort?: string;
  statusSource: 'provider' | 'live-feed' | 'inferred';
  elapsed?: number;
  score?: { home?: number; away?: number };
  competition?: { id: string; name: string; logo?: string };
  teams?: {
    home?: { name: string; badge: string };
    away?: { name: string; badge: string };
  };
  sources?: Array<{ source: string; id: string }>;
};

export type StreamedCompetition = { id: string; name: string; logo?: string };

export function getMatchCompetition(match: StreamedMatch): StreamedCompetition {
  return match.competition || { id: match.category || 'football', name: match.category || 'Football' };
}

export function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function getMatchSearchText(match: StreamedMatch): string {
  const competition = getMatchCompetition(match);
  return normalizeSearchText([match.title, competition.name, match.teams?.home?.name, match.teams?.away?.name].filter(Boolean).join(' '));
}

export type StreamedStream = {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers?: number;
  kind?: 'iframe' | 'hls' | 'mp4';
};

export function isMatchLive(match: StreamedMatch): boolean {
  return match.status === 'live' || match.status === 'halftime';
}

export function isMatchUpcoming(match: StreamedMatch): boolean {
  return match.status === 'scheduled' && Boolean(match.kickoffTime && match.kickoffTime > Date.now());
}

export function getMatchStatusLabel(match: StreamedMatch): string {
  if (match.status === 'live') return 'LIVE';
  if (match.status === 'halftime') return 'Half-time';
  if (match.status === 'finished') return 'Finished';
  if (match.status === 'postponed') return 'Postponed';
  if (match.status === 'cancelled') return 'Cancelled';
  if (match.status === 'abandoned') return 'Abandoned';
  if (match.status === 'suspended') return 'Suspended';
  if (match.status === 'scheduled') return 'Upcoming';
  return 'Status unavailable';
}

export function formatMatchDate(timestamp?: number): string {
  if (!timestamp) return 'TBA';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

const MATCHES_URL = 'https://streamed.pk/api/matches/football';
const LIVE_MATCHES_URL = 'https://streamed.pk/api/matches/live';
const REQUEST_TIMEOUT_MS = 10_000;
const INITIAL_LIVE_WAIT_MS = 1_500;
function configuredSeconds(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const FOOTBALL_REVALIDATE_SECONDS = configuredSeconds('STREAMED_FIXTURES_REVALIDATE_SECONDS', 60);
export const LIVE_REVALIDATE_SECONDS = configuredSeconds('STREAMED_LIVE_REVALIDATE_SECONDS', 20);

const LIVE_STATUS_VALUES = new Set(['live', '1h', '2h', 'et', 'p', 'pen', 'first_half', 'second_half', 'extra_time', 'penalties']);
const HALFTIME_STATUS_VALUES = new Set(['ht', 'halftime', 'half_time']);
const FINISHED_STATUS_VALUES = new Set(['ft', 'aet', 'finished', 'full_time']);
const POSTPONED_STATUS_VALUES = new Set(['pst', 'postponed']);
const CANCELLED_STATUS_VALUES = new Set(['canc', 'cancelled', 'canceled']);
const ABANDONED_STATUS_VALUES = new Set(['abd', 'abandoned']);
const SUSPENDED_STATUS_VALUES = new Set(['susp', 'suspended']);

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isValidStream(value: unknown): value is StreamedStream {
  if (!value || typeof value !== 'object') return false;

  const stream = value as Partial<StreamedStream>;
  if (
    typeof stream.id !== 'string' ||
    typeof stream.streamNo !== 'number' ||
    typeof stream.language !== 'string' ||
    typeof stream.hd !== 'boolean' ||
    typeof stream.source !== 'string' ||
    typeof stream.embedUrl !== 'string'
  ) return false;

  try {
    const url = new URL(stream.embedUrl);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function streamRank(stream: StreamedStream): number {
  const language = stream.language.trim().toLowerCase();
  return (stream.hd ? 2 : 0) + (language === 'english' ? 1 : 0);
}

function detectStreamKind(url: string, contentType = ''): StreamedStream['kind'] {
  const value = `${url} ${contentType}`.toLowerCase();
  if (value.includes('mpegurl') || value.includes('application/x-mpegurl') || /\.m3u8(?:$|[?#])/.test(url)) return 'hls';
  if (value.includes('video/mp4') || /\.mp4(?:$|[?#])/.test(url)) return 'mp4';
  return 'iframe';
}

async function resolveStreamUrl(stream: StreamedStream): Promise<StreamedStream | null> {
  try {
    const response = await fetchWithTimeout(stream.embedUrl, {
      method: 'HEAD',
      cache: 'no-store',
      redirect: 'follow'
    });
    return response.ok ? { ...stream, kind: detectStreamKind(response.url || stream.embedUrl, response.headers.get('content-type') || '') } : null;
  } catch (error) {
    console.warn(`Unavailable embed URL for ${stream.source}/${stream.id}:`, error);
    return null;
  }
}

function normalizeStatus(value: unknown): { status: MatchStatus; statusShort?: string } | null {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/[ -]/g, '_');
    if (LIVE_STATUS_VALUES.has(normalized)) return { status: 'live', statusShort: value };
    if (HALFTIME_STATUS_VALUES.has(normalized)) return { status: 'halftime', statusShort: value };
    if (FINISHED_STATUS_VALUES.has(normalized)) return { status: 'finished', statusShort: value };
    if (POSTPONED_STATUS_VALUES.has(normalized)) return { status: 'postponed', statusShort: value };
    if (CANCELLED_STATUS_VALUES.has(normalized)) return { status: 'cancelled', statusShort: value };
    if (ABANDONED_STATUS_VALUES.has(normalized)) return { status: 'abandoned', statusShort: value };
    if (SUSPENDED_STATUS_VALUES.has(normalized)) return { status: 'suspended', statusShort: value };
  }
  return null;
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 10_000_000_000 ? value * 1000 : value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function normalizeRawMatch(value: unknown, liveIds: Set<string>): StreamedMatch | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;

  const kickoffTime = parseTimestamp(raw.date ?? raw.kickoffTime ?? raw.kickoff ?? (raw.fixture as Record<string, unknown> | undefined)?.date);
  const nestedStatus = raw.status && typeof raw.status === 'object' ? raw.status as Record<string, unknown> : undefined;
  const fixture = raw.fixture && typeof raw.fixture === 'object' ? raw.fixture as Record<string, unknown> : undefined;
  const fixtureStatus = fixture?.status && typeof fixture.status === 'object' ? fixture.status as Record<string, unknown> : undefined;
  const rawCompetition = raw.competition && typeof raw.competition === 'object' ? raw.competition as Record<string, unknown> : undefined;
  const rawLeague = raw.league && typeof raw.league === 'object' ? raw.league as Record<string, unknown> : undefined;
  const competitionRecord = rawCompetition || rawLeague;
  const competitionId = competitionRecord?.id ?? competitionRecord?.key ?? raw.competitionId ?? raw.leagueId;
  const competitionName = competitionRecord?.name ?? competitionRecord?.title ?? raw.competitionName ?? raw.leagueName;
  const competitionLogo = competitionRecord?.logo ?? competitionRecord?.image;
  const rawStatus = normalizeStatus(raw.statusShort ?? nestedStatus?.short ?? nestedStatus?.long ?? raw.status ?? fixtureStatus?.short ?? fixtureStatus?.long);
  // A passed kickoff is not evidence that a fixture has finished. Only the provider
  // or the dedicated live feed can promote a match out of its unknown state.
  const fallbackStatus: { status: MatchStatus; statusShort?: string } = liveIds.has(raw.id)
    ? { status: 'live' }
    : { status: kickoffTime && kickoffTime > Date.now() ? 'scheduled' : 'unknown' };
  const status = rawStatus || fallbackStatus;
  const statusSource = rawStatus ? 'provider' as const : liveIds.has(raw.id) ? 'live-feed' as const : 'inferred' as const;

  return {
    ...(raw as Omit<StreamedMatch, 'date' | 'kickoffTime' | 'timezone' | 'status' | 'statusSource'>),
    id: raw.id,
    title: raw.title,
    category: typeof raw.category === 'string' ? raw.category : undefined,
    competition: typeof competitionId === 'string' || typeof competitionId === 'number'
      ? {
          id: String(competitionId),
          name: typeof competitionName === 'string' ? competitionName : typeof raw.category === 'string' ? raw.category : 'Football',
          logo: typeof competitionLogo === 'string' ? competitionLogo : undefined
        }
      : undefined,
    date: kickoffTime,
    kickoffTime,
    timezone: 'UTC',
    status: status.status,
    statusShort: status.statusShort,
    statusSource,
    elapsed: typeof raw.elapsed === 'number' ? raw.elapsed : undefined,
    score: raw.score && typeof raw.score === 'object'
      ? {
          home: typeof (raw.score as Record<string, unknown>).home === 'number' ? (raw.score as Record<string, number>).home : undefined,
          away: typeof (raw.score as Record<string, unknown>).away === 'number' ? (raw.score as Record<string, number>).away : undefined
        }
      : undefined,
  };
}

function normalizeMatchesPayload(payload: unknown, liveIds = new Set<string>()): StreamedMatch[] {
  let values: unknown[] = [];
  if (Array.isArray(payload)) {
    values = payload;
  } else if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const candidates = [record.data, record.matches, record.results, record.items];
    values = candidates.find(Array.isArray) as unknown[] | undefined || [];
  }

  return values.map((value) => normalizeRawMatch(value, liveIds)).filter((match): match is StreamedMatch => match !== null);
}

async function fetchMatches(url: string, init?: RequestInit & { next?: { revalidate: number } }): Promise<StreamedMatch[]> {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) throw new Error(`Failed to fetch matches: ${response.status}`);

  const text = await response.text();
  let data: unknown = [];
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.warn('Unable to parse streamed matches payload:', error);
  }

  return normalizeMatchesPayload(data);
}

async function fetchLiveIds(fresh = false): Promise<Set<string>> {
  try {
    const liveMatches = await fetchMatches(
      LIVE_MATCHES_URL,
      fresh ? { cache: 'no-store' } : { next: { revalidate: LIVE_REVALIDATE_SECONDS } }
    );
    return new Set(liveMatches.map((match) => match.id));
  } catch (error) {
    console.warn('Unable to refresh live fixture IDs:', error);
    return new Set();
  }
}

async function fetchInitialLiveIds(fresh = false): Promise<Set<string>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(new Set()), INITIAL_LIVE_WAIT_MS);
    void fetchLiveIds(fresh).then((ids) => {
      clearTimeout(timer);
      resolve(ids);
    });
  });
}

export async function fetchFootballMatches(options: { fresh?: boolean } = {}): Promise<StreamedMatch[]> {
  const liveIdsRequest = fetchInitialLiveIds(options.fresh);
  const response = await fetchWithTimeout(
    MATCHES_URL,
    options.fresh ? { cache: 'no-store' } : { next: { revalidate: FOOTBALL_REVALIDATE_SECONDS } }
  );
  if (!response.ok) throw new Error(`Failed to fetch matches: ${response.status}`);
  const payload = await response.json();
  // Live badges are valuable but must not hold the whole fixture page hostage when
  // Streamed's live endpoint is slow. The client refreshes that small feed later.
  const liveIds = await liveIdsRequest;
  const matches = normalizeMatchesPayload(payload, liveIds);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[Goal Pulse] fixture refresh', { count: matches.length, liveCount: matches.filter((match) => match.status === 'live').length, refreshedAt: new Date().toISOString() });
  }
  return matches;
}

export async function fetchLiveMatches(): Promise<StreamedMatch[]> {
  const response = await fetchWithTimeout(LIVE_MATCHES_URL, { next: { revalidate: LIVE_REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`Failed to fetch live matches: ${response.status}`);
  const payload = await response.json();
  const liveMatches = normalizeMatchesPayload(payload);
  const liveIds = new Set(liveMatches.map((match) => match.id));
  return normalizeMatchesPayload(payload, liveIds).filter((match) => match.category === 'football');
}

export type FixturePage = { matches: StreamedMatch[]; total: number; offset: number; limit: number };

export async function fetchFootballMatchesPage(offset = 0, limit = 9): Promise<FixturePage> {
  const matches = await fetchFootballMatches();
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(30, Math.max(1, Math.floor(limit)));
  return { matches: matches.slice(safeOffset, safeOffset + safeLimit), total: matches.length, offset: safeOffset, limit: safeLimit };
}

export async function fetchMatchById(id: string): Promise<StreamedMatch | null> {
  try {
    const response = await fetchWithTimeout(MATCHES_URL, { next: { revalidate: FOOTBALL_REVALIDATE_SECONDS } });
    if (!response.ok) return null;

    const [payload, liveIds] = await Promise.all([response.json(), fetchLiveIds()]);
    const match = normalizeMatchesPayload(payload, liveIds).find((item) => item.id === id) || null;
    if (process.env.NODE_ENV !== 'production' && match) {
      console.debug('[Goal Pulse] fixture', { streamProviderFixtureId: match.id, homeTeam: match.teams?.home?.name, awayTeam: match.teams?.away?.name, kickoffUtc: match.kickoffTime ? new Date(match.kickoffTime).toISOString() : undefined, displayTime: match.kickoffTime ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(match.kickoffTime)) : undefined, status: match.status, currentTime: new Date().toISOString() });
    }
    return match;
  } catch (error) {
    console.error(`Failed to fetch match ${id}:`, error);
    return null;
  }
}

export async function fetchMatchStreams(match: StreamedMatch): Promise<StreamedStream[]> {
  const sources = (match.sources || []).filter((source) => source.source?.trim() && source.id?.trim());
  if (!sources.length) return [];

  const results = await Promise.all(sources.map(async (source) => {
    const url = `https://streamed.pk/api/stream/${encodeURIComponent(source.source)}/${encodeURIComponent(source.id)}`;

    try {
      const response = await fetchWithTimeout(url, { cache: 'no-store' });
      if (!response.ok) return [];

      const payload: unknown = await response.json();
      const parsedStreams = Array.isArray(payload) ? payload.filter(isValidStream) : [];
      const availability = await Promise.all(parsedStreams.map(resolveStreamUrl));
      return availability.filter((stream): stream is StreamedStream => stream !== null);
    } catch (error) {
      console.error(`Failed to fetch streams for ${match.id} from ${source.source}:`, error);
      return [];
    }
  }));

  const uniqueStreams = new Map<string, StreamedStream>();
  results.flat().forEach((stream) => {
    const key = `${stream.source}:${stream.id}:${stream.embedUrl}`;
    if (!uniqueStreams.has(key)) uniqueStreams.set(key, stream);
  });

  const uniqueResults = [...uniqueStreams.values()].sort((a, b) => streamRank(b) - streamRank(a));
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[Goal Pulse] stream mapping', { streamProviderFixtureId: match.id, streamUrls: uniqueResults.map((stream) => ({ source: stream.source, id: stream.id, embedUrl: stream.embedUrl })) });
  }
  return uniqueResults;
}
