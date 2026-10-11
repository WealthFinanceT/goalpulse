import { NextResponse } from 'next/server';
import { FOOTBALL_REVALIDATE_SECONDS, LIVE_REVALIDATE_SECONDS, fetchFootballMatchesPage, fetchLiveMatches } from '@/lib/streamed';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('live') === '1') {
      return NextResponse.json(await fetchLiveMatches(), { headers: { 'Cache-Control': `public, s-maxage=${LIVE_REVALIDATE_SECONDS}, stale-while-revalidate=${LIVE_REVALIDATE_SECONDS}` } });
    }
    const offset = Number(searchParams.get('offset') || 0);
    const limit = Number(searchParams.get('limit') || 9);
    return NextResponse.json(await fetchFootballMatchesPage(offset, limit), { headers: { 'Cache-Control': `public, s-maxage=${FOOTBALL_REVALIDATE_SECONDS}, stale-while-revalidate=${FOOTBALL_REVALIDATE_SECONDS * 2}` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to refresh matches.' }, { status: 502 });
  }
}
