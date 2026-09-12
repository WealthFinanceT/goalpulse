import type { MatchEvent, MatchStatus, StreamedMatch } from '@/lib/streamed';
import { fetchFootballMatches as fetchStreamedFixtures } from '@/lib/streamed';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const REQUEST_TIMEOUT_MS = 10_000;
const FIXTURE_CACHE_MS = 60_000;
const LIVE_CACHE_MS = 20_000;
const STREAM_MATCH_WINDOW_MS = 36 * 60 * 60 * 1000;

type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: { long?: string; short?: string; elapsed?: number | null };
  };
  league?: { id?: number; name?: string; logo?: string };
  teams?: { home?: { name?: string; logo?: string }; away?: { name?: string; logo?: string } };
  goals?: { home?: number | null; away?: number | null };
  score?: { halftime?: { home?: number | null; away?: number | null }; fulltime?: { home?: number | null; away?: number | null } };
};

type ApiResponse<T> = { response?: T[]; errors?: Record<string, unknown> | string[] };

let fixturesCache: { expiresAt: number; value: StreamedMatch[] } | null = null;
let liveCache: { expiresAt: number; value: StreamedMatch[] } | null = null;

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeName(value?: string): string {
  return (value || '')
    .replace(/Ã¶/gi, 'ö').replace(/Ã¼/gi, 'ü').replace(/Ã§/gi, 'ç').replace(/Ã±/gi, 'ñ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|club)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function statusFromApi(short?: string): { status: MatchStatus; statusShort?: string } {
  switch ((short || '').toUpperCase()) {
    case '1H': case '2H': case 'ET': case 'P': case 'PEN': return { status: 'live', statusShort: short };
    case 'HT': return { status: 'halftime', statusShort: short };
    case 'FT': case 'AET': return { status: 'finished', statusShort: short };
    case 'PST': return { status: 'postponed', statusShort: short };
    case 'CANC': return { status: 'cancelled', statusShort: short };
    case 'ABD': return { status: 'abandoned', statusShort: short };
    case 'SUSP': return { status: 'suspended', statusShort: short };
    case 'NS': return { status: 'scheduled', statusShort: short };
    default: return { status: 'unknown', statusShort: short };
  }
}

function nullableNumber(value?: number | null): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function normalizeApiFixture(item: ApiFixture): StreamedMatch {
  const home = item.teams?.home?.name || 'Home Team';
  const away = item.teams?.away?.name || 'Away Team';
  const status = statusFromApi(item.fixture.status.short);
  const kickoffTime = Date.parse(item.fixture.date);

  return {
    id: String(item.fixture.id),
    footballApiFixtureId: item.fixture.id,
    title: `${home} vs ${away}`,
    category: item.league?.name || 'Football',
    league: item.league?.name ? { id: item.league.id, name: item.league.name, logo: item.league.logo } : undefined,
    date: kickoffTime,
    kickoffTime,
    timezone: 'UTC',
    status: status.status,
    statusShort: status.statusShort,
    statusSource: 'api-football',
    elapsed: item.fixture.status.elapsed ?? undefined,
    score: { home: nullableNumber(item.goals?.home), away: nullableNumber(item.goals?.away) },
    halftimeScore: { home: nullableNumber(item.score?.halftime?.home), away: nullableNumber(item.score?.halftime?.away) },
    fulltimeScore: { home: nullableNumber(item.score?.fulltime?.home), away: nullableNumber(item.score?.fulltime?.away) },
    teams: {
      home: { name: home, badge: item.teams?.home?.logo || '' },
      away: { name: away, badge: item.teams?.away?.logo || '' }
    },
    sources: []
  };
}

async function apiFootballRequest<T>(path: string, revalidate: number): Promise<T[]> {
  const apiKey = process.env.FOOTBALL_API_KEY;
  console.info('[Goal Pulse] FOOTBALL_API_KEY configured:', Boolean(apiKey));
  if (!apiKey) throw new Error('FOOTBALL_API_KEY is not configured on the server.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'x-apisports-key': apiKey },
      next: { revalidate },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API-Football request failed: ${response.status}`);
    const payload = await response.json() as ApiResponse<T>;
    if (payload.errors && Object.keys(payload.errors).length > 0) throw new Error('API-Football returned an error response.');
    return payload.response || [];
  } finally {
    clearTimeout(timeout);
  }
}

async function streamCandidates(): Promise<StreamedMatch[]> {
  try {
    return await fetchStreamedFixtures();
  } catch (error) {
    console.error('Streamed.pk fixture lookup failed; football metadata will remain available:', error);
    return [];
  }
}

function attachStreamSource(match: StreamedMatch, candidates: StreamedMatch[]): StreamedMatch {
  const homeName = normalizeName(match.teams?.home?.name);
  const awayName = normalizeName(match.teams?.away?.name);
  const possible = candidates
    .filter((candidate) => normalizeName(candidate.teams?.home?.name) === homeName && normalizeName(candidate.teams?.away?.name) === awayName)
    .map((candidate) => ({ candidate, distance: Math.abs((candidate.kickoffTime || 0) - (match.kickoffTime || 0)) }))
    .filter(({ distance }) => distance <= STREAM_MATCH_WINDOW_MS)
    .sort((a, b) => a.distance - b.distance);
  const selected = possible[0]?.candidate;

  if (!selected) return match;
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[Goal Pulse] safe stream match', { footballApiFixtureId: match.footballApiFixtureId, streamProviderFixtureId: selected.id, homeTeam: homeName, awayTeam: awayName });
  }
  return { ...match, streamProviderFixtureId: selected.id, sources: selected.sources || [] };
}

async function attachStreams(matches: StreamedMatch[]): Promise<StreamedMatch[]> {
  const candidates = await streamCandidates();
  return matches.map((match) => attachStreamSource(match, candidates));
}

export async function getFixturesByDate(date: string): Promise<StreamedMatch[]> {
  const fixtures = await apiFootballRequest<ApiFixture>(`/fixtures?date=${encodeURIComponent(date)}&timezone=UTC`, 60);
  return attachStreams(fixtures.map(normalizeApiFixture));
}

export async function getFixtures(): Promise<StreamedMatch[]> {
  if (fixturesCache && fixturesCache.expiresAt > Date.now()) return fixturesCache.value;
  try {
    const start = new Date();
    const dates = [0, 1].map((day) => formatUtcDate(new Date(start.getTime() + day * 24 * 60 * 60 * 1000)));
    const [dateResults, live] = await Promise.all([
      Promise.all(dates.map((date) => apiFootballRequest<ApiFixture>(`/fixtures?date=${date}&timezone=UTC`, 60))),
      apiFootballRequest<ApiFixture>('/fixtures?live=all&timezone=UTC', 20)
    ]);
    const fixtures = dateResults.flat();
    const byId = new Map<number, ApiFixture>();
    [...fixtures, ...live].forEach((fixture) => byId.set(fixture.fixture.id, fixture));
    const value = await attachStreams([...byId.values()].map(normalizeApiFixture));
    fixturesCache = { expiresAt: Date.now() + FIXTURE_CACHE_MS, value };
    return value;
  } catch (error) {
    console.error('API-Football fixture fetch failed:', error instanceof Error ? error.message : 'Unknown API error');
    if (fixturesCache) return fixturesCache.value;
    throw error;
  }
}

export async function getLiveFixtures(): Promise<StreamedMatch[]> {
  if (liveCache && liveCache.expiresAt > Date.now()) return liveCache.value;
  try {
    const value = await attachStreams((await apiFootballRequest<ApiFixture>('/fixtures?live=all&timezone=UTC', 20)).map(normalizeApiFixture));
    liveCache = { expiresAt: Date.now() + LIVE_CACHE_MS, value };
    return value;
  } catch (error) {
    console.error('API-Football live fixture fetch failed:', error instanceof Error ? error.message : 'Unknown API error');
    return liveCache?.value || [];
  }
}

export async function getFixtureById(id: string): Promise<StreamedMatch | null> {
  try {
    const fixtures = await apiFootballRequest<ApiFixture>(`/fixtures?id=${encodeURIComponent(id)}&timezone=UTC`, 20);
    const [match] = await attachStreams(fixtures.map(normalizeApiFixture));
    return match || null;
  } catch (error) {
    console.error(`API-Football fixture ${id} fetch failed:`, error instanceof Error ? error.message : 'Unknown API error');
    return null;
  }
}

export async function getLeagueFixtures(leagueId: number, season = new Date().getUTCFullYear()): Promise<StreamedMatch[]> {
  const fixtures = await apiFootballRequest<ApiFixture>(`/fixtures?league=${leagueId}&season=${season}&timezone=UTC`, 300);
  return attachStreams(fixtures.map(normalizeApiFixture));
}

export async function getStandings(leagueId: number, season = new Date().getUTCFullYear()): Promise<unknown[]> {
  return apiFootballRequest(`/standings?league=${leagueId}&season=${season}`, 300);
}

export async function getFixtureEvents(fixtureId: number): Promise<MatchEvent[]> {
  const events = await apiFootballRequest<Record<string, unknown>>(`/fixtures/events?fixture=${fixtureId}`, 20);
  return events.map((event) => {
    const time = event.time && typeof event.time === 'object' ? event.time as Record<string, unknown> : undefined;
    const player = event.player && typeof event.player === 'object' ? event.player as Record<string, unknown> : undefined;
    const assist = event.assist && typeof event.assist === 'object' ? event.assist as Record<string, unknown> : undefined;
    const type = event.type === 'Goal' ? 'goal' : event.type === 'Card' ? 'card' : event.type === 'subst' ? 'subst' : 'unknown';
    return { time: typeof time?.elapsed === 'number' ? time.elapsed : undefined, type, detail: typeof event.detail === 'string' ? event.detail : undefined, team: typeof (event.team as Record<string, unknown> | undefined)?.name === 'string' ? (event.team as Record<string, unknown>).name as string : undefined, player: typeof player?.name === 'string' ? player.name : undefined, assist: typeof assist?.name === 'string' ? assist.name : undefined };
  });
}
